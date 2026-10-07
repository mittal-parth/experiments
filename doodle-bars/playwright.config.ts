import { defineConfig, devices } from '@playwright/test'

const port = process.env.PW_PORT ?? '3000'
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: port,
      SONG_PREVIEW_MODE: 'fixture',
      SONG_ORDER: 'catalog',
      GUESS_GRACE_SECONDS: '45',
    },
  },
})
