---
name: supertux-regression-check
description: Run offline Python, Python-to-Godot transport, and Godot 3.5.2 SuperTux regression tests and whitespace checks in this project. Use to validate changes or gather regression evidence without live model evaluation.
---

# SuperTux regression check

Run from the SuperTux project root containing `project.godot`, `controller/`, and
`tests/`. Read its `AGENTS.md` first, then execute:

```sh
GODOT="/Applications/Godot.app/Contents/MacOS/Godot" .agents/skills/supertux-regression-check/scripts/check.sh
```

`GODOT` is one executable path or command name, not a command with arguments.
The macOS app path is the default; set `GODOT` for another installation or Linux.
`PYTHON` optionally selects Python 3.10+ (default `python3`). Apple Silicon needs
no Homebrew or GNU `timeout`. On Linux without a display, run the whole script
under `xvfb-run -a`, with `LIBGL_ALWAYS_SOFTWARE=1` if needed. Use an already
imported Godot 3.5.2 Standard project. Do not auto-install dependencies or import
or rewrite resources.

The script runs deterministic Python tests with integration disabled, then
explicitly enables `ProtocolTests` using exported `GODOT`. It also runs
`tests/test_episode.tscn`, `tests/test_ai_controls.gd`,
`tests/test_ai_level.tscn`, and `git diff --check`. The unit-only pass intentionally
skips transport; the separate integration check must pass for full verification.
Commands have external deadlines. Engine tests require exit 0, a success marker,
and no script errors or failed assertions.

Only existing offline test entrypoints are invoked. Never run `controller.run`,
Vertex requests, live evaluation, or provider authentication commands. Never
modify game code, commit, push, or fix failures as part of this skill. Fake
provider responses in unit fixtures are never live-trial evidence.

Logs go to a fresh OS temporary directory printed by the script; no report or
trace is written into tracked source. Retain logs for inspection, but omit
incidental device names and sensitive data from reports. Python bytecode is
disabled. Existing Godot startup may use normal ignored caches and user settings.

Report PASS, FAIL, and SKIP, exit status, log directory, and incomplete checks.
Exit 0 means all six regression groups passed; 1 means failure; 2 means missing
prerequisites without a failed check. Missing Godot/display skips engine checks;
a wrong version fails the prerequisite. If sandbox restrictions prevent engine,
window-server, or loopback access, use the normal execution approval mechanism
and rerun; never substitute fake integration results. Regression success does
not prove Linux CI success, live-model quality, human playability, or a level win.

## Invoke in a new Codex CLI session

Start from this project root so Codex discovers the project-local skill:

```sh
export GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
codex
```

Then enter this prompt in Codex (the `$` is literal):

```text
$supertux-regression-check Run offline regression checks and report actual passes, failures, skips, and limitations. Do not modify game code, commit, or push.
```

For another platform, export its Godot 3.5.2 executable instead. If the skill
is absent in a fresh session, verify the working directory and inspect `/skills`.
Discovery and explicit invocation follow the
[official Codex skills documentation](https://learn.chatgpt.com/docs/build-skills).
