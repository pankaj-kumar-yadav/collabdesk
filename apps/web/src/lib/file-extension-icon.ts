import type { LucideIcon } from "lucide-react";
import {
  Braces,
  File,
  FileCode2,
  FileJson,
  FileText,
  FileType,
  Image,
} from "lucide-react";

type FileExtensionIconMeta = {
  Icon: LucideIcon;
  className: string;
};

const FILE_ICON_BY_EXT = {
  ts: { Icon: FileCode2, className: "text-sky-400" },
  tsx: { Icon: FileCode2, className: "text-sky-400" },
  js: { Icon: FileCode2, className: "text-amber-400" },
  jsx: { Icon: FileCode2, className: "text-amber-400" },
  mjs: { Icon: FileCode2, className: "text-amber-400" },
  cjs: { Icon: FileCode2, className: "text-amber-400" },
  py: { Icon: FileCode2, className: "text-yellow-300" },
  go: { Icon: FileCode2, className: "text-cyan-400" },
  rs: { Icon: FileCode2, className: "text-orange-400" },
  java: { Icon: FileCode2, className: "text-red-400" },
  kt: { Icon: FileCode2, className: "text-violet-400" },
  c: { Icon: FileCode2, className: "text-blue-400" },
  h: { Icon: FileCode2, className: "text-blue-400" },
  cpp: { Icon: FileCode2, className: "text-blue-500" },
  cc: { Icon: FileCode2, className: "text-blue-500" },
  hpp: { Icon: FileCode2, className: "text-blue-500" },
  cs: { Icon: FileCode2, className: "text-emerald-400" },
  php: { Icon: FileCode2, className: "text-indigo-400" },
  rb: { Icon: FileCode2, className: "text-rose-400" },
  swift: { Icon: FileCode2, className: "text-orange-300" },
  vue: { Icon: FileCode2, className: "text-emerald-400" },
  svelte: { Icon: FileCode2, className: "text-orange-500" },
  css: { Icon: FileType, className: "text-pink-400" },
  scss: { Icon: FileType, className: "text-pink-400" },
  sass: { Icon: FileType, className: "text-pink-400" },
  less: { Icon: FileType, className: "text-pink-400" },
  html: { Icon: FileType, className: "text-orange-400" },
  htm: { Icon: FileType, className: "text-orange-400" },
  xml: { Icon: FileType, className: "text-orange-300" },
  svg: { Icon: Image, className: "text-fuchsia-400" },
  png: { Icon: Image, className: "text-fuchsia-400" },
  jpg: { Icon: Image, className: "text-fuchsia-400" },
  jpeg: { Icon: Image, className: "text-fuchsia-400" },
  gif: { Icon: Image, className: "text-fuchsia-400" },
  webp: { Icon: Image, className: "text-fuchsia-400" },
  json: { Icon: FileJson, className: "text-lime-400" },
  jsonc: { Icon: FileJson, className: "text-lime-400" },
  md: { Icon: FileText, className: "text-zinc-300" },
  mdx: { Icon: FileText, className: "text-zinc-300" },
  txt: { Icon: FileText, className: "text-zinc-400" },
  yaml: { Icon: Braces, className: "text-teal-400" },
  yml: { Icon: Braces, className: "text-teal-400" },
  toml: { Icon: Braces, className: "text-teal-400" },
  env: { Icon: Braces, className: "text-teal-300" },
} as const satisfies Record<string, FileExtensionIconMeta>;

const DEFAULT_FILE_ICON: FileExtensionIconMeta = {
  Icon: File,
  className: "text-muted-foreground",
};

export function fileExtensionIcon(fileName: string): FileExtensionIconMeta {
  const ext = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext in FILE_ICON_BY_EXT) {
    return FILE_ICON_BY_EXT[ext as keyof typeof FILE_ICON_BY_EXT];
  }
  return DEFAULT_FILE_ICON;
}
