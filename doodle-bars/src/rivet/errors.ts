export function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return ''
}

export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return ''
}

export function isMissingActor(error: unknown): boolean {
  return errorCode(error) === 'not_found' || errorText(error).includes('Actor not found')
}

export function isTakenCode(error: unknown): boolean {
  const code = errorCode(error)
  if (
    code === 'already_exists' ||
    code === 'already_created' ||
    code === 'duplicate_key' ||
    code === 'destroyed_during_creation'
  ) {
    return true
  }
  const text = errorText(error).toLowerCase()
  return text.includes('already exists') || text.includes('already created') || text.includes('already in use')
}

export const MISSING_ROOM = 'No room with that code'

export function explainConnectError(error: unknown): string | null {
  if (isMissingActor(error) || errorText(error).includes(MISSING_ROOM)) return MISSING_ROOM
  return null
}
