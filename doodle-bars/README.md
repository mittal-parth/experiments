# Song Guesser

Hear a few seconds of a song and name it, or switch the round so the answer is the artist. A close spelling still counts. In artist mode, the song title scores nothing. Host a room and send the link. The room code is in the URL. The host picks the playlist, the answer, the clip length, and how many songs are in the game.

Set the Vercel project root to `doodle-bars`. WebSockets use Fluid compute (`experimental_upgradeWebSocket` on `/api/ws`). Locally, `npm run dev` attaches the same hub with the `ws` package, because that upgrade helper does not run under `next dev`.

Songs live in `src/catalog/playlists/`. Add a file, register it in `src/catalog/registry.ts`, and add the same id to `src/catalog/public.ts`. Do not store preview URLs or audio. There is no database: rooms stay in memory for the prototype. If two Vercel instances split a room, add Redis later for snapshots and pub/sub.

```bash
npm install
npm run dev
npm test
npm run test:e2e
```

Previews are streamed from iTunes and stop after the chosen number of seconds. The screen says they often start at the hook. Reveal links back to Apple Music. Preview courtesy of iTunes.
