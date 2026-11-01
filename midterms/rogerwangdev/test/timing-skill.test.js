import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DECISION_FRAMES, PHYSICS_HZ } from '../src/episode.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const helper = 'skills/gold-miner-rule-change/scripts/check-timing.mjs'
const run = (args = [], cwd = root) => spawnSync(process.execPath, [helper, ...args], { cwd, encoding: 'utf8', timeout: 20000 })

test('timing skill checks the declared engine, provider schema and full development episodes offline', () => {
  const result = run(['--trace', 'reports/2026-10-26T19-22-31-872Z-vertex-open-dev-1.json'])
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.decisionFrames, DECISION_FRAMES)
  assert.equal(report.decisionSeconds, DECISION_FRAMES / PHYSICS_HZ)
  assert.equal(report.providerRequests, 0)
  assert.equal(report.replayedSteps, 60)
  assert.deepEqual(report.baseline.map(row => row.success), [true, true, true])
})

test('timing skill rejects a requested interval that the runtime has not implemented', () => {
  const result = run(['--seconds', String(2 * DECISION_FRAMES / PHYSICS_HZ)])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Requested decision interval/)
})

test('timing skill rejects a duration between physics ticks rather than rounding it', () => {
  const result = run(['--seconds', String(1.5 / PHYSICS_HZ)])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /positive whole number of physics frames/)
})

test('timing skill catches drift between the engine and the outgoing provider action schema', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'gold-miner-timing-schema-'))
  try {
    for (const path of ['package.json', 'SOURCE.json', 'SUITE.json', 'src', 'vendor', 'skills', 'scripts']) cpSync(join(root, path), join(fixture, path), { recursive: true })
    const path = join(fixture, 'src/vertex.js')
    const source = readFileSync(path, 'utf8')
    const expected = `maximum: ${DECISION_FRAMES - 1}`
    assert.ok(source.includes(expected), 'Update the controlled schema-drift fixture if the adapter implementation changes')
    writeFileSync(path, source.replace(expected, `maximum: ${DECISION_FRAMES - 2}`))
    const result = run([], fixture)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Vertex launch schema maximum/)
  } finally { rmSync(fixture, { recursive: true, force: true }) }
})
