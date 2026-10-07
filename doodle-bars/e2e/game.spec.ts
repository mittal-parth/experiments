import { expect, test, type Page } from '@playwright/test'

const ROUND_TITLES = ['Kesariya', 'Tum Hi Ho', 'Kal Ho Naa Ho', 'Channa Mereya', 'Apna Bana Le']

test('solo hindi round starts the clip and accepts a near spelling', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('play-solo').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'lobby')
  await page.getByTestId('playlist').selectOption('hindi')
  await page.getByTestId('clip-3').click()
  await expect(page.getByTestId('clip-5')).toHaveCSS('color', 'rgb(36, 28, 22)')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.locator('body')).not.toContainText('Kesariya')
  await expect(page.getByTestId('reveal-art')).toHaveCount(0)
  await expect(page.getByTestId('clip-status')).toHaveText('playing')
  await expect(page.getByTestId('clip-status')).toHaveAttribute('data-start', '0')
  await page.getByTestId('guess-input').fill('nope')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('guess-feedback')).toHaveText(/not quite/i)
  await expect(page.getByTestId('guess-chat')).toContainText('nope')
  await expect(page.locator('body')).not.toContainText('Kesariya')
  await page.getByTestId('guess-input').fill('Keshariya')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Kesariya')
  await expect(page.getByTestId('reveal-art')).toHaveAttribute('src', '/fixture-cover.svg')
  await expect(page.getByTestId('your-score')).not.toHaveText(/Aman 0/)
  await expect(page.getByTestId('reveal-link')).toHaveAttribute('href', /music\.apple\.com/)
  await expect(page.getByTestId('courtesy')).toContainText(/iTunes/i)
})

test('a room link joins, the timer stops after a correct guess, and the leaderboard names a winner', async ({
  browser,
}) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()
  const host = await hostContext.newPage()
  const guest = await guestContext.newPage()

  await host.goto('/')
  await host.getByTestId('nickname').fill('Aman')
  await host.getByTestId('host-room').click()
  await expect(host.getByTestId('room-code')).toHaveText(/^[A-Z0-9]{4}$/)
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? ''
  await expect(host).toHaveURL(new RegExp(`code=${code}`))

  await guest.goto(`/?code=${code}`)
  await expect(guest.getByTestId('join-code')).toHaveValue(code)
  await guest.getByTestId('nickname').fill('Riya')
  await guest.getByTestId('join-room').click()
  await expect(guest.getByTestId('scoreboard')).toContainText('Aman')
  await expect(host.getByTestId('scoreboard')).toContainText('Riya')

  await host.getByTestId('start-game').click()
  await expect(guest.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(guest.locator('body')).not.toContainText('Kesariya')
  await expect(guest.getByTestId('clip-status')).toHaveText('playing')
  await guest.getByTestId('guess-input').fill('nope')
  await guest.getByTestId('guess-submit').click()
  await expect(host.getByTestId('guess-chat')).toContainText('Riya')
  await expect(host.getByTestId('guess-chat')).toContainText('nope')
  await expect(host.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')

  for (const title of ROUND_TITLES) {
    await guessTitle(guest, title)
    await expect(guest.getByTestId('phase')).toHaveAttribute('data-phase', 'reveal')
    await expect(host.getByTestId('phase')).toHaveAttribute('data-phase', 'reveal')
    await expect(host.getByTestId('guess-chat')).toContainText(title)
    await expect(host.getByTestId('reveal-title')).toHaveText(title)
    await expect(guest.getByTestId('reveal-title')).toHaveText(title)
    await expect(host.getByTestId('guess-input')).toHaveCount(0)
    await host.getByTestId('next-round').click()
  }

  await expect(host.getByTestId('phase')).toHaveAttribute('data-phase', 'done')
  await expect(host.getByTestId('winner')).toHaveText('Riya wins')
  await expect(host.getByTestId('leaderboard')).toContainText('Riya')
  await expect(guest.getByTestId('winner')).toHaveText('Riya wins')
  await expect(host.getByTestId('setlist-guessed')).toContainText('Kesariya')
  await expect(host.getByTestId('setlist-guessed')).toContainText('Apna Bana Le')
  await expect(host.getByTestId('setlist-missed')).toHaveText('None')
  await expect(guest.getByTestId('setlist-guessed')).toContainText('Riya')
  await expect(guest.getByTestId('personal-best')).toHaveText(/Best across games: [1-9]/)

  await hostContext.close()
  await guestContext.close()
})

test('the host can choose how many songs, then the recap and best score stick', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('rounds-3').click()
  await expect(page.getByTestId('rounds-5')).toHaveCSS('color', 'rgb(36, 28, 22)')
  await page.getByTestId('play-solo').click()
  await expect(page.getByTestId('rounds-3')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('start-game').click()
  await expect(page.getByText('Round 1 of 3')).toBeVisible()

  for (const title of ROUND_TITLES.slice(0, 3)) {
    await guessTitle(page, title)
    await expect(page.getByTestId('reveal-title')).toHaveText(title)
    await page.getByTestId('next-round').click()
  }

  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'done')
  await expect(page.getByTestId('setlist-guessed')).toContainText('Kal Ho Naa Ho')
  await expect(page.getByTestId('setlist-missed')).toHaveText('None')
  const best = page.getByTestId('personal-best')
  await expect(best).toHaveText(/Best across games: [1-9]/)
  const bestText = await best.textContent()

  await page.getByTestId('play-again').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'lobby')
  await expect(page.getByTestId('personal-best')).toHaveText(bestText ?? '')
  await page.getByTestId('leave').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'home')
  await expect(page.getByTestId('personal-best')).toHaveText(bestText ?? '')
})

async function guessTitle(page: Page, title: string) {
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await page.getByTestId('guess-input').fill(title)
  await page.getByTestId('guess-submit').click()
}
