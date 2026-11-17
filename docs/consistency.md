# Consistency, durability, and recovery

**Assignment engineering note (canonical):** [`ENGINEERING_NOTE.md`](./ENGINEERING_NOTE.md)

That document covers:

1. What can be lost during a crash  
2. How recovery works  
3. The system’s consistency guarantees  

## Short version

**Saved** = Yjs update appended to Postgres (`YjsUpdate`), then `saved` ack to the client. Unacked local edits can be lost. Restart loads latest `DocSnapshot` + trailing updates. Document text uses Yjs CRDTs (strong eventual consistency). Awareness (cursors) is ephemeral.
