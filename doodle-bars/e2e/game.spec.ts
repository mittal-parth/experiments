import { expect, test, type Page } from '@playwright/test'
import { HEARD_STORAGE_KEY } from '../src/game/heard'

const ROUND_TITLES = ['Kesariya', 'Tum Hi Ho', 'Kal Ho Naa Ho', 'Channa Mereya', 'Apna Bana Le']

test('solo hindi round starts the clip and accepts a near spelling', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await expect(page.getByTestId('playlist').locator('option[value="kannada"]')).toHaveText('Kannada')
  await expect(page.getByTestId('playlist').locator('option[value="english"]')).toHaveText('English mix')
  await expect(page.getByTestId('playlist').locator('option[value="english-romance"]')).toHaveText('English romance')
  await expect(page.getByTestId('playlist').locator('option[value="english-party"]')).toHaveText('English party')
  await expect(page.getByTestId('playlist').locator('option[value="english-classics"]')).toHaveText('English classics')
  await expect(page.getByTestId('playlist').locator('option[value="english-rock"]')).toHaveText('English rock')
  await expect(page.getByTestId('playlist').locator('option[value="michael-jackson"]')).toHaveText('Michael Jackson')
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
  await expect(host.getByTestId('guessed-count')).toHaveText('Guessed 5')
  await expect(host.getByTestId('setlist-guessed')).toContainText('Kesariya')
  await expect(host.getByTestId('setlist-guessed')).toContainText('Apna Bana Le')
  await expect(host.getByTestId('setlist-missed')).toHaveText('None')
  await expect(guest.getByTestId('setlist-guessed')).toContainText('Riya')
  await expect(guest.getByTestId('personal-best')).toHaveText(/Best across games: [1-9]/)
  await expect(host.getByTestId('recap-points').first()).toHaveText(/\d+/)
  await expect(host.locator('.recap-title').first()).toHaveCSS('text-decoration-line', 'none')
  const titleSize = await host.locator('.recap-title').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))
  const artistSize = await host.locator('.recap-artist').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))
  expect(artistSize).toBeLessThan(titleSize)
  const padding = await host.locator('.recap > li').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingTop))
  expect(padding).toBeGreaterThanOrEqual(16)
  const whoPad = await host.locator('.recap-who').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft))
  const ptsPad = await host.locator('.recap-pts').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft))
  expect(whoPad).toBeGreaterThanOrEqual(10)
  expect(ptsPad).toBeGreaterThanOrEqual(10)
  const scoreShadow = await host.locator('.recap-scores li').first().evaluate((node) => getComputedStyle(node).boxShadow)
  expect(scoreShadow).toBe('none')
  const whoBox = await host.locator('.recap-who').first().boundingBox()
  const ptsBox = await host.locator('.recap-pts').first().boundingBox()
  expect(whoBox).not.toBeNull()
  expect(ptsBox).not.toBeNull()
  expect((ptsBox?.x ?? 0) > (whoBox?.x ?? 0) + (whoBox?.width ?? 0) - 1).toBe(true)
  await expect(host.getByRole('link', { name: /Listen to Kesariya on Apple Music/ })).toHaveAttribute('href', /music\.apple\.com/)

  await hostContext.close()
  await guestContext.close()
})

test('naming the artist scores fewer points and the revealed song is remembered', async ({ page }) => {
  const sent: string[] = []
  page.on('websocket', (ws) => {
    ws.on('framesent', (frame) => {
      sent.push(String(frame.payload))
    })
  })

  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('play-solo').click()
  await page.getByTestId('playlist').selectOption('hindi')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')

  await page.getByTestId('guess-input').fill('Arijit Singh')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.getByTestId('guess-feedback')).toHaveText(/that's the artist/i)
  await expect(page.getByTestId('your-score')).toContainText('artist')
  await expect(page.locator('body')).not.toContainText('Kesariya')
  const artistScore = scoreOf(await page.getByTestId('your-score').textContent())
  expect(artistScore).toBeGreaterThan(0)

  await page.getByTestId('guess-input').fill('Kesariya')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Kesariya')
  await expect(page.getByTestId('guess-feedback')).toHaveText(/that's it/i)
  expect(scoreOf(await page.getByTestId('your-score').textContent())).toBeGreaterThan(artistScore)
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), HEARD_STORAGE_KEY))
    .toContain('1635014240')

  for (const title of ROUND_TITLES.slice(1)) {
    await page.getByTestId('next-round').click()
    await guessTitle(page, title)
    await expect(page.getByTestId('reveal-title')).toHaveText(title)
  }
  await page.getByTestId('next-round').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'done')
  await expect(page.getByTestId('guessed-count')).toHaveText('Guessed 5')
  await expect(page.getByTestId('setlist-guessed').locator('[data-kind="artist"]')).toContainText('artist')
  await page.getByTestId('play-again').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'lobby')

  sent.length = 0
  await page.getByTestId('start-game').click()
  await expect
    .poll(() => sent.some((frame) => frame.includes('"type":"start"') && frame.includes('1635014240')))
    .toBe(true)
})

