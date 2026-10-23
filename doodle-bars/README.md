# Song Guesser

Hear a few seconds of a song and name it, or switch the round so the answer is the artist. A close spelling still counts. In artist mode, the song title scores nothing. Host a room and send the link. The room code is in the URL. The host picks the playlist, the answer, the clip length, and how many songs are in the game.

The Next.js site stays on Vercel. Each room is one Cloudflare Durable Object, keyed by its 4-character code, behind a small Worker (`worker/index.ts`). The room is saved in the object's SQLite storage. Locally there is no Cloudflare account: `npm run dev` starts `wrangler dev` on `127.0.0.1:8787`, then `next dev`. The Rivet actor backend is still in the repo as an alternate (`NEXT_PUBLIC_ROOM_BACKEND=rivet`).

Songs live in `src/catalog/playlists/`. Add a file, register it in `src/catalog/registry.ts`, and add the same id to `src/catalog/public.ts`. Do not store preview URLs or audio.

```bash
npm install
npm run dev
npm test
npm run test:e2e
```

`npm start` serves the built site. The rooms are the Worker, deployed with `npm run deploy:worker`. Set `NEXT_PUBLIC_ROOM_WS_URL` on Vercel to the Worker's `wss://` URL. See [docs/deployment.md](docs/deployment.md).

`npm run typecheck` checks the site and the Worker. `node scripts/smoke-worker.mjs [url]` plays a short game against a running Worker.

To use Rivet instead, build the site with `NEXT_PUBLIC_ROOM_BACKEND=rivet` and run it locally with `ROOM_BACKEND=rivet npm run dev`. The Rivet runner, its environment variables and its `Dockerfile` are described in [docs/deployment-rivet.md](docs/deployment-rivet.md).

Previews are streamed from iTunes and stop after the chosen number of seconds. The screen says they often start at the hook. Reveal links back to Apple Music. Preview courtesy of iTunes.
