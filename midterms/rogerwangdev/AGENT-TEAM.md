# Agent-team log and reflection

I chose Gold Miner because I played it as a child and still enjoy its combination of timing, calculation and geometry. A well-timed launch can produce a large reward, making success feel directly connected to the player's judgment. I wanted to preserve that feedback while keeping the project small enough to test with an agent.

I directed the development through Codex, using the following roles and boundaries:

| Role and access | Contribution and decision | Evidence |
| --- | --- | --- |
| Implementation: submission files and dedicated workflow | Adapted the existing MIT code. I retained the original claw physics and added the bounded agent interface. | [Instructions](AGENTS.md), [configuration](agent-config.json), [skill-use evidence](docs/skill-use.md) |
| Reusable skill: scoped rule changes and isolated checks | Connected source evidence, tests and review. Two sessions used it, including an isolated one-second timing rehearsal. | [Skill](skills/gold-miner-rule-change/SKILL.md), [two uses](docs/skill-use.md) |
| Independent review: read-only access | Separate reviewers identified problems and checked fixes, including misleading human-replay request labels. | [Findings and resolutions](review.md) |

Gemini had a separate role as the gameplay agent. It received public numerical observations and legal actions, without repository or development tools.

The main timing decision was to separate observation frequency from launch precision. Agent decisions advance 0.5 simulated seconds, but launches can be scheduled at 1/60-second offsets within that interval. The game pauses while Gemini responds, so response latency does not consume game time. I also requested smooth human controls after seeing that the original browser interface visibly stepped every half second. The active agent interval stayed unchanged.

The [evaluation](EVALUATION.md) challenged my expectation that history would improve performance. The geometry-based heuristic reached 6/6 quotas by recalculating interception and value/time from each observation. Gemini reached 2/6 without history and 0/6 with four previous decisions. This fully observed game already supplies the current information needed for a decision. The results suggest that extra history was not helpful in these runs. Spatial and timing reasoning remain possible limitations, but the traces do not establish the cause of each miss. Two trials per case are too few for a general conclusion.

The [peer feedback](docs/playtests/2026-10-30-received.md) was useful because it connected successful grabs with satisfaction and repeated misses with frustration. It also exposed uncertainty about unfinished retrievals at the deadline. I requested clearer start, control and result screens, and the interface now explains that unfinished retrievals earn no money when the round ends. I would investigate the reported playback stutter before expanding the mechanics. An optional beginner aiming guide is a useful future direction. The precise agent view was not identified, so I cannot treat its apparent accuracy as evidence of unfair information. Beginner assistance and playback investigation remain proposed work.

My [Catacomb II playtest review](docs/playtests/2026-11-01-given-catacomb-ii.md) also informed presentation decisions. I found its labeled controls and explicit start/end screens useful, so I asked for comparable clarity in Gold Miner. I combined the instructions and controls and kept the goal and timer visible. This improves readability without changing agent performance. I sent the review to the other student on November 1.

The current scope uses one level format with three selectable situations, rather than a campaign. It does not reproduce the original game's increasing quotas and stage progression. A future version could vary layouts and difficulty across stages, with more valuable but harder-to-retrieve targets. That would create stronger risk/reward decisions: committing time to one large reward could leave too little time to recover from a miss. Any expansion would need its own testing and evaluation.
