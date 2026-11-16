"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { ConnectionStatus } from "@collabdesk/shared";
import { getToken, getWsUrl } from "@/lib/api";
import { CollabWebsocketProvider } from "@/lib/y-websocket";

type PresenceUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
};

export function CollaborativeEditor({
  fileId,
  fileName,
  readOnly,
  onReadOnlyChange,
}: {
  fileId: string;
  fileName: string;
  readOnly?: boolean;
  onReadOnlyChange?: (readOnly: boolean) => void;
}) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const { doc, yText, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const yText = doc.getText("monaco");
    const token = getToken();
    const url = `${getWsUrl()}?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token ?? "")}`;
    const provider = new CollabWebsocketProvider(url, doc);
    return { doc, yText, provider };
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

    const refreshPresence = () => {
      const users: PresenceUser[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { id: string; name: string; color: string } }).user;
        if (!user) return;
        users.push({ clientId, ...user });
      });
      setPresence(users);
      paintRemoteSelections();
    };

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

      // Inject dynamic color styles for selection backgrounds via CSS variables on decorations is limited;
      // use a shared translucent style and ruler color for identity.
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decs);
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

    monaco.editor.defineTheme("collabdesk", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0f1419",
      },
    });
    monaco.editor.setTheme("collabdesk");

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
  const language = fileName.endsWith(".ts") || fileName.endsWith(".tsx")
    ? "typescript"
    : fileName.endsWith(".js") || fileName.endsWith(".jsx")
      ? "javascript"
      : fileName.endsWith(".json")
        ? "json"
        : fileName.endsWith(".css")
          ? "css"
          : fileName.endsWith(".md")
            ? "markdown"
            : "plaintext";

  const dotClass =
    status === "saved" || status === "connected"
      ? "ok"
      : status === "offline" || status === "unauthorized"
        ? "bad"
        : "warn";

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <div>
          <strong>{fileName}</strong>
          {locked ? <span className="muted"> · read-only</span> : null}
        </div>
        <div className="status-pill">
          <span className={`status-dot ${dotClass}`} />
          {status}
        </div>
      </div>
      {error ? <p className="error" style={{ padding: "0 0.85rem" }}>{error}</p> : null}
      <div style={{ flex: 1, minHeight: 420 }}>
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
          }}
        />
      </div>
      <div className="presence" style={{ borderLeft: "none", borderTop: "1px solid var(--line)" }}>
        <strong>Connected</strong>
        <div style={{ marginTop: "0.75rem" }}>
          {presence.map((u) => (
            <div className="presence-row" key={`${u.clientId}-${u.id}`}>
              <span className="swatch" style={{ background: u.color }} />
              <span>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
