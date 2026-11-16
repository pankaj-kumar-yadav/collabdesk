import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type { WebSocket } from "ws";
import { canWrite, colorForUserId, WS_CONTROL } from "@collabdesk/shared";
import type { Role } from "@prisma/client";
import { env } from "@/env";
import { prisma } from "@/db";
import { logActivity, logError } from "@/logging";
import {
  loadDocument,
  maybeSnapshot,
  persistUpdate,
} from "@/yjs/persistence";

const messageSync = 0;
const messageAwareness = 1;
const messageControl = 2;

export type RoomClient = {
  ws: WebSocket;
  userId: string;
  name: string;
  email: string;
  role: Role;
  awarenessThrottleUntil: number;
  controlledAwarenessIds: Set<number>;
};

type Room = {
  fileId: string;
  workspaceId: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<RoomClient>;
  nextSeq: number;
  updatesSinceSnapshot: number;
  lastSnapshotAt: number;
  persistQueue: Promise<void>;
  closed: boolean;
};

const rooms = new Map<string, Room>();
const roomDestroyTimers = new Map<string, ReturnType<typeof setTimeout>>();

function send(ws: WebSocket, encoder: encoding.Encoder) {
  if (ws.readyState === ws.OPEN) {
    ws.send(encoding.toUint8Array(encoder));
  }
}

function sendControl(ws: WebSocket, payload: Record<string, unknown>) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageControl);
  encoding.writeVarString(encoder, JSON.stringify(payload));
  send(ws, encoder);
}

export function broadcastControl(
  fileId: string,
  payload: Record<string, unknown>,
  except?: WebSocket,
) {
  const room = rooms.get(fileId);
  if (!room) return;
  for (const client of room.clients) {
    if (except && client.ws === except) continue;
    sendControl(client.ws, payload);
  }
}

export function broadcastWorkspaceControl(
  workspaceId: string,
  payload: Record<string, unknown>,
) {
  for (const room of rooms.values()) {
    if (room.workspaceId !== workspaceId) continue;
    for (const client of room.clients) {
      sendControl(client.ws, payload);
    }
  }
}

export async function getOrCreateRoom(fileId: string, workspaceId: string): Promise<Room> {
  const existing = rooms.get(fileId);
  if (existing && !existing.closed) {
    const pending = roomDestroyTimers.get(fileId);
    if (pending) {
      clearTimeout(pending);
      roomDestroyTimers.delete(fileId);
    }
    return existing;
  }

  const loaded = await loadDocument(fileId);
  const awareness = new awarenessProtocol.Awareness(loaded.doc);
  const room: Room = {
    fileId,
    workspaceId,
    doc: loaded.doc,
    awareness,
    clients: new Set(),
    nextSeq: loaded.nextSeq,
    updatesSinceSnapshot: loaded.updatesSinceSnapshot,
    lastSnapshotAt: Date.now(),
    persistQueue: Promise.resolve(),
    closed: false,
  };

  loaded.doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin === "load" || origin === "restore") return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    for (const client of room.clients) {
      if (origin !== client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
      }
    }

    const seq = room.nextSeq;
    room.nextSeq += 1;
    room.updatesSinceSnapshot += 1;

    room.persistQueue = room.persistQueue
      .then(async () => {
        await persistUpdate(fileId, seq, update);
        const snap = await maybeSnapshot(
          fileId,
          room.doc,
          seq,
          room.updatesSinceSnapshot,
          room.lastSnapshotAt,
        );
        room.updatesSinceSnapshot = snap.updatesSinceSnapshot;
        room.lastSnapshotAt = snap.lastSnapshotAt;
        for (const client of room.clients) {
          sendControl(client.ws, { type: WS_CONTROL.SAVED, seq });
        }
      })
      .catch(async (error) => {
        console.error("Persist failure", error);
        await logError({
          fileId,
          workspaceId,
          code: "persist_failed",
          message: error instanceof Error ? error.message : "Persist failed",
        });
      });
  });

  awareness.on(
    "update",
    (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const changed = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
      );
      const message = encoding.toUint8Array(encoder);
      for (const client of room.clients) {
        if (origin !== client && client.ws.readyState === client.ws.OPEN) {
          client.ws.send(message);
        }
      }
    },
  );

  rooms.set(fileId, room);
  return room;
}

