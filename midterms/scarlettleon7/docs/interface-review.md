# Independent interface review — November 7, 2026

A separate development agent (`rules_review`) inspected the runner, tests and
rule map read-only. This is independent code review evidence, not student gate
approval or permission to merge. The referenced `.claude` rule-change skill and
reviewer files are not present in this project.

Findings and dispositions:

* Invisible bonus block roots stayed visible despite hidden sprites. Fixed by
  omitting blocks with `invisible=true`; regression uses actual BonusInvisible.
* Startup could wait indefinitely for readiness. Fixed by polling readiness with
  the monotonic episode deadline. Tests cover startup timeout and subsequent reset.
* Missing player could cause an invalid-instance call while releasing inputs.
  Fixed with an instance-validity guard; missing-player test passes.
* Upstream blocks/flame orbs use render-frame gameplay updates. Full replay
  determinism is not established; limitation retained in machine-interface docs.
* Coin counter rolls over at 100. Score definition now states current coin
  counter plus victory bonus rather than cumulative collected coins.

Follow-up independent review confirmed those fixes and reported no new blocking
findings within the documented dedicated-process scope. It recommended reset
recovery testing, which was added and passed. No gate was approved.

Actual local verification, Godot 3.5.2 stable official on macOS:

| Run | Actual result |
|---|---|
| `tests/test_episode.tscn` | 32 checks PASS, zero failures, exit 0 |
| `-s tests/test_ai_controls.gd` | AI control assertions passed, exit 0 |
| `tests/test_ai_level.tscn` | 10 checks PASS, zero failures, exit 0 |
| `ai/run_episode.tscn` | exit 0; eight WAIT actions, 48 physics frames, `episode_limit/step_limit`, score 0 |
| Trace JSON parsing | nine valid JSONL records: one reset and eight actions |
| `git diff --check` | clean |

Sandboxed engine launches aborted before startup; successful verification used
approved execution outside the sandbox. Godot printed its existing OpenGL texture
warning on startup. Final runs showed no GDScript errors. Earlier failures during
implementation were corrected; no live provider or autonomous completion test ran.
Exact commands and evidence boundaries are in `docs/machine-interface.md`.
