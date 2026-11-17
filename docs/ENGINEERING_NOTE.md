# Engineering note — crash loss, recovery, and consistency

Brief note for CollabDesk (Electron + Next.js + Fastify + PostgreSQL + Yjs).

---

## 1. What can be lost during a crash

**Definition of durable:** an edit is durable only after the server appends its Yjs update to Postgres (`YjsUpdate`) and the client receives a `saved` control ack for that sequence. Until then, the edit is in-flight.

| Failure mode | What can be lost |
|---|---|
| Desktop/renderer crash before the WebSocket send | Unsent local keystrokes still only in memory on that client |
| Client crash after send, before `saved` ack | Usually nothing if the server already committed; client will resync on reopen. If the server never applied the frame, those keystrokes are gone |
| Server crash after applying an update in the in-memory `Y.Doc`, before Postgres commit | That update (and any not-yet-persisted peers) — rare window on the persist queue |
| Server crash after Postgres commit | Nothing for acknowledged updates |
| Network partition / temporary disconnect | No durable loss of already-acked updates; missed updates sync on reconnect |
| Process kill of a single client | Other clients keep the shared durable state; the disconnected user catches up on reconnect |

**Not durable by design:** live cursors, selections, and presence (Yjs awareness). They are ephemeral and cleared on disconnect or stale timeout. Losing them is expected, not a document-data loss.

---

## 2. How recovery works

### After a client reconnect

1. Client opens WebSocket with a valid session and `fileId`.
2. Server attaches the socket to the file’s Yjs room (creating the room if needed).
3. Sync uses **y-protocols** (sync step 1 / step 2 / updates): each side sends missing CRDT updates.
4. Replicas converge; duplicate delivery is safe because Yjs updates are idempotent under the CRDT merge.

### After a backend restart (cold room)

1. `loadDocument(fileId)` builds a fresh `Y.Doc`.
2. Load the latest `DocSnapshot` (if any).
3. Apply trailing `YjsUpdate` rows with `seq > snapshot.version` in order.
4. Resume accepting clients; they sync via y-protocols as above.

Periodic snapshots (`DocSnapshot`) compact the restore path so restart does not replay an unbounded update log. History restore is **append-only**: restoring a snapshot writes a new durable revision and forces connected clients to reconnect onto that state.

### After a permission or session change while connected

- Membership/role is enforced on join and on writes; downgrades push `role_changed` and reject further document updates from viewers.
- Expired sessions fail protected REST with 401; WebSocket auth fails on handshake / reconnect (close unauthorized).

---

## 3. Consistency guarantees

| Guarantee | Statement |
|---|---|
| Document merge model | **Yjs CRDT** — concurrent inserts/deletes commute; once all updates are exchanged, replicas hold the same document |
| Consistency class | **Strong eventual consistency** for document text — not linearizability of every intermediate keystroke or cursor position |
| No last-write-wins | Concurrent edits from multiple editors are both retained and merged; we do not drop one side |
| Durability boundary | Acked (`saved`) ⇒ present in Postgres update log (and recoverable via snapshot + trailing updates) |
| Idempotent sync | Re-delivery and overlapping sync after reconnect do not corrupt the document |
| Awareness | Ephemeral; not part of the durable consistency story |
| Authz | Viewer cannot mutate the durable document; unauthorized room join is denied |

### What we do *not* claim

- Exactly-once end-to-end delivery of every keystroke under arbitrary crash timing (unacked local buffer can be lost).
- Cross-region multi-primary durability (rooms are single-node in-memory; horizontal scale needs a shared pub/sub or hosted Yjs provider).
- Linearizable global ordering of cursors across clients.

---

## Implementation map

| Concern | Where |
|---|---|
| Room apply + fan-out + persist queue + `saved` ack | `apps/server/src/yjs/rooms.ts` |
| Snapshot load / update append / restore | `apps/server/src/yjs/persistence.ts` |
| Client sync + `saved` status | `apps/web/src/lib/y-websocket.ts` |
| Acceptance coverage (reconnect, restart, convergence) | `apps/server/src/test/collaboration.test.ts` |

---

## One-sentence summary

Unacked local edits can be lost; everything the server has committed to Postgres survives restart via snapshot + update log; concurrent editors converge with Yjs CRDTs under strong eventual consistency, while cursors remain ephemeral.
