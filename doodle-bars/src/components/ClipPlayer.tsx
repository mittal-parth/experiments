'use client'

import { useEffect, useRef, useState } from 'react'
import { captureGameEvent } from '@/analytics/posthog-client'
import { clipPlayhead } from '@/game/clip'
import { AppButton } from './AppButton'
import { NoteIcon } from './Doodles'

type ClipStatus = 'loading' | 'ready' | 'playing' | 'done' | 'unavailable'

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

let shared: HTMLAudioElement | null = null

function audioElement(): HTMLAudioElement {
  if (!shared) shared = new Audio()
  return shared
}

export function unlockAudio(): void {
  const audio = audioElement()
  audio.src = SILENT_WAV
  void audio.play().catch(() => undefined)
}

function clipLabel(status: ClipStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading…'
    case 'ready':
      return 'Play clip'
    case 'playing':
      return 'Playing'
    case 'done':
      return 'Play again'
    case 'unavailable':
      return 'Play clip'
    default: {
      const unexpected: never = status
      throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
    }
  }
}

export function ClipPlayer({
  url,
  seconds,
  startsAt,
  serverNow,
}: {
  url: string
  seconds: number
  startsAt: number | null
  serverNow: number
}) {
  const [status, setStatus] = useState<ClipStatus>('loading')
  const [startAt, setStartAt] = useState(0)
  const [heardAt, setHeardAt] = useState(0)
  const windowRef = useRef({ from: 0, end: seconds })
  const readyRef = useRef(false)
  const pendingPlay = useRef(true)
  const serverNowRef = useRef(serverNow)
  serverNowRef.current = serverNow
  const clockRef = useRef({ originServer: serverNow, originLocal: Date.now() })

  useEffect(() => {
    const audio = audioElement()
    const originServer = serverNowRef.current
    const originLocal = Date.now()
    clockRef.current = { originServer, originLocal }
    let stopped = false
    let placed = false
    let seekTries = 0
    let starting = false
    readyRef.current = false
    pendingPlay.current = true
    setStatus('loading')

    const elapsedSeconds = () => {
      if (startsAt == null) return 0
      const serverTime = originServer + (Date.now() - originLocal)
      return Math.max(0, (serverTime - startsAt) / 1000)
    }

    const finish = () => {
      readyRef.current = true
      pendingPlay.current = false
      audio.pause()
      if (!stopped) setStatus('done')
    }

    const playFromWindow = () => {
      if (stopped || !pendingPlay.current || starting) return
      const playhead = clipPlayhead(audio.duration, seconds, elapsedSeconds())
      if (playhead.finished) {
        finish()
        return
      }
      starting = true
      void audio.play().then(
        () => {
          starting = false
          if (!stopped) setStatus('playing')
        },
        () => {
          starting = false
          pendingPlay.current = false
          if (!stopped) setStatus(readyRef.current ? 'ready' : 'loading')
        },
      )
    }

    const seekToSharedTime = (allowFallback: boolean) => {
      const playhead = clipPlayhead(audio.duration, seconds, elapsedSeconds())
      windowRef.current = { from: playhead.from, end: playhead.from + seconds }
      setStartAt(playhead.from)
      setHeardAt(Math.round(playhead.target * 10) / 10)
      if (playhead.finished) {
        finish()
        return
      }
      if (Math.abs(audio.currentTime - playhead.target) < 0.08) {
        readyRef.current = true
        playFromWindow()
        return
      }
      if (!allowFallback && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return
      audio.currentTime = playhead.target
    }

    const placePlayhead = () => {
      if (stopped || placed) return
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      placed = true
      seekToSharedTime(true)
    }

    // Previews are about 30 seconds and the clip starts late in the file, so
    // playback waits until that offset is buffered. Setting currentTime before
    // the file can seek is ignored and does not fire seeked — retry, then play
    // from wherever we landed rather than leaving the round silent.
    const onSeeked = () => {
      if (stopped || !placed) return
      const playhead = clipPlayhead(audio.duration, seconds, elapsedSeconds())
      setHeardAt(Math.round(playhead.target * 10) / 10)
      if (playhead.finished) {
        finish()
        return
      }
      if (audio.currentTime + 0.15 < playhead.target) {
        if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return
        seekTries += 1
        if (seekTries <= 4) {
          audio.currentTime = playhead.target
          return
        }
      }
      readyRef.current = true
      playFromWindow()
    }

    const onTime = () => {
      if (!readyRef.current) return
      if (elapsedSeconds() >= seconds) {
        finish()
        return
      }
      const { from, end } = windowRef.current
      if (audio.currentTime + 0.15 < from) return
      if (audio.currentTime + 0.05 < end) return
      finish()
    }

    const onCanPlay = () => {
      if (stopped) return
      if (!placed) {
        placePlayhead()
        return
      }
      const playhead = clipPlayhead(audio.duration, seconds, elapsedSeconds())
      if (playhead.finished) {
        finish()
        return
      }
      const playable = audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
      if (!readyRef.current && playable && audio.currentTime + 0.15 < playhead.target) {
        audio.currentTime = playhead.target
      }
    }

    const onError = () => {
      if (stopped) return
      if (audio.error?.code === MediaError.MEDIA_ERR_ABORTED) return
      setStatus('unavailable')
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', placePlayhead)
    audio.addEventListener('durationchange', placePlayhead)
    audio.addEventListener('seeked', onSeeked)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    audio.preload = 'auto'
    audio.src = url
    audio.load()
    return () => {
      stopped = true
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', placePlayhead)
      audio.removeEventListener('durationchange', placePlayhead)
      audio.removeEventListener('seeked', onSeeked)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [url, seconds, startsAt])

  function play() {
    captureGameEvent('clip_played', { clip_seconds: seconds })
    const audio = audioElement()
    pendingPlay.current = true
    if (audio.error) {
      setStatus('loading')
      audio.load()
      return
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      setStatus('loading')
      return
    }
    const { originServer, originLocal } = clockRef.current
    const elapsed =
      startsAt == null ? 0 : Math.max(0, (originServer + (Date.now() - originLocal) - startsAt) / 1000)
    const playhead = clipPlayhead(audio.duration, seconds, elapsed)
    setStartAt(playhead.from)
    setHeardAt(Math.round(playhead.target * 10) / 10)
    if (playhead.finished) {
      setStatus('done')
      return
    }
    if (Math.abs(audio.currentTime - playhead.target) < 0.08) {
      readyRef.current = true
      void audio.play().then(
        () => {
          setStatus('playing')
        },
        () => {
          pendingPlay.current = false
          setStatus('ready')
        },
      )
      return
    }
    setStatus('loading')
    audio.currentTime = playhead.target
  }

  const playerClass =
    status === 'playing' ? 'player is-playing' : status === 'loading' ? 'player is-loading' : 'player'

  return (
    <div className="clip">
      <p data-testid="clip-status" className="clip-status" data-start={startAt} data-at={heardAt}>
        {status}
      </p>
      <div className={playerClass}>
        <div className="disc-wrap" aria-hidden="true">
          <div className="record" />
          <div className="tonearm" />
          <NoteIcon className="float-note fn1" />
          <NoteIcon className="float-note fn2" />
          <NoteIcon className="float-note fn3" />
        </div>
        <div className="player-copy">
          <AppButton
            type="button"
            variant="solid"
            data-testid="play-clip"
            seed={40}
            fill="#e24b4b"
            paper="#fffaf5"
            state={status === 'loading' ? 'loading' : 'idle'}
            onClick={play}
            disabled={status === 'playing'}
          >
            {clipLabel(status)}
          </AppButton>
          {status === 'loading' ? <p className="quiet">Loading the preview…</p> : null}
          {status === 'unavailable' ? <p className="quiet">The preview didn’t load. Tap play to try again.</p> : null}
        </div>
      </div>
    </div>
  )
}
