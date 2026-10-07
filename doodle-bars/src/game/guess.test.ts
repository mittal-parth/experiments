import { describe, expect, it } from 'vitest'
import { artistCredits, judgeArtist, judgeGuess, matchesAnswer, normalizeAnswer } from './guess'

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

  it('accepts a near spelling and flags a short prefix as close', () => {
    expect(judgeGuess('Keshariya', 'Kesariya')).toBe('correct')
    expect(judgeGuess('Chana Mereya', 'Channa Mereya')).toBe('correct')
    expect(judgeGuess('Rabta', 'Raabta')).toBe('correct')
    expect(judgeGuess('tum hi', 'Tum Hi Ho')).toBe('close')
    expect(judgeGuess('nope', 'Kesariya')).toBe('miss')
  })
})

describe('judgeArtist', () => {
  const credit = 'Pritam, Arijit Singh & Amitabh Bhattacharya'

  it('accepts the full credit or one named artist', () => {
    expect(artistCredits(credit)).toEqual([
      'Pritam, Arijit Singh & Amitabh Bhattacharya',
      'Pritam',
      'Arijit Singh',
      'Amitabh Bhattacharya',
    ])
    expect(judgeArtist('Arijit Singh', credit)).toBe('correct')
    expect(judgeArtist('pritam', credit)).toBe('correct')
    expect(judgeArtist(credit, credit)).toBe('correct')
    expect(judgeArtist('Kesariya', credit)).toBe('miss')
    expect(judgeArtist('Arijit Si', credit)).toBe('close')
  })
})
