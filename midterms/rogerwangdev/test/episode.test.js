import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCore } from '../src/load-core.js'
import { Episode } from '../src/episode.js'

const GM = loadCore()
const scenario = {
  id: 'test', quota: 50, seconds: 12, angle: 0, speed: 1,
  items: [{ kind: 'gold_s', x: 480, y: 300 }]
}
const make = (changes = {}, options = {}) => new Episode(GM, { ...scenario, ...changes }, options)

test('one decision advances exactly 30 physics frames without wall-time dependence', async () => {
  const a = make(), b = make()
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.deepEqual(a.observe(), b.observe())
  a.step(0, { type: 'wait' })
  b.step(0, { type: 'wait' })
  assert.deepEqual(a.observe(), b.observe())
  assert.equal(a.observe().frame, 30)
  assert.equal(a.observe().timeLeft, 11.5)
})

test('the same seed and actions reproduce an entire gameplay trace', () => {
  const a = make(), b = make()
  a.reset(123); b.reset(123)
  const trace = e => {
    const results = [e.step(0, { type: 'launch', frame: 0 })]
    while (!e.outcome().terminal) results.push(e.step(0, { type: 'wait' }))
    return results
  }
  assert.deepEqual(trace(a), trace(b))
})

test('invalid actions and player IDs cannot mutate gameplay', () => {
  for (const [player, action] of [[1, { type: 'wait' }], [0, { type: 'cheat' }], [0, { type: 'launch', frame: 30 }], [0, { type: 'launch', frame: -1 }], [0, { type: 'launch', frame: 0.5 }], [0, { type: 'wait', score: 9000 }], [0, null]]) {
    const e = make(), before = e.observe()
    assert.throws(() => e.step(player, action))
    assert.deepEqual(e.observe(), before)
  }
})

test('observations are detached copies with no seed, engine, or evaluator data', () => {
  const e = make(), obs = e.observe()
  obs.objects[0].value = 9000
  obs.physics.pivot.x = 0
  assert.equal(e.observe().objects[0].value, 50)
  assert.equal(e.observe().physics.pivot.x, 480)
  for (const key of ['seed', 'GM', 'world', 'scenario', 'solution', 'credentials']) assert.equal(Object.hasOwn(e.observe(), key), false)
  assert.throws(() => e.observe(2))
  assert.throws(() => e.legal_actions(2))
})

test('launch is unavailable while the claw is busy', () => {
  const e = make({ items: [{ kind: 'gold_xl', x: 480, y: 520 }] })
  e.step(0, { type: 'launch', frame: 0 })
  assert.deepEqual(e.legal_actions(), [{ type: 'wait' }])
  assert.throws(() => e.step(0, { type: 'launch', frame: 0 }))
})

test('a straight launch completes a verified successful path and delivers exact value', () => {
  const e = make()
  e.step(0, { type: 'launch', frame: 0 })
  while (!e.outcome().terminal) e.step(0, { type: 'wait' })
  assert.equal(e.outcome().reason, 'field_cleared')
  assert.equal(e.outcome().success, true)
  assert.equal(e.outcome().score, 50)
  assert.throws(() => e.step(0, { type: 'wait' }))
})

test('nearest intercepted object wins over a more valuable object behind it', () => {
  const e = make({ items: [{ kind: 'diamond', x: 480, y: 500 }, { kind: 'rock_s', x: 480, y: 290 }] })
  let result = e.step(0, { type: 'launch', frame: 0 })
  while (!result.events.some(x => x.type === 'grab')) result = e.step(0, { type: 'wait' })
  assert.equal(result.events.find(x => x.type === 'grab').kind, 'rock_s')
})

test('heavier loads take more simulated time to deliver', () => {
  const duration = kind => {
    const e = make({ seconds: 30, items: [{ kind, x: 480, y: 400 }] })
    e.step(0, { type: 'launch', frame: 0 })
    while (!e.outcome().terminal) e.step(0, { type: 'wait' })
    return e.outcome().simulatedSeconds
  }
  assert.ok(duration('gold_xl') > duration('diamond'))
})

test('timer expiry is exact and distinguishable from step exhaustion', () => {
  const e = make({ seconds: 1 })
  e.step(0, { type: 'wait' }); e.step(0, { type: 'wait' })
  assert.equal(e.outcome().reason, 'timer_expired')
  assert.equal(e.outcome().simulatedSeconds, 1)
  assert.equal(e.outcome().success, false)
  const limited = make({}, { maxSteps: 1 })
  limited.step(0, { type: 'wait' })
  assert.equal(limited.outcome().reason, 'step_limit')
})

test('launch-frame offset is executed by physics rather than an aiming oracle', () => {
  const e = make()
  e.step(0, { type: 'launch', frame: 12 })
  assert.ok(Math.abs(e.observe().claw.angle - 12 / 60) < 1e-10)
})

test('observed integration regression: an empty launch retracts without a rendering callback', () => {
  const e = make({ angle: 1.2, seconds: 3 })
  e.step(0, { type: 'launch', frame: 0 })
  while (!e.outcome().terminal) e.step(0, { type: 'wait' })
  assert.equal(e.outcome().score, 0)
  assert.equal(e.outcome().reason, 'timer_expired')
})
