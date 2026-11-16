import type * as Monaco from "monaco-editor";
import type { Awareness } from "y-protocols/awareness";

const REMOTE_CURSOR_NAME_MAX = 16;

type RemoteCursorWidgetEntry = {
  widget: Monaco.editor.IContentWidget;
  root: HTMLDivElement;
  caret: HTMLDivElement;
  label: HTMLDivElement;
  lineNumber: number;
  column: number;
};

const widgetsByEditor = new WeakMap<
  Monaco.editor.IStandaloneCodeEditor,
  Map<number, RemoteCursorWidgetEntry>
>();

function truncateRemoteCursorName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= REMOTE_CURSOR_NAME_MAX) return trimmed;
  return `${trimmed.slice(0, REMOTE_CURSOR_NAME_MAX - 1)}…`;
}

export function ensureCollaborativeEditorRemoteCursorStyles() {
  const styleId = "collabdesk-remote-style";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    .remote-selection { background: rgba(61, 156, 240, 0.25); }
    .remote-cursor-root {
      display: flex;
      align-items: center;
      gap: 3px;
      pointer-events: none;
      z-index: 10;
      transform: translate(-1px, -1px);
    }
    .remote-cursor-caret {
      width: 2px;
      height: 1.2em;
      border-radius: 1px;
      flex-shrink: 0;
    }
    .remote-cursor-name {
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      padding: 1px 5px;
      border-radius: 3px;
      color: #fff;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }
  `;
}

type PaintCollaborativeEditorRemoteCursorsProps = {
  editor: Monaco.editor.IStandaloneCodeEditor;
  monaco: typeof Monaco;
  awareness: Awareness;
  localClientId: number;
  decorationsRef: { current: string[] };
};

export function clearCollaborativeEditorRemoteCursors(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
) {
  if (!editor) return;
  const widgets = widgetsByEditor.get(editor);
  if (!widgets) return;
  for (const entry of widgets.values()) {
    editor.removeContentWidget(entry.widget);
  }
  widgets.clear();
}

export function paintCollaborativeEditorRemoteCursors(
  props: PaintCollaborativeEditorRemoteCursorsProps,
) {
  const { editor, monaco, awareness, localClientId, decorationsRef } = props;
  const model = editor.getModel();
  if (!model) return;

  ensureCollaborativeEditorRemoteCursorStyles();

  let widgets = widgetsByEditor.get(editor);
  if (!widgets) {
    widgets = new Map();
    widgetsByEditor.set(editor, widgets);
  }

  const decs: Monaco.editor.IModelDeltaDecoration[] = [];
  const activeClients = new Set<number>();

  awareness.getStates().forEach((state, clientId) => {
    if (clientId === localClientId) return;
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

    activeClients.add(clientId);

    const isCursor =
      sel.startLineNumber === sel.endLineNumber &&
      sel.startColumn === sel.endColumn;

    if (!isCursor) {
      decs.push({
        range: new monaco.Range(
          sel.startLineNumber,
          sel.startColumn,
          sel.endLineNumber,
          sel.endColumn,
        ),
        options: {
          className: "remote-selection",
          inlineClassName: "remote-selection",
          overviewRuler: {
            color: user.color,
            position: monaco.editor.OverviewRulerLane.Full,
          },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    } else {
      decs.push({
        range: new monaco.Range(
          sel.endLineNumber,
          sel.endColumn,
          sel.endLineNumber,
          sel.endColumn,
        ),
        options: {
          overviewRuler: {
            color: user.color,
            position: monaco.editor.OverviewRulerLane.Full,
          },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    let entry = widgets.get(clientId);
    if (!entry) {
      const root = document.createElement("div");
      root.className = "remote-cursor-root";
      const caret = document.createElement("div");
      caret.className = "remote-cursor-caret";
      const label = document.createElement("div");
      label.className = "remote-cursor-name";
      root.append(caret, label);

      const created: RemoteCursorWidgetEntry = {
        root,
        caret,
        label,
        lineNumber: sel.endLineNumber,
        column: sel.endColumn,
        widget: {
          getId: () => `collabdesk-remote-cursor-${clientId}`,
          getDomNode: () => root,
          getPosition: () => ({
            position: {
              lineNumber: created.lineNumber,
              column: created.column,
            },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
          }),
        },
      };
      entry = created;
      widgets.set(clientId, entry);
      editor.addContentWidget(entry.widget);
    }

    entry.lineNumber = sel.endLineNumber;
    entry.column = sel.endColumn;
    entry.caret.style.backgroundColor = user.color;
    entry.label.textContent = truncateRemoteCursorName(user.name);
    entry.label.style.backgroundColor = user.color;
    editor.layoutContentWidget(entry.widget);
  });

  for (const [clientId, entry] of widgets) {
    if (activeClients.has(clientId)) continue;
    editor.removeContentWidget(entry.widget);
    widgets.delete(clientId);
  }

  decorationsRef.current = editor.deltaDecorations(
    decorationsRef.current,
    decs,
  );
}
