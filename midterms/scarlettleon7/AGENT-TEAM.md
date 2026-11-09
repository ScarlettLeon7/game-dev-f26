# Agent Team — SuperTux Classic

## My Role and Decisions

I chose SuperTux Classic because I wanted a platformer similar to Super Mario. I limited the AI implementation to one level with six possible actions and tested the controls and game interface. I ran six real Vertex AI trials across three predefined situations and reviewed the resulting traces. All six model trials ended in defeat, which I retained as the actual evaluation results rather than presenting them as successes. I directed Codex to investigate the initial live-evaluation timeout and used the independent review to prioritize the CI integration fix.

## Implementation Agent

I used Codex CLI as my implementation agent, with project guidance in `AGENTS.md`. It helped me add programmatic player controls, implement the five-operation game interface, connect the Godot game to a Python controller, and build the scripted baseline and Vertex AI player. It also helped write tests and evaluation documentation.

**Implementation session:** 01a1b8c4-ee14-7321-b7bc-0e920ef566bf

Codex was permitted to inspect and modify project files and run local tests. I reviewed its changes, verified results, and handled commits and pushes. The game-playing model itself had no access to repository files or development tools.

## Independent Review Agent

I conducted a separate Codex CLI review using --sandbox read-only. The reviewer inspected the implementation, tests, evaluation artifacts, and CI workflow without modifying files or making provider calls.

**Session ID:** 01a1b930-fa14-7110-b463-50540773be99
**Review transcript:** `docs/codex-independent-review.md`

The reviewer found no verified critical defects, model-facing hidden-state leaks, or terminal-outcome misclassifications. Its main concerns involved reproducibility, CI coverage, determinism, and incomplete test coverage.

**Finding dispositions:**

- **CI transport coverage:** Resolved. I directed Codex to make the Godot executable configurable and enable Python-to-Godot integration testing under Linux/Xvfb. All eight Python tests passed locally, and I confirmed that the updated GitHub Actions workflow passed.

- **Evaluation reproducibility:** The historical traces do not record every effective runtime setting. I preserved them and documented the limitation.

- **Replay determinism and natural victory testing:** These remain limitations. Current tests do not establish complete cross-platform replay determinism or a naturally reached level victory.

- **Provider subprocess cleanup and CI integrity checks:** These remain unverified or deferred hardening concerns; no critical failure was demonstrated.

- **Missing development-agent and reusable-skill evidence:** Addressed by documenting the implementation and review sessions, supplying the reusable skill, and recording its use in two separate Codex sessions.

## Reusable Agent Skill

I used the project-local skill supertux-regression-check, defined in `.agents/skills/supertux-regression-check/SKILL.md`, to run repeatable offline regression checks without calling Vertex AI.

**Session 1:** 01a1b95c-3927-7b22-9f8c-0753474d96f7
All six check groups passed with exit status 0 after an initial sandboxed Godot launch failure was resolved. The run verified Python tests, actual Godot transport, episode tests, input controls, real-level tests, and Git whitespace checks.

**Session 2:** 01a1b95f-1c5f-76d1-8329-f813aaf3f6c2
All six check groups passed with exit status 0. The Python unit suite intentionally skipped the transport test, which passed separately with integration enabled. The Godot suites and whitespace check also passed.

These skill runs verified regression behavior, not model success or full-level completion. I separately confirmed that the updated GitHub Actions integration workflow passed.
