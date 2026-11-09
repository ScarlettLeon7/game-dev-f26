# Offline visual trace replay

Run from `midterms/scarlettleon7/` with the already imported Godot **3.5.2
Standard** project and Python 3.10+. No provider credentials or Python packages
are needed. The saved `evaluation-02` model trials are real prior Vertex trials;
this tool makes **no new model requests** and spends no API credits.

```sh
export GODOT="/Applications/Godot.app/Contents/MacOS/Godot"

# Normal human gameplay for the beginning of the demonstration
"$GODOT" --path .

# Close the human game, then replay 79 recorded model actions visibly
python3 -m controller.replay traces/evaluation-02/opening-model-1.jsonl --delay 0.8

# Another recorded trial, including its five setup actions
python3 -m controller.replay traces/evaluation-02/held-out-jump-model-1.jsonl --delay 0.4

# Brief real-engine smoke replay; explicitly partial, not a full episode
python3 -m controller.replay traces/evaluation-02/opening-model-1.jsonl --max-actions 5 --delay 0 --start-hold 0 --end-hold 1

# Deterministic Python tests (no provider requests)
python3 -m unittest discover -s tests -v
```

For a different engine installation, set `GODOT` or pass `--godot /path/to/godot`.
A visible window/display is required; macOS may require normal execution approval
for window-server and loopback access in a sandboxed Codex session. Keep the
terminal visible beside Godot to show the source path, recorded model/result,
setup/model/fallback action labels, and replay comparison. The game window itself
is titled and permanently labeled **OFFLINE TRACE REPLAY** / **NO live model/API
calls**. The displayed step and outcome describe the new replay simulation.

`--delay` adds a pause between actions; it does not alter engine time scale or
the six-physics-frame action duration. `--start-hold` and `--end-hold` default to
3 and 8 seconds. `--timeout` bounds engine wall time (default 300 seconds), and
RPC/process deadlines also apply. Keep delays and holds within that budget.
Closing the window stops the replay; transport errors are reported explicitly.
Engine logs go to a fresh OS temporary file printed at startup. No recording,
trace, evaluation report, or source asset is overwritten.

The tool reads the seed from the trace summary, resets the original level, and
submits the trace's executed setup and decision actions through the existing
Python-to-Godot JSON interface. It uses the recorded fallback action where one
was actually executed; malformed model text is never treated as an action.
Unexecuted proposals (including terminal-rejected actions) are omitted. It does
not reserve model calls, use recorded latency, or recreate historical wall/model
call limits. `--max-actions` is explicitly partial playback.

This is a **re-simulation of recorded actions**, not original evaluation footage
or a new live inference demonstration. Position, velocity, grounded state,
physics-frame counts, and step outcomes are compared with the trace (numeric
absolute tolerance 0.001). Differences and early termination are printed; the
tool never teleports the character or replaces outcomes to match the recording.
The game still has some render/animation-driven behavior, so full trajectory or
cross-platform determinism is not guaranteed. A replay result cannot replace or
correct the saved evaluation result. The opening model-1 trace records defeat,
score 10; do not present it as a win.

For a 3–5 minute demonstration: spend about a minute on human gameplay, explain
the bounded interface and saved Vertex result for 30–45 seconds, show the opening
replay with `--delay 0.8` for roughly 1–2 minutes, then discuss the actual result
and replay limitations for 30–45 seconds. Durations are estimates, not a recording
or human playtest result. Record with your normal screen recorder. Never commit
video files; upload to unlisted YouTube or Google Drive and link the recording.

## Actual local verification

Using Godot 3.5.2 Standard on this Mac, visible opening-model-1 replay executed
79/79 actions and ended in defeat/death, score 10; held-out-jump-model-1 executed
69/69 actions (five setup plus 64 model actions) and ended in defeat/death,
score 13. Both had zero reset/step motion-or-outcome differences under the
comparison above. These runs used `--delay 0.1` and `--delay 0` respectively;
longer recording pacing and other platforms are not guaranteed to match.

All six groups in `supertux-regression-check` passed: Python unit tests, actual
Python-to-Godot transport, three Godot suites, and whitespace validation. The
unit-only pass intentionally skipped transport; its separate integration check
passed. Four added Python tests cover trace parsing, setup actions, recorded
fallbacks, omission of unexecuted proposals, invalid input, and divergence
reporting. Integrity hashes confirmed all existing saved traces/results/logs and
the pre-existing title-screen edit were unchanged. No provider requests were made.
