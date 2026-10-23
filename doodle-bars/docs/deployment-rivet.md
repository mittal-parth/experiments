# Deployment: Rivet backend

This is the alternate backend, selected with `NEXT_PUBLIC_ROOM_BACKEND=rivet`. The default is Cloudflare, see [deployment.md](deployment.md).

Two deploys. The site is the Next app on Vercel. The actor is the Docker image from `Dockerfile`, on a machine you keep running (a VM, Railway, or Fly). Rivet Cloud is the router and the store. You do not run the actor on Vercel, and this plan does not use Rivet's own managed compute.

Nothing below is set in git. The values come from the Rivet dashboard, under Backend Configuration.

The VM only runs the actor. The process dials out to Rivet, so you do not open a public port. The commands below are for a Debian or Ubuntu VM. Railway and Fly use the same image and the same variables.

## 1. Rivet

Create the namespace. Copy both endpoint URLs.

- Secret, runner only: `https://<namespace>:sk_…@api.rivet.dev`
- Publishable, browser: `https://<namespace>:pk_…@api.rivet.dev`

Keep the `sk_` URL off your laptop, off Vercel, and out of git.

## 2. The runner

Build `doodle-bars/Dockerfile`. It is Node 22 Debian (`node:22-bookworm-slim`) and starts `npx tsx runner.ts`. Alpine is the wrong base. Rivet's SQLite build has no musl binary.

Set these on that service:

| Variable                | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `RIVET_ENDPOINT`        | The `sk_` URL. This process only.                                        |
| `RIVET_PUBLIC_ENDPOINT` | The `pk_` URL.                                                           |
| `RIVET_RUNNER_VERSION`  | The git commit you deployed, so a later deploy can drain old actors.    |
| `GUESS_GRACE_SECONDS`   | Seconds after the clip before the round reveals. Default in code is 12. |
| `SONG_PREVIEW_MODE`     | `live` so the runner calls iTunes. `fixture` is for tests.               |
| `SONG_ORDER`            | `shuffle`, or `catalog` to keep playlist order.                          |

`RIVET_RUN_SERVICES` can stay unset. `runner.ts` sets it to `0` so the extra Services process is not started.

Do not open a public port for the actor. The process connects outbound to Rivet. It also needs outbound HTTPS to iTunes. A default cloud firewall that allows outbound 443 is enough. Leave 6420 closed.

Run at least two runner containers with the same env file (same `RIVET_ENDPOINT`, same `RIVET_RUNNER_VERSION`). Rivet Cloud routes new rooms to a healthy runner. If one container's outbound link to Rivet goes half-open, the other keeps serving players while Docker restarts the sick one.

Each runner polls Rivet's built-in health every 2 seconds. After two consecutive non-200 responses (often `503` with `engine_ping_stale`), or if the runner never becomes healthy within 60 seconds of boot, it logs a line like `runner unhealthy: …; exiting so the runner can restart` and exits with code 1. With `--restart unless-stopped`, Docker starts a fresh container and a new websocket. Room state lives in Rivet, not in the container.

### Install Docker

```bash
sudo apt-get update
sudo apt-get install -y docker.io git
sudo usermod -aG docker "$USER"
```

Log out and back in so the `docker` group applies. Confirm with `docker info`.

### Get the code

```bash
git clone <your-repo-url> experiments
cd experiments
git rev-parse HEAD
```

Save that commit SHA. It is `RIVET_RUNNER_VERSION`.

### Write the env file

Create `doodle-bars/runner.env` on the VM only. Do not commit it.

```bash
RIVET_ENDPOINT=https://<namespace>:sk_…@api.rivet.dev
RIVET_PUBLIC_ENDPOINT=https://<namespace>:pk_…@api.rivet.dev
RIVET_RUNNER_VERSION=<the SHA from git rev-parse HEAD>
GUESS_GRACE_SECONDS=12
SONG_PREVIEW_MODE=live
SONG_ORDER=shuffle
```

`SONG_ORDER=catalog` keeps playlist order.

### Build

Build from `doodle-bars`. The Dockerfile copies `package.json` and `package-lock.json` from that directory.

```bash
cd doodle-bars
docker build -t doodle-bars-runner .
```

### Start

```bash
docker run -d \
  --name doodle-bars-runner \
  --restart unless-stopped \
  --env-file runner.env \
  doodle-bars-runner
```

Do not pass `-p`. Inbound traffic is not required.

### Confirm

```bash
docker ps
docker logs -f doodle-bars-runner
```

The logs should show a connection to Rivet, and the container should still be running after that. `Ctrl-C` only stops following the log.

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

## 5. The next deploy

Build the new image, then stop the old container with a long timeout so Rivet can move live rooms. `runner.ts` shuts down on `SIGTERM`. Docker's default stop timeout is 10 seconds, which is too short. Rivet may take minutes. State survives a hard kill. Players reconnect.

```bash
git pull
SHA=$(git rev-parse HEAD)
```

Update `RIVET_RUNNER_VERSION` in `runner.env` to `$SHA`, then:

```bash
docker build -t doodle-bars-runner .
docker stop -t 300 doodle-bars-runner
docker rm doodle-bars-runner
docker run -d \
  --name doodle-bars-runner \
  --restart unless-stopped \
  --env-file runner.env \
  doodle-bars-runner
```
