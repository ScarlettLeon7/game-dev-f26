import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Trusted, pinned engine code. Players never receive this context or filesystem access.
export function loadCore() {
  const sandbox = { window: { GM: { Audio: { play() {} } } } }
  vm.createContext(sandbox)
  for (const name of ['utils', 'items', 'hook']) {
    const source = readFileSync(new URL(`../vendor/gold-miner/js/${name}.js`, import.meta.url), 'utf8')
    vm.runInContext(source, sandbox, { filename: `upstream/${name}.js`, timeout: 1000 })
  }
  return sandbox.window.GM
}
