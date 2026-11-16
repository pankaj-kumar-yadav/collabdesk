# Local run commands

Run everything from the **repo root** (`collabdesk/`). Use separate terminals for each process.

## One-time setup

```bash
cp .env.example .env
cp .env.example apps/server/.env
cp .env.example apps/web/.env.local

pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm --filter @collabdesk/shared build
```

Postgres must be up before backend / Prisma Studio.

---

## Backend (API + WebSocket)

```bash
pnpm dev:server
```

- URL: http://localhost:4000
- Package: `apps/server`

Same thing from the server folder:

```bash
cd apps/server
pnpm dev
```

---

## Frontend (Next.js)

```bash
pnpm dev:web
```

- URL: http://localhost:3000
- Package: `apps/web`

Same thing from the web folder:

```bash
cd apps/web
pnpm dev
```

---

## Prisma Studio (DB UI)

Browse / edit Postgres tables in the browser:

```bash
pnpm --filter @collabdesk/server exec prisma studio
```

- URL: http://localhost:5555 (default)
- Needs `DATABASE_URL` in `apps/server/.env`

Same thing from the server folder:

```bash
cd apps/server
pnpm exec prisma studio
```

---

## Optional: both apps together

```bash
pnpm db:up
pnpm dev
```

Starts **backend + frontend** in parallel (not Studio).

| Process        | Command                                              | Port |
|----------------|------------------------------------------------------|------|
| Backend        | `pnpm dev:server`                                    | 4000 |
| Frontend       | `pnpm dev:web`                                       | 3000 |
| Prisma Studio  | `pnpm --filter @collabdesk/server exec prisma studio` | 5555 |
| Postgres       | `pnpm db:up`                                         | 5432 |

Stop Postgres: `pnpm db:down`.
