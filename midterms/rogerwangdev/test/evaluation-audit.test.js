import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { Episode } from '../src/episode.js'
import { loadCore } from '../src/load-core.js'
import { runEpisode } from '../src/runner.js'
import { baseline } from '../src/baseline.js'
import { scenarios } from '../src/scenarios.js'
import { auditTrace } from '../scripts/audit-evaluation.mjs'

const protocol = JSON.parse(readFileSync(new URL('../FINAL-EVALUATION.json', import.meta.url)))
const make = () => runEpisode(new Episode(loadCore(), scenarios.find(s => s.id === protocol.cases[0])),
  ({ observation }) => baseline(observation), { seed: 701, ...protocol.limits,
    metadata: { kind: 'baseline', scenario: protocol.cases[0], player: 'baseline', trial: 1, gameHash: protocol.gameHash, promptHash: protocol.promptHash, suiteHash: protocol.suiteHash } })

test('evaluation audit accepts a complete trace and rejects forged replay results', async () => {
  const trace = await make()
  trace.summary.estimatedCostUsd = 0
  assert.equal(auditTrace(trace, protocol).success, true)
  trace.steps[0].result.observation.score++
  assert.throws(() => auditTrace(trace, protocol), /Replay action result mismatch/)
})

test('evaluation audit rejects incompatible game identity and forged token totals', async () => {
  const trace = await make()
  trace.summary.estimatedCostUsd = 0
  trace.metadata.gameHash = 'forged'
  assert.throws(() => auditTrace(trace, protocol), /Game identity mismatch/)
  trace.metadata.gameHash = protocol.gameHash
  trace.summary.inputTokens++
  assert.throws(() => auditTrace(trace, protocol), /Input-token count mismatch/)
})

test('evaluation audit rejects altered limits, requested model settings and cost basis', () => {
  const folder = new URL('../reports/final-vertex-h0/', import.meta.url)
  const filename = readdirSync(folder).find(name => name.includes('-open-heldout-1.json'))
  const source = JSON.parse(readFileSync(new URL(filename, folder)))
  for (const [change, expected] of [
    [trace => { trace.limits.maxCalls = 999 }, /Recorded maxCalls/],
    [trace => { trace.limits.callTimeoutMs = 999999 }, /Recorded callTimeoutMs/],
    [trace => { trace.metadata.configuration.model = 'different-model' }, /Requested model/],
    [trace => { trace.metadata.configuration.temperature = 1.9 }, /Requested temperature/],
    [trace => { trace.metadata.kind = 'baseline' }, /Trace kind/],
    [trace => { trace.pricing.inputPerMillion = 0 }, /Input price basis/]
  ]) {
    const trace = structuredClone(source)
    change(trace)
    assert.throws(() => auditTrace(trace, protocol), expected)
  }
})
