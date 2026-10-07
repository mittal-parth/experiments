'use client'

import { useRef, useState } from 'react'
import { DrawablyButton } from 'drawably/react'
import { NoteIcon } from './Doodles'

type ClipStatus = 'idle' | 'playing' | 'done' | 'unavailable'

export function ClipPlayer({ url, seconds }: { url: string; seconds: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [status, setStatus] = useState<ClipStatus>('idle')

  function play() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play().then(
      () => {
        setStatus('playing')
      },
      () => {
        setStatus('unavailable')
      },
    )
  }

  function onTime() {
    const audio = audioRef.current
    if (!audio || audio.currentTime < seconds) return
    audio.pause()
    setStatus('done')
  }

  const label =
    status === 'playing' ? 'Playing' : status === 'done' ? 'Played' : 'Play clip'

  const spinning = status === 'playing'

  return (
    <div className="clip">
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onTimeUpdate={onTime}
        data-testid="clip-audio"
      />
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
      <p data-testid="clip-status" className="clip-status">
        {status}
      </p>
    </div>
  )
}
