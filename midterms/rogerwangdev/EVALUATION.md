# Gold Miner evaluation

## Declaration

The concrete suite is in `src/scenarios.js`, with its pre-live declaration and hash in `SUITE.json`. Three development situations cover open targets, a blocked approach, and a tight time budget. Three separate held-out situations are reserved for the final comparison. The scenario fixtures were committed to the working tree before any model calls or prompt tuning. Their declaration is not evidence that live trials have run.

The shared controls use 60 Hz physics, 30 frames per decision, and a launch offset of 0–29 frames. The baseline predicts intercepts from visible geometry and ranks value per estimated waiting, outward, and return time with a 240-frame horizon. Both players get the same observations. `SUITE.json` is preserved as the original pre-live declaration, including its historical setup status. Current results are recorded below.

## Final held-out evaluation, October 28

The unchanged Gemini player reached **2 of 6 quotas with observation-only input**, compared with **0 of 6 with four previous decision/result entries**. The geometry-based heuristic reached all six quotas in each arm. These are a small classroom sample, not estimates of general success rates.

The [final protocol](FINAL-EVALUATION.json) was committed as `e7e4ec2` before the first held-out episode. It preserves the original scenario declaration, prompt, rules, seeds, 0.5-second decisions and resource limits. The recorded gameplay hash is `67ca7cefe52c686116bbe8759b99dd9a96f4349ce6af2fe7708b1b6501462ee0`. No held-out result was used to change a prompt, layout, quota or policy. Each arm ran two trials per case. Both heuristic history arms ran first, followed by model H0 and model H4.

| Case / quota | Heuristic scores (both history arms) | Gemini H0 scores / wins | Gemini H4 scores / wins |
| --- | --- | --- | --- |
| open-heldout / 750 | 1011, 1011 | 11, 1011 / 1/2 | 161, 161 / 0/2 |
| blocked-heldout / 700 | 1570, 1570 | 970, 370 / 1/2 | 370, 370 / 0/2 |
| budget-heldout / 650 | 1150, 1150 | 0, 0 / 0/2 | 50, 20 / 0/2 |

| Player | History entries | Quota reached | Mean raw score | Model calls | Input / output tokens | Estimated USD |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 6/6 | 1243.7 | 0 | 0 / 0 | 0.0000000 |
| baseline | 4 | 6/6 | 1243.7 | 0 | 0 / 0 | 0.0000000 |
| vertex | 0 | 2/6 | 393.7 | 157 | 96,113 / 1,287 | 0.0320514 |
| vertex | 4 | 0/6 | 188.7 | 157 | 543,596 / 1,713 | 0.1673613 |

| Model arm | Mean / median / p95 latency (ms) | Total episode wall seconds |
| --- | --- | --- |
| H0 | 731.2 / 713.7 / 897.7 | 114.87 |
| H4 | 957.0 / 828.4 / 1688.0 | 150.32 |

All 12 live episodes reached ordinary game termination, with zero illegal actions, fallbacks, provider errors, request timeouts or exhausted call budgets. The 314 API calls reported 639,709 input tokens and 3,000 output tokens, for **$0.1994127 USD** estimated cost. All failures remain in the committed traces. Baseline decisions are local computations, not API calls.

### Reproducibility and metrics

[Per-trial CSV](reports/final-results.csv), [audited JSON](reports/final-analysis.json), and [campaign ledger](reports/final-campaign-ledger.json) retain all 24 runs. The JSON links every complete trace and reports score/quota, success, terminal reason, seed through its trace, simulated and wall time, decisions/model calls, forced waits, invalid actions, launch/grab/delivery counts, rock grabs, completed empty retrievals, unfinished empty launches, latency, tokens, dated cost and model versions. `npm run audit:evaluation` independently replays each action and verifies every recorded observation, event, outcome and metric total against the frozen game.

An empty retrieval means a launched claw returned without grabbing an object. An empty launch still in flight at episode expiry is reported separately, rather than counted as a completed miss. Per-trial latency quantiles use nearest ranks. The arm-level median above uses the ordinary median of all recorded requests, and p95 uses nearest rank. Pooled raw scores mix different quotas and layouts, so the per-case table and quota counts are the primary comparison. Deterministic baseline repeats verify reproducibility and are not independent stochastic samples.

The requested and resolved model was `gemini-3.5-flash-lite`, Vertex global, temperature 0.2, maximum output 1024 tokens. A request uses the system prompt plus public observation, legal actions and either zero or at most four previous model-decision/result entries. Forced busy waits are not history decisions and do not invoke the provider. Both players use the same visible physics and legal controls. The heuristic performs an explicit 240-frame public-geometry search and ignores history, which is disclosed rather than described as equal computation.

