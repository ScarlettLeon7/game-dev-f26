# SuperTux AI Challenge

## Project Overview

SuperTux AI Challenge is an adaptation of SuperTux Classic, a Mario-inspired 2D platformer, developed for the AI in Games midterm.

The project aims to support both human gameplay and autonomous AI gameplay. A model-driven agent will play the game through a structured observation/action interface and be compared with a scripted baseline.

## Current Status

AI input controls and an opt-in five-operation interface for the original first level are implemented. See [input controls](docs/ai-input-controls.md) and [machine interface](docs/machine-interface.md) for commands, API, tests, and limitations. The baseline, live model player, and full evaluation remain unimplemented.

## Technology

- Engine: Godot 3.5.2
- Language: GDScript
- Original game: SuperTux Classic
- AI player: To be implemented

## Setup and Play

Starting from `midterms/scarlettleon7/`:

1. Install Godot 3.5.2 Standard.
2. Import `project.godot` in Godot.
3. Run the game using F5.

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

The original project credits additional graphics, audio, and music contributors. Applicable media licenses must be verified before public submission.

## Evaluation

The evaluation suite, model-driven player, scripted baseline, results, and traces will be documented in `EVALUATION.md` once implemented.

## Agent Team

Development-agent roles, independent review evidence, and my design decisions will be documented in `AGENT-TEAM.md`.

## Limitations

The interface has local deterministic tests; full evaluation and cross-platform replay determinism remain unverified. See [machine-interface limitations](docs/machine-interface.md).

