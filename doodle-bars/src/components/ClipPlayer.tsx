'use client'

import { useEffect, useRef, useState } from 'react'
import { DrawablyButton } from 'drawably/react'
import { clipStartSeconds } from '@/game/clip'
import { NoteIcon } from './Doodles'

type ClipStatus = 'idle' | 'playing' | 'done' | 'unavailable'

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

export function ClipPlayer({ url, seconds }: { url: string; seconds: number }) {
  const [status, setStatus] = useState<ClipStatus>('idle')
  const [startAt, setStartAt] = useState(0)
  const windowRef = useRef({ from: 0, end: seconds })

  useEffect(() => {
    const audio = audioElement()
    let stopped = false
    let began = false

    const onTime = () => {
      const { from, end } = windowRef.current
      if (audio.currentTime + 0.15 < from) return
      if (audio.currentTime + 0.05 < end) return
      audio.pause()
      if (!stopped) setStatus('done')
    }

    const playFromWindow = () => {
      if (stopped) return
      void audio.play().then(
        () => {
          if (!stopped) setStatus('playing')
        },
        () => {
          if (!stopped) setStatus('idle')
        },
      )
    }

    const arm = () => {
      if (stopped || began) return
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      began = true
      const from = clipStartSeconds(audio.duration, seconds)
      windowRef.current = { from, end: from + seconds }
      setStartAt(from)
      if (Math.abs(audio.currentTime - from) < 0.08) {
        playFromWindow()
        return
      }
      audio.currentTime = from
    }

    const onSeeked = () => {
      if (stopped || !began) return
      if (audio.currentTime + 0.15 < windowRef.current.from) return
      playFromWindow()
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', arm)
    audio.addEventListener('durationchange', arm)
    audio.addEventListener('seeked', onSeeked)
    audio.src = url
    audio.load()
    return () => {
      stopped = true
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', arm)
      audio.removeEventListener('durationchange', arm)
      audio.removeEventListener('seeked', onSeeked)
    }
  }, [url, seconds])

  function play() {
    const audio = audioElement()
    const { from } = windowRef.current
    const start = () => {
      void audio.play().then(
        () => {
          setStatus('playing')
        },
        () => {
          setStatus('unavailable')
        },
      )
    }
    if (Math.abs(audio.currentTime - from) < 0.08) {
      start()
      return
    }
    const onSeeked = () => {
      audio.removeEventListener('seeked', onSeeked)
      start()
    }
    audio.addEventListener('seeked', onSeeked)
    audio.currentTime = from
  }

  const label = status === 'playing' ? 'Playing' : status === 'done' ? 'Play again' : 'Play clip'
  const spinning = status === 'playing'

  return (
    <div className="clip">
      <p data-testid="clip-status" className="clip-status" data-start={startAt}>
        {status}
      </p>
      <div className={spinning ? 'player is-playing' : 'player'}>
        <div className="disc-wrap" aria-hidden="true">
          <div className="record" />
          <div className="tonearm" />
          <NoteIcon className="float-note fn1" />
          <NoteIcon className="float-note fn2" />
          <NoteIcon className="float-note fn3" />
        </div>
        <div className="player-copy">
          <DrawablyButton
            key={status}
            type="button"
            variant="solid"
            data-testid="play-clip"
            seed={40}
            fill="#e24b4b"
            paper="#fffaf5"
            onClick={play}
            disabled={status === 'playing'}
          >
            {label}
          </DrawablyButton>
        </div>
      </div>
    </div>
  )
}
