# A game, step by step

These diagrams use the Rivet names. On the default Cloudflare backend, "Rivet" is the Worker and "Actor" is the `GameRoom` Durable Object, and the steps are the same. Each diagram is one stretch of a room. "Rivet" is Rivet Cloud in production and the local runner on port 6420 in dev. The actor runs inside your process either way. Snapshots are per connection. A player never receives another player's view.

## Host opens a room, guest joins

```mermaid
sequenceDiagram
  participant Host
  participant Rivet
  participant Actor
  participant Guest

  Host->>Rivet: create([code], input)
  Rivet->>Actor: createState
  Note over Actor: lobby, host already seated
  Host->>Rivet: connect playerId, resume
  Rivet->>Actor: onConnect
  Actor-->>Host: snapshot lobby

  Guest->>Rivet: get([code]) then connect, intent join
  Guest->>Rivet: join(nickname)
  Rivet->>Actor: join
  Actor-->>Host: snapshot, both names
  Actor-->>Guest: snapshot lobby
```

The host connects with `resume` because `createRoom` already seated them. The guest is allowed to connect before they have a seat. `join` is the action that seats them. Until that succeeds, the guest has no snapshot.

A second `create` of the same code fails. The host mints another code and tries again, up to 20 times.

## Start loads songs, then the clock starts

```mermaid
sequenceDiagram
  participant Host
  participant Actor
  participant iTunes
  participant Guest

  Host->>Actor: start(msgId, avoidTrackIds)
  Actor-->>Host: snapshot, starting
  Actor-->>Guest: snapshot, starting
  Actor->>iTunes: keepAwake loadRoundSongs
  iTunes-->>Actor: songs
  Actor->>Actor: beginGame, schedule round end
  Actor-->>Host: snapshot playing, clip url, title hidden
  Actor-->>Guest: snapshot playing, title hidden
```

`keepAwake` stops the actor from sleeping while iTunes answers. Each browser plays the clip itself. The shared fact is `roundEndsAt`.

If iTunes returns nothing, the actor aborts `starting`, forgets the `msgId`, and sends `error` only to the host. The same Start click can be retried.

## Guesses

A correct title reveals the round for everyone. `syncPhase` moves to `reveal` as soon as anyone is in `solvedIds`. A wrong guess stays in `playing`. Both players still get a new snapshot, so the scoreboard updates.

```mermaid
sequenceDiagram
  participant Guest
  participant Actor
  participant Host

  Guest->>Actor: guess(msgId, "nope")
  Note over Actor: still playing
  Actor-->>Guest: snapshot, miss
  Actor-->>Host: snapshot, scoreboard

  Guest->>Actor: guess(newMsgId, title)
  Note over Actor: reveal
  Actor-->>Guest: snapshot, title and points
  Actor-->>Host: snapshot, title and points
```

The host then sends `next(msgId, roundNumber)`. The actor advances, schedules the new deadline, and both get a `playing` snapshot with the next clip. The title is hidden again.

When `next` runs past the last song, the phase is `done`. Both get the recap.

## The round can end with no guess

```mermaid
sequenceDiagram
  participant Actor
  participant Host
  participant Guest

  Note over Actor: schedule.after fires _onRoundDue
  Actor->>Actor: syncPhase, phase is reveal
  Actor-->>Host: snapshot, title shown
  Actor-->>Guest: snapshot, title shown
```

This runs with zero connections too. On the next connect the player gets that reveal snapshot.

## One player drops, then comes back

The room stays. Only that player's `connected` flag flips. The other player keeps playing.

```mermaid
sequenceDiagram
  participant Guest
  participant Actor
  participant Host

  Guest--xActor: socket drops
  Actor->>Actor: onDisconnect, guest marked away
  Actor-->>Host: snapshot, guest away
  Note over Guest: last command kept, same msgId
  Guest->>Actor: connect same playerId, resume
  Actor-->>Guest: snapshot of the round as it is now
  Guest->>Actor: same guess msgId again
  Actor-->>Guest: current snapshot, guess not applied twice
```

`sessionStorage` still has `{ code, playerId }`, so this is a resume, not a new seat. A repeat `msgId` is in the last 32 for that player. The actor resends the view and does not score again.

If the guess never reached the actor before the drop, the replay is the first time it is applied.

## Play again

```mermaid
sequenceDiagram
  participant Host
  participant Actor
  participant Guest

  Host->>Actor: restart(msgId)
  Note over Actor: lobby, scores 0, songs cleared
  Actor-->>Host: snapshot lobby
  Actor-->>Guest: snapshot lobby
  Host->>Actor: start(newMsgId)
  Note over Actor: load songs again, first round
```

`restart` is host-only and only from `done`. The next `start` is the same load path as the first game.

## Errors stay on the connection that caused them

A snapshot can still go to everyone when the room changed. The `error` event does not.

```mermaid
sequenceDiagram
  participant Guest
  participant Actor
  participant Host

  Guest->>Actor: guess after the deadline
  Actor->>Actor: syncPhase, round already reveal
  Actor-->>Guest: error "That round just ended"
  Actor-->>Guest: snapshot reveal
  Actor-->>Host: snapshot reveal
  Note over Host: no error event
```

Other refusals (`Only the host can do that`, `Join a room first`, `You already have this one`) are an `error` event to the caller. The other browser is unchanged unless the action also wrote the room.

A missing actor is different. `get([code]).resolve()` fails with `not_found`, or a resume names a player who is not seated. Both become "No room with that code". `useRoom` forgets the session and clears the view. A socket drop does not. The seat is still there.
