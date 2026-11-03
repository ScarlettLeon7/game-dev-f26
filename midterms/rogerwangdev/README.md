# Gold Miner — model-player evaluation

A bounded adaptation of [Lor3walker/gold-miner](https://github.com/Lor3walker/gold-miner), comparing model-selected launch timing with a geometry-based heuristic. The original claw physics, item definitions, and procedural artwork are reused under MIT. The pinned source, license, and file hashes are recorded in [SOURCE.json](SOURCE.json).

## Current status

- Playable browser game and five-operation engine implemented.
- Heuristic reaches the quota in all three development and all three held-out situations.
- All 38 deterministic engine, human-frame parity, runner, replay, mocked adapter, timing-skill and evaluation-audit tests pass locally. Independent review evidence is in [review.md](review.md).
- **Final held-out evaluation is complete.** Twelve fresh Vertex episodes compare observation-only input and four-entry history. Gemini reached 2/6 quotas with H0 and 0/6 with H4. The heuristic reached all quotas. All 24 final traces, the original failed checkpoint and the $0.1994127 final token-cost estimate are retained in [EVALUATION.md](EVALUATION.md).
- [The development runtime passed fork CI at 675090b](https://github.com/rogerwangdev/game-dev-f26/actions/runs/41331690374), including source verification, tests, timing checks, the saved-trace audit and development baselines. This submission branch is a clean snapshot of that work and needs its own remote CI run after publication. No course PR is claimed. See [verification and CI status](EVALUATION.md#verification).

## Shareable playtest

[Play Gold Miner](https://gold-miner-peer-playtest.rogerwang0506.chatgpt.site/) or share the [15-minute playtest guide](https://gold-miner-peer-playtest.rogerwang0506.chatgpt.site/playtest.html). Anyone with the link can play without installing software or providing credentials. The guide links the captioned agent recording and feedback prompts. Send actual feedback through the agreed course/private channel. The site does not collect feedback or start paid provider calls.

Peer evidence: [October 30 feedback received](docs/playtests/2026-10-30-received.md) and [November 1 Catacomb II review given](docs/playtests/2026-11-01-given-catacomb-ii.md). The [peer-notes index and response record](PEER-NOTES.md) summarize the observations and remaining gaps. The source report is preserved unchanged, including its unchecked confirmation box and Not verified technical items.

## Rubric 5A and 5B

| Check | Evidence and status |
| --- | --- |
| **5A — fair evaluation** | Completed model/baseline comparison in [EVALUATION.md](EVALUATION.md), with the [pre-run protocol](FINAL-EVALUATION.json), held-out cases, complete traces, metrics and failures. Human feedback does not replace these experiments. |
| **5B — reflection and peer feedback** | The [reflection](AGENT-TEAM.md) explains design decisions, limitations and responses to [received feedback](docs/playtests/2026-10-30-received.md). [PEER-NOTES.md](PEER-NOTES.md) indexes both reports. The [partner review](docs/playtests/2026-11-01-given-catacomb-ii.md) was sent on November 1. Tester confirmation, total session duration and the exact agent view were not recorded. |

## Submission layout

The submission is self-contained in `midterms/rogerwangdev/`. Its only change outside that folder is `.github/workflows/midterm-rogerwangdev.yml`.

```text
midterms/rogerwangdev/
├── README.md, EVALUATION.md, AGENT-TEAM.md, PEER-NOTES.md
├── package.json, agent-config.json     # Commands and agent configuration
├── SOURCE.json, SUITE.json, FINAL-EVALUATION.json
├── index.html, style.css, recording.html
├── src/                               # Game, players, runner and browser
├── test/                              # Deterministic tests
├── scripts/                           # Evaluation, audit and capture tools
├── docs/                              # Rule map, skill uses and peer notes
├── skills/                            # Reusable rule-change procedure
├── reports/                           # Recorded trials and comparison data
├── recordings/                        # Video, replay menu and provenance
└── vendor/gold-miner/                  # Pinned original code and MIT license
```

## Run locally

Use Node.js 22 or later and Python 3 for the static server. No npm dependencies are required for the game, tests, baseline or saved-trace audit. Live Vertex play also requires Google Cloud CLI (`gcloud`), funded project access, and application-default authentication. Video capture is an optional development tool with separate Playwright requirements.

From the repository root, enter this project once:

```bash
cd midterms/rogerwangdev
```

Run every command below from `midterms/rogerwangdev/`:

```bash
npm test
npm run verify-source
npm run check:timing
npm run audit:evaluation
npm run baseline
npm run serve
```

Open <http://127.0.0.1:8765>. Choose a situation and player. The centered **Start game** button begins smooth 60 Hz human play with **You** selected. The field stays still until you start. The adjacent **How to play** panel combines the goal, labeled controls, launch button and round guidance. Click the field, click **Launch claw**, or press Space/Down to launch on the next physics tick at the visible angle. **Pause game** stops the clock and shows **Resume game**. At the end, a result panel reports the score and goal, with **Play again** and **View final field**. Hidden tabs pause automatically.

Open **Replay files and debug tools**, then enable **Debug stepping** to pause and reveal **Wait 0.5 seconds**. While paused, Right advances that interval and Launch fires before advancing it. Turn debugging off and use Resume game to resume smooth play. Heuristic and recorded model decisions retain the evaluation's 0.5-second steps. Human downloads identify `human-realtime-60hz` timing and per-record frame counts so they replay through the frame adapter. Old evaluation recordings still replay through the frozen agent engine. Replays make no provider calls.

To watch the actual first Gemini run, open <http://127.0.0.1:8765/?replay=vertex> or select **Original checkpoint** and click **Watch selected episode**. Use **Pause replay**, then **Next recorded step** to inspect each observation, returned action, latency, and result in the agent inspector. Automatic waits are labeled separately and make no model request. This recording ends with the actual failed $0/750 outcome. No new API calls are made when watching it.

The **Gemini recording** dropdown includes the original checkpoint and all 12 final model episodes, grouped by no history or four previous decisions. Each option shows the case, trial, recorded score/quota and whether the quota was reached. Changing the selection starts that replay. Both successes and failures remain available. For example, [open trial 2 without history](https://gold-miner-peer-playtest.rogerwang0506.chatgpt.site/?replay=vertex&episode=h0-open-heldout-2) scored $1,011/$750, and [blocked trial 1 without history](https://gold-miner-peer-playtest.rogerwang0506.chatgpt.site/?replay=vertex&episode=h0-blocked-heldout-1) scored $970/$700. These are selected recorded examples, not new runs or representative success-rate estimates.

## Recording

[Watch/download the 3½-minute WebM recording](recordings/gold-miner-demo.webm), or serve the project and open <http://127.0.0.1:8765/recording.html> for the interactive demonstration. [Capture provenance and reproduction](recordings/README.md) describe its selected traces, hashes and checks.

The recording replays real Vertex actions at half speed and labels that clearly. It shows the first observation-only trial of each held-out case, selected before results were known. It includes failures, numeric observation excerpts, returned actions, actual recorded latency and the full comparison. No person selects gameplay moves and no model calls occur while watching. This is recorded evaluation playback rather than a new live browser-connected agent.

![Recording preview](recordings/demo-poster.png)

The agent loop runs locally in `src/runner.js`. It sends visible numeric state and allowed actions to the existing Gemini model through `src/vertex.js`, validates the returned action, and advances the local engine. The game and runner have not been deployed to Google Cloud. Gemini receives structured game observations rather than a browser connection or screenshot. Opening the browser game does not start a live model episode.

## Scope and controls

**Scope statement — updated November 1, 2026.** Gold Miner replaces my Week 3 Metal Slug proposal. Its timing and geometry provide a manageable scope for a complete game and reproducible agent evaluation.

The scope includes one level format with three selectable situations, static gold, diamonds, rocks, quotas and a timer. Value is awarded after retrieval. Episodes end when the field is cleared or time expires, with success determined by the quota. Shops, upgrades, combos, dynamite, hidden-value bags, moving animals and campaign progression are excluded.

The model receives structured public observations rather than the audiovisual input proposed for Metal Slug. Gemini and the heuristic use the same fixed-step interface and evaluation cases. I would cut additional layouts and visual polish first, preserving the complete gameplay loop and model/baseline comparison.

The evaluation engine uses 60 Hz physics and 30 frames per decision. An action is `{"type":"wait"}` or `{"type":"launch","frame":N}` for integer `N` from 0 to 29. A launch waits exactly N physics frames in the current interval before firing. Model thinking time does not advance the game. The runner advances forced waits without model calls while the claw cannot accept another launch. Both players use identical controls.

The authoritative engine exposes `reset(seed)`, `observe(player_id)`, `legal_actions(player_id)`, `step(player_id, action)`, and `outcome()`. Public numeric object properties support evaluation without a vision model. Players receive copied observations and have no engine handle, file-reading tools, credentials, or evaluator annotations.

The [rule/source map](docs/rule-source-map.md) distinguishes inherited rules from intentional adaptations. Our contribution is the fixed-step agent interface, smooth human frame adapter, bounded level scenarios, baseline, model adapter, runner, tests, traces, and English checkpoint interface. `src/human-episode.js` is browser-only and reuses the original hook physics. Parity tests compare every interval of all development baseline episodes against the frozen evaluation engine. Human play is not a new model-performance evaluation.

## Run another live Vertex episode

These commands make paid API calls only when `--live` is present. Run from this project folder after configuring the project associated with your course credits and application-default credentials:

```bash
export GOOGLE_CLOUD_PROJECT='YOUR_GCP_PROJECT_ID'
export GOOGLE_CLOUD_LOCATION='global'
export COURSE_MODEL='gemini-3.5-flash-lite'
gcloud auth application-default login
npm run evaluate -- --player vertex --live --suite development --scenario open-dev --trials 1
```

For existing application-default credentials outside the standard WSL directory, set `GOOGLE_APPLICATION_CREDENTIALS` to that local file. Do not copy credentials into this repository. The adapter reads an access token through `gcloud` and sends only public gameplay context to Vertex. It has no retry or heuristic fallback.

The default live limits are 60 calls, three invalid responses, 15 seconds per call, and 180 seconds per episode. Failed calls count. Use a small development episode first. Inspect the saved summary and trace, including failures, before broader evaluation.

The final evaluation has already run. The frozen [protocol](FINAL-EVALUATION.json), [audited results](reports/final-analysis.json) and [per-trial CSV](reports/final-results.csv) are included. To perform a new reproduction, use the same cases and two trials per situation. The two Vertex commands below make new paid requests. Separate output folders preserve the recorded final results:

```bash
npm run evaluate -- --player baseline --suite heldout --trials 2 --history 0 --output-dir reports/reproduction-baseline-h0
npm run evaluate -- --player baseline --suite heldout --trials 2 --history 4 --output-dir reports/reproduction-baseline-h4
npm run evaluate -- --player vertex --live --suite heldout --trials 2 --history 0 --output-dir reports/reproduction-vertex-h0
npm run evaluate -- --player vertex --live --suite heldout --trials 2 --history 4 --output-dir reports/reproduction-vertex-h4
```

Do not use held-out results to tune the prompt. [SUITE.json](SUITE.json) records the declared cases, budgets, and scenario hash before any live trials. [EVALUATION.md](EVALUATION.md) reports actual evidence and outstanding work.

## Agent-team evidence

[AGENTS.md](AGENTS.md) and [agent-config.json](agent-config.json) define development and gameplay roles. The reusable [gold-miner-rule-change skill](skills/gold-miner-rule-change/SKILL.md) connects source evidence, behavioral tests and independent review. [Two actual uses](docs/skill-use.md) document implementation and an isolated timing-change rehearsal. The [review record](review.md) summarizes findings and fixes.

The [reflection](AGENT-TEAM.md) explains my design decisions and limitations. An [outgoing peer review](docs/playtests/2026-11-01-given-catacomb-ii.md) was sent on November 1. [Peer notes](PEER-NOTES.md) link the received report and its limitations.

Original source: Lor3walker, pinned in SOURCE.json under the retained [MIT license](vendor/gold-miner/LICENSE). Procedural artwork is inherited from that code. This adaptation does not claim affiliation with the original Gold Miner publisher.
