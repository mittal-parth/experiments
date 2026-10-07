import { describe, expect, it } from 'vitest'
import { parseClientMessage } from './protocol'

describe('parseClientMessage start', () => {
  it('starts with no memory when the field is missing or messy', () => {
    expect(parseClientMessage({ type: 'start' })).toEqual({ type: 'start', avoidTrackIds: [] })
    expect(parseClientMessage({ type: 'start', avoidTrackIds: [3, 1, 3, -1, 2.5, 2] })).toEqual({
      type: 'start',
      avoidTrackIds: [1, 3, 2],
    })
  })
})
