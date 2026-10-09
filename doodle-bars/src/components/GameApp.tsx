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
import { allowsArtistGuess } from '@/game/playlist-rules'
import { BEST_KEY, bestScore, readStoredBest, withBest, type BestBoard } from '@/game/best'
import { CLIP_CHOICES, DEFAULT_CLIP_SECONDS, DEFAULT_ROUNDS, ROUND_CHOICES } from '@/game/constants'
import { HEARD_STORAGE_KEY, heardIds, storeHeard } from '@/game/heard'
import { cleanCode, cleanNickname } from '@/game/names'
import type { AnswerMode, ClientMessage, RoomView, SharedGuess } from '@/game/protocol'
import { standings, winnerText } from '@/game/standings'
import { ClipPlayer, unlockAudio } from './ClipPlayer'
import { NoteBand } from './Doodles'
import { useRoom } from './useRoom'

const NICK_KEY = 'song-guesser-nick'

export function GameApp() {
  const room = useRoom()
  const phase = room.view?.phase ?? 'home'
  const revealTrackId = room.view?.reveal?.trackId
  const playlistId = room.view?.playlistId
  const youId = room.view?.you.id
  const finishedScore =
    room.view?.phase === 'done'
      ? (room.view.players.find((player) => player.id === youId)?.score ?? null)
      : null

  useEffect(() => {
    if (!revealTrackId || !playlistId) return
    localStorage.setItem(
      HEARD_STORAGE_KEY,
      storeHeard(localStorage.getItem(HEARD_STORAGE_KEY), playlistId, revealTrackId),
    )
  }, [playlistId, revealTrackId])

  return (
    <div className="stage">
      <main className="sheet" data-testid="phase" data-phase={phase}>
        <header className="mast">
          <NoteBand />
          <p className="eyebrow">Hear a clip. Name the song, or switch and name the artist.</p>
          <h1>
            Song <DrawablyHighlight seed={4} fill="#f0a202" stroke="#c47b12">Guesser</DrawablyHighlight>
          </h1>
          {room.view ? (
            <PersonalBest nickname={room.view.you.nickname} pendingScore={finishedScore} />
          ) : null}
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
          error={room.error}
          waiting={room.waiting}
          connected={room.connected}
        />
      </main>
    </div>
  )
}

function Screen({
  view,
  send,
  leave,
  error,
  waiting,
  connected,
}: {
  view: RoomView | null
  send: (message: ClientMessage) => void
  leave: () => void
  error: string | null
  waiting: boolean
  connected: boolean
}) {
  if (!view) return <Home send={send} waiting={waiting} connected={connected} />
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} send={send} leave={leave} />
    case 'playing':
      return <Playing view={view} send={send} waiting={waiting} error={error} />
    case 'reveal':
      return <Reveal view={view} send={send} waiting={waiting} />
    case 'done':
      return <Done view={view} send={send} leave={leave} waiting={waiting} connected={connected} />
    default:
      return assertNever(view.phase)
  }
}

function Home({
  send,
  waiting,
  connected,
}: {
  send: (message: ClientMessage) => void
  waiting: boolean
  connected: boolean
}) {
  const [nickname, setNickname] = useState('')
  const [playlistId, setPlaylistId] = useState<string>(playlistChoices[0]?.id ?? 'hindi')
  const [clipSeconds, setClipSeconds] = useState(DEFAULT_CLIP_SECONDS)
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUNDS)
  const [answer, setAnswer] = useState<AnswerMode>('song')
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
    if (waiting) return
    const nick = nickOrWarn()
    if (!nick) return
    unlockAudio()
    send({ type: 'create', nickname: nick, playlistId, clipSeconds, roundCount, mode, answer })
  }

  function join() {
    if (waiting) return
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
        <p className="lede">Hear a few seconds. Guess the song, or switch and name the artist.</p>
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
          <PlaylistField
            playlistId={playlistId}
            onChange={(id) => {
              setPlaylistId(id)
              if (!allowsArtistGuess(id)) setAnswer('song')
            }}
          />
          <AnswerField answer={answer} allowArtist={allowsArtistGuess(playlistId)} onChange={setAnswer} />
          <ClipField seconds={clipSeconds} onChange={setClipSeconds} />
          <RoundField count={roundCount} onChange={setRoundCount} />
          <PersonalBest nickname={nickname} pendingScore={null} />
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
          state={waiting ? 'loading' : 'idle'}
          disabled={waiting}
          onClick={() => create('solo')}
        >
          {waiting ? (connected ? 'Starting…' : 'Connecting…') : 'Play solo'}
        </DrawablyButton>
        <DrawablyButton
          type="button"
          variant="solid"
          data-testid="host-room"
          seed={12}
          fill="#1f8a70"
          paper="#fffaf5"
          state={waiting ? 'loading' : 'idle'}
          disabled={waiting}
          onClick={() => create('room')}
        >
          {waiting ? (connected ? 'Starting…' : 'Connecting…') : 'Host a room'}
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
              state={waiting ? 'loading' : 'idle'}
              disabled={waiting}
              onClick={join}
            >
              {waiting ? (connected ? 'Joining…' : 'Connecting…') : 'Join'}
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
              send(settings(view, { playlistId }))
            }}
          />
          <AnswerField
            answer={view.answer}
            allowArtist={allowsArtistGuess(view.playlistId)}
            disabled={!view.you.isHost || view.starting}
            onChange={(answer) => {
              send(settings(view, { answer }))
            }}
          />
          <ClipField
            seconds={view.clipSeconds}
            disabled={!view.you.isHost || view.starting}
            onChange={(clipSeconds) => {
              send(settings(view, { clipSeconds }))
            }}
          />
          <RoundField
            count={view.roundCount}
            disabled={!view.you.isHost || view.starting}
            onChange={(roundCount) => {
              send(settings(view, { roundCount }))
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
        <DrawablyButton type="button" data-testid="leave" onClick={leave}>
          Leave
        </DrawablyButton>
      </div>
    </div>
  )
}

