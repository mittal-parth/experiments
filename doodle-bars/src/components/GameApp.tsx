'use client'

import { useEffect, useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyInput,
  DrawablySelect,
} from 'drawably/react'
import { playlistChoices } from '@/catalog/public'
import { assertNever } from '@/game/assert-never'
import { CLIP_CHOICES, DEFAULT_CLIP_SECONDS } from '@/game/constants'
import { cleanCode, cleanNickname } from '@/game/names'
import type { ClientMessage, RoomView } from '@/game/protocol'
import { ClipPlayer } from './ClipPlayer'
import { useRoom } from './useRoom'

const NICK_KEY = 'doodle-bars-nick'

export function GameApp() {
  const room = useRoom()
  const phase = room.view?.phase ?? 'home'

  return (
    <main className="sheet" data-testid="phase" data-phase={phase}>
      <p className="eyebrow">name that hook</p>
      <h1>Doodle Bars</h1>
      {room.error ? (
        <p className="error" data-testid="error" role="alert">
          {room.error}
        </p>
      ) : null}
      {!room.connected && phase === 'home' ? <p className="quiet">Connecting…</p> : null}
      <Screen
        view={room.view}
        send={room.send}
        leave={room.leave}
      />
    </main>
  )
}

function Screen({
  view,
  send,
  leave,
}: {
  view: RoomView | null
  send: (message: ClientMessage) => void
  leave: () => void
}) {
  if (!view) return <Home send={send} />
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} send={send} leave={leave} />
    case 'playing':
      return <Playing view={view} send={send} />
    case 'reveal':
      return <Reveal view={view} send={send} />
    case 'done':
      return <Done view={view} send={send} leave={leave} />
    default:
      return assertNever(view.phase)
  }
}

function Home({ send }: { send: (message: ClientMessage) => void }) {
  const [nickname, setNickname] = useState('')
  const [playlistId, setPlaylistId] = useState<string>(playlistChoices[0]?.id ?? 'hindi')
  const [clipSeconds, setClipSeconds] = useState(DEFAULT_CLIP_SECONDS)
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(NICK_KEY)
    if (stored) setNickname(stored)
  }, [])

  function remember(value: string) {
    setNickname(value)
    localStorage.setItem(NICK_KEY, value)
  }

  function nickOrWarn(): string | null {
    const nick = cleanNickname(nickname)
    if (!nick) {
      setLocalError('Use 2–16 letters or numbers')
      return null
    }
    setLocalError(null)
    return nick
  }

  function create(mode: 'solo' | 'room') {
    const nick = nickOrWarn()
    if (!nick) return
    send({ type: 'create', nickname: nick, playlistId, clipSeconds, mode })
  }

  function join() {
    const nick = nickOrWarn()
    const roomCode = cleanCode(code)
    if (!nick) return
    if (!roomCode) {
      setLocalError('Enter the 4-character room code')
      return
    }
    send({ type: 'join', nickname: nick, code: roomCode })
  }

  return (
    <div className="stack">
      <p>Hear the opening of a preview. Name the song. No account, just a nickname.</p>
      {localError ? (
        <p className="error" role="alert">
          {localError}
        </p>
      ) : null}
      <label className="field" htmlFor="nickname">
        Nickname
        <DrawablyInput
          id="nickname"
          data-testid="nickname"
          value={nickname}
          maxLength={16}
          autoComplete="nickname"
          onChange={(event) => {
            remember(event.target.value)
          }}
        />
      </label>
      <PlaylistField
        playlistId={playlistId}
        onChange={setPlaylistId}
      />
      <ClipField seconds={clipSeconds} onChange={setClipSeconds} />
      <div className="row">
        <DrawablyButton type="button" variant="solid" data-testid="play-solo" onClick={() => create('solo')}>
          Play solo
        </DrawablyButton>
        <DrawablyButton type="button" data-testid="host-room" onClick={() => create('room')}>
          Host a room
        </DrawablyButton>
      </div>
      <label className="field" htmlFor="join-code">
        Room code
        <DrawablyInput
          id="join-code"
          data-testid="join-code"
          value={code}
          maxLength={4}
          autoCapitalize="characters"
          onChange={(event) => {
            setCode(event.target.value.toUpperCase())
          }}
        />
      </label>
      <div>
        <DrawablyButton type="button" data-testid="join-room" onClick={join}>
          Join
        </DrawablyButton>
      </div>
    </div>
  )
}

function Lobby({
  view,
  send,
  leave,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
  leave: () => void
}) {
  return (
    <div className="stack">
      <DrawablyCard className="card">
        {view.mode === 'room' ? (
          <>
            <p className="quiet">Share this code</p>
            <p className="code" data-testid="room-code">
              {view.code}
            </p>
          </>
        ) : (
          <p>Solo game. Pick a playlist, then start.</p>
        )}
      </DrawablyCard>
      <PlaylistField
        playlistId={view.playlistId}
        disabled={!view.you.isHost || view.starting}
        onChange={(playlistId) => {
          send({ type: 'configure', playlistId, clipSeconds: view.clipSeconds })
        }}
      />
      <ClipField
        seconds={view.clipSeconds}
        disabled={!view.you.isHost || view.starting}
        onChange={(clipSeconds) => {
          send({ type: 'configure', playlistId: view.playlistId, clipSeconds })
        }}
      />
      <Scoreboard view={view} />
      <div className="row">
        {view.you.isHost ? (
          <DrawablyButton
            type="button"
            variant="solid"
            data-testid="start-game"
            state={view.starting ? 'loading' : 'idle'}
            disabled={view.starting}
            onClick={() => {
              send({ type: 'start' })
            }}
          >
            {view.starting ? 'Finding a song…' : 'Start'}
          </DrawablyButton>
        ) : (
          <p className="quiet">Waiting for the host.</p>
        )}
        <DrawablyButton type="button" onClick={leave}>
          Leave
        </DrawablyButton>
      </div>
    </div>
  )
}

