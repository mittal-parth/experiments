# Song Guesser docs

- [How the pieces talk](architecture.md). Browser, Cloudflare Worker, and the room Durable Object. This is the default backend.
- [What to deploy next](deployment.md). `wrangler deploy`, the Vercel variable, and the cost limits.
- [A game, step by step](sequences.md). Join, song load, guesses, a drop, and play again.
- [How a click becomes an action](actions.md). What `useRoom` calls for create, join, guess, and leave.
- Alternate Rivet backend: [architecture](architecture-rivet.md) and [deployment](deployment-rivet.md). Select it with `NEXT_PUBLIC_ROOM_BACKEND=rivet`.
