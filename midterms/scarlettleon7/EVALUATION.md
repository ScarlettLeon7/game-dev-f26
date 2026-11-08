# Autonomous players

Python 3.10+ uses only the standard library. Godot must be the imported **3.5.2
Standard** project (the original level/resources and physics remain authoritative).
Run these commands from this project directory. macOS Godot needs window-server
access even with `--no-window`; change `--godot` on other platforms.

```sh
# One full baseline episode
python3 -m controller.run --output traces/baseline-01

# One real Vertex episode (existing ADC and gcloud CLI required)
# Set these to your existing course configuration; no default model is invented.
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --player model --live --wall 600 --request-timeout 30 --output traces/model-02

# Same three situations: baseline once and two independent live episodes each
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --evaluate --live --wall 600 --request-timeout 30 --output traces/evaluation-02

# Baseline suite without spending credits; six model trials recorded not_run
python3 -m controller.run --evaluate --output traces/baseline-suite-01

# Deterministic Python checks, then actual engine/protocol checks
python3 -m unittest discover -s tests -v
SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_episode.tscn
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
```

Use a fresh output directory for every run; previous evidence is never overwritten.
`agent-config.json` holds nonsecret settings, situation definitions, and optional
USD per million input/output token rates. Project, location, and model may instead
come from the environment shown above. Never store credentials there. The adapter
uses existing `gcloud auth application-default print-access-token`; it never logs
in or changes authentication. It calls the real Vertex
[generateContent REST endpoint](https://docs.cloud.google.com/workflows/docs/tutorials/use-vertex-ai-models).
No tools, repository contents, seed, setup prefix, evaluator results, or hidden
state are included in the model request. Only instructions, observation, and legal
actions are supplied. This is a tool-free language-model player, not an OS sandbox
for arbitrary malicious Python plugins.

## Protocol and control

`ai/external.tscn` serves newline-delimited UTF-8 JSON on a single loopback TCP
connection. The trusted launcher passes a temporary port and limits through
`SUPERTUX_PORT`, `SUPERTUX_STEPS`, `SUPERTUX_CALLS`, `SUPERTUX_TIMEOUT_MS`.
The port reservation has a small close/listen race; startup failures are explicit.
This local transport is intended for one trusted controller, not multiuser hosting.
Operations are `{"op":"reset","seed":7}`, `observe`, `legal_actions`,
`{"op":"step","action":"RIGHT"}`, and `outcome`; optional `player_id`
defaults to tux. Replies are one JSON value per line, errors are dictionaries.
`begin_model_call` is a trusted budget reservation, never exposed to the model.
Unknown operations and invalid seeds/actions are rejected. No generic method
invocation or node serialization exists. Godot logging goes to separate files.
The five-operation runner and six-physics-frame duration are unchanged.

The baseline uses position history, grounded state, visible terrain, blocks,
hazards, gaps and goals to choose movement/jumps. It releases jump between
presses. Tile appearances are coarse and may include decorative terrain, so gap
and obstacle detection is heuristic. This baseline is not claimed to win.
Malformed/illegal model responses and failed requests use this same baseline as
an explicitly recorded fallback. Every submitted action is checked against legal
actions by Python and Godot. Raw response text and usage metadata are retained.

Defaults: 600 engine steps (including situation setup), 100 model attempts,
120-second engine wall timeout, 15-second provider attempt deadline,
30-second RPC timeout. The external Godot lifetime defaults to
`wall + request-timeout + 2*rpc-timeout + 5` seconds (200 seconds with defaults,
695 seconds with `--wall 600 --request-timeout 30`). An explicit
`--process-timeout` must meet that minimum. All limits must be positive and
finite. CLI flags can lower or raise these bounds; step and call defaults remain
600 and 100. The margin covers startup, an in-flight provider attempt and cleanup,
and terminal RPC handling; it is a bounded grace period, not extra game time. Every provider attempt reserves its call **before**
requesting; failures and timeouts consume the budget, with no automatic retries.
A separate worker process bounds token acquisition and HTTP calls. The engine
lifetime watchdog handles engine hangs; infrastructure failures preserve partial
traces and report unavailable outcome rather than claiming a loss.
A terminal step rejection carries the engine outcome through to the report:
wall expiry becomes `episode_limit / wall_timeout`, preserving score and without
counting the rejected action as executed. Its decision remains in the trace,
followed by `action_not_executed`. Infrastructure errors record `partial_trace`,
a structured engine response when available, and `last_outcome`; the summary
sets `trace_complete=false`. Trace/log creation is exclusive even when calling
`episode()` directly.

## Evaluation design and measurements

The fixed situations in `agent-config.json` are opening (seed 7), approach
(seed 17, five RIGHT steps), and held-out-jump (seed 29, a five-action jump
prefix). Prefixes run through real `step`, consume the same episode budgets,
and are traced separately from player actions. These are modest initial-state
variations on one level, not three different levels or guaranteed distinct
obstacle types. Held-out is reserved for final evaluation; no tuning on its
results is claimed. Each model trial starts a fresh engine and has no prior
trial history. Human experience is not measured by these tests.

Each JSONL records reset, setup, decisions (raw text, errors, fallback, latency,
usage), steps and final summary. `report.json` records every requested episode,
win, score, terminal reason, successful submitted actions, invalid model
proposals/failed calls, fallback count, setup and player step counts, model calls,
latencies, total tokens and estimated cost. Null means unavailable, never zero.
Baseline tokens/cost are zero. Partial token usage stays in traces; aggregate
usage/cost remains null if any attempt lacks usage. Rates must be supplied for
cost estimates; output estimates use total minus prompt tokens (including
reported reasoning tokens). These are estimates, not billing records; model,
region, caching and rate differences require checking actual billing.

Python player tests use explicit deterministic doubles, never live-trial evidence.
The original Godot tests cover lifecycle/limit detection. The saved model-01
trace is a real Vertex episode with partial measurements; its unavailable outcome
must not count as a completed evaluation. Supply your existing provider
configuration when running new live trials.

## Actual local verification (November 7, 2026)

* Python: four player tests plus real Godot protocol test passed (5 total).
* Existing Godot episode suite: 32 checks passed, zero failures, exit 0.
* Existing Godot input assertions and real-level integration (10 checks): passed.
* Baseline suite: opening died after 36 player steps; approach and held-out-jump
  each died after 31 player steps plus five setup steps. All scored 0. No wins.
* Raw evidence: `traces/baseline-suite-actual/`; `report.json` also lists six
  model trials as not run. The suite was run before any tuning on its results.
* Initial sandbox failure and separate 40-step-cap baseline smoke are preserved
  in `traces/baseline-smoke/` and `traces/baseline-real-smoke/` respectively.
* At the initial verification, live Vertex trials had not been run. The later
  user-supplied model-01 trace is analyzed below. No new live calls were made
  during the timeout fix.

Only new transport/controller/config/tests/docs and traces were added; existing
EpisodeRunner, Tux controls, level, physics, scenes, licenses and credits remain
unchanged. No game rules, legal actions, observations or scoring were changed,
so no rule-change review is claimed for this transport integration. Referenced
`.claude` skill/reviewer files remain absent locally.

## Timeout regression investigation (November 7, 2026)

The preserved `traces/model-01/opening-model-1.jsonl` contains 68 successful
Vertex decisions and 67 executed steps (402 physics frames), last score 5.
Its final decision succeeded; the following step did not return successfully.
The original `Game.rpc()` raised `RuntimeError` for a structured terminal reply
and discarded the outcome. The broad episode handler then discarded the message.
The engine's idle wall timer runs while waiting for Vertex; after expiry,
`step()` returns `error=terminal` with `episode_limit/wall_timeout`. This path
explains the 121.147-second result with a 120-second engine budget. The external
150-second watchdog would not yet have fired. No engine log or exception message
was saved with this trace, so the historical exception text cannot be recovered;
a disconnected transport also used RuntimeError. The real-engine regression
reproduces and verifies the terminal-rejection path without any provider call.
No original trace is rewritten or relabeled as a successful completed episode.

Verification commands are listed above. The live commands now use finite
600-second engine and 30-second provider budgets with an automatic 695-second
external deadline per episode. The full suite runs three baselines and six real
Vertex trials; each trial still permits at most 600 steps and 100 model attempts.
Choose a new output path if the example already exists.

Fix verification: all eight Python tests passed with real Godot integration,
including wall expiry between decision and step; the existing episode suite,
input assertions, and ten real-level checks passed. CLI checks rejected NaN and
an insufficient external deadline. No live Vertex credits were spent verifying
the fix. Modified files: `controller/run.py`, `tests/test_controller.py`, and
`EVALUATION.md`; the runner, level and physics files are unchanged.

## Completed live evaluation — November 7, 2026

Source: [report](traces/evaluation-02/report.json) and all nine adjacent JSONL files. Each raw summary matches its report entry; decision, executed step, setup, latency and token counts were cross-checked. Historical JSONL files were also inspected. Original evidence is preserved.

All nine episodes ended in `defeat / death`. Baseline win rate: **0/3 (0%)**; Vertex win rate: **0/6 (0%)**. Model: **`gemini-3.5-flash-lite`** (recorded in reports; configuration uses an environment override). No invalid proposals, fallbacks, failed provider calls, infrastructure errors or timeouts occur in these nine completed trials.

| Situation / player / trial | Score | Player steps | Setup steps | Calls | Elapsed s |
|---|---:|---:|---:|---:|---:|
| opening / baseline / 1 | 0 | 36 | 0 | 0 | 5.384 |
| opening / model / 1 | 10 | 79 | 0 | 79 | 174.474 |
| opening / model / 2 | 0 | 19 | 0 | 19 | 35.571 |
| approach / baseline / 1 | 0 | 31 | 5 | 0 | 5.186 |
| approach / model / 1 | 5 | 74 | 5 | 74 | 137.750 |
| approach / model / 2 | 3 | 28 | 5 | 28 | 50.115 |
| held-out-jump / baseline / 1 | 0 | 31 | 5 | 0 | 5.233 |
| held-out-jump / model / 1 | 13 | 64 | 5 | 64 | 115.600 |
| held-out-jump / model / 2 | 0 | 14 | 5 | 14 | 25.610 |

Steps exclude setup; every executed action advances six physics frames. Elapsed time includes startup, decisions and engine work. Latency below is per provider attempt, including process/authentication/HTTP overhead, rather than isolated model inference time.

| Live trial | Input tokens | Output tokens | Total tokens | Latency mean / median / max (s) | Conditional global / non-global USD |
|---|---:|---:|---:|---|---|
| opening 1 | 41,966 | 556 | 42,522 | 2.083 / 1.659 / 21.659 | 0.013980 / 0.015378 |
| opening 2 | 12,461 | 106 | 12,567 | 1.691 / 1.673 / 1.914 | 0.004003 / 0.004404 |
| approach 1 | 44,177 | 505 | 44,682 | 1.727 / 1.645 / 6.486 | 0.014516 / 0.015967 |
| approach 2 | 13,669 | 185 | 13,854 | 1.611 / 1.585 / 2.277 | 0.004563 / 0.005020 |
| held-out-jump 1 | 33,023 | 445 | 33,468 | 1.668 / 1.666 / 2.053 | 0.011019 / 0.012121 |
| held-out-jump 2 | 9,413 | 80 | 9,493 | 1.585 / 1.608 / 1.712 | 0.003024 / 0.003326 |

Totals: **278 calls**, **154,709 input + 1,877 output = 156,586 tokens**. Call-weighted latency mean 1.793s, median 1.651s, range 1.418–21.659s. Baselines use zero tokens/calls and cost $0.

Model mean score: **5.17**, median **4**, range **0–13**; baseline mean/median **0**. Model mean scores by situation: opening **5**, approach **4**, held-out-jump **6.5**, versus **0** for each baseline. Four of six trials scored above baseline; two tied. Mean player steps: model **46.33**, baseline **32.67**; longer survival is not a win.

### Pricing provenance and estimates

Checked November 7, 2026: Google Cloud’s authoritative [Vertex pricing URL](https://cloud.google.com/vertex-ai/generative-ai/pricing), redirected to [Model Garden pricing](https://cloud.google.com/model-garden/pricing), Gemini 3 **Standard** table. Gemini 3.5 Flash-Lite text rates are $0.30 input / $2.50 output per million tokens globally, or $0.33 / $2.75 for non-global endpoints. The page states non-global pricing applies from **July 1, 2026**. Priority and Flex/Batch tables have different prices; Gemini Developer API pricing is not the billing source used here. This is a dated lookup, not an archived invoice or a guaranteed historical rate snapshot.

Conditional standard on-demand estimates use `(prompt tokens × input rate + (total − prompt) × output rate) / 1,000,000`. The recorded usage is TEXT, ON_DEMAND; no cache usage is reported. Output includes any reasoning counted in total minus prompt. Aggregate conditional estimates: **$0.051105 global**, **$0.056216 non-global**.

The actual endpoint location is absent from the saved report and null in `agent-config.json`. Therefore a single run-specific estimated cost remains **unavailable** (`null` in original evidence); the two conditional calculations above must not be presented as the amount billed. Confirm endpoint and applicable rate with your Cloud billing records. Credits, taxes, negotiated discounts and historical partial-run charges are excluded. No original report or trace was rewritten to insert an assumed region or price.

### Interpretation and evidence limits

These are two stochastic trials per situation, one baseline per situation, on one level. Small samples, a weak baseline, coarse local observations and render-frame updates prevent broad reliability or replay-determinism claims. Seeds and prefixes are initial-state variations; “held-out” is a configuration label, not independent proof of no tuning. Death traces establish outcome, not a verified causal diagnosis for each failure. Model latency pauses bounded physics progression but consumes wall time. Successful collection with zero wins demonstrates partial progress, not platformer mastery. No human-experience result follows from these automated tests. The earlier `model-01` timeout remains separate regression evidence and is excluded from these six completed trials.

### Submission evidence audit

* `docs/interface-review.md` reports a separate read-only `rules_review` agent, findings and follow-up. It supports a documented review claim for the earlier interface, but no session transcript/ID or immutable session link is present to independently verify a separate session. It does not cover the later controller, live evaluation or this CI change. A strict separate-session evidence requirement is **not yet demonstrably satisfied**. Obtain an actual independent read-only review and retain its session reference, scope, findings and dispositions; no review was created by this audit.

* No project-local reusable `SKILL.md` or execution evidence was found; the referenced `.claude` skill/reviewer files are absent. Add the required reusable skill and an actual usage artifact if required by the rubric.

* No human playtest observations, participant-safe outcomes/interpretation, playable-build link, or video/recording link was found in project documentation. JSONL action traces are automated evidence, not a video or human playtest. Conduct and document actual human testing and supply accessible recording/build links.

* `AGENT-TEAM.md` is referenced by README but absent. Supply executable role configurations and real role/session evidence, your design decisions and limitations. Current `agent-config.json` configures the runtime player only.

* Student must verify media licenses/credits, maintain Asana tasks/PPP/acceptance and gate decisions, link the PR/CI, and verify the course rubric and submission destination/deadline. Asana and any external submission state were not available in this audit. No gate approval, commit, push, publication or live rerun was performed.

### Verification for this documentation/CI phase

Modified files: `EVALUATION.md`, `README.md`, and the sole new workflow `../../.github/workflows/midterm-scarlettleon7.yml`. Gameplay, physics, controller behavior, original evidence and credentials were untouched.

Actual local results on November 7, 2026, Godot `3.5.2.stable.official.170ba337a`:

* `python3 -m unittest discover -s tests -v`: 7 passed, 1 opt-in integration skipped (8 discovered).
* `SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v`: all 8 passed, including actual Godot protocol/termination and wall-expiry regression.
* `tests/test_episode.tscn`: 32 checks passed, zero failures, exit 0.
* `tests/test_ai_controls.gd`: assertions passed, exit 0.
* `tests/test_ai_level.tscn`: 10 checks passed, zero failures, exit 0, including keyboard restoration.
* All saved JSONL files parsed; evaluation-02 raw counts, usage, latencies and embedded summaries matched report.json.

The initial sandbox Godot version probe aborted; successful engine tests used approved macOS window-server access. Existing OpenGL texture warnings appeared; no GDScript errors appeared. CI uses the official Godot 3.5.2 Standard Linux binary, asset import, Xvfb and software OpenGL, with bounded commands and explicit success/error checks. No Vertex secrets/authentication or live evaluation command is configured. Python integration currently hardcodes macOS, so Linux CI uses the three direct engine suites and leaves that Python test skipped. The workflow has not run on GitHub; Linux CI success is pending a student push/PR. No costly trials were rerun.
