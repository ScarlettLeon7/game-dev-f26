# Autonomous-play recording

[Play/download gold-miner-demo.webm](gold-miner-demo.webm) · [captured preview](demo-poster.png) · [capture checks and hashes](capture-check.json) · [selected traces and comparison](demo-manifest.json)

The video is **3 minutes 31.6 seconds**, 1280×900, VP9 WebM at 10 fps, without audio. Captions provide the explanation. It preserves the full capture duration and is about 2 MB. Serve the project with `npm run serve` and open <http://127.0.0.1:8765/recordings/gold-miner-demo.webm>, or use the interactive presentation at <http://127.0.0.1:8765/recording.html>.

## What it shows

The original [final protocol](../FINAL-EVALUATION.json) selected the first observation-only live trial of each held-out case before outcomes were known. The video displays those actual saved decisions at half speed, with the real engine, observation excerpts, validated actions, recorded API latency, score/timer and final outcomes. It includes both failures and a quota success. A closing table includes every final arm rather than only the selected examples.

The claw actions were selected autonomously by Vertex `gemini-3.5-flash-lite` during evaluation. The browser recording replays those actions. No human chooses gameplay moves, no new model calls occur during capture, and this is not presented as a live browser-connected agent. Internal model reasoning and intended target IDs were not recorded or invented.

Capture completed without browser errors or external requests. The sidecar records the raw capture hash and the final compressed artifact hash. Independent review exercised the complete presentation and checked its first-trial selection, labels and data against the final traces. [October 30 peer feedback](../docs/playtests/2026-10-30-received.md) is now filed. Its agent view was not identified, so it cannot be attributed specifically to this video.

## Recreate the presentation or capture

From `midterms/rogerwangdev/`, `npm run serve` serves all required local files. Click the presentation's start button and it advances without gameplay input.

Automated capture is optional and uses Playwright **1.64.1** and Chromium. These tools are not needed for game/test/evaluation reproduction. Install capture tools separately, for example:

```bash
npm install --prefix /tmp/gold-miner-capture-tools playwright@1.64.1
/tmp/gold-miner-capture-tools/node_modules/.bin/playwright install chromium
```

Keep the server running in another terminal. From `midterms/rogerwangdev/`:

```bash
PLAYWRIGHT_MODULE=/tmp/gold-miner-capture-tools/node_modules/playwright/index.mjs node scripts/record-demo.mjs
```

`CHROMIUM_EXECUTABLE` can select an already-installed compatible Chromium executable. The script captures the full demonstration, saves the preview and writes capture checks. It creates a larger raw video. The committed video was compressed with FFmpeg using `libvpx-vp9`, bitrate `55k`, CRF `42`, output rate `10`, `cpu-used 8` and no audio. Preserve the raw file before re-encoding to the output filename, and update the final artifact's hash/duration in the sidecar. This presentation changes playback speed only, never simulation frequency or recorded choices.

The recording is included in this submission and is available on the public [video page](https://gold-miner-peer-playtest.rogerwang0506.chatgpt.site/watch.html). The course PR should link it directly.
