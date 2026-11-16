import { buildApp } from "./app.js";
import { env } from "./env.js";
import { closeAllRooms } from "./yjs/rooms.js";
import { prisma } from "./db.js";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`CollabDesk server listening on http://${env.HOST}:${env.PORT}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown() {
  await closeAllRooms();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
