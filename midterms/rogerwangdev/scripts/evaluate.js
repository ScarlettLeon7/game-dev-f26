import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { loadCore } from '../src/load-core.js'
import { Episode } from '../src/episode.js'
import { baseline } from '../src/baseline.js'
import { runEpisode } from '../src/runner.js'
import { createVertexPlayer, SYSTEM_PROMPT } from '../src/vertex.js'
import { scenarios } from '../src/scenarios.js'
import { gameVersion } from './game-version.js'

const { values: opts } = parseArgs({ options: {
  player: { type: 'string', default: 'baseline' }, suite: { type: 'string', default: 'development' },
  scenario: { type: 'string' }, trials: { type: 'string', default: '1' }, history: { type: 'string', default: '0' },
  live: { type: 'boolean', default: false }, 'max-calls': { type: 'string', default: '60' },
  'output-dir': { type: 'string', default: 'reports' }
} })
if (!['baseline', 'vertex'].includes(opts.player) || !['development', 'heldout'].includes(opts.suite)) throw new Error('Choose baseline/vertex and development/heldout')
if (opts.player === 'vertex' && !opts.live) throw new Error('A Vertex episode requires --live and an explicit configured project')
const trials = Number(opts.trials), historySize = Number(opts.history), maxCalls = Number(opts['max-calls'])
if (![trials, maxCalls].every(n => Number.isInteger(n) && n > 0) || !Number.isInteger(historySize) || historySize < 0 || trials > 20) throw new Error('Invalid trial, call, or history budget')
const selected = scenarios.filter(s => s.split === opts.suite && (!opts.scenario || s.id === opts.scenario))
if (!selected.length) throw new Error('No matching scenario')
const player = opts.player === 'baseline' ? ({ observation }) => baseline(observation) : await createVertexPlayer()
const hash = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex')
const suiteHash = hash('../src/scenarios.js')
if (existsSync('SUITE.json')) {
  const declaration = JSON.parse(readFileSync('SUITE.json', 'utf8'))
  if (declaration.scenariosSha256 !== suiteHash) throw new Error('Suite changed. Record an amendment before more evaluation')
}
const gameHash = gameVersion()
let commit = 'uncommitted'
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch {}
const date = new Date().toISOString(), stamp = date.replace(/[:.]/g, '-')
mkdirSync(opts['output-dir'], { recursive: true })
const table = []
for (const scenario of selected) for (let trial = 1; trial <= trials; trial++) {
  const metadata = { kind: opts.player === 'vertex' ? 'live' : 'baseline', player: opts.player, scenario: scenario.id, split: scenario.split, trial, date, gameCommit: commit, gameHash, suiteHash, promptHash: createHash('sha256').update(SYSTEM_PROMPT).digest('hex'), configuration: player.configuration ?? { algorithm: 'visible-geometry-value-per-time', lookaheadFrames: 240 } }
  const trace = await runEpisode(new Episode(loadCore(), scenario), player, { seed: scenario.seed, historySize, maxCalls, metadata })
  // Standard global on-demand prices checked 2026-10-26. Thinking tokens count as output.
  trace.pricing = { currency: 'USD', date: '2026-10-26', model: 'gemini-3.5-flash-lite', inputPerMillion: 0.30, outputPerMillion: 2.50, source: 'https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing', caveat: 'Estimate excludes unreported failed-request usage, discounts, and billing rounding.' }
  trace.summary.estimatedCostUsd = opts.player === 'vertex' && metadata.configuration.model === trace.pricing.model && metadata.configuration.location === 'global' ? (trace.summary.inputTokens * .30 + trace.summary.outputTokens * 2.50) / 1e6 : opts.player === 'baseline' ? 0 : null
  const path = `${opts['output-dir']}/${stamp}-${opts.player}-${scenario.id}-${trial}.json`
  writeFileSync(path, JSON.stringify(trace, null, 2) + '\n', { flag: 'wx' })
  const row = { scenario: scenario.id, trial, player: opts.player, ...trace.summary, trace: path }
  table.push(row)
  console.log(JSON.stringify(row))
}
writeFileSync(`${opts['output-dir']}/${stamp}-${opts.player}-summary.json`, JSON.stringify(table, null, 2) + '\n', { flag: 'wx' })
