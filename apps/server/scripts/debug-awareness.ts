import {
  TestYClient,
  apiJson,
  cleanupTestData,
  registerAndLogin,
  startTestServer,
  stopTestServer,
} from "../src/test/helpers.js";
import { prisma } from "../src/db.js";
import { closeAllRooms } from "../src/yjs/rooms.js";

const { app, baseUrl } = await startTestServer();
await cleanupTestData();

const alice = await registerAndLogin(baseUrl, {
  name: "Alice",
  email: `alice-aw-${Date.now()}@example.com`,
  password: "password123",
});
const bob = await registerAndLogin(baseUrl, {
  name: "Bob",
  email: `bob-aw-${Date.now()}@example.com`,
  password: "password123",
});
const ws = await apiJson<{ id: string }>(baseUrl, alice.token, "/workspaces", {
  method: "POST",
  body: JSON.stringify({ name: "Demo" }),
});
const bobUser = await prisma.user.findUniqueOrThrow({ where: { id: bob.userId } });
const inv = await apiJson<{ token: string }>(
  baseUrl,
  alice.token,
  `/workspaces/${ws.body.id}/invitations`,
  { method: "POST", body: JSON.stringify({ email: bobUser.email, role: "editor" }) },
);
await apiJson(baseUrl, bob.token, `/invitations/${inv.body.token}/accept`, {
  method: "POST",
  body: "{}",
});
const file = await apiJson<{ id: string }>(
  baseUrl,
  alice.token,
  `/workspaces/${ws.body.id}/files`,
  { method: "POST", body: JSON.stringify({ name: "main.ts" }) },
);

const u = new URL(baseUrl);
const wsUrl = (token: string) =>
  `ws://${u.host}/ws?fileId=${file.body.id}&token=${encodeURIComponent(token)}`;

const a = new TestYClient(wsUrl(alice.token));
const b = new TestYClient(wsUrl(bob.token));
await Promise.all([a.waitOpen(), b.waitOpen()]);
await Promise.all([a.waitSynced(), b.waitSynced()]);
console.log("synced", { a: a.synced, b: b.synced, alice: alice.userId });

a.awareness.setLocalState({
  user: { id: alice.userId, name: "Alice", color: "#E4572E" },
  selection: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 },
});

await new Promise((r) => setTimeout(r, 1000));
console.log(
  "a states",
  JSON.stringify([...a.awareness.getStates().entries()]),
);
console.log(
  "b states",
  JSON.stringify([...b.awareness.getStates().entries()]),
);
console.log("b size", b.awareness.getStates().size);
console.log("a controls", JSON.stringify(a.controls));

a.close();
b.close();
await closeAllRooms();
await stopTestServer(app);
await prisma.$disconnect();
