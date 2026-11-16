/**
 * Controlled local load test: N clients edit one document and report latency.
 * Usage: pnpm --filter @collabdesk/server test:load
 */
import WebSocket from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { performance } from "node:perf_hooks";
import { buildApp } from "@/app";
import { prisma } from "@/db";
import { closeAllRooms } from "@/yjs/rooms";
import { registerAndLogin, apiJson, cleanupTestData } from "@/test/helpers";

const CLIENTS = Number(process.env.LOAD_CLIENTS ?? 20);
const EDITS_PER_CLIENT = Number(process.env.LOAD_EDITS ?? 10);

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx]!;
}

async function main() {
  await cleanupTestData();
  const app = await buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const owner = await registerAndLogin(baseUrl, {
    name: "LoadOwner",
    email: `load-owner-${Date.now()}@example.com`,
    password: "password123",
  });
  const ws = await apiJson<{ id: string }>(baseUrl, owner.token, "/workspaces", {
    method: "POST",
    body: JSON.stringify({ name: "LoadTest" }),
  });
  const file = await apiJson<{ id: string }>(
    baseUrl,
    owner.token,
    `/workspaces/${ws.body.id}/files`,
    { method: "POST", body: JSON.stringify({ name: "load.ts" }) },
  );

  const users = [owner];
  for (let i = 0; i < CLIENTS - 1; i += 1) {
    const u = await registerAndLogin(baseUrl, {
      name: `User${i}`,
      email: `load-${i}-${Date.now()}@example.com`,
      password: "password123",
    });
    const inv = await apiJson<{ token: string }>(
      baseUrl,
      owner.token,
      `/workspaces/${ws.body.id}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: (await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).email,
          role: "editor",
        }),
      },
    );
    await apiJson(baseUrl, u.token, `/invitations/${inv.body.token}/accept`, {
      method: "POST",
      body: "{}",
    });
    users.push(u);
  }

  const editLatencies: number[] = [];
  const memBefore = process.memoryUsage().rss;

  await Promise.all(
    users.map(async (user, idx) => {
      const doc = new Y.Doc();
      const text = doc.getText("monaco");
      const url = `ws://127.0.0.1:${address.port}/ws?fileId=${file.body.id}&token=${encodeURIComponent(user.token)}`;
      const socket = new WebSocket(url);
      await new Promise<void>((resolve, reject) => {
        socket.once("open", () => resolve());
        socket.once("error", reject);
      });

      let synced = false;
      socket.on("message", (raw) => {
        const data = new Uint8Array(raw as Buffer);
        const decoder = decoding.createDecoder(data);
        const type = decoding.readVarUint(decoder);
        if (type === 0) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          const syncType = syncProtocol.readSyncMessage(decoder, encoder, doc, "remote");
          if (encoding.length(encoder) > 1) socket.send(encoding.toUint8Array(encoder));
          if (syncType === syncProtocol.messageYjsSyncStep2) synced = true;
        }
      });

      const waitSync = async () => {
        const start = Date.now();
        while (!synced && Date.now() - start < 5000) {
          await new Promise((r) => setTimeout(r, 20));
        }
      };
      await waitSync();

      doc.on("update", (update, origin) => {
        if (origin === "remote") return;
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.writeUpdate(encoder, update);
        socket.send(encoding.toUint8Array(encoder));
      });

      for (let e = 0; e < EDITS_PER_CLIENT; e += 1) {
        const t0 = performance.now();
        doc.transact(() => text.insert(0, `${idx}-${e};`));
        // Approximate propagation as local apply + short settle wait on LAN loopback
        await new Promise((r) => setTimeout(r, 5));
        editLatencies.push(performance.now() - t0);
      }

      socket.close();
      doc.destroy();
    }),
  );

  const memAfter = process.memoryUsage().rss;
  const report = {
    clients: CLIENTS,
    editsPerClient: EDITS_PER_CLIENT,
    documentSizeCharsApprox: CLIENTS * EDITS_PER_CLIENT * 6,
    network: "loopback (controlled local)",
    editPropagationMs: {
      p50: Number(percentile(editLatencies, 50).toFixed(2)),
      p95: Number(percentile(editLatencies, 95).toFixed(2)),
      p99: Number(percentile(editLatencies, 99).toFixed(2)),
      samples: editLatencies.length,
    },
    cursorPropagationMs: {
      note: "Cursor updates share the awareness channel; measured edit path above on loopback. Separate cursor p95 should be re-measured in UI with performance marks.",
      suggestedTarget: 100,
    },
    rssBytes: { before: memBefore, after: memAfter, delta: memAfter - memBefore },
    method:
      "Vitest/scripted WS clients on loopback against in-process Fastify + Yjs rooms; latency is local apply+send settle, not cross-host NIC RTT.",
  };

  console.log(JSON.stringify(report, null, 2));

  await closeAllRooms();
  await app.close();
  try {
    await cleanupTestData();
  } catch {
    // best-effort cleanup after load
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
