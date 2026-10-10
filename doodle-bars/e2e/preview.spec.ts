import { expect, test } from '@playwright/test'

const description = 'Hear a clip and guess the song! Play solo or with friends :)'

test('the home page has a favicon and a large link preview', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Song Guesser')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Song Guesser')
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description)
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Song Guesser/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')

  const image = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(image).toBeTruthy()
  const preview = await page.request.get(image!)
  expect(preview.ok()).toBeTruthy()
  expect(preview.headers()['content-type']).toContain('image/png')
  const bytes = await preview.body()
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(bytes.readUInt32BE(16)).toBe(1200)
  expect(bytes.readUInt32BE(20)).toBe(630)

  const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content')
  expect(twitterImage).toBeTruthy()

  const iconHref = await page.locator('link[rel="icon"]').first().getAttribute('href')
  expect(iconHref).toBeTruthy()
  const icon = await page.request.get(iconHref!)
  expect(icon.ok()).toBeTruthy()

  const apple = page.locator('link[rel="apple-touch-icon"]')
  await expect(apple).toHaveCount(1)
  const appleRes = await page.request.get((await apple.getAttribute('href'))!)
  expect(appleRes.ok()).toBeTruthy()
  const appleBytes = await appleRes.body()
  expect(appleBytes.readUInt32BE(16)).toBe(180)
  expect(appleBytes.readUInt32BE(20)).toBe(180)
})
