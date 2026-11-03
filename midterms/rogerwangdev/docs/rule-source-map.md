# Rules and source evidence

Source paths below refer to the pinned upstream revision in `SOURCE.json`. Project locators identify the implemented adapter and evaluation contract. Inherited behavior is labeled `code`, and deliberate adaptations are labeled `design`.

| Rule | Evidence | Locator and decision |
| --- | --- | --- |
| Item value, weight, and collision radius are inherited unchanged | code | `vendor/gold-miner/js/items.js:8`, `TYPES`. Gold values 50/100/250/500, diamond 600, rocks 11/20. Public observations use these definitions |
| Extension speed 680 px/s, empty return 1020 px/s, pull base 900, pull bounds 48–620, claw radius 15, resting length 76 | code | `vendor/gold-miner/js/hook.js:8`, constants and `Hook.pullSpeedFor` |
| World width 960, height 640, ground y=150, pivot (480,107.5), angular bounds ±76 degrees, rope limit 760 | code | `vendor/gold-miner/js/main.js:5` and `js/game.js:30`, world initialization. The adapter retains this geometry |
| Initial angle -0.8 radians, direction rightward, default angular speed 1.18 rad/s | design | `src/episode.js:reset`. Fixed initial conditions replace the upstream per-level speed schedule |
| Explicit layouts, quotas, and timers belong to three development and three held-out situations | design | `src/scenarios.js` and `SUITE.json`. Layout identity is determined by the scenario, while reset seed determines procedural appearance |
| Claw swings between fixed angular limits and launches along its current direction | code | `vendor/gold-miner/js/hook.js`, `Hook.update` and `Hook.launch` |
| First collision during outward travel determines the collected object | code | `vendor/gold-miner/js/hook.js`, `Hook.update` and `Hook.pickAt` |
| Heavier objects return more slowly, using bounded inverse-weight speed | code | `vendor/gold-miner/js/hook.js`, `Hook.pullSpeedFor` |
| Value is delivered when the claw returns to its resting length | code | `vendor/gold-miner/js/hook.js`, retract branch and `Game.onDeliver` in `js/game.js` |
| Level timer advances by simulated delta time | code | `vendor/gold-miner/js/game.js`, `Game.update` |
| Checkpoint uses static gold, diamonds, and rocks with known values, no shop, combo, dynamite, bags, or animals | design | `src/episode.js` and `src/scenarios.js`. Bounded scope isolates timing and value/time decisions |
| Physics advances at 60 Hz, decisions advance 30 frames, launch optionally occurs at an explicit frame 0–29 | design | `src/episode.js`. Fixed interval preserves timed aiming without API latency changing the game. The timing-change procedure is in `skills/gold-miner-rule-change/references/simulation-timing.md`, with an offline contract check in `scripts/check-timing.mjs` inside that skill. The October 28 skill work does not change this rule |
| Invalid commands leave gameplay unchanged, with runner-counted failures and finite budgets | design | `src/episode.js`, `src/runner.js` |
| Episode ends at time expiry or field clearance, with quota-based success | design | `src/episode.js`. One standalone bounded level |
| Players receive visible objects, public physics, claw state, timer, score, and legal controls as copies | design | `src/episode.js`. No engine, seeds, credentials, or evaluator annotations |
| Both players use identical fixed-step controls and forced-wait handling | design | `src/runner.js` |
| Human browser play advances one 60 Hz physics tick per display-time tick, with immediate next-tick launch input. Pause/step remains an inspection control | design | `src/human-episode.js` and `src/browser.js`. Uses the same imported hook, item definitions, initial world, scoring and end conditions. Baseline/model evaluation retains the frozen 30-frame decision interface. Parity tests compare matching human ticks with agent actions. Human traces declare per-step frame counts and replay through the human adapter |
| Empty launches omit a visual particle effect while preserving return physics | design | `src/episode.js`, no-op `puff` callback. Regression test covers the observed headless crash |
