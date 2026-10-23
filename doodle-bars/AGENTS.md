<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Documentation in code

Room backends (Cloudflare Durable Objects and Rivet) are easier to follow when the **split between layers** is spelled out in comments. Prefer short JSDoc and inline notes over long external-only docs.

### What to document

- **File-level** (once at the top): what the module owns, what it deliberately does *not* own, and the Rivet hook or HTTP equivalent when mirroring the other backend.
- **Public types and methods**: JSDoc on `RoomPlatform`, `RoomHost` entry points, DO handlers (`fetch`, `webSocketMessage`, `alarm`), and transport factories.
- **Non-obvious invariants** inline: single alarm multiplexing, `admit` vs `connect`, hibernation attachments, `armedAt` alarm dedupe, `msgId` replay behavior, multi-tab same `playerId`.

### What to skip

- Comments that restate the next line (`// increment i`).
- Duplicating full sequence diagrams from `docs/` unless one sentence points there.

### Where things live (keep comments aligned with this)

| Layer | Path | Comment focus |
| --- | --- | --- |
| Outer Worker + DO shell | `worker/index.ts` | Routing, CORS, WebSocket hibernation, `platform()` |
| Room orchestration | `src/cloudflare/room-host.ts` | Lifecycle, actions, timers; no Workers imports |
| Browser → room wire | `src/cloudflare/wire.ts` | Parsed socket payloads (not HTTP create) |
| Backend-agnostic client API | `src/transport/types.ts`, `cloudflare-client.ts` | `SongClient` / listeners vs Rivet events |
| Shared create + dedupe | `src/game/room-service.ts` | Used by Rivet actor and `RoomHost` |
| Rivet actor | `src/rivet/game-room.ts` | Keep parity notes when changing `RoomHost` |

When you change behavior in `room-host.ts` or `worker/index.ts`, update the matching JSDoc in the same PR. If Rivet parity shifts, mention it in the file header or method JSDoc.

### Tests

`src/cloudflare/room-host.test.ts` uses a fake `RoomPlatform`; comments there should explain *which* invariant each test guards (timer, reap, dedupe), not repeat the assertion.
