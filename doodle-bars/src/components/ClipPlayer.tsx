'use client'

import { useRef, useState } from 'react'
import { DrawablyButton } from 'drawably/react'

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

  return (
    <div className="clip">
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onTimeUpdate={onTime}
        data-testid="clip-audio"
      />
      <DrawablyButton
        type="button"
        variant="solid"
        data-testid="play-clip"
        onClick={play}
        disabled={status === 'playing'}
      >
        {label}
      </DrawablyButton>
      <p data-testid="clip-status" className="quiet">
        {status}
      </p>
    </div>
  )
}
