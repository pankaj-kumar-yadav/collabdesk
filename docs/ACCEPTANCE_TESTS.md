# Acceptance test outcomes (assignment §4)

Documented results for CollabDesk acceptance scenarios. Automated coverage lives in `apps/server/src/test/collaboration.test.ts`. Load test details are in [`measurements.md`](./measurements.md).

## How to reproduce

```bash
pnpm db:up
pnpm db:migrate
pnpm test
pnpm test:load
```

Manual UI checks (cursors/colors in Monaco): see [`demo.md`](./demo.md) with ≥3 authenticated users.

## Results matrix

Recorded run: **2026-11-17** — `pnpm test` → **9/9 passed**.

| Assignment scenario | Expected | How we tested | Outcome |
|---|---|---|---|
| Concurrent inserts | Both changes survive; replicas converge | Vitest: two WS clients insert `"Hello"` / `"World"` at same index; assert texts equal and contain both | **Pass** |
| Concurrent edits and deletes | Document stays consistent | Same test continues with delete + nearby insert; assert both clients converge | **Pass** |
| Live selections | Peers show range in that user’s color | Vitest: Alice sets awareness `selection` + server-bound `user`; Bob observes remote state with matching `user.id` + `selection`. UI color rendering verified in demo | **Pass** (protocol + demo) |
| Presence | Correct identity/color; stale gone after disconnect | Vitest: awareness user binding; disconnect removes / does not keep writer connected incorrectly. Colors from server `hello` / `colorForUserId` | **Pass** |
| Network interruption | Reconnect syncs missed changes | Vitest: Alice drops WS; Bob edits; Alice reconnects; catches `"while-offline"` | **Pass** |
| Backend restart | Persisted state recoverable | Vitest: write `"durable-content"`, `closeAllRooms` + restart Fastify, reconnect; content present | **Pass** |
| Expired session | No protected ops | Vitest: `POST /sessions/expire-current` then GET workspace → **401** | **Pass** |
| Permission downgrade | Connected editor→viewer; writes rejected | Vitest: PATCH member to `viewer` while Bob connected; Bob insert not visible to Alice | **Pass** |
| Unauthorized room access | Join denied | Vitest: stranger WS to private file; close code forbidden / unauthorized family | **Pass** |
| Load test | Document latency + resource use | `pnpm test:load` — see [`measurements.md`](./measurements.md) | **Pass** (documented; loopback) |

## Mapping to test names

| Vitest case | §4 scenarios covered |
|---|---|
| `converges concurrent inserts and nearby edit/delete conflicts` | Concurrent inserts; concurrent edits/deletes |
| `propagates awareness selection presence` | Live selections; presence identity |
| `removes stale presence after disconnect` | Presence stale cleanup |
| `resyncs after network interruption` | Network interruption |
| `recovers persisted state after backend restart` | Backend restart |
| `rejects expired sessions for protected operations` | Expired session |
| `rejects writes after permission downgrade to viewer` | Permission downgrade |
| `denies unauthorized room access` | Unauthorized room access |
| `stores snapshots for history restore` | Reliability / history (supports restore path) |

## Notes / honesty

- Automated suite proves **protocol + server** behavior (Yjs sync, awareness payloads, authz, persistence). Colored Monaco decorations are confirmed in the **manual 3-user demo**, not asserted via pixel tests.
- Load-test edit p95 was measured on **loopback** (~35 ms in the recorded run) — a lower bound vs multi-host LAN. Cursor p95 is method-limited in the scripted harness; see measurements doc.
- Authorization: suite expects **no** successful unauthorized joins/writes for the cases above.
