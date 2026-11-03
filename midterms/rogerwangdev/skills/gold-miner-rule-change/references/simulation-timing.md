# Change the decision interval

Use for requests such as “change the simulation interval from 0.5 seconds to 1 second.” Confirm from the request whether the intended change is the agent decision interval, physics frequency, or playback speed. Preserve an explicitly selected scope. If the user is asking only to improve this skill, do not change the game.

## Specify the timing contract before editing

Identify the current `design` row in `docs/rule-source-map.md`. Record the requested old/new decision duration, physics Hz, frame count, offset range, and rationale. Keep the physics frequency unchanged unless the user requested a physics change.

`decisionFrames = decisionSeconds * physicsHz` must be a positive integer. Report an unrepresentable duration rather than silently rounding it. At 60 Hz:

| Decision duration | Frames per decision | Legal launch offsets | Launch precision |
| --- | --- | --- | --- |
| 0.5 seconds | 30 | 0–29 | 1/60 second |
| 1 second | 60 | 0–59 | 1/60 second |
| 0.1 seconds | 6 | 0–5 | 1/60 second |

An offset of zero launches before the first tick. Offset N waits N ticks before launching. One decision can end early at a terminal outcome. Provider wall time never advances simulated time. A longer decision interval changes observation frequency, not launch precision when offsets are retained.

## Locate the consumers

Use `rg` to locate definitions and usages, then inspect them. Do not globally replace numbers such as 30, 60, or 500.

| Consumer | Files and checks |
| --- | --- |
| Engine and public interface | `src/episode.js`: constants, update loop, legal offsets, validation, timer accounting and observation fields |
| Model request | `src/vertex.js`: system instructions and response schema must describe the same frames, Hz and offset range as the engine |
| Baseline | `src/baseline.js`: uses public `physics.decisionFrames` and `physics.hz`. Preserve its search horizon in simulated seconds unless deliberately changing it |
| Runner and budgets | `src/runner.js`, `scripts/evaluate.js`, `agent-config.json`: review step/call limits, forced waits, invalid responses, provider and episode timeouts |
| Browser and replay | `src/browser.js`, `index.html`: interval timer, labels, keyboard/manual stepping, inspector and recorded-step validation |
| Version and evaluation | `scripts/game-version.js`, `SUITE.json`, `EVALUATION.md`: declaration selection, new version identity and comparable trials |
| Verification and explanation | `test/`, `docs/rule-source-map.md`, `README.md`: behavioral expectations and reproducible commands |

For shorter intervals, `ceil(longestScenarioSeconds / decisionSeconds)` bounds the timer-only step requirement. Calls are fewer when the claw is busy, but can approach the step count while it swings. Budget exhaustion remains a separate failure reason. Explain any revised budget before evaluation rather than quietly increasing it after a failed trial.

## Test first, then implement

All commands here run from `midterms/rogerwangdev/`.

1. Run `npm run check:timing` to establish the current contract. Use `npm run check:timing -- --seconds 1` for a proposed one-second contract. Before implementation it should fail because the runtime interval differs. This helper failure is useful evidence but does not replace a focused behavioral test of the requested change.
2. Write and run a behavioral test before changing the engine. Check the new frames/time advance, first and last legal offsets, rejection of the next offset without mutation, and expiry inside an incomplete final interval. Record the actual failure and reason.
3. Update the affected consumers together. Preserve the same observation/action capabilities for the model and baseline. Keep rendering outside authoritative timing and preserve imported files.
4. Verify that injected provider delay changes wall time but not the chosen action's simulated result. Run `npm test`, `npm run verify-source`, the timing helper, and complete development baseline episodes. Inspect the actual mocked request instructions as well as its schema. The helper checks the schema but does not interpret natural-language prompt wording or browser labels.
5. Check browser stepping and a complete episode. Replay version-compatible recordings exactly. A changed timing version must reject incompatible recordings explicitly rather than silently reinterpret their action offsets or outcomes.

The helper accepts `--seconds <duration>`, `--declaration <project-relative-json-path>`, and `--trace <project-relative-json-path>`. Without a declaration override it checks the original `SUITE.json`. It never edits the interval. A new runtime interval with the old declaration should fail.

## Preserve the experiment

The original `SUITE.json` and reports are the October 26 checkpoint evidence. Preserve them. For an actual timing change, create a dated declaration/amendment stating the reason, new timing, budgets, source identity, and relationship to the original suite. Wire declaration selection into the evaluator and commands explicitly. The current evaluator checks scenario hashes but does not by itself enforce every timing/declaration field.

Re-run affected baseline/model comparisons on matching new versions before making new performance claims. Old traces are historical results, not trials under the new interval. Do not use held-out cases to tune the change. Routine verification and skill testing use mocks, not paid calls.

## Evidence and review handoff

Record the named invocation, session reference, user request, scope, rule-map row, actual failing test, files changed, passing checks, budget/version decision, and remaining limitations in `docs/skill-use.md`. Hand the diff and evidence to a reviewer who did not implement it. Commit their findings and resolutions in `review.md`.

An isolated rehearsal is skill validation, not a new production experiment. A review subagent or another turn in this chat is not the second standalone authoring session. Keep missing session links, the second invocation, human feedback and student-authored `AGENT-TEAM.md` explicitly pending until real evidence exists.
