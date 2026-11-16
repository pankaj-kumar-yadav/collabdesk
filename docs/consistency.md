# Consistency, durability, and recovery

## What “saved” means

A client may show **Saved** only after the server has appended the corresponding Yjs update to the `YjsUpdate` table (and optionally advanced a `DocSnapshot`). Until that acknowledgment arrives over the control channel, local edits are **in-flight**.

## What can be lost in a crash

| Failure | Possible loss |
|---|---|
| Renderer/process crash before WS send | Unsent local keystrokes |
| Server crash after apply, before DB commit | Rare; in-memory room update not yet queued to Postgres |
| Server crash after DB commit | None for acknowledged updates |
| Network partition | No durable loss; reconnect syncs missed updates |

## Recovery

1. On room cold start, load the latest `DocSnapshot` (if any), then apply trailing `YjsUpdate` rows with `seq > snapshot.version`.
2. Clients reconnect with `y-protocols` sync step 1/2 and converge.
3. Snapshot restore appends a new durable revision (append-only history) and forces connected clients to reconnect.

## Consistency model

CollabDesk uses **Yjs CRDTs**. Concurrent inserts/deletes commute; replicas converge to the same document once all updates are exchanged. This is **strong eventual consistency** for document text, not linearizability of intermediate cursor positions.

Awareness (cursors/selections) is **ephemeral**: it is not durably persisted and is removed on disconnect/timeout.

## Authorization on long-lived sockets

Every WS message re-checks workspace membership. Role downgrades push a `role_changed` control frame; subsequent document updates from viewers are rejected. Session expiry causes REST 401 and WS close on the next authenticated action / reconnect.