test('artist mode scores a fuzzy artist and gives the song title nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('answer-artist').click()
  await expect(page.getByTestId('answer-artist')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('play-solo').click()
  await expect(page.getByTestId('answer-artist')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('playlist').selectOption('hindi')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.locator('.round-line')).toContainText('Name the artist')
  await expect(page.locator('body')).not.toContainText('Kesariya')

  await page.getByTestId('guess-input').fill('Kesariya')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.getByTestId('guess-feedback')).toHaveText(/that's the song/i)
  await expect(page.getByTestId('your-score')).toContainText('Aman 0')
  await expect(page.getByTestId('guess-chat')).toContainText('Song title')

  await page.getByTestId('guess-input').fill('Arijith Singh')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Kesariya')
  await expect(page.getByTestId('guess-feedback')).toHaveText(/that's the artist/i)
  expect(scoreOf(await page.getByTestId('your-score').textContent())).toBeGreaterThan(0)
})

test('next song shows a loader while the preview is still downloading', async ({ page }) => {
  let hits = 0
  await page.route('**/api/fixture-tone*', async (route) => {
    hits += 1
    if (hits > 1) await new Promise((resolve) => setTimeout(resolve, 1200))
    const response = await route.fetch()
    await route.fulfill({
      status: response.status(),
      body: await response.body(),
      headers: {
        ...response.headers(),
        'cache-control': 'no-store',
      },
    })
  })

  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('play-solo').click()
  await page.getByTestId('playlist').selectOption('hindi')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('clip-status')).toHaveText('playing')
  await page.getByTestId('guess-input').fill('Kesariya')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Kesariya')
  await page.getByTestId('next-round').click()
  await expect(page.getByTestId('play-clip')).toHaveText('Loading…')
  await page.getByTestId('play-clip').click()
  await expect(page.getByTestId('clip-status')).toHaveText('playing')
})

test('michael jackson playlists do not score the artist', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('answer-artist').click()
  await page.getByTestId('playlist').selectOption('michael-jackson')
  await expect(page.getByTestId('answer-song')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('answer-artist')).toBeDisabled()
  await expect(page.getByTestId('artist-locked')).toBeVisible()
  await page.getByTestId('play-solo').click()
  await expect(page.getByTestId('answer-artist')).toBeDisabled()
  await expect(page.getByTestId('answer-song')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.locator('.round-line')).toContainText('Name the song')
  await expect(page.locator('body')).not.toContainText('Billie Jean')

  await page.getByTestId('guess-input').fill('Michael Jackson')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.getByTestId('guess-feedback')).toHaveText(/name the song/i)
  await expect(page.getByTestId('your-score')).toContainText('Aman 0')

  await page.getByTestId('guess-input').fill('Billie Jean')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Billie Jean')
})

test('a kannada round starts without showing the title', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nickname').fill('Aman')
  await page.getByTestId('playlist').selectOption('kannada')
  await expect(page.getByText('Kannada songs.')).toBeVisible()
  await page.getByTestId('play-solo').click()
  await expect(page.getByTestId('playlist')).toHaveValue('kannada')
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', 'playing')
  await expect(page.locator('body')).not.toContainText('Belageddu')
  await page.getByTestId('guess-input').fill('Belagiddu')
  await page.getByTestId('guess-submit').click()
  await expect(page.getByTestId('reveal-title')).toHaveText('Belageddu')
})

function scoreOf(text: string | null): number {
  const match = text?.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

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
