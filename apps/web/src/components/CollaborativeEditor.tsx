"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useTheme } from "next-themes";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { ConnectionStatus } from "@collabdesk/shared";
import { getToken, getWsUrl } from "@/lib/api";
import { fileExtensionIcon } from "@/lib/file-extension-icon";
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

type CollabSession = {
  doc: Y.Doc;
  yText: Y.Text;
  provider: CollabWebsocketProvider;
};

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

function bindMonacoToYText(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  session: CollabSession | null,
  bindingRef: { current: MonacoBinding | null },
) {
  if (!editor || !session) return;
  const model = editor.getModel();
  if (!model) return;

  // Destroy first so setValue does not echo back into Y.Text via the binding.
  bindingRef.current?.destroy();
  bindingRef.current = null;

  const next = session.yText.toString();
  if (model.getValue() !== next) {
    model.setValue(next);
  }

  bindingRef.current = new MonacoBinding(
    session.yText,
    model,
    new Set([editor]),
    session.provider.awareness,
  );
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
  const [session, setSession] = useState<CollabSession | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const sessionRef = useRef<CollabSession | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const editorTheme = resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    const doc = new Y.Doc();
    const yText = doc.getText("monaco");
    const token = getToken();
    const url = `${getWsUrl()}?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token ?? "")}`;
    const provider = new CollabWebsocketProvider(url, doc);
    const nextSession: CollabSession = { doc, yText, provider };
    sessionRef.current = nextSession;
    setSession(nextSession);
    setStatus("connecting");
    setPresence([]);
    setError(null);

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
    const onSynced = () => {
      bindMonacoToYText(editorRef.current, nextSession, bindingRef);
    };

    provider.on("status", onStatus);
    provider.on("hello", onHello);
    provider.on("role", onRole);
    provider.on("control-error", onErr);
    provider.on("synced", onSynced);

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
      // One chip per account — ignore ghost / multi-tab clientIDs for the same user.
      const byUserId = new Map<string, PresenceUser>();
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { id: string; name: string; color: string } })
          .user;
        if (!user?.id) return;
        byUserId.set(user.id, { clientId, ...user });
      });
      setPresence([...byUserId.values()]);
      paintRemoteSelections();
    };

    provider.awareness.on("change", refreshPresence);
    refreshPresence();

    return () => {
      provider.off("status", onStatus);
      provider.off("hello", onHello);
      provider.off("role", onRole);
      provider.off("control-error", onErr);
      provider.off("synced", onSynced);
      provider.awareness.off("change", refreshPresence);
      bindingRef.current?.destroy();
      bindingRef.current = null;
      provider.destroy();
      doc.destroy();
      if (sessionRef.current === nextSession) {
        sessionRef.current = null;
        setSession(null);
      }
    };
  }, [fileId, onReadOnlyChange]);

  useEffect(() => {
    bindMonacoToYText(editorRef.current, session, bindingRef);
  }, [session]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    applyMonacoTheme(monaco, editorTheme);
  }, [editorTheme]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    bindMonacoToYText(editor, sessionRef.current, bindingRef);

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
      sessionRef.current?.provider.awareness.setLocalStateField("selection", {
        startLineNumber: sel.startLineNumber,
        startColumn: sel.startColumn,
        endLineNumber: sel.endLineNumber,
        endColumn: sel.endColumn,
      });
    });
  };

  const locked = readOnly || !canWrite;
  const language = languageForFileName(fileName);
  const { Icon: FileIcon, className: iconClassName } =
    fileExtensionIcon(fileName);
  const dotClass = CONNECTION_DOT_CLASS[status];

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 truncate font-mono text-sm font-medium tracking-tight">
            <FileIcon className={cn("size-3.5 shrink-0", iconClassName)} />
            <span className="truncate">{fileName}</span>
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
