# Machine interface rules

These are opt-in episode rules; original game physics and human play are unchanged.
Tests were written before `ai/EpisodeRunner.gd`; the initial Godot run failed
because that runner did not yet exist. Referenced `.claude/skills/rule-change/`
and `.claude/agents/rules-reviewer.md` are absent in this project.

| Rule | Source | Deterministic evidence |
|---|---|---|
| Original movement/jump/collision | `scenes/player/Tux.gd`, `TuxSM.gd` | existing AI tests |
| One fixed level; reset seed, counters, checkpoint, coins, powerup | `ai/EpisodeRunner.gd:reset` | repeated reset/action observation equality |
| Six actions for role tux; reject invalid role/action without advancing | `legal_actions`, `step` | action and role tests |
| Six actual physics ticks, 60 Hz, pause between decisions | `step` | independent level physics counter and frozen observation |
| Local 320 x 256 observation window; no invisible tiles or block contents | `observe` | boundaries, role and allowlist tests |
| Goal/death terminate before progression/respawn | `outcome`, existing `Tux.win/die`, `EndGoalPosts` | real lifecycle methods invoked by trusted fixtures |
| 600 steps, 100 attempted model calls, 120 seconds default | runner limits | lowered limits in tests, idle timeout |
| Failed model calls consume reservations | `begin_model_call` | exhausted reservation with no successful response |
| Current coin counter + 100 on victory; terminal reason latched | `_end`, `outcome` | score and terminal tests |

Tests using direct lifecycle methods are terminal-adapter evidence, not evidence
that an autonomous player traversed the level or reached the goal through physics.
