'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyCircle,
  DrawablyHighlight,
  DrawablyInput,
  DrawablySelect,
} from 'drawably/react'
import { playlistChoices } from '@/catalog/public'
import { assertNever } from '@/game/assert-never'
import { CLIP_CHOICES, DEFAULT_CLIP_SECONDS } from '@/game/constants'
import { HEARD_STORAGE_KEY, heardIds, storeHeard } from '@/game/heard'
import { cleanCode, cleanNickname } from '@/game/names'
import type { ClientMessage, RoomView, SharedGuess } from '@/game/protocol'
import { standings, winnerText } from '@/game/standings'
import { ClipPlayer, unlockAudio } from './ClipPlayer'
import { DoodleField, NoteBand } from './Doodles'
import { useRoom } from './useRoom'

const NICK_KEY = 'song-guesser-nick'

export function GameApp() {
  const room = useRoom()
  const phase = room.view?.phase ?? 'home'
  const revealTrackId = room.view?.reveal?.trackId
  const playlistId = room.view?.playlistId

  useEffect(() => {
    if (!revealTrackId || !playlistId) return
    localStorage.setItem(
      HEARD_STORAGE_KEY,
      storeHeard(localStorage.getItem(HEARD_STORAGE_KEY), playlistId, revealTrackId),
    )
  }, [playlistId, revealTrackId])

  return (
    <div className="stage">
      <DoodleField />
      <main className="sheet" data-testid="phase" data-phase={phase}>
        <header className="mast">
          <NoteBand />
          <p className="eyebrow">Hear a clip. Guess the song or the artist.</p>
          <h1>
            Song <DrawablyHighlight seed={4} fill="#f0a202" stroke="#c47b12">Guesser</DrawablyHighlight>
          </h1>
        </header>
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
    </div>
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
    const stored = localStorage.getItem(NICK_KEY) ?? localStorage.getItem('doodle-bars-nick')
    if (stored) setNickname(stored)
    const fromUrl = cleanCode(new URLSearchParams(window.location.search).get('code') ?? '')
    if (fromUrl) setCode(fromUrl)
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
    unlockAudio()
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
    unlockAudio()
    send({ type: 'join', nickname: nick, code: roomCode })
  }

  return (
    <div className="stack">
      <DrawablyCard className="panel panel-lilac" seed={2} stroke="#7b4b94" fill="#7b4b94">
        <p className="lede">Hear a few seconds. Guess the song or the artist.</p>
      </DrawablyCard>
      {localError ? (
        <p className="error" role="alert">
          {localError}
        </p>
      ) : null}
      <DrawablyCard className="panel panel-sun" seed={6} stroke="#c47b12" fill="#f0a202">
        <div className="stack">
          <label className="field" htmlFor="nickname">
            Nickname
            <DrawablyInput
              id="nickname"
              data-testid="nickname"
              value={nickname}
              maxLength={16}
              autoComplete="nickname"
              seed={8}
              stroke="#c47b12"
              onChange={(event) => {
                remember(event.target.value)
              }}
            />
          </label>
          <PlaylistField playlistId={playlistId} onChange={setPlaylistId} />
          <ClipField seconds={clipSeconds} onChange={setClipSeconds} />
        </div>
      </DrawablyCard>
      <div className="row actions">
        <DrawablyButton
          type="button"
          variant="solid"
          data-testid="play-solo"
          seed={11}
          fill="#e24b4b"
          paper="#fffaf5"
          onClick={() => create('solo')}
        >
          Play solo
        </DrawablyButton>
        <DrawablyButton
          type="button"
          variant="solid"
          data-testid="host-room"
          seed={12}
          fill="#1f8a70"
          paper="#fffaf5"
          onClick={() => create('room')}
        >
          Host a room
        </DrawablyButton>
      </div>
      <DrawablyCard className="panel panel-rose" seed={9} stroke="#c44536" fill="#e24b4b">
        <div className="stack tight">
          <p className="quiet">Got a code from a friend?</p>
          <div className="join-row">
            <label className="field" htmlFor="join-code">
              Room code
              <DrawablyInput
                id="join-code"
                data-testid="join-code"
                value={code}
                maxLength={4}
                autoCapitalize="characters"
                seed={10}
                stroke="#c44536"
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                }}
              />
            </label>
            <DrawablyButton
              type="button"
              variant="solid"
              data-testid="join-room"
              seed={13}
              fill="#3a5ccc"
              paper="#fffaf5"
              onClick={join}
            >
              Join
            </DrawablyButton>
          </div>
        </div>
      </DrawablyCard>
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
      <DrawablyCard className="panel panel-sun" seed={14} stroke="#c47b12" fill="#f0a202">
        {view.mode === 'room' ? (
          <>
            <p className="quiet">Share this code</p>
            <p className="code" data-testid="room-code">
              <DrawablyCircle seed={15} stroke="#e24b4b">{view.code}</DrawablyCircle>
            </p>
            <RoomLink code={view.code} />
          </>
        ) : (
          <p className="lede">Solo game. Pick a playlist, then start.</p>
        )}
      </DrawablyCard>
      <DrawablyCard className="panel panel-sea" seed={17} stroke="#1f8a70" fill="#1f8a70">
        <div className="stack">
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
        </div>
      </DrawablyCard>
      <div className="row">
        {view.you.isHost ? (
          <DrawablyButton
            type="button"
            variant="solid"
            data-testid="start-game"
            seed={16}
            fill="#e24b4b"
            paper="#fffaf5"
            state={view.starting ? 'loading' : 'idle'}
            disabled={view.starting}
            onClick={() => {
              unlockAudio()
              send({
                type: 'start',
                avoidTrackIds: heardIds(localStorage.getItem(HEARD_STORAGE_KEY), view.playlistId),
              })
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
  const youSolved = view.players.some((player) => player.id === view.you.id && player.solved)
  const left = useCountdown(youSolved ? null : view.roundEndsAt)

  function submit() {
    const text = guess.trim()
    if (!text || youSolved) return
    setGuess('')
    send({ type: 'guess', text })
  }

  return (
    <div className="stack">
      <RoundHeading view={view} />
      <DrawablyCard className="panel panel-sea" seed={18} stroke="#1f8a70" fill="#1f8a70">
        <div className="stack">
          {view.clip ? <ClipPlayer key={view.roundNumber} url={view.clip.previewUrl} seconds={view.clipSeconds} /> : null}
          <p className="quiet">This clip is {view.clipSeconds} seconds, from later in the preview.</p>
          <p className="quiet">Faster answers score more. The artist is worth fewer points.</p>
          <p className="quiet" data-testid="courtesy">
            Preview courtesy of iTunes.
          </p>
          {youSolved ? (
            <p className="clock" data-testid="clock">
              Timer stopped
            </p>
          ) : left !== null ? (
            <p className="clock" data-testid="clock">
              {left}s left
            </p>
          ) : null}
        </div>
      </DrawablyCard>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <DrawablyCard className="panel panel-rose" seed={19} stroke="#c44536" fill="#e24b4b">
          <div className="stack">
            <label className="field" htmlFor="guess">
              Song or artist
              <DrawablyInput
                id="guess"
                data-testid="guess-input"
                value={guess}
                maxLength={80}
                seed={20}
                stroke="#c44536"
                onChange={(event) => {
                  setGuess(event.target.value)
                }}
              />
            </label>
            <div>
              <DrawablyButton
                type="submit"
                variant="solid"
                data-testid="guess-submit"
                seed={21}
                fill="#e24b4b"
                paper="#fffaf5"
                disabled={youSolved}
              >
                Guess
              </DrawablyButton>
            </div>
          </div>
        </DrawablyCard>
      </form>
      <GuessChat view={view} />
      <Cover url={view.artworkUrl} />
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
      <RoundHeading view={view} />
      {view.reveal ? (
        <DrawablyCard className="panel panel-sun" seed={22} stroke="#c47b12" fill="#f0a202">
          <Cover url={view.artworkUrl} />
          <p className="quiet">That was</p>
          <h2 data-testid="reveal-title">
            <DrawablyHighlight seed={23} fill="#f0a202" stroke="#c47b12">{view.reveal.title}</DrawablyHighlight>
          </h2>
          <p>{view.reveal.artist}</p>
          <a className="apple-link" data-testid="reveal-link" href={view.reveal.storeUrl} target="_blank" rel="noreferrer">
            Listen on Apple Music
          </a>
        </DrawablyCard>
      ) : null}
      <p className="quiet" data-testid="courtesy">
        Preview courtesy of iTunes.
      </p>
      <GuessChat view={view} />
      <Feedback last={view.lastGuess} />
      <Scoreboard view={view} />
      {view.you.isHost ? (
        <DrawablyButton
          type="button"
          variant="solid"
          data-testid="next-round"
          seed={24}
          fill="#1f8a70"
          paper="#fffaf5"
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
  const ranked = standings(view.players)
  const headline = winnerText(view.players)
  const guessed = view.recap.filter((round) => round.scores.some((score) => score.kind === 'correct'))
  const missed = view.recap.filter((round) => !round.scores.some((score) => score.kind === 'correct'))
  return (
    <div className="stack">
      <h2>Final scores</h2>
      {headline ? (
        <p className="winner-line" data-testid="winner">
          {headline}
        </p>
      ) : (
        <p className="winner-line" data-testid="winner">
          You scored {view.players[0]?.score ?? 0}
        </p>
      )}
      <ol className="leaderboard" data-testid="leaderboard">
        {ranked.map((player) => (
          <li key={player.id} className={player.id === view.you.id ? 'you' : undefined}>
            <span className="place">{player.place}</span>
            <span>{player.nickname}</span>
            <span>{player.score}</span>
          </li>
        ))}
      </ol>
      <SongRecap heading="Guessed" countTestId="guessed-count" rounds={guessed} />
      <SongRecap heading="Not guessed" rounds={missed} />
      <div className="row">
        {view.you.isHost ? (
          <DrawablyButton
            type="button"
            variant="solid"
            data-testid="play-again"
            seed={25}
            fill="#f0a202"
            paper="#241c16"
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

function SongRecap({
  heading,
  rounds,
  countTestId,
}: {
  heading: string
  rounds: RoomView['recap']
  countTestId?: string
}) {
  if (rounds.length === 0 && heading !== 'Guessed') return null
  return (
    <section className="stack tight">
      <h3 className="recap-heading" data-testid={countTestId}>
        {heading} {rounds.length}
      </h3>
      {rounds.length > 0 ? (
        <ul className="recap" data-testid={heading === 'Guessed' ? 'recap' : 'recap-missed'}>
          {rounds.map((round) => {
            const solved = round.scores.some((score) => score.kind === 'correct')
            const tone = [solved ? 'hit' : 'miss', round.scores.length > 0 ? 'scored' : ''].filter(Boolean).join(' ')
            return (
              <li key={`${round.storeUrl}-${round.title}`} className={tone}>
                <div className="recap-copy">
                  <p className="recap-title">{round.title}</p>
                  <p className="recap-artist">{round.artist}</p>
                </div>
                <a
                  className="store-icon"
                  href={round.storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Listen to ${round.title} on Apple Music`}
                >
                  <LinkIcon />
                </a>
                {round.scores.length > 0 ? (
                  <ul className="recap-scores">
                    {round.scores.map((score, index) => (
                      <li key={`${score.nickname}-${score.kind}-${index}`} data-kind={score.kind}>
                        <span className="recap-who">{score.nickname}</span>
                        <span className="recap-pts" data-testid="recap-points">
                          {score.points}
                          {score.kind === 'artist' ? <span className="recap-kind"> artist</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-9 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        seed={31}
        stroke="#1f8a70"
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
      <div className="row clip-choices">
        {CLIP_CHOICES.map((choice) => (
          <DrawablyButton
            key={choice}
            type="button"
            data-testid={`clip-${choice}`}
            seed={30 + choice}
            variant={choice === seconds ? 'solid' : 'outline'}
            fill={choice === seconds ? '#1f8a70' : '#fff6ea'}
            paper={choice === seconds ? '#fffaf5' : '#241c16'}
            stroke="#1f8a70"
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
      <DrawablyCard className="panel panel-leaf" seed={26} stroke="#2f8f4e" fill="#2f8f4e">
        <p className="feedback" data-testid="guess-feedback">
          That&apos;s it. {last.points} points.
        </p>
      </DrawablyCard>
    )
  }
  if (last.artist) {
    return (
      <DrawablyCard className="panel panel-sea" seed={29} stroke="#1f8a70" fill="#1f8a70">
        <p className="feedback" data-testid="guess-feedback">
          {last.points > 0
            ? `That's the artist. ${last.points} points.`
            : 'You already named the artist.'}
        </p>
      </DrawablyCard>
    )
  }
  if (last.close) {
    return (
      <DrawablyCard className="panel panel-sun" seed={28} stroke="#c47b12" fill="#f0a202">
        <p className="feedback" data-testid="guess-feedback">
          Very close
        </p>
      </DrawablyCard>
    )
  }
  return (
    <DrawablyCard className="panel panel-rose" seed={27} stroke="#c44536" fill="#e24b4b">
      <p className="feedback" data-testid="guess-feedback">Not quite</p>
    </DrawablyCard>
  )
}

function guessTag(kind: SharedGuess['kind'], points: number): string | null {
  switch (kind) {
    case 'miss':
      return null
    case 'close':
      return 'Very close'
    case 'correct':
      return `${points} points`
    case 'artist':
      return points > 0 ? `Artist · ${points}` : 'Already named'
    default:
      return assertNever(kind)
  }
}

function GuessChat({ view }: { view: RoomView }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [view.guesses])

  return (
    <div className="chat" data-testid="guess-chat">
      {view.guesses.length === 0 ? <p className="quiet">No guesses yet.</p> : null}
      <ul>
        {view.guesses.map((guess) => {
          const tag = guessTag(guess.kind, guess.points)
          return (
            <li key={guess.id} className={guess.playerId === view.you.id ? 'you' : undefined} data-kind={guess.kind}>
              <span className="who">{guess.nickname}</span>
              <span>{guess.text}</span>
              {tag ? <span className="tag">{tag}</span> : null}
            </li>
          )
        })}
      </ul>
      <div ref={bottomRef} />
    </div>
  )
}

function Cover({ url }: { url: string | null }) {
  if (!url) return null
  return <img className="cover" data-testid="reveal-art" src={url} alt="Album cover" />
}

function RoomLink({ code }: { code: string }) {
  const [link, setLink] = useState('')
  useEffect(() => {
    setLink(`${window.location.origin}/?code=${code}`)
  }, [code])
  if (!link) return null
  return (
    <p className="share-link" data-testid="room-link">
      Send this page. The code is in the link.
      <br />
      {link}
    </p>
  )
}

function Scoreboard({ view }: { view: RoomView }) {
  const rows = standings(view.players)
  return (
    <ul className="scores" data-testid="scoreboard">
      {rows.map((player) => (
        <li
          key={player.id}
          className={player.id === view.you.id ? 'you' : undefined}
          data-testid={player.id === view.you.id ? 'your-score' : undefined}
        >
          <span className="swatch" aria-hidden="true" />
          {player.nickname} {player.score}
          {player.solved ? ' · got it' : ''}
          {!player.solved && player.namedArtist ? ' · artist' : ''}
          {!player.connected ? ' · away' : ''}
        </li>
      ))}
    </ul>
  )
}

function RoundHeading({ view }: { view: RoomView }) {
  return (
    <div className="stack tight">
      <p className="round-line">
        <span className="round-pill">
          Round {view.roundNumber} of {view.totalRounds}
        </span>
        <span>{view.playlistName}</span>
      </p>
      <div className="pips" aria-hidden="true">
        {Array.from({ length: view.totalRounds }, (_, index) => (
          <span key={index} className={index < view.roundNumber ? 'on' : undefined} />
        ))}
      </div>
    </div>
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
