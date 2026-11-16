# Demo script (3 authenticated users)

1. Start stack: `pnpm db:up && pnpm dev` (and optionally `pnpm dev:desktop`).
2. Register three users (unique emails, password ≥ 8 characters).
3. As user A, create workspace **CollabDemo**, create file `main.ts`.
4. Invite user B as **editor** and user C as **viewer**; copy invite tokens.
5. As B and C, accept invites from the Workspaces page.
6. Open `main.ts` in three windows:
   - Confirm distinct cursor colors and live selections.
   - Confirm C cannot edit (read-only).
7. Disconnect B briefly, continue typing as A, reconnect B — missed edits appear.
8. As A, downgrade B to viewer while B is connected — B’s subsequent writes are rejected.
