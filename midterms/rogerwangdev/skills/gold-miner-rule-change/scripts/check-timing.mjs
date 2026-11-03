import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { Episode, DECISION_FRAMES, PHYSICS_HZ } from '../../../src/episode.js'
import { loadCore } from '../../../src/load-core.js'
import { baseline } from '../../../src/baseline.js'
import { runEpisode } from '../../../src/runner.js'
import { createVertexPlayer } from '../../../src/vertex.js'
import { scenarios } from '../../../src/scenarios.js'
import { finishReplay } from '../../../src/replay.js'
import { gameVersion } from '../../../scripts/game-version.js'

// This development tool receives the engine. The playing agent never does.
const root = new URL('../../../', import.meta.url)
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`)

async function main() {
  const { values } = parseArgs({ options: { seconds: { type: 'string' }, declaration: { type: 'string', default: 'SUITE.json' }, trace: { type: 'string' } } })
  const seconds = values.seconds === undefined ? DECISION_FRAMES / PHYSICS_HZ : Number(values.seconds)
  const rawFrames = seconds * PHYSICS_HZ
  assert.ok(Number.isFinite(rawFrames) && rawFrames > 0 && Math.abs(rawFrames - Math.round(rawFrames)) < 1e-9,
    'Decision duration must represent a positive whole number of physics frames')
  assert.equal(DECISION_FRAMES, Math.round(rawFrames), `Requested decision interval ${seconds}s is not implemented by this runtime`)
  const declaration = json(values.declaration)
  assert.equal(declaration.physicsHz, PHYSICS_HZ, 'Declaration physics frequency')
  assert.equal(declaration.decisionFrames, DECISION_FRAMES, 'Declaration decision interval')
  assert.deepEqual(declaration.launchFrames, [0, DECISION_FRAMES - 1], 'Declaration launch range')

  const GM = loadCore()
  const fixture = {
    id: 'timing-audit', quota: 50, seconds: seconds * 2 + 1 / PHYSICS_HZ, angle: 0, speed: 0.1 / seconds,
    items: [{ kind: 'gold_s', x: 900, y: 600 }]
  }
  const make = () => new Episode(GM, fixture, { maxSteps: 4 })
  const wait = make(), initial = wait.observe()
  assert.equal(initial.physics.hz, PHYSICS_HZ, 'Observed physics frequency')
  assert.equal(initial.physics.decisionFrames, DECISION_FRAMES, 'Observed decision interval')
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.deepEqual(wait.observe(), initial, 'Provider wall time must not advance simulation')
  const after = wait.step(0, { type: 'wait' }).observation
  assert.equal(after.frame, DECISION_FRAMES, 'Physics frames per decision')
  close(initial.timeLeft - after.timeLeft, seconds, 'Simulated time per decision')
  wait.step(0, { type: 'wait' })
  wait.step(0, { type: 'wait' })
  assert.equal(wait.outcome().reason, 'timer_expired', 'Partial final interval reason')
  assert.equal(wait.observe().frame, DECISION_FRAMES * 2 + 1, 'Partial final interval must stop at expiry')
  assert.equal(wait.observe().timeLeft, 0, 'Expired timer')

  for (const offset of [0, DECISION_FRAMES - 1]) {
    const episode = make()
    assert.deepEqual(episode.legal_actions(), [{ type: 'wait' }, { type: 'launch', frame_min: 0, frame_max: DECISION_FRAMES - 1 }], 'Public launch range')
    episode.step(0, { type: 'launch', frame: offset })
    close(episode.observe().claw.angle, offset * fixture.speed / PHYSICS_HZ, 'Actual launch angle')
  }
  for (const action of [{ type: 'launch', frame: DECISION_FRAMES }, { type: 'launch', frame: -1 }, { type: 'launch', frame: 0.5 }, { type: 'wait', frame: 0 }]) {
    const episode = make(), before = episode.observe()
    assert.throws(() => episode.step(0, action), /Illegal action/)
    assert.deepEqual(episode.observe(), before, 'Illegal action must leave gameplay unchanged')
  }

  let request
  const player = await createVertexPlayer({
    project: 'timing-audit', accessToken: 'offline-fixture-only',
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body)
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ type: 'launch', frame: DECISION_FRAMES - 1 }) }] } }] }) }
    }
  })
  const episode = make()
  const payload = { observation: episode.observe(), legalActions: episode.legal_actions(), history: [] }
  const response = await player(payload)
  const schema = request.generationConfig.responseSchema.properties.frame
  assert.equal(schema.type, 'INTEGER', 'Vertex launch schema type')
  assert.equal(schema.minimum, 0, 'Vertex launch schema minimum')
  assert.equal(schema.maximum, DECISION_FRAMES - 1, 'Vertex launch schema maximum')
  assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), payload, 'Outgoing public observation and actions')
  assert.equal(Object.hasOwn(request, 'tools'), false, 'Model must not receive repository tools')
  episode.step(0, response.action)
  close(episode.observe().claw.angle, (DECISION_FRAMES - 1) * fixture.speed / PHYSICS_HZ, 'Mocked model launch angle')

  const results = []
  for (const scenario of scenarios.filter(s => s.split === 'development')) {
    const trace = await runEpisode(new Episode(GM, scenario, { maxSteps: declaration.limits.maxSteps }),
      ({ observation }) => baseline(observation), { seed: scenario.seed, ...declaration.limits })
    assert.equal(trace.summary.success, true, `Development baseline failed: ${scenario.id}, ${trace.summary.reason}, score ${trace.summary.score}`)
    results.push({ scenario: scenario.id, score: trace.summary.score, success: trace.summary.success, steps: trace.summary.steps })
  }

  let replayedSteps = 0
  if (values.trace) {
    const saved = json(values.trace)
    assert.equal(saved.metadata.gameHash, gameVersion(), 'Recording game version differs. Use its original code version for replay')
    const scenario = scenarios.find(s => s.id === saved.metadata.scenario)
    assert.ok(scenario, 'Unknown recording scenario')
    const replay = new Episode(GM, scenario, { maxSteps: declaration.limits.maxSteps })
    replay.reset(saved.seed)
    for (const step of saved.steps) if (step.result && step.action) {
      assert.deepEqual(replay.observe(), step.observation, 'Recorded starting observation differs')
      assert.deepEqual(replay.step(0, step.action), step.result, 'Recorded action result differs')
      replayedSteps++
    }
    finishReplay(replay, saved.summary)
  }
  console.log(JSON.stringify({ physicsHz: PHYSICS_HZ, decisionFrames: DECISION_FRAMES, decisionSeconds: seconds,
    launchFrames: [0, DECISION_FRAMES - 1], declaration: values.declaration, gameHash: gameVersion(), providerRequests: 0,
    baseline: results, replayedSteps, manualReview: ['system prompt wording', 'browser timing and labels', 'evaluation version selection'] }, null, 2))
}

main().catch(error => { console.error(`Timing check failed: ${error.message}`); process.exitCode = 1 })
