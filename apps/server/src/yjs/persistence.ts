import * as Y from "yjs";
import { prisma } from "../db.js";
import { env } from "../env.js";

export async function loadDocument(fileId: string): Promise<{
  doc: Y.Doc;
  nextSeq: number;
  updatesSinceSnapshot: number;
}> {
  const doc = new Y.Doc();
  const latestSnapshot = await prisma.docSnapshot.findFirst({
    where: { fileId },
    orderBy: { version: "desc" },
  });

  let fromSeq = 0;
  if (latestSnapshot) {
    Y.applyUpdate(doc, new Uint8Array(latestSnapshot.state));
    fromSeq = latestSnapshot.version;
  }

  const updates = await prisma.yjsUpdate.findMany({
    where: { fileId, seq: { gt: fromSeq } },
    orderBy: { seq: "asc" },
  });

  for (const row of updates) {
    Y.applyUpdate(doc, new Uint8Array(row.update));
  }

  const lastUpdate = await prisma.yjsUpdate.findFirst({
    where: { fileId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });

  return {
    doc,
    nextSeq: (lastUpdate?.seq ?? 0) + 1,
    updatesSinceSnapshot: updates.length,
  };
}

export async function persistUpdate(
  fileId: string,
  seq: number,
  update: Uint8Array,
): Promise<void> {
  await prisma.yjsUpdate.create({
    data: {
      fileId,
      seq,
      update: Buffer.from(update),
    },
  });
}

export async function maybeSnapshot(
  fileId: string,
  doc: Y.Doc,
  currentSeq: number,
  updatesSinceSnapshot: number,
  lastSnapshotAt: number,
): Promise<{ snapped: boolean; updatesSinceSnapshot: number; lastSnapshotAt: number }> {
  const dueByCount = updatesSinceSnapshot >= env.YJS_SNAPSHOT_EVERY_UPDATES;
  const dueByTime = Date.now() - lastSnapshotAt >= env.YJS_SNAPSHOT_EVERY_MS;
  if (!dueByCount && !dueByTime) {
    return { snapped: false, updatesSinceSnapshot, lastSnapshotAt };
  }

  const state = Y.encodeStateAsUpdate(doc);
  await prisma.docSnapshot.create({
    data: {
      fileId,
      version: currentSeq,
      state: Buffer.from(state),
    },
  });

  // Keep a restore window of trailing updates; prune older ones past last snapshot - 200.
  const pruneBefore = Math.max(0, currentSeq - 200);
  if (pruneBefore > 0) {
    await prisma.yjsUpdate.deleteMany({
      where: { fileId, seq: { lt: pruneBefore } },
    });
  }

  return {
    snapped: true,
    updatesSinceSnapshot: 0,
    lastSnapshotAt: Date.now(),
  };
}

export async function listSnapshots(fileId: string) {
  return prisma.docSnapshot.findMany({
    where: { fileId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      createdAt: true,
    },
  });
}

export async function restoreSnapshot(fileId: string, snapshotId: string) {
  const snapshot = await prisma.docSnapshot.findFirst({
    where: { id: snapshotId, fileId },
  });
  if (!snapshot) return null;

  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(snapshot.state));
  const state = Y.encodeStateAsUpdate(doc);

  const lastUpdate = await prisma.yjsUpdate.findFirst({
    where: { fileId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  const nextSeq = (lastUpdate?.seq ?? 0) + 1;

  // Append a restore update as a new durable revision so history remains append-only.
  await prisma.yjsUpdate.create({
    data: {
      fileId,
      seq: nextSeq,
      update: Buffer.from(state),
    },
  });

  await prisma.docSnapshot.create({
    data: {
      fileId,
      version: nextSeq,
      state: Buffer.from(state),
    },
  });

  return { version: nextSeq, state };
}