export async function refreshClientRole(fileId: string, userId: string) {
  const room = rooms.get(fileId);
  if (!room) return;
  await refreshClientRoleInWorkspace(room.workspaceId, userId);
}

export async function refreshClientRoleInWorkspace(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  for (const room of rooms.values()) {
    if (room.workspaceId !== workspaceId) continue;
    for (const client of [...room.clients]) {
      if (client.userId !== userId) continue;
      if (!membership) {
        sendControl(client.ws, {
          type: WS_CONTROL.ERROR,
          code: "access_revoked",
          message: "Access revoked",
        });
        client.ws.close(4003, "Access revoked");
        continue;
      }
      client.role = membership.role;
      sendControl(client.ws, {
        type: WS_CONTROL.ROLE_CHANGED,
        role: membership.role,
        canWrite: canWrite(membership.role),
      });
    }
  }
}

export async function replaceRoomDocFromState(fileId: string) {
  const room = rooms.get(fileId);
  if (!room) return;
  for (const client of [...room.clients]) {
    sendControl(client.ws, {
      type: WS_CONTROL.FILE_CHANGED,
      reason: "restored",
    });
    client.ws.close(4010, "Document restored");
  }
  room.closed = true;
  rooms.delete(fileId);
  room.doc.destroy();
}

function peekSyncMessageType(data: Uint8Array): number | null {
  try {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);
    if (messageType !== messageSync) return null;
    return decoding.readVarUint(decoder);
  } catch {
    return null;
  }
}

