import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { Episode } from '../src/episode.js'
import { loadCore } from '../src/load-core.js'
import { scenarios } from '../src/scenarios.js'
import { finishReplay } from '../src/replay.js'
import { gameVersion } from './game-version.js'

const root = new URL('../', import.meta.url)
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const quantile = (values, q) => values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(q * values.length) - 1)] : 0

export function auditTrace(trace, protocol) {
  const m = trace.metadata, summary = trace.summary
  assert.equal(m.gameHash, protocol.gameHash, 'Game identity mismatch')
  assert.equal(m.promptHash, protocol.promptHash, 'Prompt identity mismatch')
  assert.equal(m.suiteHash, protocol.suiteHash, 'Suite identity mismatch')
  assert.ok(protocol.cases.includes(m.scenario), 'Unexpected final-evaluation case')
  assert.ok(['baseline', 'vertex'].includes(m.player))
  assert.equal(m.kind, m.player === 'vertex' ? 'live' : 'baseline', 'Trace kind mismatch')
  for (const key of ['maxCalls', 'maxInvalid', 'callTimeoutMs', 'wallTimeoutMs']) {
    assert.equal(trace.limits[key], protocol.limits[key], `Recorded ${key} differs from protocol`)
  }
  if (m.player === 'vertex') {
    const config = m.configuration
    for (const key of ['provider', 'model', 'location', 'temperature']) assert.equal(config[key], protocol[key], `Requested ${key} differs from protocol`)
    // These settings are pinned by the unchanged adapter included in protocol.gameHash.
    assert.equal(config.maxOutputTokens, 1024, 'Pinned adapter output-token budget')
    assert.equal(config.retries, 0, 'Pinned adapter retry policy')
    assert.equal(trace.pricing.model, protocol.model, 'Pricing model basis')
    assert.equal(trace.pricing.inputPerMillion, protocol.pricing.inputPerMillion, 'Input price basis')
    assert.equal(trace.pricing.outputPerMillion, protocol.pricing.outputPerMillion, 'Output price basis')
  }
  assert.ok([0, 4].includes(trace.limits.historySize))
  assert.ok([1, 2].includes(m.trial))
  const scenario = scenarios.find(s => s.id === m.scenario)
  assert.equal(trace.seed, scenario.seed, 'Scenario seed mismatch')
  const episode = new Episode(loadCore(), scenario)
  episode.reset(trace.seed)
  let calls = 0, forced = 0, invalid = 0, input = 0, output = 0, launches = 0
  const events = [], latency = [], versions = new Set()
  for (const step of trace.steps) {
    assert.deepEqual(episode.observe(), step.observation, 'Replay starting observation mismatch')
    input += step.usage?.inputTokens ?? 0
    output += step.usage?.outputTokens ?? 0
    if (step.modelVersion) versions.add(step.modelVersion)
    if (step.source === 'forced_wait') {
      forced++
      assert.deepEqual(episode.legal_actions(), [{ type: 'wait' }], 'Forced wait skipped a legal decision')
    } else {
      calls++
      latency.push(step.latencyMs)
    }
    if (step.source === 'invalid_action') {
      invalid++
      assert.throws(() => episode.step(0, step.action), /Illegal action|Invalid action/)
      assert.deepEqual(episode.observe(), step.observation)
    } else if (step.result) {
      if (step.action.type === 'launch') launches++
      assert.deepEqual(episode.step(0, step.action), step.result, 'Replay action result mismatch')
      events.push(...step.result.events)
    } else assert.equal(step.source, 'failed_call', 'Unrecognized trace record')
  }
  finishReplay(episode, summary)
  assert.equal(summary.calls, calls, 'Decision count mismatch')
  assert.equal(summary.forcedWaits, forced, 'Forced-wait count mismatch')
  assert.equal(summary.invalid, invalid, 'Invalid-action count mismatch')
  assert.equal(summary.inputTokens, input, 'Input-token count mismatch')
  assert.equal(summary.outputTokens, output, 'Output-token count mismatch')
  assert.equal(summary.fallbacks, 0)
  assert.ok(calls <= protocol.limits.maxCalls)
  assert.ok(summary.steps <= protocol.limits.maxSteps)
  const grabs = events.filter(e => e.type === 'grab')
  const latestLaunch = trace.steps.findLastIndex(s => s.result && s.action?.type === 'launch')
  const incompleteEmptyLaunch = latestLaunch >= 0 && episode.observe().claw.state !== 'swing' && !trace.steps.slice(latestLaunch).some(s => s.result?.events.some(e => e.type === 'grab')) ? 1 : 0
  const cost = m.player === 'vertex' ? (input * protocol.pricing.inputPerMillion + output * protocol.pricing.outputPerMillion) / 1e6 : 0
  assert.ok(Math.abs(cost - summary.estimatedCostUsd) < 1e-9, 'Cost estimate mismatch')
  return { scenario: m.scenario, trial: m.trial, player: m.player, history: trace.limits.historySize,
    score: summary.score, quota: summary.quota, success: summary.success, reason: summary.reason,
    simulatedSeconds: summary.simulatedSeconds, wallMs: summary.wallMs, steps: summary.steps,
    decisions: calls, modelCalls: m.player === 'vertex' ? calls : 0, forcedWaits: forced, invalid,
    launches, grabs: grabs.length, deliveries: events.filter(e => e.type === 'delivery').length,
    rockGrabs: grabs.filter(e => e.kind.startsWith('rock')).length,
    completedEmptyRetrievals: launches - grabs.length - incompleteEmptyLaunch, incompleteEmptyLaunch,
    meanLatencyMs: latency.length ? latency.reduce((a, b) => a + b, 0) / latency.length : 0,
    medianLatencyMs: quantile(latency, .5), p95LatencyMs: quantile(latency, .95), maxLatencyMs: Math.max(0, ...latency),
    inputTokens: input, outputTokens: output, estimatedCostUsd: cost, modelVersions: [...versions] }
}

