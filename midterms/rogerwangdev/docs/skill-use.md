# Skill-use evidence

Skill: [gold-miner-rule-change](../skills/gold-miner-rule-change/SKILL.md). These selected excerpts document two actual authoring sessions. Only the task, named invocation, relevant work and results are included.

## Session 1 — implementation

Work date: October 26, 2026. Environment: VS Code Codex. Session identifier: `01a13d3a-ca69-73c1-9754-390b76c321f3`.

Recorded invocation excerpt:

> I’m invoking `gold-miner-rule-change` for the fixed-step interface, with tests written before the engine adapter.

Work: mapped inherited rules, wrote behavioral tests before the engine adapter, implemented the five-operation interface and corrected the observed replay terminal-reason regression. The final session snapshot passed 25 tests and verified all 13 imported source hashes. Inspect the retained [engine tests](../test/episode.test.js), [replay regression](../test/replay.test.js) and [rule map](rule-source-map.md).

## Session 2 — simulation-timing change

Date: October 28, 2026. Environment: a fresh standalone Codex CLI session. Session identifier: `01a1839b-f210-7e42-acdb-e47be9825ea6`.

Recorded invocation excerpt:

> I’m invoking `gold-miner-rule-change` for this isolated rehearsal. I’ll read its procedure and timing reference, capture the required failures, then implement and verify the one-second migration.

Task: change decisions from 0.5 to 1 simulated second at 60 Hz in an isolated checkout. The initial focused tests had four failures. The session updated the frame/offset contract, prompt/schema, declaration validation, replay compatibility and affected tests. Its final snapshot passed 40 tests, all source hashes and the timing check. Development baselines reached $1,011/$750, $1,570/$700 and $1,150/$650 with history settings 0 and 4. No provider calls or held-out tuning occurred. Browser interaction was not tested.

The [selected executable patch](../reports/skill-use/session-02.patch) preserves the actual code/test changes without conversation logs or administrative notes. [Selected original test totals](../reports/skill-use/original-test-totals.txt) retain the historical 25/25 and 40/40 results.

### Reproduce the isolated change

The original rehearsal used historical development commit `67c25ee`. Its required source files are retained in a small [source-only snapshot](../reports/skill-use/session-02-base.tar.gz), with per-file hashes in the [manifest](../reports/skill-use/session-02-base.json). No old Git history or conversation export is needed. Unchanged imported files and the original checkpoint trace are reused from this submission.

From `midterms/rogerwangdev/`, choose a new directory outside the repository and run:

```bash
python3 scripts/reproduce-skill-session.py --output-dir /tmp/gold-miner-session-02
```

The helper verifies all hashes, assembles the original source base, applies the retained zero-context patch and runs the 40 tests, source/timing checks and development baselines with history 0 and 4. It creates an isolated local Git directory and a new fixture commit for patch application and never fetches historical commits or calls a provider. It leaves the production tree unchanged. The output directory must not already exist.

This second session demonstrates skill reuse, not a change to the final game or a new live evaluation. Production remains at 0.5-second agent decisions. Independent findings and rechecks are summarized in [review.md](../review.md).