export async function attachClient(opts: {
  fileId: string;
  workspaceId: string;
  ws: WebSocket;
  userId: string;
  name: string;
  email: string;
  role: Role;
}) {
  const room = await getOrCreateRoom(opts.fileId, opts.workspaceId);
  const client: RoomClient = {
    ws: opts.ws,
    userId: opts.userId,
    name: opts.name,
    email: opts.email,
    role: opts.role,
    awarenessThrottleUntil: 0,
    controlledAwarenessIds: new Set(),
  };
  room.clients.add(client);

  // Keep WS handling synchronous on the hot path. Role changes are pushed via
  // refreshClientRoleInWorkspace; periodic re-check catches revoked membership.
  const membershipTimer = setInterval(() => {
    void prisma.workspaceMember
      .findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: room.workspaceId,
            userId: client.userId,
          },
        },
      })
      .then((membership) => {
        if (!membership) {
          sendControl(opts.ws, {
            type: WS_CONTROL.ERROR,
            code: "access_revoked",
            message: "Access revoked",
          });
          opts.ws.close(4003, "Access revoked");
          return;
        }
        if (membership.role !== client.role) {
          client.role = membership.role;
          sendControl(opts.ws, {
            type: WS_CONTROL.ROLE_CHANGED,
            role: membership.role,
            canWrite: canWrite(membership.role),
          });
        }
      })
      .catch(() => undefined);
  }, 5_000);

  opts.ws.on("message", (raw) => {
    try {
      const data =
        raw instanceof Buffer ? new Uint8Array(raw) : new Uint8Array(raw as ArrayBuffer);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        const syncType = peekSyncMessageType(data);
        if (
          syncType === syncProtocol.messageYjsUpdate &&
          !canWrite(client.role)
        ) {
          sendControl(opts.ws, {
            type: WS_CONTROL.ERROR,
            code: "write_forbidden",
            message: "Viewer cannot edit",
          });
          return;
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, client);
        if (encoding.length(encoder) > 1) send(opts.ws, encoder);
        return;
      }

      if (messageType === messageAwareness) {
        const now = Date.now();
        const update = decoding.readVarUint8Array(decoder);
        // Coalesce: skip applying ultra-high-frequency duplicates within throttle window
        // only when there is no selection payload change urgency — always apply for correctness.
        void now;
        void client.awarenessThrottleUntil;
        client.awarenessThrottleUntil = now + env.PRESENCE_THROTTLE_MS;

        const before = new Set(room.awareness.getStates().keys());
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, client);

        // Bind newly seen awareness clientIDs to this authenticated socket.
        for (const clientId of room.awareness.getStates().keys()) {
          if (!before.has(clientId) || client.controlledAwarenessIds.has(clientId)) {
            client.controlledAwarenessIds.add(clientId);
          }
        }
        // Reject forged presence identities (cannot claim another user id).
        for (const clientId of [...client.controlledAwarenessIds]) {
          const state = room.awareness.getStates().get(clientId) as
            | { user?: { id?: string } }
            | undefined;
          if (state?.user?.id && state.user.id !== client.userId) {
            awarenessProtocol.removeAwarenessStates(
              room.awareness,
              [clientId],
              "impersonation",
            );
            client.controlledAwarenessIds.delete(clientId);
            sendControl(opts.ws, {
              type: WS_CONTROL.ERROR,
              code: "presence_impersonation",
              message: "Presence identity is server-enforced",
            });
          }
        }
      }
    } catch (error) {
      void logError({
        userId: client.userId,
        workspaceId: room.workspaceId,
        fileId: room.fileId,
        code: "ws_message_error",
        message: error instanceof Error ? error.message : "WS message error",
      });
    }
  });

  const close = () => {
    clearInterval(membershipTimer);
    if (room.closed) return;
    room.clients.delete(client);
    try {
      if (client.controlledAwarenessIds.size > 0) {
        awarenessProtocol.removeAwarenessStates(
          room.awareness,
          [...client.controlledAwarenessIds],
          "client-close",
        );
      }
    } catch {
      // Room may already be tearing down.
    }
    void logActivity({
      userId: client.userId,
      workspaceId: room.workspaceId,
      fileId: room.fileId,
      type: "ws_leave",
      message: `${client.name} left file room`,
    });
    if (room.clients.size === 0) {
      const fileId = room.fileId;
      const timer = setTimeout(() => {
        roomDestroyTimers.delete(fileId);
        if (room.clients.size === 0 && !room.closed) {
          room.closed = true;
          rooms.delete(fileId);
          try {
            room.awareness.destroy();
          } catch {
            /* ignore */
          }
          room.doc.destroy();
        }
      }, 10_000);
      roomDestroyTimers.set(fileId, timer);
    }
  };

  opts.ws.on("close", close);
  opts.ws.on("error", close);

  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    send(opts.ws, encoder);
  }

  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    send(opts.ws, encoder);
  }

  sendControl(opts.ws, {
    type: "hello",
    role: opts.role,
    canWrite: canWrite(opts.role),
    user: {
      id: opts.userId,
      name: opts.name,
      color: colorForUserId(opts.userId),
    },
  });

  void logActivity({
    userId: opts.userId,
    workspaceId: opts.workspaceId,
    fileId: opts.fileId,
    type: "ws_join",
    message: `${opts.name} joined file room`,
  });
}

export function getRoomStats() {
  return [...rooms.entries()].map(([fileId, room]) => ({
    fileId,
    clients: room.clients.size,
    nextSeq: room.nextSeq,
  }));
}

export async function closeAllRooms() {
  for (const timer of roomDestroyTimers.values()) clearTimeout(timer);
  roomDestroyTimers.clear();
  const snapshot = [...rooms.values()];
  for (const room of snapshot) {
    room.closed = true;
  }
  const pending = snapshot.map((room) => room.persistQueue.catch(() => undefined));
  for (const room of snapshot) {
    for (const client of [...room.clients]) {
      try {
        client.ws.close(1001, "Server shutting down");
      } catch {
        /* ignore */
      }
    }
    room.clients.clear();
  }
  await Promise.all(pending);
  for (const room of snapshot) {
    try {
      room.awareness.destroy();
    } catch {
      /* ignore */
    }
    try {
      room.doc.destroy();
    } catch {
      /* ignore */
    }
  }
  rooms.clear();
}
