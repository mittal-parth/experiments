import { expect, test, type Page } from '@playwright/test'

test('a three player room survives reload, a dropped guess, and a pile of wrong answers', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const riyaContext = await browser.newContext()
  const devContext = await browser.newContext()
  const host = await hostContext.newPage()
  const riya = await riyaContext.newPage()
  const dev = await devContext.newPage()
  const players = [host, riya, dev]

  await host.goto('/')
  await host.getByTestId('nickname').fill('Aman')
  await host.getByTestId('clip-15').click()
  await host.getByTestId('host-room').click()
  await expect(host.getByTestId('room-code')).toHaveText(/^[A-Z0-9]{4}$/)
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? ''

  await riya.goto(`/?code=${code}`)
  await riya.getByTestId('nickname').fill('Riya')
  await riya.getByTestId('join-room').click()
  await dev.goto(`/?code=${code}`)
  await dev.getByTestId('nickname').fill('Dev')
  await dev.getByTestId('join-room').click()
  await expect(host.getByTestId('scoreboard')).toContainText('Riya')
  await expect(host.getByTestId('scoreboard')).toContainText('Dev')

  await host.getByTestId('start-game').click()
  for (const page of players) {
    await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
    await expect(page.getByTestId('clip-status')).toHaveText('playing')
    await expect(page.getByText('Finding a song…')).toHaveCount(0)
    await expect(page.getByTestId('error')).toHaveCount(0)
  }
  const heard = await heardAt(players)
  expect(Math.max(...heard) - Math.min(...heard)).toBeLessThan(2)

  await host.reload()
  await expect(host.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(host.getByTestId('clip-status')).toHaveText(/playing|done/)
  await expect(host.getByText('Round 1 of 5')).toBeVisible()
  await expect(host.getByTestId('error')).toHaveCount(0)
  await expect(host.getByText('No response from the server')).toHaveCount(0)
  await expect(riya.getByTestId('scoreboard')).toContainText('Aman')

  await riya.context().setOffline(true)
  await riya.getByTestId('guess-input').fill('nope')
  await riya.getByTestId('guess-submit').click()
  await riya.context().setOffline(false)
  for (const page of players) {
    await expect(page.getByTestId('guess-chat').getByText('nope', { exact: true })).toHaveCount(1)
    await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  }
  await expect(riya.getByTestId('error')).toHaveCount(0)

  for (const text of ['nah', 'no']) {
    await dev.getByTestId('guess-input').fill(text)
    await dev.getByTestId('guess-submit').click()
    await expect(host.getByTestId('guess-chat').getByText(text, { exact: true })).toHaveCount(1)
  }
  await expect(dev.getByTestId('guess-chat').getByText('nah', { exact: true })).toHaveCount(1)
  await expect(riya.getByTestId('guess-chat').getByText('no', { exact: true })).toHaveCount(1)

  await dev.getByTestId('guess-input').fill('Kesariya')
  await dev.getByTestId('guess-submit').click()
  for (const page of players) {
    await expect(page.getByTestId('reveal-title')).toHaveText('Kesariya')
    await expect(page.getByTestId('error')).toHaveCount(0)
    await expect(page.getByText('No response from the server')).toHaveCount(0)
    await expect(page.getByText('That round just ended')).toHaveCount(0)
  }

  await host.getByTestId('next-round').click()
  for (const page of players) {
    await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
    await expect(page.getByTestId('clip-status')).toHaveText('playing')
    await expect(page.getByText('Round 2 of 5')).toBeVisible()
    await expect(page.getByText('Finding a song…')).toHaveCount(0)
  }
  const second = await heardAt(players)
  expect(Math.max(...second) - Math.min(...second)).toBeLessThan(2)

  await hostContext.close()
  await riyaContext.close()
  await devContext.close()
})

async function heardAt(pages: Page[]): Promise<number[]> {
  return Promise.all(pages.map(async (page) => Number(await page.getByTestId('clip-status').getAttribute('data-at'))))
}
