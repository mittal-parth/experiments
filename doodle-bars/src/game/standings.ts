export type StandingPlayer = {
  nickname: string
  score: number
}

export type Standing<T> = T & { place: number }

export function standings<T extends StandingPlayer>(players: readonly T[]): Standing<T>[] {
  const ordered = [...players].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
  )
  let place = 1
  return ordered.map((player, index) => {
    const previous = ordered[index - 1]
    if (previous && player.score < previous.score) place = index + 1
    return { ...player, place }
  })
}

export function winnerText(players: readonly StandingPlayer[]): string | null {
  if (players.length < 2) return null
  const ranked = standings(players)
  const top = ranked[0]
  if (!top || top.score === 0) return 'Nobody scored'
  const names = ranked.filter((player) => player.score === top.score).map((player) => player.nickname)
  if (names.length === 1) return `${names[0]} wins`
  if (names.length === 2) return `${names[0]} and ${names[1]} tie`
  const last = names[names.length - 1] ?? ''
  return `${names.slice(0, -1).join(', ')}, and ${last} tie`
}
