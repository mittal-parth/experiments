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
  return [title, ...aliases].some((target) => matchesOne(guess, target))
}

function matchesOne(guess: string, target: string): boolean {
  const normalizedGuess = normalizeAnswer(guess)
  const normalizedTarget = normalizeAnswer(target)
  if (normalizedGuess.length < 3 || normalizedTarget.length < 3) return false
  if (normalizedGuess === normalizedTarget) return true
  return normalizedGuess.startsWith(`${normalizedTarget} `)
}
