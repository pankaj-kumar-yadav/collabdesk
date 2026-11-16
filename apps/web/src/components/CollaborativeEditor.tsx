"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useTheme } from "next-themes";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { ConnectionStatus } from "@collabdesk/shared";
import { getToken, getWsUrl } from "@/lib/api";
import { CollabWebsocketProvider } from "@/lib/y-websocket";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

const EDITOR_LANGUAGE_BY_EXT = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  md: "markdown",
} as const;

const CONNECTION_DOT_CLASS = {
  saved: "ok",
  connected: "ok",
  offline: "bad",
  unauthorized: "bad",
  connecting: "warn",
  syncing: "warn",
} as const satisfies Record<ConnectionStatus, "ok" | "bad" | "warn">;

function applyMonacoTheme(monaco: typeof Monaco, mode: "light" | "dark") {
  if (mode === "light") {
    monaco.editor.defineTheme("collabdesk", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
      },
    });
  } else {
    monaco.editor.defineTheme("collabdesk", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0f1419",
      },
    });
  }
  monaco.editor.setTheme("collabdesk");
}

function languageForFileName(fileName: string) {
  const ext = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext in EDITOR_LANGUAGE_BY_EXT) {
    return EDITOR_LANGUAGE_BY_EXT[ext as keyof typeof EDITOR_LANGUAGE_BY_EXT];
  }
  return "plaintext";
}

type PresenceUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
};

export type CollaborativeEditorProps = {
  fileId: string;
  fileName: string;
  readOnly?: boolean;
  onReadOnlyChange?: (readOnly: boolean) => void;
};

export function CollaborativeEditor(props: CollaborativeEditorProps) {
  const { fileId, fileName, readOnly, onReadOnlyChange } = props;
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const editorTheme = resolvedTheme === "light" ? "light" : "dark";

  const { doc, yText, provider } = useMemo(() => {
    const nextDoc = new Y.Doc();
    const nextYText = nextDoc.getText("monaco");
    const token = getToken();
    const url = `${getWsUrl()}?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token ?? "")}`;
    const nextProvider = new CollabWebsocketProvider(url, nextDoc);
    return { doc: nextDoc, yText: nextYText, provider: nextProvider };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    const onStatus = (s: ConnectionStatus) => setStatus(s);
    const onHello = (payload: { canWrite?: boolean }) => {
      const writable = Boolean(payload.canWrite);
      setCanWrite(writable);
      onReadOnlyChange?.(!writable);
    };
    const onRole = (payload: { canWrite?: boolean }) => {
      const writable = Boolean(payload.canWrite);
      setCanWrite(writable);
      onReadOnlyChange?.(!writable);
    };
    const onErr = (payload: { message?: string }) => {
      setError(payload.message ?? "Collaboration error");
    };

    provider.on("status", onStatus);
    provider.on("hello", onHello);
    provider.on("role", onRole);
    provider.on("control-error", onErr);

    const paintRemoteSelections = () => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      const model = editor.getModel();
      if (!model) return;

      const decs: Monaco.editor.IModelDeltaDecoration[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (clientId === doc.clientID) return;
        const user = (state as { user?: { name: string; color: string } }).user;
        const sel = (
          state as {
            selection?: {
              startLineNumber: number;
              startColumn: number;
              endLineNumber: number;
              endColumn: number;
            };
          }
        ).selection;
        if (!user || !sel) return;
        const isCursor =
          sel.startLineNumber === sel.endLineNumber &&
          sel.startColumn === sel.endColumn;
        decs.push({
          range: new monaco.Range(
            sel.startLineNumber,
            sel.startColumn,
            sel.endLineNumber,
            sel.endColumn + (isCursor ? 1 : 0),
          ),
          options: {
            className: isCursor ? undefined : "remote-selection",
            inlineClassName: isCursor ? undefined : "remote-selection",
            overviewRuler: {
              color: user.color,
              position: monaco.editor.OverviewRulerLane.Full,
            },
            after: isCursor
              ? {
                  content: "▋",
                  inlineClassName: "remote-cursor",
                }
              : undefined,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      });

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decs);
    };

    const refreshPresence = () => {
      const users: PresenceUser[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { id: string; name: string; color: string } })
          .user;
        if (!user) return;
        users.push({ clientId, ...user });
      });
      setPresence(users);
      paintRemoteSelections();
    };

    provider.awareness.on("change", refreshPresence);
    refreshPresence();

    return () => {
      provider.off("status", onStatus);
      provider.off("hello", onHello);
      provider.off("role", onRole);
      provider.off("control-error", onErr);
      provider.awareness.off("change", refreshPresence);
      bindingRef.current?.destroy();
      provider.destroy();
      doc.destroy();
    };
  }, [doc, onReadOnlyChange, provider]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    applyMonacoTheme(monaco, editorTheme);
  }, [editorTheme]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const model = editor.getModel();
    if (!model) return;

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness,
    );

    const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
    applyMonacoTheme(monaco, mode);

    const styleId = "collabdesk-remote-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .remote-selection { background: rgba(61, 156, 240, 0.25); }
        .remote-cursor { color: #f0b429; font-weight: 700; margin-left: -0.3ch; }
      `;
      document.head.appendChild(style);
    }

    editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      provider.awareness.setLocalStateField("selection", {
        startLineNumber: sel.startLineNumber,
        startColumn: sel.startColumn,
        endLineNumber: sel.endLineNumber,
        endColumn: sel.endColumn,
      });
    });
  };

  const locked = readOnly || !canWrite;
  const language = languageForFileName(fileName);
  const dotClass = CONNECTION_DOT_CLASS[status];

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-medium tracking-tight">
            {fileName}
          </p>
          {locked ? (
            <p className="text-xs text-muted-foreground">Read-only for your role</p>
          ) : null}
        </div>
        <div className="status-pill" aria-live="polite">
          <span className={cn("status-dot", dotClass)} />
          <span className="capitalize">{status}</span>
        </div>
      </div>
      {error ? (
        <p className="border-b border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={language}
          theme="collabdesk"
          onMount={onMount}
          options={{
            readOnly: locked,
            minimap: { enabled: false },
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 14,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            renderLineHighlight: "line",
          }}
        />
      </div>
      <CollaborativeEditorPresence presence={presence} />
    </div>
  );
}

type CollaborativeEditorPresenceProps = {
  presence: PresenceUser[];
};

function CollaborativeEditorPresence(props: CollaborativeEditorPresenceProps) {
  const { presence } = props;

  return (
    <div className="border-t border-border/80 bg-background/50 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Presence</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {presence.length} online
        </p>
      </div>
      {presence.length === 0 ? (
        <p className="text-xs text-muted-foreground">Waiting for collaborators…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presence.map((u) => (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card py-1 pr-2.5 pl-1 text-xs"
              key={`${u.clientId}-${u.id}`}
            >
              <UserAvatar
                size="sm"
                className="size-5"
                seed={u.id || u.name}
                name={u.name}
                backgroundColor={u.color}
              />
              <span className="max-w-[8rem] truncate">{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
