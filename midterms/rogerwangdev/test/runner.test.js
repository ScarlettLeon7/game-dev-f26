import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCore } from '../src/load-core.js'
import { Episode } from '../src/episode.js'
import { runEpisode } from '../src/runner.js'
import { baseline } from '../src/baseline.js'
import { scenarios } from '../src/scenarios.js'

const make = () => new Episode(loadCore(), scenarios[0])
test('baseline completes all development scenarios using only observations', async () => {
  for (const scenario of scenarios.filter(x => x.split === 'development')) {
    const result = await runEpisode(new Episode(loadCore(), scenario), ({ observation }) => baseline(observation), { seed: scenario.seed })
    assert.equal(result.summary.terminal, true)
    assert.equal(result.summary.invalid, 0)
    assert.ok(['field_cleared', 'timer_expired'].includes(result.summary.reason))
    assert.equal(result.summary.success, true)
    assert.ok(result.summary.score > 0)
  }
})
test('model call exhaustion is enforced and explicit', async () => {
  const result = await runEpisode(make(), () => ({ type: 'wait' }), { maxCalls: 2 })
  assert.equal(result.summary.reason, 'call_limit')
  assert.equal(result.summary.calls, 2)
})
test('invalid model actions consume budget and never mutate gameplay', async () => {
  const result = await runEpisode(make(), () => ({ type: 'teleport' }), { maxInvalid: 2 })
  assert.equal(result.summary.reason, 'invalid_limit')
  assert.equal(result.summary.invalid, 2)
  assert.equal(result.summary.simulatedSeconds, 0)
})
test('a stuck provider is aborted and recorded as a failed call', async () => {
  let signal
  const result = await runEpisode(make(), (_, opts) => { signal = opts.signal; return new Promise(() => {}) }, { callTimeoutMs: 10 })
  assert.equal(result.summary.reason, 'provider_timeout')
  assert.equal(result.summary.calls, 1)
  assert.equal(signal.aborted, true)
  assert.equal(result.steps[0].source, 'failed_call')
  assert.equal(result.summary.fallbacks, 0)
})
test('wall limit is distinct from request timeout', async () => {
  const result = await runEpisode(make(), () => new Promise(() => {}), { wallTimeoutMs: 10, callTimeoutMs: 100 })
  assert.equal(result.summary.reason, 'wall_timeout')
})
test('provider errors are not replaced with baseline actions', async () => {
  const result = await runEpisode(make(), () => { throw new Error('provider failed') })
  assert.equal(result.summary.reason, 'provider_error')
  assert.equal(result.summary.calls, 1)
  assert.equal(result.summary.simulatedSeconds, 0)
})
test('forced waits are counted separately from player decisions', async () => {
  const e = new Episode(loadCore(), { quota: 500, seconds: 10, angle: 0, items: [{ kind: 'gold_xl', x: 480, y: 520 }] })
  const result = await runEpisode(e, () => ({ type: 'launch', frame: 0 }))
  assert.equal(result.summary.calls, 1)
  assert.ok(result.summary.forcedWaits > 0)
  assert.equal(result.summary.success, true)
})
test('current observation mode does not leak previous moves into history', async () => {
  const result = await runEpisode(make(), ({ history }) => { assert.deepEqual(history, []); return { type: 'wait' } }, { maxCalls: 2 })
  assert.equal(result.summary.reason, 'call_limit')
})

test('bounded history contains only previous decisions and cannot mutate retained results', async () => {
  const episode = () => new Episode(loadCore(), { ...scenarios[0], seconds: 1.5 })
  const lengths = []
  const trace = await runEpisode(episode(), ({ observation, history }) => {
    lengths.push(history.length)
    assert.equal(observation.score, 0)
    for (const entry of history) {
      assert.equal(entry.observation.score, 0)
      assert.ok(entry.observation.frame < observation.frame)
      entry.observation.score = 9999
      entry.result.observation.score = 9999
    }
    return { type: 'wait' }
  }, { historySize: 2 })
  assert.deepEqual(lengths, [0, 1, 2])
  assert.ok(trace.steps.every(step => step.observation.score === 0 && step.result.observation.score === 0))
})

test('provider response delay does not change actions or simulated results', async () => {
  const run = delay => runEpisode(new Episode(loadCore(), { ...scenarios[0], seconds: 1.5 }), async () => {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay))
    return { type: 'wait' }
  })
  const immediate = await run(0), delayed = await run(5)
  const gameplay = trace => trace.steps.map(({ observation, action, result }) => ({ observation, action, result }))
  assert.deepEqual(gameplay(delayed), gameplay(immediate))
  assert.equal(delayed.summary.simulatedSeconds, immediate.summary.simulatedSeconds)
  assert.equal(delayed.summary.calls, immediate.summary.calls)
})
