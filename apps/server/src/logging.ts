import type { Prisma } from "@prisma/client";
import { prisma } from "@/db";

export async function logActivity(input: {
  userId?: string | null;
  workspaceId?: string | null;
  fileId?: string | null;
  type: string;
  message: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        fileId: input.fileId ?? null,
        type: input.type,
        message: input.message,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}

export async function logError(input: {
  userId?: string | null;
  workspaceId?: string | null;
  fileId?: string | null;
  code: string;
  message: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.errorEvent.create({
      data: {
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        fileId: input.fileId ?? null,
        code: input.code,
        message: input.message,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log error event", error);
  }
}
