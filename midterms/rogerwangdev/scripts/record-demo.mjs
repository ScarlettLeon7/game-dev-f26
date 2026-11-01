// Optional development tool. Install Playwright separately or set PLAYWRIGHT_MODULE to its index.mjs.
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: mkdtempSync(join(tmpdir(), 'gold-miner-video-')), size: { width: 1280, height: 900 } } })
const page = await context.newPage(), errors = [], requests = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) requests.push(request.url()) })
await page.goto('http://127.0.0.1:8765/recording.html')
await page.waitForFunction(() => !document.getElementById('start').disabled)
const video = page.video()
await page.getByRole('button', { name: 'Start 3½-minute demonstration' }).click()
await page.waitForFunction(() => document.body.dataset.phase === 'open-heldout', null, { timeout: 40000 })
await page.waitForTimeout(12000)
await page.screenshot({ path: 'recordings/demo-poster.png' })
await page.waitForFunction(() => document.body.dataset.demoDone === 'true' || document.body.dataset.demoError, null, { timeout: 230000 })
const state = await page.evaluate(() => ({ done: document.body.dataset.demoDone, error: document.body.dataset.demoError }))
await context.close()
await video.saveAs('recordings/gold-miner-demo.webm')
await browser.close()
if (errors.length || requests.length || state.error || !state.done) throw new Error(JSON.stringify({ errors, requests, state }))
const bytes = readFileSync('recordings/gold-miner-demo.webm')
writeFileSync('recordings/capture-check.json', JSON.stringify({ createdAt: new Date().toISOString(), browserErrors: errors, externalRequests: requests,
  complete: true, source: 'recording.html', manifest: 'recordings/demo-manifest.json', playbackSpeed: .5,
  manualMoveSelection: false, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }, null, 2) + '\n')
console.log('Recorded complete offline demonstration:', bytes.length, 'bytes')
