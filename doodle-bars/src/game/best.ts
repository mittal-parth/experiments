export type BestBoard = Record<string, number>

export const BEST_KEY = 'song-guesser-best'

export function bestId(nickname: string): string {
  return nickname.trim().toLowerCase()
}

export function readStoredBest(raw: string | null): BestBoard {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const board: BestBoard = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
      board[key] = Math.round(value)
    }
    return board
  } catch {
    return {}
  }
}

export function bestScore(board: BestBoard, nickname: string): number {
  const score = board[bestId(nickname)]
  return typeof score === 'number' && score > 0 ? score : 0
}

export function withBest(board: BestBoard, nickname: string, score: number): BestBoard {
  const id = bestId(nickname)
  if (!id || !Number.isFinite(score) || score <= 0) return board
  const nextScore = Math.round(score)
  if (nextScore <= bestScore(board, nickname)) return board
  return { ...board, [id]: nextScore }
}
