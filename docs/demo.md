# Demo script (seeded users)

1. Start stack: `pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev` (and optionally `pnpm dev:desktop`).
2. Sign in with any seeded account (password for all: `password@123`):
   - `alice@example.com` — owner
   - `bob@example.com` — editor
   - `carol@example.com` — editor
   - `dave@example.com` — viewer
3. Open workspace **Demo Workspace** (already has `example.js`, `example.ts`, `example.md`).
4. Open `example.ts` in multiple windows:
   - Confirm distinct cursor colors and live selections.
   - Confirm Dave cannot edit (read-only viewer).
5. Disconnect Bob briefly, continue typing as Alice, reconnect Bob — missed edits appear.
6. As Alice, downgrade Bob to viewer while Bob is connected — Bob’s subsequent writes are rejected.

Re-run `pnpm db:seed` anytime; it is idempotent (keeps existing file content, restores login password).
