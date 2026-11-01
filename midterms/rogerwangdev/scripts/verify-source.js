import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('SOURCE.json', root), 'utf8'))
for (const file of manifest.imported_files) {
  const actual = createHash('sha256').update(readFileSync(new URL(`vendor/gold-miner/${file.path}`, root))).digest('hex')
  if (actual !== file.sha256) throw new Error(`Imported file changed: ${file.path}`)
}
console.log(`Verified ${manifest.imported_files.length} unchanged imported files at ${manifest.revision}`)