Prices were rechecked on October 28: global standard input $0.30 and response/reasoning output $2.50 per million tokens. Trace pricing retains its original October 26 verification date, with the same verified rates. The $5 campaign estimate ceiling was not approached. Estimates exclude billing rounding, discounts and unreported failed-request usage. [Google pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

### What history did and did not show

The game is fully observed and deterministic given an action. Past shots could help a model recognize repeated errors, but add no hidden state needed to compute current trajectories. Here, H4 used about **5.7 times the input tokens and 5.2 times the estimated cost**, with the same 157 model calls and fewer sampled quota successes. It collected somewhat more in the two tight-budget runs, while doing worse in the open and blocked cases. This supports keeping observation-only input as the default for this bounded experiment. It does not establish that memory generally harms play.

The two trials per cell, fixed initial seeds, sequential arm order and possible provider variation limit causal interpretation. Repeating the same unchanged model is not training or self-improvement. No model thought text or intended target IDs were recorded, so explanations do not invent what the model was thinking. Neither automated wins nor these observations establish player enjoyment. The separate [October 30 human feedback](docs/playtests/2026-10-30-received.md) provides qualitative experience reports, with limitations recorded in [PEER-NOTES.md](PEER-NOTES.md).

### Human feedback and rubric 5B

The model/baseline experiments above address **5A**. The received peer report and the student's response address **5B**. The peer described satisfying manual grabs, frustrating misses, an unclear deadline rule, less engaging precise agent play and intermittent stutter, and suggested beginner assistance. Its agent view, exact build and total elapsed duration were not recorded. The report references two JSON traces not supplied here, leaves its final confirmation unchecked, and marks technical checks Not verified. These limits are retained, not filled by inference. Human scores are not additional model trials or a controlled learning comparison. The [reflection](AGENT-TEAM.md) explains my design decisions and response to the feedback. The [review given to a partner](docs/playtests/2026-11-01-given-catacomb-ii.md) was sent on November 1.

### Interpretation and limitations

I expected history to help Gemini, but the recorded comparison did not support that expectation in these runs. The heuristic recalculates geometry and value/time from the current observation, while Gemini still has to choose a useful timing action. Spatial and timing reasoning are possible limitations. The simulation pauses during model responses, so network latency does not consume the level timer. The small sample does not establish why individual shots failed or whether another model would behave similarly.

My scope preserves a complete level format with three situations but omits a campaign with rising quotas and increasingly risky targets. The peer report suggests that successful manual timing feels rewarding and repeated misses can be frustrating. The interface now includes explicit start/result screens and deadline instructions. I would investigate the unidentified agent-view stutter before expanding mechanics. Beginner aiming assistance and stage progression are future directions, not completed responses. The separate [peer index](PEER-NOTES.md) links the outgoing review and the received report's limited coverage.

## October 26 preliminary comparison

| Situation | Player | Score / quota | Result | Simulated seconds | Decisions | Forced waits | Invalid actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| open-dev | Heuristic | 1011 / 750 | Success, field cleared | 14.40 | 13 | 16 | 0 |
| blocked-dev | Heuristic | 1570 / 700 | Success, field cleared | 13.23 | 12 | 15 | 0 |
| budget-dev | Heuristic | 1150 / 650 | Success, timer expired | 12.00 | 11 | 13 | 0 |
| open-dev | Vertex model | 0 / 750 | Failure, timer expired | 30.00 | 32 | 28 | 0 |

Traces are saved under `reports/`. Each trace records observations, actions, forced waits, physics events, outcomes, limits, scenario seed, source hashes, timestamp, commit context, and player configuration. There are zero provider calls or token costs in baseline runs. This is a preliminary checkpoint comparison with one live development episode, not the final repeated held-out evaluation.

Saved checkpoint evidence for implementation commit `2303986`:

- [Open field trace](reports/2026-10-26T18-17-02-679Z-baseline-open-dev-1.json)
- [Blocked approach trace](reports/2026-10-26T18-17-02-679Z-baseline-blocked-dev-1.json)
- [Tight budget trace](reports/2026-10-26T18-17-02-679Z-baseline-budget-dev-1.json)
- [Comparison data](reports/2026-10-26T18-17-02-679Z-baseline-summary.json)

Live checkpoint evidence for commit `07fabe4`:

- [Complete live episode trace](reports/2026-10-26T19-22-31-872Z-vertex-open-dev-1.json)
- [Live summary](reports/2026-10-26T19-22-31-872Z-vertex-summary.json)
- Requested and resolved model: `gemini-3.5-flash-lite`, Vertex AI, `global`, project `game-dev-f26-lw3240`.
- Start: October 26, 2026, 19:22:31 UTC. Actual episode wall time: 24.86 seconds. Simulated game time: 30 seconds.
- 32 real API calls, 22,102 input tokens, and 260 output tokens. No retries, fallbacks, invalid actions, or provider failures.
- Mean request latency: 776.23 ms. Median: 744.04 ms. Maximum: 1490.35 ms.
- Estimated cost: $0.0072806 USD using the dated standard global prices below. This is an estimate rather than a billing statement.
- Both compared traces have seed 101, the same scenario/suite hash, and game hash `67ca7cefe52c686116bbe8759b99dd9a96f4349ce6af2fe7708b1b6501462ee0`.

The model selected 20 waits and 12 launches. The trace records one small rock grabbed at 27.9 simulated seconds and no delivered objects before the timer expired. All 60 simulation intervals were replayed independently and matched their saved observations, events, and outcomes exactly. The result demonstrates a working autonomous model loop but poor first-trial performance. It does not establish a general model success rate or a history benefit. No prompt tuning or additional live episodes were performed for this checkpoint.

## Checkpoint verification, October 26

The deterministic test suite covers rule invariants, legal and illegal actions, a successful collection path, termination, a real integration regression, and episode limits. The regression was observed as `game.puff is not a function` when an empty grab left the playfield in the headless adapter. Its behavioral test failed before adding the rendering-neutral callback and passes afterward. The imported hook file remains unchanged.

All 25 local tests passed. Local browser checks exercised manual stepping, launch, reset, a complete heuristic episode, phone layout, and replay of a mocked call-limited episode. The open-field heuristic completed in the browser with score 1011. The mocked replay retained its `call_limit` failure. No browser errors or horizontal overflow were observed in those checks. Browser checks do not replace a human playtest. Independent review and its follow-up are recorded in [review.md](review.md).

The dedicated GitHub workflow is `.github/workflows/midterm-rogerwangdev.yml`. Its [remote run on checkpoint commit 90b3e46 passed](https://github.com/rogerwangdev/game-dev-f26/actions/runs/40376569370), including source verification, all 25 tests, and development baseline runs. The fork's shared setup and minigame workflows also passed. The engine source is unchanged from implementation commit `2303986` referenced by the saved traces.

Course PR integration remains separate from the successful fork CI: the current trusted minigame boundary checker protects all `.github/` paths and rejects this dedicated midterm workflow, although the midterm brief explicitly requires it. This was reproduced by calling `scripts/minigames.py:check_paths` with the project README and its dedicated workflow. No shared course tooling was modified. Staff will need to resolve that policy mismatch before the final course PR can pass that boundary check.

## Live protocol and cost

The student selected Google Vertex AI using course credits and subsequently supplied project `game-dev-f26-lw3240`. One live development episode was run with `--live`, observation-only input, and the originally declared budgets. The suite and prompt were unchanged. The declared final primary and four-entry history evaluations are now complete, as reported above. All 24 traces, including failures, are retained.

Record the requested and resolved model identifiers, latency, calls, invalid actions, limits, fallback count, token usage, and game version. The adapter requests JSON actions, has no tools, and makes no automatic retries. It never silently substitutes the baseline.

For `gemini-3.5-flash-lite` standard global on-demand requests, published prices checked October 26, 2026 are $0.30 per million input tokens and $2.50 per million output tokens, including reasoning. The evaluation CLI calculates estimates only for that model and location. Other configurations produce an unknown cost rather than reusing these rates. Unreported failed-request usage and discounts are excluded from estimates. [Google Cloud pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

## Limitations and outstanding evidence

The October 26 checkpoint has a playable five-operation game, completed baseline runs, a completed live model episode and trace, an initial comparison, and passing deterministic CI. The live model failed its quota and that failure is retained. The completed held-out/history comparison remains a small sample with the limitations above. Received human feedback and the reflection are filed. Outgoing feedback was sent on November 1. Course submission has not been recorded. Unknown peer metadata and technical coverage are documented limits, not failed game tests. Recording and verification status are linked from the README. Two actual skill-use sessions are documented in `docs/skill-use.md`.

Human browser play now uses a separate smooth 60 Hz adapter. Model/heuristic evaluation and recorded model playback retain the declared fixed-step interface. Historic observations about stepped rendering should not be attributed to an unidentified agent view in the peer report.

## Verification

This submission branch packages the completed project after evaluation. Commit IDs in the original protocol, traces and historical checks identify the development history, rather than ancestors of this branch. Those artifacts are preserved unchanged. Exact replay is checked against the recorded game, suite and prompt hashes. The skill rehearsal has a source-only reproduction package, so it does not require those historical Git objects.

A clean independent clone of runtime commit `36d43b0` passed all 38 tests, verification of 13 imported file hashes, timing checks, all 24 final-trace replays and all three development baseline episodes. Browser checks covered smooth human play, pause/reset/debug controls, all 13 menu recordings to their saved outcomes, phone layout, presentation loading and the 211.6-second video. No new provider calls were used for these checks. Independent follow-up is summarized in [review.md](review.md).

From `midterms/rogerwangdev/`, reproduce the deterministic checks with:

```bash
npm test
npm run verify-source
npm run check:timing
npm run audit:evaluation
npm run baseline
```

The [dedicated workflow](../../.github/workflows/midterm-rogerwangdev.yml) runs these checks without provider credentials. [Fork CI passed at `675090b`](https://github.com/rogerwangdev/game-dev-f26/actions/runs/41331690374), including all 38 tests, source verification, timing checks, the 24-trace audit and development baselines. The shared setup and minigame checks also passed at that commit. These are development-branch CI results. The clean submission branch needs its own remote CI run after publication. Before submission, the course's trusted path policy must permit the assignment-required workflow under `.github/workflows/`. No successful course-PR boundary result is claimed.

[Skill-use evidence](docs/skill-use.md) separately documents the isolated one-second rehearsal. The production gameplay hash, prompt, declared cases and retained experiment are unchanged.
