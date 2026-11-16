import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { fromNodeHeaders } from "better-auth/node";
import { auth, getSessionFromHeaders } from "@/auth";
import { env } from "@/env";
import { workspaceRoutes } from "@/routes/workspaces";
import { attachClient, getRoomStats } from "@/yjs/rooms";
import { prisma } from "@/db";
import { HttpError } from "@/permissions";
import { logError } from "@/logging";
import { loggerOptions } from "@/utils/logs/logger";

function headersToWebHeaders(headers: Record<string, unknown>): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) h.append(key, String(item));
    } else {
      h.set(key, String(value));
    }
  }
  return h;
}

export async function buildApp() {
  const app = Fastify({ logger: loggerOptions });

  await app.register(cors, {
    origin: [env.CORS_ORIGIN, "http://localhost:3000"],
    credentials: true,
    exposedHeaders: ["set-auth-token"],
  });
  await app.register(websocket);

  app.get("/health", async () => ({ ok: true, rooms: getRoomStats() }));

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const headers = fromNodeHeaders(request.headers);
      const body =
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : JSON.stringify(request.body ?? {});
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body,
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      const text = await response.text();
      return reply.send(text || null);
    },
  });

  app.addHook("preHandler", async (request, reply) => {
    if (
      request.url.startsWith("/api/auth") ||
      request.url.startsWith("/health") ||
      request.url.startsWith("/ws")
    ) {
      return;
    }

    const headers = headersToWebHeaders(request.headers as Record<string, unknown>);
    const authHeader = request.headers.authorization;
    if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      headers.set("authorization", authHeader);
    }

    const session = await getSessionFromHeaders(headers);
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.user = session.user;
    request.sessionToken = session.session.token;
  });

  await app.register(workspaceRoutes);

  app.get("/ws", { websocket: true }, async (socket, request) => {
    try {
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const fileId = url.searchParams.get("fileId");
      const token =
        url.searchParams.get("token") ||
        (typeof request.headers.authorization === "string"
          ? request.headers.authorization.replace(/^Bearer\s+/i, "")
          : null);

      if (!fileId) {
        socket.close(4400, "fileId required");
        return;
      }
      if (!token) {
        socket.close(4401, "Unauthorized");
        return;
      }

      const headers = new Headers();
      headers.set("authorization", `Bearer ${token}`);
      // Also support cookie sessions when present
      if (request.headers.cookie) {
        headers.set("cookie", request.headers.cookie);
      }

      const session = await getSessionFromHeaders(headers);
      if (!session) {
        socket.close(4401, "Unauthorized");
        return;
      }

      const file = await prisma.documentFile.findFirst({
        where: { id: fileId, deletedAt: null },
      });
      if (!file) {
        socket.close(4404, "File not found");
        return;
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: file.workspaceId,
            userId: session.user.id,
          },
        },
      });
      if (!membership) {
        socket.close(4403, "Forbidden");
        return;
      }

      await attachClient({
        fileId: file.id,
        workspaceId: file.workspaceId,
        ws: socket,
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: membership.role,
      });
    } catch (error) {
      await logError({
        code: "ws_handshake_failed",
        message: error instanceof Error ? error.message : "WS handshake failed",
      });
      socket.close(4500, "Internal error");
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  return app;
}
