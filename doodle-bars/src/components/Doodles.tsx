export function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 72" aria-hidden="true">
      <ellipse cx="16" cy="56" rx="13" ry="9" transform="rotate(-28 16 56)" />
      <path d="M27 14v40" />
      <path className="flag" d="M27 12c16 7 20 22 6 32-7-11-12-16-6-26" />
    </svg>
  )
}

export function Beamed({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 78 72" aria-hidden="true">
      <ellipse cx="16" cy="58" rx="12" ry="8" transform="rotate(-28 16 58)" />
      <ellipse cx="52" cy="54" rx="12" ry="8" transform="rotate(-28 52 54)" />
      <path d="M26 16v40M62 12v40" />
      <path className="flag" d="M26 14c12 5 24 3 36-5 0 8-12 12-36 6z" />
    </svg>
  )
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className ? `${className} star` : 'star'} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 4l5 14h14l-11 8 4 14-12-8-12 8 4-14L5 18h14z" />
    </svg>
  )
}

export function NoteBand() {
  return (
    <div className="note-band" aria-hidden="true">
      <NoteIcon />
      <Beamed />
      <Star />
      <NoteIcon />
      <Beamed />
    </div>
  )
}

function Headphones({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 120 112">
      <path d="M14 72C8 4 112 4 106 72" fill="none" />
      <rect x="4" y="62" width="28" height="44" rx="12" fill="var(--coral)" />
      <rect x="88" y="62" width="28" height="44" rx="12" fill="var(--coral)" />
      <path d="M13 76v16M107 76v16" fill="none" stroke="var(--paper)" />
    </svg>
  )
}

function Vinyl({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="56" fill="var(--ink)" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="var(--paper)" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M26 40a38 38 0 0 1 22-18" fill="none" stroke="var(--paper)" strokeWidth="3" />
      <circle cx="60" cy="60" r="19" fill="var(--marigold)" />
      <circle cx="60" cy="60" r="4" fill="var(--paper)" />
    </svg>
  )
}

function Microphone({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 80 150">
      <rect x="20" y="4" width="40" height="70" rx="20" fill="var(--teal)" />
      <path d="M20 26h40M20 40h40M20 54h40" fill="none" stroke="var(--paper)" strokeWidth="2.5" />
      <path d="M8 50c0 48 64 48 64 0" fill="none" />
      <path d="M40 90v40M18 134h44" fill="none" />
    </svg>
  )
}

function Cassette({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 130 86">
      <rect x="3" y="3" width="124" height="80" rx="9" fill="var(--marigold)" />
      <rect x="20" y="14" width="90" height="32" rx="8" fill="var(--paper)" />
      <circle cx="44" cy="30" r="9" fill="none" />
      <circle cx="86" cy="30" r="9" fill="none" />
      <path d="M26 83l10-24h58l10 24" fill="var(--paper)" />
      <path d="M50 70h30" fill="none" strokeDasharray="2 5" />
    </svg>
  )
}

function SoundWave({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 110 80">
      <path d="M10 40v0M26 26v28M42 8v64M58 20v40M74 12v56M90 30v20" fill="none" strokeWidth="9" stroke="var(--cobalt)" />
      <path d="M10 40v0M26 26v28M42 8v64M58 20v40M74 12v56M90 30v20" fill="none" strokeWidth="3" />
    </svg>
  )
}

function Speaker({ className }: { className: string }) {
  return (
    <svg className={`margin-doodle ${className}`} viewBox="0 0 100 130">
      <rect x="4" y="4" width="92" height="122" rx="12" fill="var(--grape)" />
      <circle cx="50" cy="36" r="13" fill="var(--paper)" />
      <circle cx="50" cy="84" r="27" fill="var(--paper)" />
      <circle cx="50" cy="84" r="10" fill="var(--grape)" />
    </svg>
  )
}

export function MarginDoodles() {
  return (
    <div className="margin-doodles" aria-hidden="true">
      <svg width="0" height="0" focusable="false">
        <filter id="doodle-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <Headphones className="m1" />
      <Vinyl className="m2" />
      <Cassette className="m3" />
      <Microphone className="m4" />
      <SoundWave className="m5" />
      <Speaker className="m6" />
    </div>
  )
}
