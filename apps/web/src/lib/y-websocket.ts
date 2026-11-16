import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { Observable } from "lib0/observable";
import type { ConnectionStatus } from "@collabdesk/shared";

const messageSync = 0;
const messageAwareness = 1;
const messageControl = 2;

export type ControlMessage = {
  type: string;
  [key: string]: unknown;
};

export class CollabWebsocketProvider extends Observable<string> {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  url: string;
  private ws: WebSocket | null = null;
  private shouldConnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  synced = false;
  status: ConnectionStatus = "connecting";
  canWrite = true;
  serverUser: { id: string; name: string; color: string } | null = null;

  constructor(url: string, doc: Y.Doc) {
    super();
    this.url = url;
    this.doc = doc;
    this.awareness = new awarenessProtocol.Awareness(doc);

    this.doc.on("update", this.onDocUpdate);
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnload);
    }
    this.connect();
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.emit("status", [status]);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.canWrite) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    this.ws.send(encoding.toUint8Array(encoder));
    this.setStatus("syncing");
  };

  private beforeUnload = () => {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "window unload",
    );
  };

  private awarenessFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingAwarenessIds: Set<number> = new Set();

  private onAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (const id of added.concat(updated, removed)) this.pendingAwarenessIds.add(id);
    if (this.awarenessFlushTimer) return;
    this.awarenessFlushTimer = setTimeout(() => {
      this.awarenessFlushTimer = null;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const changed = [...this.pendingAwarenessIds];
      this.pendingAwarenessIds.clear();
      if (changed.length === 0) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
      );
      this.ws.send(encoding.toUint8Array(encoder));
    }, 75);
  };

  connect() {
    if (!this.shouldConnect || this.ws) return;
    this.setStatus("connecting");
    const ws = new WebSocket(this.url);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus("connected");
      this.awareness.on("update", this.onAwarenessUpdate);
      // Request server state so we receive SyncStep2 and become synced.
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      ws.send(encoding.toUint8Array(encoder));
    };

    ws.onclose = () => {
      this.synced = false;
      // Broadcast leave while the socket may still flush, then detach.
      this.broadcastAwarenessLeave("connection closed");
      this.awareness.off("update", this.onAwarenessUpdate);
      this.ws = null;
      this.setStatus("offline");
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 800);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        const syncMessageType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          this.doc,
          this,
        );
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
        if (
          syncMessageType === syncProtocol.messageYjsSyncStep2 &&
          !this.synced
        ) {
          this.synced = true;
          this.setStatus("saved");
          this.emit("synced", [true]);
        }
      } else if (messageType === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this,
        );
      } else if (messageType === messageControl) {
        const payload = JSON.parse(decoding.readVarString(decoder)) as ControlMessage;
        if (payload.type === "hello") {
          this.canWrite = Boolean(payload.canWrite);
          this.serverUser = payload.user as {
            id: string;
            name: string;
            color: string;
          };
          this.awareness.setLocalStateField("user", this.serverUser);
          // Ensure sync step 1 after server is ready.
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeSyncStep1(encoder, this.doc);
          ws.send(encoding.toUint8Array(encoder));
          this.emit("hello", [payload]);
        } else if (payload.type === "role_changed") {
          this.canWrite = Boolean(payload.canWrite);
          this.emit("role", [payload]);
        } else if (payload.type === "saved") {
          this.setStatus("saved");
        } else if (payload.type === "error") {
          if (payload.code === "access_revoked" || payload.code === "write_forbidden") {
            this.setStatus("unauthorized");
          }
          this.emit("control-error", [payload]);
        } else {
          this.emit("control", [payload]);
        }
      }
    };
  }

  private broadcastAwarenessLeave(reason: string) {
    const clientId = this.doc.clientID;
    const ws = this.ws;
    // Keep the update listener long enough to flush a null-state leave to the server.
    awarenessProtocol.removeAwarenessStates(this.awareness, [clientId], reason);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [clientId]),
      );
      ws.send(encoding.toUint8Array(encoder));
    } catch {
      // Best-effort leave; server also clears on socket close.
    }
  }

  destroy() {
    this.shouldConnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.awarenessFlushTimer) clearTimeout(this.awarenessFlushTimer);
    this.doc.off("update", this.onDocUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnload);
    }
    this.broadcastAwarenessLeave("provider destroy");
    this.awareness.off("update", this.onAwarenessUpdate);
    this.ws?.close();
    this.ws = null;
    this.awareness.destroy();
  }
}
