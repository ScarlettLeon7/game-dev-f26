# SuperTux AI Challenge

## Project Overview

SuperTux AI Challenge is an adaptation of SuperTux Classic, a Mario-inspired 2D platformer, developed for the AI in Games midterm.

The project aims to support both human gameplay and autonomous AI gameplay. A model-driven agent will play the game through a structured observation/action interface and be compared with a scripted baseline.

## Current Status

AI input controls and an opt-in five-operation interface for the original first level are implemented. See [input controls](docs/ai-input-controls.md) and [machine interface](docs/machine-interface.md) for commands, API, tests, and limitations. A Python baseline, Vertex REST player, and evaluation runner are implemented; see [commands and actual results](EVALUATION.md). Six real Vertex trials and three baselines completed; all ended in defeat. Live scores were 10, 0, 5, 3, 13, and 0. See EVALUATION.md for measured results and preserved timeout regression evidence.

## Technology

- Engine: Godot 3.5.2
- Language: GDScript
- Original game: SuperTux Classic
- AI player: Python observation-based baseline and Vertex language-model adapter

## Setup and Play

Starting from `midterms/scarlettleon7/`:

1. Install Godot 3.5.2 Standard.
2. Import `project.godot` in Godot.
3. Run the game using the play button in the top right corner.

The original game currently supports keyboard controls.

## Planned Midterm Scope

The intended midterm adaptation will focus on one bounded platformer level featuring movement, jumping, obstacles, collectibles, and a clear terminal outcome.

The complete original game, additional worlds, advanced enemies, and cosmetic changes are outside the planned scope.

The planned AI interface consists of:

- `reset(seed)`
- `observe(player_id)`
- `legal_actions(player_id)`
- `step(player_id, action)`
- `outcome()`

## Rule / Source Map — Initial Draft

| Rule | Evidence label | Evidence location |
|---|---|---|
| Left/right movement and acceleration | code | `scenes/player/Tux.gd`, `move_input()` and `horizontal_movement()` |
| Jumping, including buffering | code | `scenes/player/Tux.gd`, `jump_input()` |
| Movement and collisions | code | `scenes/player/Tux.gd`, `apply_movement()` |
| Player idle, walk, jump, fall, win, and dead states | code | `scenes/player/TuxSM.gd` |
| One bounded evaluation level | implementation | Original world1/level1 via `ai/EpisodeRunner.gd` |
| AI action vocabulary and step limits | implementation | [Machine-interface rule map](docs/rule-source-map.md) |

This rule map will be updated to cover all rules enforced by the completed adaptation.

## Source and License

This project adapts [SuperTux Classic](https://github.com/Alzter/SuperTux-Classic), a remake of SuperTux Milestone 1.

The original source is distributed under GPL-3.0-or-later. The license text is preserved in `LICENSE-SUPERTUX`, and original contributor credits are retained in `scenes/menus/CreditsText.tscn`.

Original upstream commit: **[f4c0db9d4e3d1292f80cf82257161d4d01b9d1db]**

The original SuperTux Classic source and contributor credits are retained. The game includes reused music, graphics, and sounds attributed to SuperTux contributors and third-party creators, including Freesound contributors. The original project also incorporates media derived from earlier SuperTux releases, for which separate license terms may apply.

The project retains the upstream GPL license text in `LICENSE-SUPERTUX` and original credits in `scenes/menus/CreditsText.tscn`. Individual media-license provenance has not been fully audited and remains a documented limitation.

## Evaluation

See [EVALUATION.md](EVALUATION.md) for the evaluation suite, players, exact commands, results, and evidence limits.

## Agent Team

Development-agent roles, independent review evidence, and my design decisions will be documented in `AGENT-TEAM.md`.

## Limitations

The interface has local deterministic tests; the nine-episode evaluation is recorded; cross-platform replay determinism remains unverified. See [machine-interface limitations](docs/machine-interface.md).


## Exact project-directory commands

Requires Python 3.10+ (standard library only), Godot **3.5.2 Standard**, and project assets imported. On macOS:

```sh
export GODOT=/Applications/Godot.app/Contents/MacOS/Godot
python3 --version
"$GODOT" --version
"$GODOT" --editor --path .
# Wait for asset import, then close the editor.
"$GODOT" --path .

# One baseline; always choose a new output directory.
python3 -m controller.run --godot "$GODOT" --output traces/baseline-new
# Three baselines, no API requests; live trials marked not_run.
python3 -m controller.run --godot "$GODOT" --evaluate --output traces/offline-suite-new

python3 -m unittest discover -s tests -v
SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v
"$GODOT" --no-window --path . res://tests/test_episode.tscn
"$GODOT" --no-window --path . -s tests/test_ai_controls.gd
"$GODOT" --no-window --path . res://tests/test_ai_level.tscn
```

On other platforms set `GODOT` to the installed Godot 3.5.2 Standard executable. The opt-in Python integration test currently hardcodes the macOS executable; CI runs the portable engine suites directly. macOS engine commands require window-server access even with `--no-window`. Human keyboard mappings are in the editor’s Project Settings → Input Map.

Live commands below **spend credits** and are provided for reproducibility; the completed trials need no rerun. Install the gcloud CLI, obtain authorized Application Default Credentials, and set your actual project and location (neither is saved in the evidence):

```sh
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT
export GOOGLE_CLOUD_LOCATION=YOUR_LOCATION
export VERTEX_MODEL=gemini-3.5-flash-lite
python3 -m controller.run --godot "$GODOT" --player model --live --wall 600 --request-timeout 30 --output traces/live-single-new
python3 -m controller.run --godot "$GODOT" --evaluate --live --wall 600 --request-timeout 30 --output traces/live-suite-new
```

The suite executes three baselines and six Vertex episodes, with at most 600 total steps and 100 model attempts per episode. Output directories must be fresh. Credentials stay outside the repository. CI runs offline Python and Godot tests through the single project workflow `.github/workflows/midterm-scarlettleon7.yml`; no live evaluations run in CI.

## Human Playtest

A friend of mine tested the human-playable version of SuperTux Classic. The playtest identified a minor usability issue with discovering the Shift key for throwing fireballs and the Space key to jump (instead of the up arrow key).

[Read the human playtest notes](docs/human-playtest.md)


## Offline visual demonstration

Replay saved Vertex actions in the visible Godot game with `python3 -m controller.replay traces/evaluation-02/opening-model-1.jsonl --delay 0.8`. This is labeled offline re-simulation, with no new model inference or API calls. See [visual replay instructions](docs/visual-replay.md) for human-play commands, pacing, verification, and recording limitations.

## Demonstration Video

[Watch the SuperTux Classic AI demonstration](https://drive.google.com/file/d/1FyeoEzqDjniWo3NLK13774bfFzTIrYI6/view?usp=sharing)

The recording shows human gameplay and an offline replay of
previously recorded Vertex AI decisions executed through the
real Godot game interface. No new model inference occurs
during the replay.

