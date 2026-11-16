import type { Role } from "@collabdesk/shared";

export type WorkspaceRow = {
  id: string;
  name: string;
  role: Role;
  memberCount: number;
  fileCount: number;
};

export type Member = {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
};

export type FileRow = {
  id: string;
  name: string;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  myRole: Role;
  members: Member[];
  files: FileRow[];
};

export type Snapshot = { id: string; version: number; createdAt: string };

export type InviteRole = Extract<Role, "editor" | "viewer">;
