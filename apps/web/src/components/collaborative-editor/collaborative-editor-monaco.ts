import type * as Monaco from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import type { CollabWebsocketProvider } from "@/lib/y-websocket";
import type * as Y from "yjs";

const EDITOR_LANGUAGE_BY_EXT = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  md: "markdown",
} as const;

type CollaborativeEditorMonacoSession = {
  yText: Y.Text;
  provider: CollabWebsocketProvider;
};

export function applyCollaborativeEditorMonacoTheme(
  monaco: typeof Monaco,
  mode: "light" | "dark",
) {
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

export function collaborativeEditorLanguageForFileName(fileName: string) {
  const ext = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext in EDITOR_LANGUAGE_BY_EXT) {
    return EDITOR_LANGUAGE_BY_EXT[ext as keyof typeof EDITOR_LANGUAGE_BY_EXT];
  }
  return "plaintext";
}

export function bindCollaborativeEditorMonacoToYText(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  session: CollaborativeEditorMonacoSession | null,
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
