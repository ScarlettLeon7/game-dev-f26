# Peer playtest notes

Received human feedback is filed below. My [reflection](AGENT-TEAM.md) describes responses and future work, and the [review given to a partner](docs/playtests/2026-11-01-given-catacomb-ii.md) records my outgoing feedback. Automated checks and agent reviews are separate evidence. Keep identifying details and private ratings out of the public submission.

## Notes given to a partner — due November 6

A [Catacomb II review](docs/playtests/2026-11-01-given-catacomb-ii.md) was prepared on November 1 from the student’s reported playthrough and two replays. It covers objective/control clarity, weapon explanations, the tested facing-lock mechanic, an independent-aiming suggestion and verification limits. The first playthrough took 1 minute 35 seconds and the second about 2 minutes, using Chrome. Total session duration, device, mode and the student’s original recording version were not recorded. A separate Codex-assisted inspection now documents the current hybrid recording’s exit-goal choice around 3:22. Technical properties remain unverified by this review. The student confirmed sending the review on November 1. Total appointment duration remains unknown, and the later recording replies are a separate activity.

## Notes received from a partner

Date: October 30, 2026.

Source: [Received playtest report](docs/playtests/2026-10-30-received.md), moved into the submission without changing its contents. The report discloses Codex assistance in organizing the tester's notes and extracting trace details. Its final tester-confirmation checkbox remains unchecked.

Build/version tested: exact source commit was not recorded. The report identifies Windows 10/Chrome, two human rounds in `open-dev`, seed 101, and some agent viewing without identifying the agent or recording.

What the player reported:

- Manual timing made successful grabs feel satisfying and skillful. Repeated diamond misses became frustrating.
- The goal/basic controls were clear. Whether a launch could finish after the timer reached zero was unclear.
- Agent precision made viewing feel less challenging and interesting. The tester did not verify an information advantage, so this is not evidence of cheating or a finding about a specific agent.
- Intermittent agent-view stutter was reported, without a known cause or reproducible sequence.
- The tester suggested an optional beginner aiming guide and difficulty options.
- The report attributes scores of $400/$750 and $1,011/$750 to two exported traces. Those JSON files were not supplied in this workspace, so the trace-derived figures and timing were not independently checked here.

### Response and remaining evidence for 5B

| Finding | Current response / remaining work |
| --- | --- |
| Deadline rule unclear | Code confirms score is awarded on delivery and there is no extra retrieval time after expiry. See [human frame adapter](src/human-episode.js) and [evaluation engine](src/episode.js). Explicit start/pause/result screens and expandable round rules now clarify the deadline. The instructions state that treasure still being hauled at the ending earns no money. |
| Beginner aiming guide/difficulty | The student identified stage progression as a limitation. The reflection identifies a beginner guide as future work and prioritizes clarity/playback investigation first. No feature is claimed implemented in response. |
| Agent precision and stutter | Exact agent/view is unknown. Identify the view and any reproduction steps before attributing the experience or changing a policy. |
| Formal exchange record | Total elapsed session duration is unknown. Sixty seconds of reported simulation is not a measured appointment duration. Tester confirmation remains unrecorded. |
| Technical checks | Held-out validation, invalid-action handling, information boundaries and provider limits remain Not verified by this peer. Existing [5A evaluation evidence](EVALUATION.md) and tests are separate from the human report. |

The received report is useful qualitative evidence, with two rounds on one situation and no controlled usability comparison. No original model/baseline result is replaced or supplemented by these human scores. Optional usability ratings were not provided and are not required.

**Response to feedback:**

My [reflection](AGENT-TEAM.md) explains the design decisions and interpretation. The interface now includes start/result screens and clearer deadline rules. Playback investigation, beginner assistance and stage progression remain future directions. These are presentation changes. Gameplay rules and the evaluation remain unchanged. The remaining factual unknowns are listed in the response table above.

## Separate silent-playtester recording replies — before class November 16

This is a separate later activity. Three classmates' recordings are assigned at the November 9 session. No Week 3 replies are recorded here yet. Before class November 16, the student must post one thing requiring a guess and one clarifying question for each assigned recording. This is not a missing November 7 report field.
