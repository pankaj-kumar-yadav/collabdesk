import type { Role } from "@prisma/client";
import { canManageFiles, canManageMembers, canWrite } from "@collabdesk/shared";
import { prisma } from "./db.js";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function requireMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  if (!membership) {
    throw new HttpError(403, "Not a workspace member");
  }
  return membership;
}

export async function requireWriteAccess(workspaceId: string, userId: string) {
  const membership = await requireMembership(workspaceId, userId);
  if (!canWrite(membership.role)) {
    throw new HttpError(403, "Viewer cannot modify content");
  }
  return membership;
}

export async function requireManageMembers(workspaceId: string, userId: string) {
  const membership = await requireMembership(workspaceId, userId);
  if (!canManageMembers(membership.role)) {
    throw new HttpError(403, "Only owners can manage members");
  }
  return membership;
}

export async function requireFileAccess(fileId: string, userId: string) {
  const file = await prisma.documentFile.findFirst({
    where: { id: fileId, deletedAt: null },
  });
  if (!file) {
    throw new HttpError(404, "File not found");
  }
  const membership = await requireMembership(file.workspaceId, userId);
  return { file, membership };
}

export async function requireFileWriteAccess(fileId: string, userId: string) {
  const { file, membership } = await requireFileAccess(fileId, userId);
  if (!canWrite(membership.role)) {
    throw new HttpError(403, "Viewer cannot modify content");
  }
  if (!canManageFiles(membership.role)) {
    throw new HttpError(403, "Insufficient permissions for file operations");
  }
  return { file, membership };
}

export function assertRole(role: Role): Role {
  return role;
}
