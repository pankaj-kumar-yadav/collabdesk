import type { FastifyInstance } from "fastify";
import {
  createFileSchema,
  createWorkspaceSchema,
  inviteSchema,
  renameFileSchema,
  updateMemberRoleSchema,
  WS_CONTROL,
} from "@collabdesk/shared";
import { randomBytes } from "node:crypto";
import { prisma } from "../db.js";
import { logActivity, logError } from "../logging.js";
import {
  HttpError,
  requireFileAccess,
  requireFileWriteAccess,
  requireManageMembers,
  requireMembership,
  requireWriteAccess,
} from "../permissions.js";
import {
  broadcastControl,
  broadcastWorkspaceControl,
  refreshClientRoleInWorkspace,
  replaceRoomDocFromState,
} from "../yjs/rooms.js";
import { listSnapshots, restoreSnapshot } from "../yjs/persistence.js";

function handleError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }
  console.error(error);
  return reply.status(500).send({ error: "Internal server error" });
}

export async function workspaceRoutes(app: FastifyInstance) {
  app.post("/workspaces", async (request, reply) => {
    try {
      const user = request.user!;
      const body = createWorkspaceSchema.parse(request.body);
      const workspace = await prisma.workspace.create({
        data: {
          name: body.name,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });
      await logActivity({
        userId: user.id,
        workspaceId: workspace.id,
        type: "workspace_created",
        message: `Created workspace ${workspace.name}`,
      });
      return workspace;
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/workspaces", async (request, reply) => {
    try {
      const user = request.user!;
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
          workspace: {
            include: {
              _count: { select: { members: true, files: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
        memberCount: m.workspace._count.members,
        fileCount: m.workspace._count.files,
        createdAt: m.workspace.createdAt,
      }));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/workspaces/:workspaceId", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId } = request.params as { workspaceId: string };
      const membership = await requireMembership(workspaceId, user.id);
      const workspace = await prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          files: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
              createdById: true,
            },
          },
        },
      });
      return { ...workspace, myRole: membership.role };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/workspaces/:workspaceId/invitations", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId } = request.params as { workspaceId: string };
      await requireManageMembers(workspaceId, user.id);
      const body = inviteSchema.parse(request.body);
      const token = randomBytes(24).toString("hex");
      const invitation = await prisma.invitation.create({
        data: {
          workspaceId,
          email: body.email.toLowerCase(),
          role: body.role,
          token,
          invitedById: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await logActivity({
        userId: user.id,
        workspaceId,
        type: "invitation_created",
        message: `Invited ${body.email} as ${body.role}`,
      });
      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        acceptPath: `/invitations/${invitation.token}/accept`,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/invitations/:token/accept", async (request, reply) => {
    try {
      const user = request.user!;
      const { token } = request.params as { token: string };
      const invitation = await prisma.invitation.findUnique({ where: { token } });
      if (!invitation || invitation.acceptedAt) {
        throw new HttpError(400, "Invalid invitation");
      }
      if (invitation.expiresAt.getTime() < Date.now()) {
        throw new HttpError(400, "Invitation expired");
      }
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new HttpError(403, "Invitation email does not match signed-in user");
      }
      const member = await prisma.$transaction(async (tx) => {
        const existing = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: invitation.workspaceId,
              userId: user.id,
            },
          },
        });
        if (existing) return existing;
        const created = await tx.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
            role: invitation.role,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
        return created;
      });
      await logActivity({
        userId: user.id,
        workspaceId: invitation.workspaceId,
        type: "invitation_accepted",
        message: `${user.email} accepted invitation`,
      });
      return member;
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.patch("/workspaces/:workspaceId/members/:memberId", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };
      await requireManageMembers(workspaceId, user.id);
      const body = updateMemberRoleSchema.parse(request.body);
      const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });
      if (!member) throw new HttpError(404, "Member not found");
      if (member.role === "owner") {
        throw new HttpError(400, "Cannot change owner role");
      }
      const updated = await prisma.workspaceMember.update({
        where: { id: member.id },
        data: { role: body.role },
      });
      await refreshClientRoleInWorkspace(workspaceId, member.userId);
      await logActivity({
        userId: user.id,
        workspaceId,
        type: "role_changed",
        message: `Changed member ${member.userId} to ${body.role}`,
      });
      return updated;
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.delete("/workspaces/:workspaceId/members/:memberId", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };
      await requireManageMembers(workspaceId, user.id);
      const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });
      if (!member) throw new HttpError(404, "Member not found");
      if (member.role === "owner") {
        throw new HttpError(400, "Cannot remove owner");
      }
      await prisma.workspaceMember.delete({ where: { id: member.id } });
      await refreshClientRoleInWorkspace(workspaceId, member.userId);
      return { ok: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/workspaces/:workspaceId/files", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId } = request.params as { workspaceId: string };
      await requireWriteAccess(workspaceId, user.id);
      const body = createFileSchema.parse(request.body);
      const file = await prisma.documentFile.create({
        data: {
          workspaceId,
          name: body.name,
          createdById: user.id,
        },
      });
      broadcastWorkspaceControl(workspaceId, {
        type: WS_CONTROL.FILE_CHANGED,
        file: { id: file.id, name: file.name },
      });
      await logActivity({
        userId: user.id,
        workspaceId,
        fileId: file.id,
        type: "file_created",
        message: `Created file ${file.name}`,
      });
      return file;
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.patch("/files/:fileId", async (request, reply) => {
    try {
      const user = request.user!;
      const { fileId } = request.params as { fileId: string };
      const { file } = await requireFileWriteAccess(fileId, user.id);
      const body = renameFileSchema.parse(request.body);
      const updated = await prisma.documentFile.update({
        where: { id: file.id },
        data: { name: body.name },
      });
      broadcastControl(file.id, {
        type: WS_CONTROL.FILE_CHANGED,
        file: { id: updated.id, name: updated.name },
      });
      return updated;
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.delete("/files/:fileId", async (request, reply) => {
    try {
      const user = request.user!;
      const { fileId } = request.params as { fileId: string };
      const { file } = await requireFileWriteAccess(fileId, user.id);
      await prisma.documentFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });
      broadcastControl(file.id, {
        type: WS_CONTROL.FILE_DELETED,
        fileId: file.id,
      });
      return { ok: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/files/:fileId", async (request, reply) => {
    try {
      const user = request.user!;
      const { fileId } = request.params as { fileId: string };
      const { file, membership } = await requireFileAccess(fileId, user.id);
      return { ...file, myRole: membership.role };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/files/:fileId/history", async (request, reply) => {
    try {
      const user = request.user!;
      const { fileId } = request.params as { fileId: string };
      await requireFileAccess(fileId, user.id);
      const snapshots = await listSnapshots(fileId);
      return { snapshots };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/files/:fileId/history/:snapshotId/restore", async (request, reply) => {
    try {
      const user = request.user!;
      const { fileId, snapshotId } = request.params as {
        fileId: string;
        snapshotId: string;
      };
      await requireFileWriteAccess(fileId, user.id);
      const restored = await restoreSnapshot(fileId, snapshotId);
      if (!restored) throw new HttpError(404, "Snapshot not found");
      await replaceRoomDocFromState(fileId);
      await logActivity({
        userId: user.id,
        fileId,
        type: "snapshot_restored",
        message: `Restored snapshot ${snapshotId}`,
      });
      return { ok: true, version: restored.version };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/workspaces/:workspaceId/activity", async (request, reply) => {
    try {
      const user = request.user!;
      const { workspaceId } = request.params as { workspaceId: string };
      await requireMembership(workspaceId, user.id);
      const events = await prisma.activityEvent.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return { events };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/sessions/revoke", async (request, reply) => {
    try {
      const user = request.user!;
      const body = (request.body ?? {}) as { sessionToken?: string };
      if (body.sessionToken) {
        await prisma.session.deleteMany({
          where: { token: body.sessionToken, userId: user.id },
        });
      } else if (request.sessionToken) {
        await prisma.session.deleteMany({
          where: { token: request.sessionToken, userId: user.id },
        });
      } else {
        await prisma.session.deleteMany({ where: { userId: user.id } });
      }
      await logActivity({
        userId: user.id,
        type: "session_revoked",
        message: "Session revoked",
      });
      return { ok: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Test helper: expire current session immediately (for acceptance tests)
  app.post("/sessions/expire-current", async (request, reply) => {
    try {
      if (!request.sessionToken) {
        throw new HttpError(400, "No session token");
      }
      await prisma.session.updateMany({
        where: { token: request.sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      return { ok: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.setErrorHandler(async (error, request, reply) => {
    await logError({
      userId: request.user?.id,
      code: "request_error",
      message: error.message,
      meta: { url: request.url },
    });
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    return reply.status(500).send({ error: "Internal server error" });
  });
}
