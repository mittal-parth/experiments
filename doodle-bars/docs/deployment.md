# Deployment Process

Two deploys. The site is the Next app on Vercel. The actor is the Docker image from `Dockerfile`,  on a machine you keep running (a VM, Railway, or Fly). Rivet Cloud is the router and the store. You do not run the actor on Vercel, and this plan does not use Rivet's own managed compute.

Nothing below is set in git. The values come from the Rivet dashboard, under Backend Configuration.

## 1. Rivet

Create the namespace. Copy both endpoint URLs.

- Secret, runner only: `https://<namespace>:sk_…@api.rivet.dev`
- Publishable, browser: `https://<namespace>:pk_…@api.rivet.dev`



## 2. The runner

Build `doodle-bars/Dockerfile`. It is Node 22 Debian and starts `npx tsx runner.ts`. Alpine is the wrong base. Rivet's SQLite build has no musl binary.

Set these on that service:


| Variable                | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| `RIVET_ENDPOINT`        | The `sk_` URL. This process only.                                       |
| `RIVET_PUBLIC_ENDPOINT` | The `pk_` URL.                                                          |
| `RIVET_RUNNER_VERSION`  | The git commit you deployed, so a later deploy can drain old actors.    |
| `GUESS_GRACE_SECONDS`   | Seconds after the clip before the round reveals. Default in code is 12. |
| `SONG_PREVIEW_MODE`     | `live` so the runner calls iTunes. `fixture` is for tests.              |
| `SONG_ORDER`            | `shuffle`, or `catalog` to keep playlist order.                         |


`RIVET_RUN_SERVICES` can stay unset. `runner.ts` sets it to `0` so the extra Services process is not started.

Do not open a public port for the actor. The process connects outbound to Rivet. It also needs outbound HTTPS to iTunes.

On the next deploy, let the process drain before it is killed. Rivet may take minutes to move live rooms onto the new process. State survives a hard kill. Players reconnect.

## 3. Vercel

Project root is `doodle-bars`.


| Variable                     | Value                                          |
| ---------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_RIVET_ENDPOINT` | The same `pk_` URL as `RIVET_PUBLIC_ENDPOINT`. |


Do not set `RIVET_ENDPOINT` or any `sk_` token on Vercel. The browser bundle can see `NEXT_PUBLIC_*`.

Redeploy the site after the variable is set. A build from before the variable existed still has the local fallback (`http://127.0.0.1:6420`) baked into the client.

## 4. Check

1. Runner logs show it connected to Rivet, and the process stays up.
2. Open the Vercel URL, host a room, copy the code.
3. Open that code in a second browser. Both should see the same lobby.
4. Start a round. The clip should load from iTunes, not from `/api/fixture-tone`.
5. Refresh one browser mid-round. The seat should return, and the page should not say the room is missing.

Local `npm run dev` is unchanged by these variables. Leave them unset on your laptop and the file-system runner on port 6420 is used.