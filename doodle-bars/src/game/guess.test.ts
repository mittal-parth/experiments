import { describe, expect, it } from 'vitest'
import { matchesAnswer, normalizeAnswer } from './guess'

describe('normalizeAnswer', () => {
  it('strips movie parentheses, case, and punctuation', () => {
    expect(normalizeAnswer('Kesariya (From "Brahmastra")!')).toBe('kesariya')
  })
})

describe('matchesAnswer', () => {
  it('matches the title and a guess that starts with it', () => {
    expect(matchesAnswer('KESARIYA!!!', 'Kesariya')).toBe(true)
    expect(matchesAnswer('Kesariya (From "Brahmastra")', 'Kesariya')).toBe(true)
    expect(matchesAnswer('kesariya from brahmastra', 'Kesariya')).toBe(true)
  })

  it('matches aliases and rejects artist-only or too-short guesses', () => {
    expect(matchesAnswer('kal ho na ho', 'Kal Ho Naa Ho', ['Kal Ho Na Ho'])).toBe(true)
    expect(matchesAnswer('Arijit Singh', 'Tum Hi Ho')).toBe(false)
    expect(matchesAnswer('shape', 'Shape of You')).toBe(false)
    expect(matchesAnswer('a', 'Gerua')).toBe(false)
  })
})
