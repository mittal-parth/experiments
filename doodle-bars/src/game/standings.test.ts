import { describe, expect, it } from 'vitest'
import { standings, winnerText } from './standings'

describe('standings', () => {
  it('ranks by score and shares a place on a tie', () => {
    const ranked = standings([
      { nickname: 'Aman', score: 400 },
      { nickname: 'Riya', score: 800 },
      { nickname: 'Dev', score: 800 },
    ])
    expect(ranked.map((player) => [player.nickname, player.place, player.score])).toEqual([
      ['Dev', 1, 800],
      ['Riya', 1, 800],
      ['Aman', 3, 400],
    ])
    expect(winnerText(ranked)).toBe('Dev and Riya tie')
  })

  it('names a single winner and a scoreless room', () => {
    expect(winnerText([{ nickname: 'Riya', score: 200 }])).toBeNull()
    expect(
      winnerText([
        { nickname: 'Riya', score: 200 },
        { nickname: 'Aman', score: 100 },
      ]),
    ).toBe('Riya wins')
    expect(
      winnerText([
        { nickname: 'Riya', score: 0 },
        { nickname: 'Aman', score: 0 },
      ]),
    ).toBe('Nobody scored')
  })
})