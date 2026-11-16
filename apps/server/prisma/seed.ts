import { PrismaClient, type Role } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import * as Y from "yjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password@123";
const WORKSPACE_NAME = "Demo Workspace";

type SeedUser = {
  name: string;
  email: string;
  role: Role;
};

const SEED_USERS: SeedUser[] = [
  { name: "Alice", email: "alice@example.com", role: "owner" },
  { name: "Bob", email: "bob@example.com", role: "editor" },
  { name: "Carol", email: "carol@example.com", role: "editor" },
  { name: "Dave", email: "dave@example.com", role: "viewer" },
];

const SEED_FILES: { name: string; content: string }[] = [
  {
    name: "example.js",
    content: `export function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("CollabDesk"));
`,
  },
  {
    name: "example.ts",
    content: `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("CollabDesk"));
`,
  },
  {
    name: "example.md",
    content: `# Demo Workspace

Shared scratchpad for Alice, Bob, Carol, and Dave.

- Edit \`example.js\` and \`example.ts\` together
- Use this markdown file for notes
`,
  },
];

function encodeMonacoDoc(content: string): Buffer {
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, content);
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return Buffer.from(state);
}

async function ensureUser(seed: SeedUser, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email: seed.email } });
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        emailVerified: true,
      },
    }));

  if (existing && existing.name !== seed.name) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: seed.name },
    });
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (!account) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  } else {
    // Always refresh so re-seed restores password@123.
    await prisma.account.update({
      where: { id: account.id },
      data: { password: passwordHash },
    });
  }

  return user;
}

async function ensureWorkspace(ownerId: string) {
  const existing = await prisma.workspace.findFirst({
    where: { name: WORKSPACE_NAME, ownerId },
  });
  if (existing) return existing;

  return prisma.workspace.create({
    data: {
      name: WORKSPACE_NAME,
      ownerId,
    },
  });
}

async function ensureMembership(workspaceId: string, userId: string, role: Role) {
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!existing) {
    await prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
    return;
  }
  if (existing.role !== role) {
    await prisma.workspaceMember.update({
      where: { id: existing.id },
      data: { role },
    });
  }
}

async function ensureFileWithContent(
  workspaceId: string,
  createdById: string,
  name: string,
  content: string,
) {
  let file = await prisma.documentFile.findUnique({
    where: { workspaceId_name: { workspaceId, name } },
  });

  if (!file) {
    file = await prisma.documentFile.create({
      data: { workspaceId, name, createdById },
    });
  }

  const [updateCount, snapshotCount] = await Promise.all([
    prisma.yjsUpdate.count({ where: { fileId: file.id } }),
    prisma.docSnapshot.count({ where: { fileId: file.id } }),
  ]);

  // Don't overwrite collaborative edits on re-seed.
  if (updateCount > 0 || snapshotCount > 0) {
    return file;
  }

  const state = encodeMonacoDoc(content);
  await prisma.yjsUpdate.create({
    data: { fileId: file.id, seq: 1, update: state },
  });
  await prisma.docSnapshot.create({
    data: { fileId: file.id, version: 1, state },
  });

  return file;
}

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const users = [];
  for (const seed of SEED_USERS) {
    users.push(await ensureUser(seed, passwordHash));
  }

  const alice = users[0]!;
  const workspace = await ensureWorkspace(alice.id);

  for (let i = 0; i < SEED_USERS.length; i++) {
    await ensureMembership(workspace.id, users[i]!.id, SEED_USERS[i]!.role);
  }

  for (const file of SEED_FILES) {
    await ensureFileWithContent(workspace.id, alice.id, file.name, file.content);
  }

  console.log("Seed complete:");
  console.log(`  workspace: ${WORKSPACE_NAME} (${workspace.id})`);
  for (const seed of SEED_USERS) {
    console.log(`  ${seed.name} <${seed.email}> role=${seed.role}`);
  }
  console.log(`  password: ${SEED_PASSWORD}`);
  console.log(`  files: ${SEED_FILES.map((f) => f.name).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
