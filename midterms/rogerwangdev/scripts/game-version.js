import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const gameFiles = [
  'SOURCE.json', 'src/episode.js', 'src/scenarios.js', 'src/runner.js', 'src/baseline.js',
  'src/vertex.js', 'src/load-core.js', 'vendor/gold-miner/js/utils.js',
  'vendor/gold-miner/js/items.js', 'vendor/gold-miner/js/hook.js'
]
export function gameVersion(read = path => readFileSync(new URL(`../${path}`, import.meta.url))) {
  const hash = createHash('sha256')
  for (const path of gameFiles) hash.update(path).update('\0').update(read(path)).update('\0')
  return hash.digest('hex')
}
