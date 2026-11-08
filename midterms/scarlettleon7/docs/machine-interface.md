# Machine interface — Godot 3.5.2

Run from `midterms/scarlettleon7/` with a **debug Godot 3.5.2 Standard** build.
On macOS the commands are:

```sh
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://ai/run_episode.tscn
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_episode.tscn
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
```

Replace the executable path on other systems. Import `project.godot` in the
editor first if resources have not been imported. `--no-window` on this macOS
build still requires graphics/window-server access. Sandboxed launches may abort.
The new test scene exits 0 on success, 1 on failure, with a 30-second watchdog.
The original course Python commands are not applicable to this Godot project.

The smoke scene runs eight WAIT actions with seed 7 and writes actual results to
`traces/interface-smoke.jsonl` (overwriting that file). It is an interface smoke
run, not a baseline, live-model evaluation, or level-completion demonstration.
Normal F5 gameplay does not load any runner code; keyboard controls are unchanged.

## Trusted caller API

Create `ai/EpisodeRunner.gd` as a child of a harness with
`pause_mode = PAUSE_MODE_PROCESS`. Use a dedicated process, one runner, main thread.

```gdscript
var runner = load("res://ai/EpisodeRunner.gd").new()
add_child(runner)
var observation = yield(runner.reset(7), "completed")
var actions = runner.legal_actions("tux")
var result = yield(runner.step("tux", "RIGHT_JUMP"), "completed")
print(JSON.print(result))
print(JSON.print(runner.outcome()))
```

`reset(seed)` and `step(player_id, action)` **always return coroutines**, including
errors. Await `completed`. Other methods return synchronously. Do not concurrently
call operations; overlapping mutation requests return `busy`. Only `tux` is a
player role. Other roles receive `unknown_player` / an empty action list. These
strings are routing validation, not authentication.

* `reset(int)`: reinstantiate the original world1/level1, clear checkpoint, coins,
  lives, deaths, player powerup and episode counters; seed Godot's RNG. The existing
  `start_level(true)` path skips title/pause UI, but instantiates the real objects
  and player, sets gravity and starts the original game clock. No settling steps
  are inserted: initial grounded is normally false. Episode settings force
  auto-run on, 60 physics ticks/second and time scale 1, independent of saved options.
* `observe("tux")`: JSON-compatible position/velocity arrays, grounded flag, step
  and physics-frame counts, local terrain appearances and object categories.
  The role's viewport is 320 x 256 world pixels centered on Tux. It is independent
  of the human camera and has ordinary platformer visibility (no wall occlusion).
  Only tile/object centers inside this window are reported; invisible tiles and
  object-map markers are omitted. Blocks expose no contents; enemy categories
  expose no AI state. No seed, complete map, resource path, node reference,
  off-window goal/enemy coordinates, evaluator data, or repository tools are sent.
  This is a coarse visual sensor, not a full collision/semantic map.
* `legal_actions("tux")`: always a fresh array of LEFT, RIGHT, JUMP, LEFT_JUMP,
  RIGHT_JUMP, WAIT, independent of hidden state. Jump actions remain legal in air.
* `step("tux", action)`: case-sensitive string validation; invalid requests return
  an error, do not count as steps and advance zero physics ticks. Repeated invalid
  input is still bounded by the wall timeout. Valid actions advance six actual
  scene-tree physics ticks (0.1 simulation seconds); terminal events may stop early.
  `physics_frame` occurs before node processing: unpause at one boundary and pause
  at the seventh. This uses real Tux/state-machine/collision processing, never
  direct manual `_physics_process` calls. The world stays paused between decisions.
  Level and scoreboard timers use physics processing and respect pause. WAIT
  releases buttons but preserves inertia. Jump edges retain the input-layer rules.
  Returns `{observation, outcome}`; terminal requests return `terminal` without
  advancing. See `docs/ai-input-controls.md` for input details.
* `outcome()`: `{status, reason, score}`. Status is `ongoing`, `victory`, `defeat`,
  or `episode_limit`; reasons are `playing`, `goal_reached`, `death`, `player_lost`,
  `step_limit`, `model_call_limit`, `wall_timeout`, or `not_reset`. Terminal state
  latches until reset. Score is current coin counter + 100 for victory. The upstream coin counter rolls over at 100. This is an
  evaluation score, not an upstream SuperTux scoring rule.

Tux's actual `dead`, `win`, `win_inside_igloo` states determine outcomes, before
respawn/victory animations progress. Goal posts already call `Tux.win()`. Detection
runs at physics boundaries and while paused; the first observed game terminal
state takes precedence over timeout/step exhaustion. No upstream scripts change.

## Episode budgets and isolation

Defaults: 600 valid steps, 100 model-call attempts, 120,000 monotonic wall-clock
milliseconds including reset and decision waiting. The trusted caller can lower
budgets for tests. Before **every** future provider attempt, it must call
`begin_model_call()`. A successful reservation increments immediately; failed,
malformed and timed-out responses are never refunded. The last reserved attempt
can submit an action. A further reservation ends with `model_call_limit` and
returns false. Never retry outside this accounting. These hooks make no provider
calls and spend no credits.

The runner owns authoritative state and limits; observations are copied data.
A future model must run outside Godot and receive only serialized observations
and permitted action strings, with its response validated by `step`. Never pass
this Node, Global, engine objects, filesystem tools, or evaluator tools to a model.
The external transport is now documented in [EVALUATION.md](../EVALUATION.md). There is no OS sandbox for arbitrary controller code: an arbitrary
in-process GDScript caller is trusted and can access Global. The external Python runner now enforces provider and engine process deadlines.

The wall watchdog runs while the scene tree is paused and terminates an idle
player or asynchronous provider wait. It cannot interrupt a blocked engine main
thread, hung driver, synchronous network call, or engine crash. A future external
supervisor must kill such a process and record an explicit infrastructure reason.
Do not perform synchronous network calls on the Godot thread. Normal exit or
forced process termination cannot promise an in-engine final message.

## Evidence and limits

Tests check all action strings, invalid requests, roles, JSON, local boundaries,
same-seed reset/action repeatability, an independent six-tick counter, pause
between decisions, lifecycle terminal adaptation, scoring and each episode limit.
Death/goal tests invoke the real lifecycle handlers from trusted fixtures; they
do not demonstrate an agent reaching a goal or dying via a natural collision.
Observation coverage is coarse; it does not provide pixel rendering, block
contents, every hazard type's semantic label, or guaranteed replay determinism
across operating systems/render timings. The game still uses visibility-enabled
enemies and animation/idle processing. Longer replay determinism and full-level
play are unverified. Human experience requires a separate playtest.

Rule mapping and independent review: `docs/rule-source-map.md` and
`docs/interface-review.md`. The external baseline and Vertex adapter are now implemented; see [evaluation](../EVALUATION.md). Actual live model results remain unavailable.
