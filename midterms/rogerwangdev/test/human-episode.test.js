import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCore } from '../src/load-core.js'
import { Episode, DECISION_FRAMES } from '../src/episode.js'
import { HumanEpisode } from '../src/human-episode.js'
import { scenarios } from '../src/scenarios.js'
import { baseline } from '../src/baseline.js'

const GM = loadCore()
const scene = { id: 'human-test', quota: 50, seconds: 3, angle: 0, speed: 1, items: [{ kind: 'gold_s', x: 480, y: 300 }] }

test('human clock advances one physics tick, and launches at the currently visible angle', () => {
  const e = new HumanEpisode(GM, scene)
  for (let i = 0; i < 7; i++) e.advance(1, { type: 'wait' })
  assert.equal(e.observe().frame, 7)
  assert.equal(e.observe().timeLeft, 3 - 7 / 60)
  const angle = e.observe().claw.angle
  e.advance(1, { type: 'launch', frame: 0 })
  assert.equal(e.observe().claw.angle, angle)
  assert.equal(e.observe().claw.state, 'extend')
  assert.equal(e.observe().frame, 8)
})

test('human tick playback matches every development baseline decision and final outcome', () => {
  for (const scenario of scenarios.filter(x => x.split === 'development')) {
    const agent = new Episode(GM, scenario), human = new HumanEpisode(GM, scenario)
    agent.reset(scenario.seed); human.reset(scenario.seed)
    while (!agent.outcome().terminal) {
      const action = baseline(agent.observe())
      const expected = agent.step(0, action)
      const events = []
      for (let frame = 0; frame < DECISION_FRAMES && !human.outcome().terminal; frame++) {
        events.push(...human.advance(1, action.type === 'launch' && action.frame === frame ? { type: 'launch', frame: 0 } : { type: 'wait' }).events)
      }
      assert.deepEqual(human.observe(), expected.observation)
      assert.deepEqual(events, expected.events)
      assert.deepEqual(human.outcome(), expected.outcome)
    }
    assert.equal(human.outcome().success, true)
  }
})

test('human adapter rejects invalid input without changing state, including a busy launch', () => {
  const e = new HumanEpisode(GM, scene)
  for (const [frames, action] of [[0, { type: 'wait' }], [31, { type: 'wait' }], [1.5, { type: 'wait' }], [1, { type: 'launch', frame: 1 }], [1, { type: 'wait', score: 999 }]]) {
    const before = e.observe()
    assert.throws(() => e.advance(frames, action))
    assert.deepEqual(e.observe(), before)
  }
  e.advance(1, { type: 'launch', frame: 0 })
  const before = e.observe()
  assert.throws(() => e.advance(1, { type: 'launch', frame: 0 }))
  assert.deepEqual(e.observe(), before)
})

test('human pause inspection advances 30 ticks and expiry stops within a partial interval', () => {
  const e = new HumanEpisode(GM, { ...scene, seconds: 31 / 60 })
  e.advance(30, { type: 'wait' })
  assert.equal(e.observe().frame, 30)
  const end = e.advance(30, { type: 'wait' })
  assert.equal(end.observation.frame, 31)
  assert.equal(end.observation.timeLeft, 0)
  assert.equal(end.outcome.reason, 'timer_expired')
  assert.throws(() => e.advance(1, { type: 'wait' }))
})
