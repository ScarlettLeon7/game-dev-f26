import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCore } from '../src/load-core.js'
import { Episode } from '../src/episode.js'
import { runEpisode } from '../src/runner.js'
import { scenarios } from '../src/scenarios.js'
import { finishReplay } from '../src/replay.js'

test('observed review regression: call-limited replays preserve failure and terminal reason', async () => {
  const original = new Episode(loadCore(), scenarios[0])
  const trace = await runEpisode(original, () => ({ type: 'wait' }), { maxCalls: 2 })
  const replay = new Episode(loadCore(), scenarios[0])
  for (const step of trace.steps) if (step.result) replay.step(0, step.action)
  assert.equal(replay.outcome().reason, 'ongoing')
  finishReplay(replay, trace.summary)
  assert.equal(replay.outcome().reason, 'call_limit')
  assert.equal(replay.outcome().terminal, true)
  assert.equal(replay.outcome().success, false)
})
test('replay rejects a recorded score that disagrees with current physics', () => {
  const e = new Episode(loadCore(), scenarios[0])
  assert.throws(() => finishReplay(e, { ...e.outcome(), score: 9999 }), /mismatch/)
})
