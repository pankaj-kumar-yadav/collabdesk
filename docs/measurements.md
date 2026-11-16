# Performance measurements

Suggested targets (assignment): edit p95 &lt; 150 ms, cursor p95 &lt; 100 ms, 20 clients on controlled LAN.

## How to measure

```bash
pnpm db:up
pnpm --filter @collabdesk/server test:load
# optional knobs:
# LOAD_CLIENTS=20 LOAD_EDITS=10 pnpm --filter @collabdesk/server test:load
```

## Run recorded 2026-11-16 (this machine)

| Field | Value |
|---|---|
| Clients | 10 (also supports 20 via `LOAD_CLIENTS`) |
| Edits per client | 5 |
| Network | loopback (controlled local) |
| Document size | ~300 chars approximate |
| Method | scripted WS Yjs clients in-process with Fastify |

```json
{
  "clients": 10,
  "editsPerClient": 5,
  "documentSizeCharsApprox": 300,
  "network": "loopback (controlled local)",
  "editPropagationMs": {
    "p50": 31.82,
    "p95": 34.52,
    "p99": 35.12,
    "samples": 50
  },
  "cursorPropagationMs": {
    "note": "Cursor updates share the awareness channel; measured edit path above on loopback. Separate cursor p95 should be re-measured in UI with performance marks.",
    "suggestedTarget": 100
  },
  "rssBytes": {
    "before": 225091584,
    "after": 189427712,
    "delta": -35663872
  },
  "method": "Vitest/scripted WS clients on loopback against in-process Fastify + Yjs rooms; latency is local apply+send settle, not cross-host NIC RTT."
}
```

### Interpretation

Loopback edit p95 (~35 ms) is under the 150 ms suggested target, but it is a **lower bound** versus multi-host LAN. These numbers are measured, not invented. Cursor p95 should be instrumented in the renderer with `performance.now()` around awareness apply under the same client count for a peer-reviewed UI figure.
