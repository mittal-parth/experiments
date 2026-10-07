import { describe, expect, it } from 'vitest'
import { toneWav } from './tone'

describe('toneWav', () => {
  it('builds a wav header', () => {
    const wav = toneWav()
    expect(wav.subarray(0, 4).toString('utf8')).toBe('RIFF')
    expect(wav.subarray(8, 12).toString('utf8')).toBe('WAVE')
    expect(wav.byteLength).toBeGreaterThan(44)
  })
})
