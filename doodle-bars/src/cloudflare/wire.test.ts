import { expect, it } from 'vitest'
import { parseWireRequest } from './wire'

it('parses the room actions and ignores the rest', () => {
  expect(parseWireRequest(JSON.stringify({ type: 'join', nickname: ' Aman ' }))).toEqual({ type: 'join', nickname: 'Aman' })
  expect(parseWireRequest(JSON.stringify({ type: 'guess', msgId: 'm', text: 'Kesariya' }))).toEqual({
    type: 'guess',
    msgId: 'm',
    text: 'Kesariya',
  })
  expect(parseWireRequest(JSON.stringify({ type: 'start', avoidTrackIds: [1, 'x', 2] }))).toEqual({
    type: 'start',
    msgId: '',
    avoidTrackIds: [1, 2],
  })
  expect(parseWireRequest(JSON.stringify({ type: 'leave' }))).toEqual({ type: 'leave' })
  expect(parseWireRequest(JSON.stringify({ type: 'guess', text: '' }))).toBeNull()
  expect(parseWireRequest(JSON.stringify({ type: 'configure', playlistId: 'x', clipSeconds: 3 }))).toBeNull()
  expect(parseWireRequest(JSON.stringify({ type: 'nope' }))).toBeNull()
  expect(parseWireRequest('not json')).toBeNull()
  expect(parseWireRequest(new ArrayBuffer(2))).toBeNull()
})
