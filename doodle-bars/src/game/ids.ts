const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeId(): string {
  return crypto.randomUUID()
}

export function makeCode(): string {
  let code = ''
  for (let index = 0; index < 4; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
