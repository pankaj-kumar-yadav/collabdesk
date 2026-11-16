# CollabDesk

Real-time collaborative code editor for desktop.

**Stack:** Electron · Next.js · Node.js (Fastify) · PostgreSQL · Prisma · Yjs · Monaco · Better Auth

## Features

- Concurrent CRDT editing (Yjs) with convergence (no last-write-wins)
- Live remote cursors and selections (awareness), throttled server-side
- Auth: register / login / logout / session restore (bearer token for Electron + WS)
- Workspaces with **owner / editor / viewer** roles and email invitations
- Durable Yjs update log + snapshots, reconnect + backend restart recovery
- Document history restore, activity/error event logging
- Packaged Electron shell with secure preload (no Node in renderer)

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL)

### Setup

```bash
cp .env.example .env
# same values are used by apps/server via dotenv from repo root if you export them,
# or copy into apps/server/.env (recommended):
cp .env.example apps/server/.env
cp .env.example apps/web/.env.local

pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm --filter @collabdesk/shared build
```

### Run (web + API)

```bash
pnpm dev
```

- Web UI: http://localhost:3000
- API / WS: http://localhost:4000

### Run desktop shell

With web + server already running:

```bash
pnpm dev:desktop
```

### Package desktop

```bash
# ensure Electron binary was allowed to install (pnpm build scripts)
pnpm rebuild electron
pnpm --filter @collabdesk/web build
# skip Windows code-sign symlink extraction issues in CI/dev shells
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --filter @collabdesk/desktop run pack
# installer (optional):
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --filter @collabdesk/desktop run dist
```

Artifacts land in `apps/desktop/release/`. For local desktop development, keep `pnpm dev` running and use `pnpm dev:desktop` (loads `http://localhost:3000`).

Windows packaging uses `"signAndEditExecutable": false` to avoid `winCodeSign` symlink privilege failures in non-admin shells. Unpacked app: `apps/desktop/release/win-unpacked/CollabDesk.exe`.

## Demo script (3 users)

1. Register `alice@example.com`, `bob@example.com`, `cara@example.com` (password ≥ 8 chars).
2. As Alice, create workspace **Demo**, create file `main.ts`.
3. Invite Bob as **editor** and Cara as **viewer**; copy invite tokens from the UI.
4. Sign in as Bob/Cara, accept invites on the Workspaces page.
5. Open `main.ts` in three windows: confirm distinct cursor colors, selections, and that Cara is read-only.
6. Disconnect Bob’s network briefly, keep editing as Alice, reconnect Bob — content syncs.
7. Downgrade Bob to viewer while connected — further Bob edits are rejected.

## Tests

```bash
pnpm test
pnpm test:load
```

Acceptance coverage (server):

- Concurrent inserts / nearby edit+delete convergence
- Awareness selection propagation
- Reconnect after interruption
- Backend restart persistence
- Expired session → 401
- Permission downgrade → write rejected
- Unauthorized WS room join denied
- Snapshot history listing

Load test prints honest loopback measurements (not production WAN claims). See `docs/measurements.md`.

## Documentation

- [Architecture & trade-offs](docs/architecture.md)
- [Consistency / recovery guarantees](docs/consistency.md)
- [Measurements](docs/measurements.md)

## Persistence guarantees (short)

**Saved** = Yjs update appended to Postgres. Unacked local edits can be lost on crash. Restart reloads snapshot + trailing updates. Details in `docs/consistency.md`.

## Known limitations / next

- Single-node in-memory rooms (horizontal scale needs Redis/Y-Sweet)
- Email invites are token-based (no SMTP sending)
- Load-test cursor p95 is documented as method-limited on loopback; UI Performance marks recommended for cursor RTT
- Monaco remote selection tint is shared CSS (identity via color swatch + overview ruler)

## Project layout

```text
apps/web        Next.js UI
apps/server     Fastify REST + Yjs WebSocket
apps/desktop    Electron main/preload
packages/shared Shared roles/schemas
docs/           Architecture & guarantees
```
