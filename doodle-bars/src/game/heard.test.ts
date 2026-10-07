import { describe, expect, it } from 'vitest'
import { heardIds, rememberTrack, storeHeard } from './heard'

describe('heard songs', () => {
  it('keeps the oldest songs first and moves a repeat to the newest end', () => {
    expect(rememberTrack([10, 20, 30], 20)).toEqual([10, 30, 20])
    expect(rememberTrack([10], 11, 2)).toEqual([10, 11])
    expect(rememberTrack([10, 11], 12, 2)).toEqual([11, 12])
  })

  it('stores one playlist without dropping another', () => {
    const hindi = storeHeard(null, 'hindi', 1635014240)
    const both = storeHeard(hindi, 'punjabi', 42)
    expect(heardIds(both, 'hindi')).toEqual([1635014240])
    expect(heardIds(both, 'punjabi')).toEqual([42])
    expect(heardIds('not json', 'hindi')).toEqual([])
  })
})
