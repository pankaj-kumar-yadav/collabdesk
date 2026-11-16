import type * as Monaco from "monaco-editor";
import type { Awareness } from "y-protocols/awareness";
import { cn } from "@/lib/utils";

const REMOTE_CURSOR_NAME_MAX = 16;
const remoteCursorColorClasses = new Set<string>();

function truncateRemoteCursorName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= REMOTE_CURSOR_NAME_MAX) return trimmed;
  return `${trimmed.slice(0, REMOTE_CURSOR_NAME_MAX - 1)}…`;
}

function ensureRemoteCursorColorClass(color: string) {
  const key = color.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "default";
  const className = `remote-cursor-color-${key}`;
  if (remoteCursorColorClasses.has(className)) return className;

  const style = document.createElement("style");
  style.textContent = `
    .${className} {
      color: ${color} !important;
      background: color-mix(in srgb, ${color} 30%, transparent) !important;
    }
  `;
  document.head.appendChild(style);
  remoteCursorColorClasses.add(className);
  return className;
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
    .remote-cursor-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.01em;
      margin-left: -0.3ch;
      padding: 0 0.4em;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
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

export function paintCollaborativeEditorRemoteCursors(
  props: PaintCollaborativeEditorRemoteCursorsProps,
) {
  const { editor, monaco, awareness, localClientId, decorationsRef } = props;
  const model = editor.getModel();
  if (!model) return;

  ensureCollaborativeEditorRemoteCursorStyles();

  const decs: Monaco.editor.IModelDeltaDecoration[] = [];

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

    const isCursor =
      sel.startLineNumber === sel.endLineNumber &&
      sel.startColumn === sel.endColumn;
    const colorClass = ensureRemoteCursorColorClass(user.color);
    const label = truncateRemoteCursorName(user.name);

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
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    // Caret + name stay on the same editor line (no floating ABOVE widget).
    decs.push({
      range: new monaco.Range(
        sel.endLineNumber,
        sel.endColumn,
        sel.endLineNumber,
        sel.endColumn + 1,
      ),
      options: {
        after: {
          content: `▋ ${label}`,
          inlineClassName: cn("remote-cursor-label", colorClass),
        },
        overviewRuler: {
          color: user.color,
          position: monaco.editor.OverviewRulerLane.Full,
        },
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    });
  });

  decorationsRef.current = editor.deltaDecorations(
    decorationsRef.current,
    decs,
  );
}
