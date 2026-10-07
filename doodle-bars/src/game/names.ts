export function cleanNickname(input: string): string | null {
  const nickname = input.replace(/\s+/g, ' ').trim()
  if (nickname.length < 2 || nickname.length > 16) return null
  if (/[^\p{L}\p{N} _.-]/u.test(nickname)) return null
  return nickname
}

export function cleanCode(input: string): string | null {
  const code = input.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z0-9]{4}$/.test(code)) return null
  return code
}
