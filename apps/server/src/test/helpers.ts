import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import WebSocket from "ws";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { prisma } from "../db.js";
import { closeAllRooms } from "../yjs/rooms.js";

const messageSync = 0;
const messageAwareness = 1;

export async function startTestServer() {
  const app = await buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { app, baseUrl };
}

export async function stopTestServer(app: FastifyInstance) {
  await closeAllRooms();
  await app.close();
}

export async function registerAndLogin(
  baseUrl: string,
  input: { name: string; email: string; password: string },
) {
  const authHeaders = {
    "content-type": "application/json",
    origin: "http://localhost:3000",
  };

  const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(input),
  });
  if (!signUp.ok) {
    const text = await signUp.text();
    throw new Error(`sign-up failed: ${signUp.status} ${text}`);
  }

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  if (!signIn.ok) {
    const text = await signIn.text();
    throw new Error(`sign-in failed: ${signIn.status} ${text}`);
  }

  const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: {
      cookie: signIn.headers.getSetCookie?.().join("; ") ?? signIn.headers.get("set-cookie") ?? "",
    },
  });

  // Prefer bearer token from DB session created by sign-in
  const body = (await signIn.json()) as { token?: string; user?: { id: string }; session?: { token: string } };
  let token = body.token ?? body.session?.token;
  if (!token) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const session = await prisma.session.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });
    token = session?.token;
  }
  if (!token) throw new Error("No session token");

  const me = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
  return { token, userId: me.id, cookie: signIn.headers.get("set-cookie") ?? "" };
}

export async function apiJson<T>(
  baseUrl: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

export class TestYClient {
  doc = new Y.Doc();
  awareness = new awarenessProtocol.Awareness(this.doc);
  ws: WebSocket;
  synced = false;
  controls: unknown[] = [];
  text: Y.Text;

  constructor(url: string) {
    this.text = this.doc.getText("monaco");
    this.ws = new WebSocket(url);
    this.ws.binaryType = "nodebuffer";

    this.doc.on("update", (update, origin) => {
      if (origin === "remote" || this.ws.readyState !== WebSocket.OPEN) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      this.ws.send(encoding.toUint8Array(encoder));
    });

    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      if (origin === "remote" || this.ws.readyState !== WebSocket.OPEN) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          added.concat(updated, removed),
        ),
      );
      this.ws.send(encoding.toUint8Array(encoder));
    });

    this.ws.on("message", (raw) => {
      const data = new Uint8Array(raw as Buffer);
      const decoder = decoding.createDecoder(data);
      const type = decoding.readVarUint(decoder);
      if (type === messageSync) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        const syncType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, "remote");
        if (encoding.length(encoder) > 1) this.ws.send(encoding.toUint8Array(encoder));
        if (syncType === syncProtocol.messageYjsSyncStep2) this.synced = true;
      } else if (type === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          "remote",
        );
      } else if (type === 2) {
        const control = JSON.parse(decoding.readVarString(decoder));
        this.controls.push(control);
        if ((control as { type?: string }).type === "hello") {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeSyncStep1(encoder, this.doc);
          this.ws.send(encoding.toUint8Array(encoder));
        }
      }
    });
  }

  waitOpen() {
    return new Promise<void>((resolve, reject) => {
      this.ws.once("open", () => resolve());
      this.ws.once("error", reject);
      this.ws.once("unexpected-response", (_req, res) => {
        reject(new Error(`WS unexpected response ${res.statusCode}`));
      });
    });
  }

  waitClose(timeoutMs = 5000) {
    return new Promise<number>((resolve, reject) => {
      if (this.ws.readyState === WebSocket.CLOSED) {
        resolve(this.ws.closeCode ?? 1006);
        return;
      }
      const timer = setTimeout(() => reject(new Error("close timeout")), timeoutMs);
      this.ws.once("close", (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  waitSynced(timeoutMs = 5000) {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (this.synced) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error("sync timeout"));
        setTimeout(tick, 25);
      };
      tick();
    });
  }

  waitForText(predicate: (text: string) => boolean, timeoutMs = 5000) {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (predicate(this.text.toString())) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(
            new Error(`text wait timeout; current=${JSON.stringify(this.text.toString())}`),
          );
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  }

  close() {
    this.awareness.destroy();
    this.doc.destroy();
    this.ws.close();
  }
}

export async function cleanupTestData() {
  await prisma.errorEvent.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.yjsUpdate.deleteMany();
  await prisma.docSnapshot.deleteMany();
  await prisma.documentFile.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}
