export type GuessJudgement = 'correct' | 'close' | 'miss'

export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesAnswer(
  guess: string,
  title: string,
  aliases: readonly string[] = [],
): boolean {
  return judgeGuess(guess, title, aliases) === 'correct'
}

export function judgeGuess(
  guess: string,
  title: string,
  aliases: readonly string[] = [],
): GuessJudgement {
  let best: GuessJudgement = 'miss'
  for (const target of [title, ...aliases]) {
    const result = judgeOne(guess, target)
    if (result === 'correct') return 'correct'
    if (result === 'close') best = 'close'
  }
  return best
}

function judgeOne(guess: string, target: string): GuessJudgement {
  const normalizedGuess = normalizeAnswer(guess)
  const normalizedTarget = normalizeAnswer(target)
  if (normalizedGuess.length < 3 || normalizedTarget.length < 3) return 'miss'
  if (normalizedGuess === normalizedTarget) return 'correct'
  if (normalizedGuess.startsWith(`${normalizedTarget} `)) return 'correct'

  const foldedGuess = fold(normalizedGuess)
  const foldedTarget = fold(normalizedTarget)
  if (foldedGuess.length < 3 || foldedTarget.length < 3) return 'miss'
  if (foldedGuess === foldedTarget) return 'correct'
  if (foldedGuess.startsWith(`${foldedTarget} `)) return 'correct'

  const distance = levenshtein(foldedGuess, foldedTarget)
  const length = Math.max(foldedGuess.length, foldedTarget.length)
  if (distance <= correctBudget(length)) return 'correct'
  if (isNearPrefix(foldedGuess, foldedTarget)) return 'close'
  if (distance <= closeBudget(length)) return 'close'
  return 'miss'
}

// Hindi romanization drifts in a few regular ways: aa/ee/oo, w/v, and doubled letters.
function fold(value: string): string {
  return value
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/w/g, 'v')
    .replace(/q/g, 'k')
    .replace(/(.)\1+/g, '$1')
}

function correctBudget(length: number): number {
  if (length < 5) return 0
  if (length < 8) return 1
  return 2
}

function closeBudget(length: number): number {
  if (length < 5) return 1
  if (length < 12) return 3
  return 4
}

function isNearPrefix(guess: string, target: string): boolean {
  if (guess.length < 4 || target.length < 4) return false
  if (target.startsWith(guess) && target.length - guess.length <= 4) return true
  if (guess.startsWith(target) && guess.length - target.length <= 3) return true
  return false
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index)
  const curr = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const insert = curr[j - 1] + 1
      const remove = prev[j] + 1
      const replace = prev[j - 1] + cost
      curr[j] = Math.min(insert, remove, replace)
    }
    for (let j = 0; j < prev.length; j += 1) prev[j] = curr[j] ?? 0
  }
  return prev[b.length] ?? b.length
}