function Playing({
  view,
  send,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
}) {
  const [guess, setGuess] = useState('')
  const left = useCountdown(view.roundEndsAt)

  function submit() {
    const text = guess.trim()
    if (!text) return
    send({ type: 'guess', text })
    setGuess('')
  }

  return (
    <div className="stack">
      <p>
        Round {view.roundNumber} of {view.totalRounds} · {view.playlistName}
      </p>
      <p>
        First {view.clipSeconds} seconds of the preview. iTunes previews often start at the hook,
        not the first second of the full song.
      </p>
      {view.clip ? <ClipPlayer key={view.roundNumber} url={view.clip.previewUrl} seconds={view.clipSeconds} /> : null}
      <p className="quiet" data-testid="courtesy">
        Preview courtesy of iTunes.
      </p>
      {left !== null ? <p className="quiet">{left}s left to guess</p> : null}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label className="field" htmlFor="guess">
          Your guess
          <DrawablyInput
            id="guess"
            data-testid="guess-input"
            value={guess}
            maxLength={80}
            onChange={(event) => {
              setGuess(event.target.value)
            }}
          />
        </label>
        <div>
          <DrawablyButton type="submit" variant="solid" data-testid="guess-submit">
            Guess
          </DrawablyButton>
        </div>
      </form>
      <Feedback last={view.lastGuess} />
      <Scoreboard view={view} />
    </div>
  )
}

function Reveal({
  view,
  send,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
}) {
  return (
    <div className="stack">
      <p>
        Round {view.roundNumber} of {view.totalRounds}
      </p>
      {view.reveal ? (
        <DrawablyCard className="card">
          <p className="quiet">That was</p>
          <h2 data-testid="reveal-title">{view.reveal.title}</h2>
          <p>{view.reveal.artist}</p>
          <a data-testid="reveal-link" href={view.reveal.storeUrl} target="_blank" rel="noreferrer">
            Listen on Apple Music
          </a>
        </DrawablyCard>
      ) : null}
      <p className="quiet" data-testid="courtesy">
        Preview courtesy of iTunes.
      </p>
      <Feedback last={view.lastGuess} />
      <Scoreboard view={view} />
      {view.you.isHost ? (
        <DrawablyButton
          type="button"
          variant="solid"
          data-testid="next-round"
          onClick={() => {
            send({ type: 'next' })
          }}
        >
          {view.roundNumber >= view.totalRounds ? 'Finish' : 'Next song'}
        </DrawablyButton>
      ) : (
        <p className="quiet">Waiting for the host.</p>
      )}
    </div>
  )
}

function Done({
  view,
  send,
  leave,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
  leave: () => void
}) {
  return (
    <div className="stack">
      <h2>That&apos;s the set</h2>
      {view.reveal ? (
        <p>
          Last one was {view.reveal.title} · {view.reveal.artist}
        </p>
      ) : null}
      <Scoreboard view={view} />
      <div className="row">
        {view.you.isHost ? (
          <DrawablyButton
            type="button"
            variant="solid"
            data-testid="play-again"
            onClick={() => {
              send({ type: 'restart' })
            }}
          >
            Play again
          </DrawablyButton>
        ) : (
          <p className="quiet">Waiting for the host.</p>
        )}
        <DrawablyButton type="button" onClick={leave}>
          Leave
        </DrawablyButton>
      </div>
    </div>
  )
}

function PlaylistField({
  playlistId,
  onChange,
  disabled = false,
}: {
  playlistId: string
  onChange: (playlistId: string) => void
  disabled?: boolean
}) {
  return (
    <label className="field" htmlFor="playlist">
      Playlist
      <DrawablySelect
        id="playlist"
        data-testid="playlist"
        aria-label="Playlist"
        value={playlistId}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {playlistChoices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </DrawablySelect>
      <span className="quiet">
        {playlistChoices.find((choice) => choice.id === playlistId)?.description}
      </span>
    </label>
  )
}

function ClipField({
  seconds,
  onChange,
  disabled = false,
}: {
  seconds: number
  onChange: (seconds: number) => void
  disabled?: boolean
}) {
  return (
    <div className="stack tight">
      <span>Clip length</span>
      <div className="row">
        {CLIP_CHOICES.map((choice) => (
          <DrawablyButton
            key={choice}
            type="button"
            data-testid={`clip-${choice}`}
            variant={choice === seconds ? 'solid' : 'outline'}
            disabled={disabled}
            aria-pressed={choice === seconds}
            onClick={() => {
              onChange(choice)
            }}
          >
            {choice}s
          </DrawablyButton>
        ))}
      </div>
    </div>
  )
}

function Feedback({ last }: { last: RoomView['lastGuess'] }) {
  if (!last) return null
  if (last.correct) {
    return (
      <p data-testid="guess-feedback">
        That&apos;s it. {last.points} points.
      </p>
    )
  }
  return <p data-testid="guess-feedback">Not quite</p>
}

function Scoreboard({ view }: { view: RoomView }) {
  return (
    <ul className="scores" data-testid="scoreboard">
      {view.players.map((player) => (
        <li
          key={player.id}
          data-testid={player.id === view.you.id ? 'your-score' : undefined}
        >
          {player.nickname} {player.score}
          {player.solved ? ' · got it' : ''}
          {!player.connected ? ' · away' : ''}
        </li>
      ))}
    </ul>
  )
}

function useCountdown(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => {
      setNow(Date.now())
    }, 250)
    return () => {
      clearInterval(id)
    }
  }, [endsAt])
  if (!endsAt) return null
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}
