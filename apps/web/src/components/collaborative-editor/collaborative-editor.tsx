"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useTheme } from "next-themes";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { ConnectionStatus } from "@collabdesk/shared";
import {
  applyCollaborativeEditorMonacoTheme,
  bindCollaborativeEditorMonacoToYText,
  collaborativeEditorLanguageForFileName,
} from "@/components/collaborative-editor/collaborative-editor-monaco";
import {
  CollaborativeEditorPresence,
  type CollaborativeEditorPresenceUser,
} from "@/components/collaborative-editor/collaborative-editor-presence";
import {
  clearCollaborativeEditorRemoteCursors,
  ensureCollaborativeEditorRemoteCursorStyles,
  paintCollaborativeEditorRemoteCursors,
} from "@/components/collaborative-editor/collaborative-editor-remote-cursors";
import { getToken, getWsUrl } from "@/lib/api";
import { fileExtensionIcon } from "@/lib/file-extension-icon";
import { CollabWebsocketProvider } from "@/lib/y-websocket";
import { cn } from "@/lib/utils";

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
  const [presence, setPresence] = useState<CollaborativeEditorPresenceUser[]>(
    [],
  );
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CollabSession | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const sessionRef = useRef<CollabSession | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const paintRemoteRef = useRef<() => void>(() => {});
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
    setLocalUserId(null);
    setError(null);

    const onStatus = (s: ConnectionStatus) => setStatus(s);
    const onHello = (payload: {
      canWrite?: boolean;
      user?: { id?: string };
    }) => {
      const writable = Boolean(payload.canWrite);
      setCanWrite(writable);
      setLocalUserId(payload.user?.id ?? provider.serverUser?.id ?? null);
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
      bindCollaborativeEditorMonacoToYText(
        editorRef.current,
        nextSession,
        bindingRef,
      );
      paintRemoteRef.current();
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
      paintCollaborativeEditorRemoteCursors({
        editor,
        monaco,
        awareness: provider.awareness,
        localClientId: doc.clientID,
        decorationsRef,
      });
    };

    paintRemoteRef.current = paintRemoteSelections;

    const refreshPresence = () => {
      // One chip per account — ignore ghost / multi-tab clientIDs for the same user.
      const byUserId = new Map<string, CollaborativeEditorPresenceUser>();
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (
          state as { user?: { id: string; name: string; color: string } }
        ).user;
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
      paintRemoteRef.current = () => {};
      clearCollaborativeEditorRemoteCursors(editorRef.current);
      decorationsRef.current = editorRef.current?.deltaDecorations(
        decorationsRef.current,
        [],
      ) ?? [];
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
    bindCollaborativeEditorMonacoToYText(
      editorRef.current,
      session,
      bindingRef,
    );
    paintRemoteRef.current();
  }, [session]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    applyCollaborativeEditorMonacoTheme(monaco, editorTheme);
  }, [editorTheme]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    bindCollaborativeEditorMonacoToYText(
      editor,
      sessionRef.current,
      bindingRef,
    );

    const mode = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    applyCollaborativeEditorMonacoTheme(monaco, mode);
    ensureCollaborativeEditorRemoteCursorStyles();
    paintRemoteRef.current();

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
  const language = collaborativeEditorLanguageForFileName(fileName);
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
            <p className="text-xs text-muted-foreground">
              Read-only for your role
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <CollaborativeEditorPresence
            presence={presence}
            localUserId={localUserId}
          />
          <div className="status-pill" aria-live="polite">
            <span className={cn("status-dot", dotClass)} />
            <span className="capitalize">{status}</span>
          </div>
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
    </div>
  );
}
