# SuperTux AI Challenge — Agent Instructions

## Project
Adapt the existing SuperTux Classic game into a bounded, AI-playable platformer for a university midterm.

## Environment
- Engine: Godot 3.5.2.
- Language: GDScript for Godot 3, not Godot 4.
- Preserve the existing gameplay, scenes, resources, and attribution.
- Work only inside `midterms/scarlettleon7/` unless explicitly authorized to create the required CI workflow.
- Do not access or modify unrelated course folders.

## Goals
1. Preserve a playable human-controlled SuperTux level.
2. Add programmatic player controls without breaking keyboard controls.
3. Implement `reset(seed)`, `observe(player_id)`, `legal_actions(player_id)`, `step(player_id, action)`, and `outcome()`, or a documented equivalent.
4. Make the actual Godot simulation advance in bounded steps.
5. Implement a scripted baseline and a model-driven player.
6. Enforce episode step limits, model-call limits, and timeout handling.
7. Add deterministic automated tests and recorded action traces.
8. Preserve all required licenses and credits.

## Development Rules
- Inspect existing code before editing it.
- Make small, testable changes.
- Do not replace the existing game with a separate simulation.
- Do not invent test results or live-model evaluation results.
- Do not delete existing functionality without explaining why.
- Use real Godot 3-compatible APIs.
- Keep all API credentials out of source code and Git.
- After each implementation phase, report modified files, tests performed, and outstanding issues.

## AI Player Restrictions
- The model-driven player must receive only game observations and permitted actions.
- The player must not receive repository access, full hidden game state, or evaluator tools.
- The runner must validate actions and enforce all episode limits.

## Submission
Keep the code, tests, configurations, documentation, and traces in this project folder. The only permitted change outside this folder is `.github/workflows/midterm-scarlettleon7.yml`.
