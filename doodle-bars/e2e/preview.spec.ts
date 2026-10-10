import { expect, test } from '@playwright/test'

const description = 'Hear a clip and guess the song! Play solo or with friends :)'
const title = 'Song Guesser — guess the song from a clip'
const site = 'https://song.mittalparth.dev'

test('the home page has a favicon and a large link preview', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description)
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', /song guesser/)
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'mittalparth')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`^${site}/?$`))
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', new RegExp(`^${site}/?$`))
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description)
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Song Guesser/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute('content', '@mittalparth')
  await expect(page.locator('meta[name="twitter:creator"]')).toHaveAttribute('content', '@mittalparth')
  const linkedData = await page.locator('script[type="application/ld+json"]').evaluate((node) => node.textContent ?? '')
  expect(linkedData).toContain(site)
  await expect(page.getByRole('link', { name: 'mittalparth on X' })).toHaveAttribute('href', 'https://x.com/mittalparth')
  await expect(page.getByRole('link', { name: 'Song Guesser on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/mittal-parth/experiments',
  )

  const image = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(image).toMatch(/\/opengraph-image/)
  const imageUrl = new URL(image!)
  const preview = await page.request.get(`${imageUrl.pathname}${imageUrl.search}`)
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
