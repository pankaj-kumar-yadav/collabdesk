import { z } from "zod";

export const ROLES = ["owner", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

export function canWrite(role: Role): boolean {
  return role === "owner" || role === "editor";
}

export function canManageMembers(role: Role): boolean {
  return role === "owner";
}

export function canManageFiles(role: Role): boolean {
  return role === "owner" || role === "editor";
}

export const USER_COLORS = [
  "#E4572E",
  "#29335C",
  "#F3A712",
  "#A8C256",
  "#669BBC",
  "#C1666B",
  "#48A9A6",
  "#D4A373",
] as const;

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length]!;
}

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export const createFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[\w.\- ]+$/, "Invalid file name"),
});

export const renameFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[\w.\- ]+$/, "Invalid file name"),
});

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "syncing"
  | "saved"
  | "offline"
  | "unauthorized";

export const WS_CONTROL = {
  ROLE_CHANGED: "role_changed",
  FILE_CHANGED: "file_changed",
  FILE_DELETED: "file_deleted",
  ERROR: "error",
  SAVED: "saved",
} as const;
