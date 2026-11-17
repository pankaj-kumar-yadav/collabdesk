# CollabDesk — How to share / submission checklist

**Status legend:** `[x]` done in repo · `[ ]` still to do · `[~]` built locally / needs a share step · `[?]` needs you to verify live

---

## Short answer

| Question | Answer |
|---|---|
| Is this an assignment submission? | **Yes** — share **source + packaged Electron app**, not “only a live URL”. |
| Do you *need* cloud deployment? | **No** — optional. Reviewers should run locally from your README. |
| What must they be able to do? | Install deps, start DB + server + web (and/or desktop), run a **3-user demo**, and ask you the §7 design questions. |

**Best share format:** private Git repo (GitHub/GitLab) **or** zip of the monorepo + a link/folder with the packaged desktop build (`apps/desktop/release/`).

---

## What to share (required)

### 1. Full source — DONE

- [x] Entire monorepo: `apps/web`, `apps/server`, `apps/desktop`, `packages/shared`
- [x] Prisma schema + migrations
- [x] Root `.env.example` (and copies referenced in README) — **no real secrets**
- [x] Tests (`pnpm test`, `pnpm test:load`)
- [x] Docs: `README.md`, `docs/architecture.md`, `docs/ENGINEERING_NOTE.md`, `docs/ACCEPTANCE_TESTS.md`, `docs/measurements.md`, `docs/demo.md`

### 2. Packaged Electron app — MOSTLY (share step left)

- [x] Build packaged desktop artifact — rebuilt **2026-11-17** → `apps/desktop/release/win-unpacked/CollabDesk.exe`
- [~] Include / upload release for reviewers (folder is **gitignored**; zip/Drive/Release asset still needed)
- [x] Note in README how to run packaged app **vs** `pnpm dev:desktop`

### 3. Runnable locally — DONE (docs/scripts); verify once before send

- [x] README “Quick start” present
- [?] Confirm on a clean machine / after `git clone`: `pnpm install` → `db:up` → migrate → `pnpm dev`
- [x] Seeded 3-user demo script (`docs/demo.md` + `pnpm db:seed`)
- [x] Desktop path documented (`pnpm dev:desktop` + packaged exe path)

### 4. Demo readiness — CODE READY; run live before interview

- [x] Seeded users: alice / bob / carol / dave (`docs/demo.md`)
- [?] Shared file open in multiple windows (live check)
- [?] Distinct cursor colors + live selections visible (live check)
- [?] Viewer is read-only; editor can write (live check)
- [?] Optional live: disconnect/reconnect + role downgrade reject

### 5. Proof / evidence — DONE

- [x] Acceptance tests exist (`apps/server/src/test/collaboration.test.ts`) — re-run `pnpm test` before send
- [x] Acceptance outcomes documented: `docs/ACCEPTANCE_TESTS.md` (9/9 pass, 2026-11-17)
- [x] Load / latency note filled: `docs/measurements.md`
- [x] Consistency / crash / recovery engineering note: `docs/ENGINEERING_NOTE.md`

---

## What is optional — NOT DONE (and not required)

- [ ] Cloud host of web + API
- [ ] Public production URL
- [ ] Docker Compose for full prod-like deploy (you have Postgres `docker-compose.yml` only — enough for local)
- [ ] Signed Windows/macOS installer

---

## Share packages — PARTIAL

### A. Git repo

- [x] Remote exists: `https://github.com/pankaj-kumar-yadav/collabdesk.git`
- [x] Visibility: **public** — share the URL; no collaborator invite needed
- [~] Attach Electron build separately (not in git) — Drive/Release asset + link in README or email

### B. Zip (if they ask for zip)

- [ ] Create clean zip (no `node_modules`, no `.env`, no secrets)
- [ ] Separate zip/link for `apps/desktop/release/`

### C. Live URL

- [ ] Skip unless you want it — not required

---

## Pre-send hygiene

- [x] `.env` gitignored and not tracked
- [x] `.gitignore` covers `node_modules`, `.env`, `apps/desktop/release`
- [x] README lists Node 22+, pnpm, Docker for Postgres
- [x] Known limitations listed in README
- [x] Interview prep notes exist locally (`docs/interview/`) — note: that folder is **gitignored**, so it won’t go to reviewers (good for personal prep)
- [!] Assignment PDF is tracked in the public repo: `collabdesk_dev-assignment (1).pdf` — remove from git if you don’t want the brief public
- [ ] Re-run `pnpm test` once before sharing

---

## Day-of demo checklist — NOT YET (do when presenting)

- [ ] Postgres up, migrations applied, seed
- [ ] `pnpm dev` (web :3000, API :4000)
- [ ] Three windows, different users
- [ ] Same file — cursors, typing, viewer locked
- [ ] Kill/restart server — document recovers
- [ ] Verbal: sessions (not JWT), Yjs, awareness, roles on WS, “saved” = Postgres

---

## Scoreboard

| Area | Status |
|---|---|
| Source + docs + tests + migrations | **Done** |
| Measurements + consistency note | **Done** |
| Packaged Electron build on disk | **Done** (rebuilt 2026-11-17) |
| Upload / attach Electron build for reviewers | **Todo** |
| Repo public + shareable URL | **Done** |
| Live 3-user demo dry-run | **Todo** |
| Remove assignment PDF from public git (optional) | **Decide** |
| Cloud deploy | **Skip** (optional) |

---

## One-line summary for the reviewer email

> Source: https://github.com/pankaj-kumar-yadav/collabdesk (public). Run via README + Docker Postgres; packaged desktop build: &lt;attach link&gt;. Demo: three users on one file with live cursors — see `docs/demo.md`.
