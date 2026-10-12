import { describe, expect, it } from 'vitest'
import { DOODLE_BARS_EVENT_PREFIX, prefixedEvent } from './posthog-client'

describe('prefixedEvent', () => {
  it('adds the doodle bars prefix', () => {
    expect(prefixedEvent('game_created')).toBe(`${DOODLE_BARS_EVENT_PREFIX}game_created`)
  })

  it('does not double-prefix', () => {
    const name = prefixedEvent('game_created')
    expect(prefixedEvent(name)).toBe(name)
  })
})
