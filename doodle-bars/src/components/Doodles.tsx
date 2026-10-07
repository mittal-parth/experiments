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

export function DoodleField() {
  return (
    <div className="doodle-field" aria-hidden="true">
      <NoteIcon className="doodle d1" />
      <Beamed className="doodle d2" />
      <Star className="doodle d3" />
      <NoteIcon className="doodle d4" />
      <span className="doodle disc d5" />
      <Beamed className="doodle d6" />
      <Star className="doodle d7" />
      <NoteIcon className="doodle d8" />
    </div>
  )
}
