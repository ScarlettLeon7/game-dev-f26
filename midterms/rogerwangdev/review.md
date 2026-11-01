# Independent review evidence

Separate read-only Codex reviewers inspected the implementation and subsequent changes. They did not author the code under review or approve a merge. This file retains findings, resolutions and verification needed to inspect that review.

## Findings and resolutions

| Review date | Finding | Resolution / retained evidence |
| --- | --- | --- |
| October 26 | Browser replay lost runner terminal reasons, leaving call-limited episodes ongoing | [Replay restoration](src/replay.js) and [regression tests](test/replay.test.js) preserve failure/end reasons |
| October 26 | The original game hash omitted imported runtime dependencies | [Version hashing](scripts/game-version.js) includes the source manifest and imported physics/items/utilities |
| October 26 | The rule map omitted numerical constants and inherited/design distinctions | Expanded [rule/source map](docs/rule-source-map.md) with source locators |
| October 28 | The evaluation auditor accepted altered limits/model settings | [Audit checks](scripts/audit-evaluation.mjs) compare protocol identities, settings, limits and cost basis. [Mutation tests](test/evaluation-audit.test.js) reject forged metadata/results |
| October 29 | ArrowRight triggered hidden debug stepping, and human replay implied a model request | [Browser controls](src/browser.js) gate stepping on debug mode and distinguish human input from model requests |

Independent follow-ups reported no remaining findings on these fixes. Reviews also checked action validation, detached observations, provider-delay independence, source-file preservation and runner budgets.

## Skill reuse review

Separate reviewers checked the two actual skill-use sessions documented in [docs/skill-use.md](docs/skill-use.md), their distinct session identities, test-first work and isolated rehearsal. The completed second-session copy passed 40 tests and development baselines without changing the production engine, declaration, original traces or vendor source. The retained patch is unapplied. These reviews are not counted as additional authoring sessions.

## Final verification review — October 31

A separate reviewer checked the clean-clone verification of runtime commit `36d43b0`, independently reran all 38 production tests and the 24-trace exact audit, and checked the original peer report and video against their preserved hashes. The parent browser check covered human controls, all 13 saved menu outcomes, phone layout and video playback. The reviewer checked those reported outcomes against the actual source traces. Final result: **No findings** on that tested revision.

Review scope included the engine, runner, provider adapter, baseline, browser/replay code, tests, source manifest, rule map, skill-use evidence, final protocol, evaluation artifacts and required reports. The written review does not confirm student authorship, outgoing peer feedback or course submission. Current verification commands and results are summarized in [EVALUATION.md](EVALUATION.md#verification).

## Submission evidence review — October 31

A separate read-only reviewer compared the focused skill-use excerpts, identifiers and test totals with the original records and verified the selected patch blocks. Required agent-team evidence remains inspectable. The reviewer confirmed unchanged peer feedback, production code, evaluation traces and recordings, then reran source verification and the 24-trace audit. One stale session-document reference was found and corrected. The parent also reproduced the retained patch in an isolated base checkout with 40 passing tests, source/timing checks and both development baseline settings.

## Interface review — November 1

A separate read-only reviewer checked the start/help/result interface, keyboard controls, debug stepping and responsive layout. Findings about repeated screen-reader announcements and uploaded human replay labels were fixed. Follow-up reported no remaining findings and independently completed a heuristic win at $1,011/$750. Parent browser checks covered all 13 saved Gemini outcomes, a synthetic browser-adapter replay, and phone/desktop layouts. All 38 existing tests, source verification, timing checks and the 24-trace audit passed. Frozen rules and evaluation evidence are unchanged.

A subsequent independent review checked the combined instructions/control panel, key badges, general goal wording and expandable debug/file tools at eight widths from 320 to 1440 pixels. Inconsistent tip typography was corrected, with no remaining findings. Parent checks passed all 38 tests and saved Gemini replays.

Independent follow-up checked the prepared outgoing peer report against the student's observations and verified its links and unconfirmed delivery status. It also verified sidebar/field alignment, responsive stacking, controls and a complete heuristic win, with no findings. Original peer feedback, imported files and frozen evaluation rules remain unchanged.

## Reproduction-package review — November 1

A separate read-only reviewer verified the source-only rehearsal snapshot against its historical source files and confirmed that it contains no conversation exports or Git history. The offline helper passed all 40 rehearsal tests, 13 imported-source hashes, timing checks and both development baseline settings. Existing-directory and in-repository output refusals also passed. Production code, tests, original traces, protocol, media and workflow are unchanged. No findings remained.