function Playing({
  view,
  send,
  waiting,
  error,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
  waiting: boolean
  error: string | null
}) {
  const [guess, setGuess] = useState('')
  const sentGuess = useRef<string | null>(null)
  const youSolved = view.players.some((player) => player.id === view.you.id && player.solved)
  const left = useCountdown(youSolved ? null : view.roundEndsAt)

  useEffect(() => {
    if (!sentGuess.current) return
    const echoed = view.guesses.some((item) => item.playerId === view.you.id && item.text === sentGuess.current)
    if (echoed) sentGuess.current = null
  }, [view.guesses, view.you.id])

  useEffect(() => {
    if (!error || !sentGuess.current) return
    setGuess(sentGuess.current)
    sentGuess.current = null
  }, [error])

  function submit() {
    const text = guess.trim()
    if (!text || youSolved || waiting) return
    sentGuess.current = text
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
          <p className="quiet">
            {view.answer === 'artist'
              ? 'Faster answers score more. A close spelling still counts. The song title scores nothing.'
              : allowsArtistGuess(view.playlistId)
                ? 'Faster answers score more. The artist is worth fewer points.'
                : 'Faster answers score more. Name the song.'}
          </p>
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
              {view.answer === 'artist' ? 'Artist' : allowsArtistGuess(view.playlistId) ? 'Song or artist' : 'Song'}
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
                state={waiting ? 'loading' : 'idle'}
                disabled={youSolved || waiting}
              >
                {waiting ? 'Sending…' : 'Guess'}
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
  waiting,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
  waiting: boolean
}) {
  const finishing = view.roundNumber >= view.totalRounds
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
          state={waiting ? 'loading' : 'idle'}
          disabled={waiting}
          onClick={() => {
            if (waiting) return
            unlockAudio()
            send({ type: 'next', roundNumber: view.roundNumber })
          }}
        >
          {waiting ? (finishing ? 'Finishing…' : 'Loading song…') : finishing ? 'Finish' : 'Next song'}
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
  waiting,
  connected,
}: {
  view: RoomView
  send: (message: ClientMessage) => void
  leave: () => void
  waiting: boolean
  connected: boolean
}) {
  const ranked = standings(view.players)
  const headline = winnerText(view.players)
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
      <Cover url={view.artworkUrl} />
      <ol className="leaderboard" data-testid="leaderboard">
        {ranked.map((player) => (
          <li key={player.id} className={player.id === view.you.id ? 'you' : undefined}>
            <span className="place">{player.place}</span>
            <span>{player.nickname}</span>
            <span>{player.score}</span>
          </li>
        ))}
      </ol>
      <Setlist rounds={view.recap} />
      <div className="row">
        {view.you.isHost ? (
          <DrawablyButton
            type="button"
            variant="solid"
            data-testid="play-again"
            seed={25}
            fill="#f0a202"
            paper="#241c16"
            state={waiting ? 'loading' : 'idle'}
            disabled={waiting}
            onClick={() => {
              if (waiting) return
              send({ type: 'restart' })
            }}
          >
            {waiting ? (connected ? 'Starting…' : 'Connecting…') : 'Play again'}
          </DrawablyButton>
        ) : (
          <p className="quiet">Waiting for the host.</p>
        )}
        <DrawablyButton type="button" data-testid="leave" onClick={leave}>
          Leave
        </DrawablyButton>
      </div>
    </div>
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

function settings(
  view: RoomView,
  patch: Partial<Pick<RoomView, 'playlistId' | 'clipSeconds' | 'roundCount' | 'answer'>>,
): ClientMessage {
  return {
    type: 'configure',
    playlistId: patch.playlistId ?? view.playlistId,
    clipSeconds: patch.clipSeconds ?? view.clipSeconds,
    roundCount: patch.roundCount ?? view.roundCount,
    answer: patch.answer ?? view.answer,
  }
}

function AnswerField({
  answer,
  onChange,
  disabled = false,
  allowArtist = true,
}: {
  answer: AnswerMode
  onChange: (answer: AnswerMode) => void
  disabled?: boolean
  allowArtist?: boolean
}) {
  const choices: readonly { id: AnswerMode; label: string }[] = [
    { id: 'song', label: 'Song' },
    { id: 'artist', label: 'Artist' },
  ]
  const shown: AnswerMode = allowArtist ? answer : 'song'
  return (
    <div className="stack tight">
      <span>Guess</span>
      <div className="row clip-choices">
        {choices.map((choice) => {
          const locked = choice.id === 'artist' && !allowArtist
          return (
            <DrawablyButton
              key={choice.id}
              type="button"
              data-testid={`answer-${choice.id}`}
              seed={choice.id === 'song' ? 51 : 52}
              variant={choice.id === shown ? 'solid' : 'outline'}
              fill={choice.id === shown ? '#7b4b94' : '#fff6ea'}
              paper={choice.id === shown ? '#fffaf5' : '#241c16'}
              stroke="#7b4b94"
              disabled={disabled || locked}
              aria-pressed={choice.id === shown}
              onClick={() => {
                if (locked) return
                onChange(choice.id)
              }}
            >
              {choice.label}
            </DrawablyButton>
          )
        })}
      </div>
      {!allowArtist ? (
        <span className="quiet" data-testid="artist-locked">
          This playlist is one artist, so you name the song.
        </span>
      ) : null}
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

function RoundField({
  count,
  onChange,
  disabled = false,
}: {
  count: number
  onChange: (count: number) => void
  disabled?: boolean
}) {
  return (
    <div className="stack tight">
      <span>Songs</span>
      <div className="row clip-choices">
        {ROUND_CHOICES.map((choice) => (
          <DrawablyButton
            key={choice}
            type="button"
            data-testid={`rounds-${choice}`}
            seed={40 + choice}
            variant={choice === count ? 'solid' : 'outline'}
            fill={choice === count ? '#7b4b94' : '#fff6ea'}
            paper={choice === count ? '#fffaf5' : '#241c16'}
            stroke="#7b4b94"
            disabled={disabled}
            aria-pressed={choice === count}
            onClick={() => {
              onChange(choice)
            }}
          >
            {choice}
          </DrawablyButton>
        ))}
      </div>
    </div>
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
  if (last.artist && last.song && !last.correct) {
    return (
      <DrawablyCard className="panel panel-sea" seed={29} stroke="#1f8a70" fill="#1f8a70">
        <p className="feedback" data-testid="guess-feedback">
          That&apos;s the artist. Name the song.
        </p>
      </DrawablyCard>
    )
  }
  if (last.correct && last.artist) {
    return (
      <DrawablyCard className="panel panel-leaf" seed={26} stroke="#2f8f4e" fill="#2f8f4e">
        <p className="feedback" data-testid="guess-feedback">
          That&apos;s the artist. {last.points} points.
        </p>
      </DrawablyCard>
    )
  }
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
  if (last.song) {
    return (
      <DrawablyCard className="panel panel-rose" seed={30} stroke="#c44536" fill="#e24b4b">
        <p className="feedback" data-testid="guess-feedback">
          That&apos;s the song. No points.
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
    case 'song':
      return 'Song title'
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

function Setlist({ rounds }: { rounds: RoomView['recap'] }) {
  const guessed = rounds.filter((round) => round.scores.some((score) => score.kind === 'correct'))
  const missed = rounds.filter((round) => !round.scores.some((score) => score.kind === 'correct'))
  return (
    <div className="setlist" data-testid="setlist">
      <section className="stack tight">
        <h3 className="recap-heading" data-testid="guessed-count">
          Guessed {guessed.length}
        </h3>
        <RoundList rounds={guessed} testId="setlist-guessed" />
      </section>
      <section className="stack tight">
        <h3 className="recap-heading">Not guessed {missed.length}</h3>
        <RoundList rounds={missed} testId="setlist-missed" />
      </section>
    </div>
  )
}

function RoundList({ rounds, testId }: { rounds: RoomView['recap']; testId: string }) {
  if (rounds.length === 0) {
    return (
      <p className="quiet" data-testid={testId}>
        None
      </p>
    )
  }
  return (
    <ul className="recap" data-testid={testId}>
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
                    <span className="recap-who who">{score.nickname}</span>
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
  )
}

function PersonalBest({
  nickname,
  pendingScore,
}: {
  nickname: string
  pendingScore: number | null
}) {
  const [board, setBoard] = useState<BestBoard>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = readStoredBest(localStorage.getItem(BEST_KEY))
    const next = pendingScore === null ? stored : withBest(stored, nickname, pendingScore)
    if (next !== stored) localStorage.setItem(BEST_KEY, JSON.stringify(next))
    setBoard(next)
    setReady(true)
  }, [nickname, pendingScore])

  const shown = bestScore(
    pendingScore === null ? board : withBest(board, nickname, pendingScore),
    nickname,
  )
  if (!ready && pendingScore === null) return null
  if (shown <= 0) return null
  return (
    <p className="best-line" data-testid="personal-best">
      Best across games: {shown}
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
        <span>{view.answer === 'artist' ? 'Name the artist' : 'Name the song'}</span>
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