function main() {
  const { values } = parseArgs({ options: { output: { type: 'string' } } })
  const protocol = read('FINAL-EVALUATION.json')
  assert.equal(gameVersion(), protocol.gameHash, 'Current engine differs from frozen final protocol')
  assert.equal(createHash('sha256').update(readFileSync(new URL('src/scenarios.js', root))).digest('hex'), protocol.suiteHash)
  const rows = []
  for (const arm of protocol.armOrder) {
    const folder = `reports/final-${arm.player}-h${arm.history}`
    for (const filename of readdirSync(new URL(folder + '/', root)).sort()) {
      if (!filename.endsWith('.json')) continue
      const trace = read(`${folder}/${filename}`)
      if (Array.isArray(trace)) continue
      const row = auditTrace(trace, protocol)
      assert.equal(row.player, arm.player)
      assert.equal(row.history, arm.history)
      rows.push({ ...row, trace: `${folder}/${filename}` })
    }
  }
  const keys = rows.map(r => `${r.player}/${r.history}/${r.scenario}/${r.trial}`)
  assert.equal(new Set(keys).size, 24, 'Missing or duplicate final trials')
  assert.equal(rows.length, 24)
  const live = rows.filter(r => r.player === 'vertex')
  const report = { protocol: 'FINAL-EVALUATION.json', gameHash: protocol.gameHash, allTracesReplayedExactly: true,
    traceCount: rows.length, liveEpisodes: live.length, modelCalls: live.reduce((a, r) => a + r.modelCalls, 0),
    reportedEstimatedCostUsd: live.reduce((a, r) => a + r.estimatedCostUsd, 0), rows }
  assert.ok(report.reportedEstimatedCostUsd <= protocol.estimatedCampaignCeilingUsd)
  if (values.output) writeFileSync(new URL(values.output, root), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify(report, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
