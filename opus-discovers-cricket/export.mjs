// Renders every frame of the animation via headless Chromium, then hands the
// PNG sequence to ffmpeg to encode as an MP4.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FPS = 30;
const FRAMES_DIR = path.join(__dirname, 'frames');
const OUT_FILE = path.join(__dirname, 'opus-discovers-cricket.mp4');
const CHROMIUM_PATH = path.join(
  os.homedir(),
  'Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
);

if (!existsSync(CHROMIUM_PATH)) {
  console.error('Chromium binary not found at', CHROMIUM_PATH);
  process.exit(1);
}

rmSync(FRAMES_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url.pathToFileURL(path.join(__dirname, 'index.html')).href);
await page.evaluate(() => document.fonts.ready);

const duration = await page.evaluate(() => window.DURATION);
const totalFrames = Math.round(duration * FPS);
console.log(`Rendering ${totalFrames} frames (${duration}s @ ${FPS}fps)...`);

for (let i = 0; i < totalFrames; i++) {
  const t = i / FPS;
  const dataUrl = await page.evaluate((tt) => {
    window.renderFrame(tt);
    return document.getElementById('stage').toDataURL('image/png');
  }, t);
  const base64 = dataUrl.split(',')[1];
  writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(4, '0')}.png`), Buffer.from(base64, 'base64'));
  if (i % 30 === 0) console.log(`  frame ${i}/${totalFrames}`);
}

await browser.close();
console.log('All frames rendered. Encoding with ffmpeg...');

execFileSync('ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(FRAMES_DIR, 'f%04d.png'),
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '18',
  OUT_FILE,
], { stdio: 'inherit' });

rmSync(FRAMES_DIR, { recursive: true, force: true });
console.log('Done ->', OUT_FILE);
