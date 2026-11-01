// Presentation of saved actions only. No provider adapter, credentials or new action selection.
const $ = id => document.getElementById(id)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const iframe = $('game')
const frameReady = iframe.contentDocument?.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }))
const descriptions = {
  'open-heldout': 'Open field: compare target value with collection time.',
  'blocked-heldout': 'Blocked approach: a rock can intercept a valuable target.',
  'budget-heldout': 'Tight budget: expensive objects may take too long to retrieve.'
}
let manifest, traces

async function loadTrace(trace) {
  await frameReady
  const doc = iframe.contentDocument
  if (!doc.getElementById('recording-layout')) {
    const style = doc.createElement('style')
    style.id = 'recording-layout'
    style.textContent = 'main{padding:0;max-width:none}header,.toolbar,.controls,#status,.inspector,.explanation,footer{display:none}'
    doc.head.append(style)
  }
  await new Promise(resolve => {
    const progress = doc.getElementById('replay-progress')
    const observer = new MutationObserver(() => {
      if (!progress.textContent.startsWith('0 /')) return
      observer.disconnect()
      doc.getElementById('run').click() // pause immediately, then advance saved steps on our presentation clock
      resolve()
    })
    observer.observe(progress, { childList: true, subtree: true, characterData: true })
    const transfer = new DataTransfer()
    transfer.items.add(new File([JSON.stringify(trace)], 'recorded-evaluation.json', { type: 'application/json' }))
    const input = doc.getElementById('replay')
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function inspectStep(trace, index) {
  const step = trace.steps.filter(s => s.result && s.action)[index]
  if (!step) return
  const o = step.observation
  $('observation').textContent = JSON.stringify({ timeLeft: o.timeLeft, score: o.score, clawAngle: Number(o.claw.angle.toFixed(4)), swingDirection: o.claw.direction, clawState: o.claw.state, visibleObjects: o.objects.map(x => ({ id: x.id, value: x.value, x: Math.round(x.x), y: Math.round(x.y) })) }, null, 2)
  $('action').textContent = JSON.stringify(step.action, null, 2)
  $('latency').textContent = step.source === 'forced_wait' ? 'Forced wait: claw busy, no model request.' : `Model response: ${step.latencyMs.toFixed(0)} ms. ${step.action.type === 'launch' ? `Launch delay: ${(step.action.frame / 60).toFixed(3)} seconds.` : 'Wait advances simulation.'}`
  $('progress').textContent = `Recorded step ${index + 1} / ${trace.steps.filter(s => s.result && s.action).length}`
}

async function demonstrate() {
  $('start').hidden = true
  $('loading').textContent = 'The demonstration advances automatically. No gameplay input is required.'
  document.body.dataset.phase = 'intro'
  await sleep(25000)
  $('intro').hidden = true
  $('play').hidden = false
  for (let c = 0; c < traces.length; c++) {
    const trace = traces[c], source = manifest.traces[c]
    document.body.dataset.phase = trace.metadata.scenario
    $('case').textContent = trace.metadata.scenario
    $('description').textContent = descriptions[trace.metadata.scenario]
    $('source').textContent = `Source: ${source}`
    $('result').textContent = ''
    await loadTrace(trace)
    const total = trace.steps.filter(s => s.result && s.action).length
    const intervals = manifest.caseSeconds[c] * 2
    for (let i = 0; i < intervals; i++) {
      await sleep(1000)
      if (i < total) {
        iframe.contentDocument.getElementById('next-recorded').click()
        inspectStep(trace, i)
      }
      if (i >= total - 1) $('result').textContent = `${trace.summary.success ? 'Quota reached' : 'Quota missed'}: $${trace.summary.score} / $${trace.summary.quota}. ${trace.summary.reason.replaceAll('_', ' ')}.`
    }
  }
  $('play').hidden = true
  $('summary').hidden = false
  document.body.dataset.phase = 'summary'
  await sleep(31000)
  document.body.dataset.demoDone = 'true'
}

try {
  const response = await fetch('recordings/demo-manifest.json')
  if (!response.ok) throw new Error('Generate the evaluation manifest before recording')
  manifest = await response.json()
  traces = await Promise.all(manifest.traces.map(async path => {
    const result = await fetch(path)
    if (!result.ok) throw new Error(`Cannot load recorded trace ${path}`)
    return result.json()
  }))
  for (const row of manifest.comparison) {
    const tr = document.createElement('tr')
    for (const value of [row.player, row.history, `${row.wins} / ${row.trials}`, row.meanScore.toFixed(1)]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td)
    }
    $('comparison').append(tr)
  }
  $('spend').textContent = `12 real model episodes, ${manifest.modelCalls} API calls, $${manifest.estimatedCostUsd.toFixed(4)} estimated token cost.`
  $('limits').textContent = 'Per episode: 200 steps, 60 model calls, 3 invalid responses, 15-second request timeout and 180-second wall limit. No retries or baseline fallbacks.'
  $('loading').textContent = 'Ready. Approximately 3 minutes 30 seconds, with readable captions and recorded actions.'
  $('start').disabled = false
  $('start').onclick = () => demonstrate().catch(error => { document.body.dataset.demoError = error.message; $('loading').textContent = error.message })
} catch (error) { $('loading').textContent = error.message; document.body.dataset.demoError = error.message }
