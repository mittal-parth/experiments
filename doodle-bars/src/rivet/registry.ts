import { setup } from 'rivetkit'
import { gameRoom } from './game-room'

export const registry = setup({
  use: { gameRoom },
})
