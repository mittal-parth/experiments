# Song Guesser

Hear a few seconds of a song and name it, or switch the round so the answer is the artist. A close spelling still counts. In artist mode, the song title scores nothing. Host a room and send the link. The room code is in the URL. The host picks the playlist, the answer, the clip length, and how many songs are in the game.

The Next.js site stays on Vercel. Each room is one Rivet actor, keyed by its 4-character code, running in a long-lived Node process. Rivet Cloud stores the room. Locally there is no Rivet account: `npm run dev` starts `next dev` and a file-system runner on `127.0.0.1:6420`. That runner keeps its data in `~/.rivetkit`.

Songs live in `src/catalog/playlists/`. Add a file, register it in `src/catalog/registry.ts`, and add the same id to `src/catalog/public.ts`. Do not store preview URLs or audio.

```bash
npm install
npm run dev
npm test
npm run test:e2e
```

`npm start` serves the built site. The actor is a separate process, `npm run runner`, or the `Dockerfile` (Node 22 Debian, not Alpine). The runner leaves Rivet Services off (`RIVET_RUN_SERVICES=0`) so the engine can start. Set it to `1` only if you have a working `rivet-services` binary.

Set these on the runner yourself. Do not commit them.

- `RIVET_ENDPOINT` — secret `sk_` URL, this process only
- `RIVET_PUBLIC_ENDPOINT` — publishable `pk_` URL
- `RIVET_RUNNER_VERSION` — the commit SHA, so a deploy drains old actors
- `GUESS_GRACE_SECONDS` and `SONG_PREVIEW_MODE`
- Node 22. Outbound HTTPS to Rivet and iTunes is enough. On a deploy, let the process drain before it is killed.

On the Vercel project, set `NEXT_PUBLIC_RIVET_ENDPOINT` to that same publishable URL. Do not put `RIVET_ENDPOINT` or the `sk_` token on Vercel.

Previews are streamed from iTunes and stop after the chosen number of seconds. The screen says they often start at the hook. Reveal links back to Apple Music. Preview courtesy of iTunes.
