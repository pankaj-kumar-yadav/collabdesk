# Architecture

```text
Electron main  --preload bridge-->  Next.js renderer
                                      |            |
                                      | REST       | WebSocket (Yjs sync + awareness)
                                      v            v
                                   Fastify + Better Auth + Yjs rooms
                                      |
                                      v
                                   PostgreSQL (Prisma)
```

## Process boundaries

- **Electron main**: window lifecycle only; no document secrets in renderer-accessible APIs.
- **Preload**: narrow `contextBridge` (`getVersion`).
- **Next.js renderer**: UI, Monaco, Yjs client provider.
- **Node server**: auth, authorization, persistence, realtime fan-out.

## Scaling bottlenecks (and next steps)

1. **In-memory Y.Doc rooms on one Node process** — sticky sessions required; scale with Redis pub/sub or a hosted Yjs provider (e.g. y-sweet) for multi-node.
2. **Append-only update log growth** — mitigated by periodic snapshots + prune window; for huge docs, move blobs to object storage.
3. **Awareness broadcast** — throttled; at very high cursor rates, shard by file or sample updates.

## Design alternatives considered

| Area | Chosen | Rejected | Why |
|---|---|---|---|
| Sync | Yjs CRDT | ShareDB OT | Simpler multi-replica convergence + awareness |
| Editor | Monaco + y-monaco | CodeMirror 6 | Desktop IDE familiarity |
| Transport | Raw WS + y-protocols | Socket.IO-only rooms | Avoid reinventing CRDT framing |
| DB | PostgreSQL | SQLite | Clearer multi-client durability/restart story |
| Auth | Better Auth + bearer | Passport/JWT hand-roll | Session revoke/expire paths for acceptance tests |
