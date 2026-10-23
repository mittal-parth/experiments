# Deployment

Two deploys. The site is the Next app on Vercel. The rooms are one Cloudflare Worker with a Durable Object class. There is no VM, no Docker image and no watchdog. The Rivet backend is still available, see [deployment-rivet.md](deployment-rivet.md).

## 1. The Worker

One time:

```bash
cd doodle-bars
npx wrangler login
npm run deploy:worker
```

`wrangler deploy` publishes `worker/index.ts` and applies the migration in `wrangler.jsonc` that creates the SQLite-backed `GameRoom` class. The live URL is `https://doodle-bars-rooms.songguesser.workers.dev`. A custom domain is optional.

A merge to `main` that changes the room worker deploys it. The workflow is [`.github/workflows/deploy-doodle-bars-worker.yml`](../../.github/workflows/deploy-doodle-bars-worker.yml). It runs `wrangler deploy` in `doodle-bars` and leaves the Vercel site alone. A site-only change does not restart rooms. A worker deploy still drops open sockets; clients reconnect and retry the last command.

One time, add these [Actions secrets](https://github.com/mittal-parth/experiments/settings/secrets/actions):

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token from the "Edit Cloudflare Workers" template, scoped to this account. [Create a token](https://dash.cloudflare.com/profile/api-tokens). |
| `CLOUDFLARE_ACCOUNT_ID` | Account id from the dashboard URL (`dash.cloudflare.com/<account id>/`). |

The workflow has to be on `main` before it runs. Until those secrets exist, the job fails at authentication and does not publish. You can also run it by hand from the Actions tab.

Settings are `vars` in `wrangler.jsonc`:

| Variable | Value |
| --- | --- |
| `SONG_PREVIEW_MODE` | `live` so the room calls iTunes. `fixture` is for tests. |
| `SONG_ORDER` | `shuffle`, or `catalog` to keep playlist order. |
| `GUESS_GRACE_SECONDS` | Seconds after the clip before the round reveals. |
| `ALLOWED_ORIGINS` | Comma-separated site origins, such as `https://doodle-bars.vercel.app`. Empty allows any origin. Set this once you know the site URL. |

There are no secrets. Do not put any in `vars`.

## 2. Vercel

Project root is `doodle-bars`.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_ROOM_WS_URL` | The Worker URL with `wss://`, for example `wss://doodle-bars-rooms.<account>.workers.dev`. |

`NEXT_PUBLIC_ROOM_BACKEND` can stay unset. The default is `cloudflare`. Redeploy the site after setting the URL, because `NEXT_PUBLIC_*` values are baked into the build. A build without it points at `ws://127.0.0.1:8787`.

## 3. Check

1. `curl https://<worker>/health` returns `{"ok":true}`.
2. Optional: `node scripts/smoke-worker.mjs https://<worker>` creates a room, starts a round against live iTunes, resumes, and leaves. It should print `playing` after the start and `No room with that code` at the end.
3. Open the Vercel URL, host a room, copy the code, and open it in a second browser. Both should see the same lobby.
4. Start a round. The clip should load from iTunes, not from `/api/fixture-tone`.
5. Refresh a browser mid-round. The seat should return.

The smoke test in step 2 is the one that matters most the first time. iTunes sees Cloudflare's shared outbound addresses, and it could throttle them. If `start` fails with a lookup error, look at `npx wrangler tail`.

## 4. The next deploy

Run `npm run deploy:worker` again. A deploy restarts the room objects and drops open sockets. The browser reconnects with a short backoff and sends its last command again with the same `msgId`, so nothing is applied twice. Rooms are restored from storage. There is no drain step and no version pinning.

Deploy the site after the Worker if the wire format changed.

## Cost

The free Workers plan is enough to start. Durable Objects on the free plan must be SQLite-backed, which `GameRoom` is. Daily limits reset at 00:00 UTC, and past a limit that kind of operation fails instead of billing:

| Limit | Free | Paid ($5 per month) |
| --- | --- | --- |
| Requests | 100,000 per day | 1M per month, then $0.15 per million |
| Duration | 13,000 GB-s per day | 400,000 GB-s per month |
| SQLite rows written | 100,000 per day | 50M per month |
| SQLite rows read | 5M per day | 25B per month |
| Storage | 5 GB | 5 GB, then $0.20 per GB-month |

Counted as requests: each HTTP request, each WebSocket connect, each alarm, and incoming WebSocket messages at 20 to 1. The rows written limit is the one to watch. Each action saves the room once. Expect on the order of 100 writes for a four-player game, so roughly a thousand games a day on the free plan. That estimate is untested. If the free limit is hit, upgrade to the paid plan.

## Rolling back to Rivet

Set `NEXT_PUBLIC_ROOM_BACKEND=rivet` and `NEXT_PUBLIC_RIVET_ENDPOINT` on Vercel, deploy the runner per [deployment-rivet.md](deployment-rivet.md), and redeploy the site. Rooms do not move between backends.
