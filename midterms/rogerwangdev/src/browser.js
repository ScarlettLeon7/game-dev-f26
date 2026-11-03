import { Episode } from './episode.js'
import { baseline } from './baseline.js'
import { scenarios } from './scenarios.js'
import { finishReplay } from './replay.js'
import { HumanEpisode } from './human-episode.js'

const $ = id => document.getElementById(id)
const canvas = $('game'), ctx = canvas.getContext('2d'), GM = window.GM
const background = GM.Sprites.background(960, 640, 150, 1)
let episode, trace, running = false, queued = null, playback = null, recording = null
let savedEpisodes = [], replayRequest = 0
let lastFrame = null, accumulatedMs = 0
let started = false, resultDismissed = false, overlayState = null
const tickMs = 1000 / 60
const resetClock = () => { lastFrame = null; accumulatedMs = 0 }
for (const s of scenarios.filter(x => x.split === 'development')) $('scenario').add(new Option(s.id.replace('-dev', ''), s.id))
function draw() {
  episode.draw(ctx, GM.Sprites, background)
  const o = episode.observe(), end = episode.outcome()
  $('score').textContent = `$${o.score}`
  $('quota').textContent = `$${o.quota}`
  $('time').textContent = `${o.timeLeft.toFixed(1)}s`
  $('claw').textContent = ({ swing: 'Ready', extend: 'Launching', retract: 'Reeling in' })[o.claw.state] ?? o.claw.state
  $('launch').disabled = (!started && !$('debug').checked) || end.terminal || o.claw.state !== 'swing' || $('mode').value !== 'human' || !!recording
  $('wait').disabled = end.terminal || !!recording
  $('wait').hidden = !$('debug').checked
  $('wait').disabled ||= running
  $('next-recorded').disabled = !playback || running || end.terminal
  $('run').disabled = end.terminal || (!!recording && !playback)
  if (end.terminal) {
    running = false
    $('status').textContent = `${end.success ? 'Quota reached!' : 'Episode finished.'} $${end.score} / $${end.quota} · ${end.reason.replaceAll('_', ' ')} · ${end.simulatedSeconds.toFixed(1)} simulated seconds`
  }
  $('run').textContent = recording ? (running ? 'Pause replay' : 'Resume replay') : (running ? 'Pause game' : started ? 'Resume game' : 'Start game')
  presentRound(o, end)
}
function presentRound(observation, end) {
  const scene = scenarios.find(x => x.id === $('scenario').value)
  const human = $('mode').value === 'human'
  const subject = recording ? 'Saved replay' : human ? 'Your game' : 'Heuristic agent'
  const phase = end.terminal ? (recording ? 'Replay finished' : 'Round finished') : running ? (recording ? 'Replay playing' : 'In progress') : started ? 'Paused' : 'Ready to play'
  if ($('round-phase').textContent !== phase) $('round-phase').textContent = phase
  $('round-phase').dataset.state = end.terminal ? 'finished' : running ? 'playing' : 'ready'
  $('round-context').textContent = `${subject} · ${recording ? 'no API calls' : $('debug').checked ? 'debug stepping enabled' : !started ? 'clock starts when you do' : 'smooth play'}`
  $('show-result').hidden = !end.terminal || !resultDismissed
  const state = end.terminal && !resultDismissed ? 'finished' : !started && !$('debug').checked ? 'ready' : !running && !recording && !$('debug').checked && !end.terminal ? 'paused' : null
  $('round-overlay').hidden = !state
  if (!state) { overlayState = null; return }
  $('overlay-dismiss').hidden = state !== 'finished'
  if (state === 'ready') {
    $('overlay-kicker').textContent = human ? 'YOUR NEXT HAUL' : 'WATCH THE HEURISTIC'
    $('overlay-title').textContent = human ? 'Ready to strike gold?' : 'See the claw in action'
    $('overlay-description').textContent = human ? 'Time your launch, reel in treasure and reach the goal before the clock runs out.' : 'The geometry-based agent chooses when to launch. Watch it aim for the goal.'
    $('overlay-summary').textContent = `$${observation.quota} goal · ${scene.seconds} seconds · ${scene.id.replace('-dev', '')} field`
    $('overlay-action').textContent = human ? 'Start game' : 'Watch heuristic'
    $('overlay-hint').textContent = 'The clock is stopped. Start when you’re ready.'
  } else if (state === 'paused') {
    $('overlay-kicker').textContent = 'TAKE YOUR TIME'
    $('overlay-title').textContent = 'Game paused'
    $('overlay-description').textContent = 'Your haul is safe. The clock will continue when you resume.'
    $('overlay-summary').textContent = `$${observation.score} / $${observation.quota} · ${observation.timeLeft.toFixed(1)} seconds left`
    $('overlay-action').textContent = 'Resume game'
    $('overlay-hint').textContent = 'You can also choose New game to start over.'
  } else {
    const normal = ['timer_expired', 'field_cleared'].includes(end.reason)
    $('overlay-kicker').textContent = recording ? 'SAVED REPLAY COMPLETE' : 'ROUND COMPLETE'
    $('overlay-title').textContent = end.success ? 'You struck gold!' : normal ? 'Round over' : 'Recording ended'
    if (recording && end.success) $('overlay-title').textContent = recording.metadata.timing === 'human-realtime-60hz' ? 'Recorded player reached the goal' : 'The agent reached the goal'
    if (!recording && !human && end.success) $('overlay-title').textContent = 'The heuristic reached the goal'
    $('overlay-description').textContent = !normal ? `This run ended: ${end.reason.replaceAll('_', ' ')}. The saved outcome is shown below.` : end.success ? (end.reason === 'field_cleared' ? 'The field is clear and the goal is met.' : 'Time is up. Enough treasure made it back to beat the goal.') : `The round ended $${Math.max(0, end.quota - end.score)} short of the goal. Try timing your next launch for a valuable target.`
    $('overlay-summary').textContent = `$${end.score} collected / $${end.quota} goal · ${end.simulatedSeconds.toFixed(1)} seconds`
    $('overlay-action').textContent = recording ? 'Play it yourself' : human ? 'Play again' : 'Run again'
    $('overlay-hint').textContent = recording ? 'This was a saved run. No new model calls were made.' : 'Choose another situation above for a different field.'
  }
  if (state !== overlayState && state !== 'ready') $('overlay-action').focus({ preventScroll: true })
  overlayState = state
}
function toggleRunning() {
  if (episode.outcome().terminal) return
  started = true
  running = !running
  queued = null
  resetClock()
  draw()
}
$('overlay-action').onclick = () => {
  if (episode.outcome().terminal) {
    reset()
    toggleRunning()
  } else toggleRunning()
}
$('overlay-dismiss').onclick = () => { resultDismissed = true; draw(); $('show-result').focus({ preventScroll: true }) }
$('show-result').onclick = () => { resultDismissed = false; draw() }
function reset(scenario = scenarios.find(x => x.id === $('scenario').value), seed = scenario.seed, timing = null) {
  running = false; queued = null; playback = null; recording = null
  started = false; resultDismissed = false; overlayState = null
  replayRequest++
  $('watch-model').disabled = savedEpisodes.length === 0
  resetClock()
  if ($('mode').value === 'recorded') $('mode').value = 'human'
  $('mode').querySelector('option[value="recorded"]')?.remove()
  $('mode').disabled = false
  const human = timing === 'human-realtime-60hz' || (!timing && $('mode').value === 'human')
  episode = human ? new HumanEpisode(GM, scenario) : new Episode(GM, scenario)
  episode.reset(seed)
  trace = { metadata: { kind: 'browser', scenario: scenario.id, player: $('mode').value, ...(human ? { timing: 'human-realtime-60hz' } : {}) }, seed, steps: [] }
  $('status').textContent = 'Choose a target. Large gold is valuable but heavy. Rocks cost precious time.'
  $('replay-progress').textContent = 'Saved recording · no API calls'
  $('decision-label').textContent = 'Load a recording to inspect its decisions'
  $('decision-meta').textContent = 'The saved episode includes the game observation, returned action, latency, and result. It contains no model reasoning text.'
  $('agent-observation').textContent = 'No recorded step selected.'
  $('agent-action').textContent = 'No recorded step selected.'
  draw()
}
function step(action, frames = 30, redraw = true) {
  if (episode.outcome().terminal) return
  const observation = episode.observe()
  started = true
  try {
    const human = episode instanceof HumanEpisode
    const result = human ? episode.advance(frames, action) : episode.step(0, action)
    trace.steps.push({ observation, action, source: $('mode').value, ...(human ? { frames } : {}), result })
    if (redraw) draw()
    return result
  } catch (error) { $('status').textContent = error.message }
}
$('restart').onclick = () => reset()
$('scenario').onchange = () => reset()
$('mode').onchange = () => reset()
$('run').onclick = toggleRunning
$('debug').onchange = () => { running = false; queued = null; resetClock(); draw() }
$('wait').onclick = () => step({ type: 'wait' })
$('launch').onclick = () => {
  if ($('launch').disabled) return
  if (running) queued = { type: 'launch', frame: 0 }
  else if (episode instanceof HumanEpisode && !$('debug').checked) {
    queued = { type: 'launch', frame: 0 }; running = true; resetClock(); draw()
  } else step({ type: 'launch', frame: 0 })
}
canvas.onclick = () => $('launch').click()
window.addEventListener('keydown', event => {
  if (['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON', 'SUMMARY', 'A'].includes(event.target.tagName)) return
  if (event.code === 'Space' || event.code === 'ArrowDown') {
    event.preventDefault()
    if (!$('round-overlay').hidden) $('overlay-action').click()
    else $('launch').click()
  }
  if (event.code === 'ArrowRight' && (recording || $('debug').checked)) { event.preventDefault(); $(recording ? 'next-recorded' : 'wait').click() }
})
$('download').onclick = () => {
  if (!recording) trace.summary = episode.outcome()
  const url = URL.createObjectURL(new Blob([JSON.stringify(recording ?? trace, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = 'gold-miner-trace.json'; a.click()
  URL.revokeObjectURL(url)
}
function loadRecording(saved) {
  const scenario = scenarios.find(x => x.id === saved.metadata?.scenario)
  if (!scenario || !Array.isArray(saved.steps)) throw new Error('Trace has no supported scenario')
  const human = saved.metadata.timing === 'human-realtime-60hz'
  if (human && saved.steps.some(s => !Number.isInteger(s.frames) || s.frames < 1 || s.frames > 30)) throw new Error('Human trace has an invalid frame count')
  reset(scenario, saved.seed, human ? 'human-realtime-60hz' : 'agent-fixed-step')
  if (![...$('scenario').options].some(option => option.value === scenario.id)) $('scenario').add(new Option(`${scenario.id} (recorded)`, scenario.id))
  $('scenario').value = scenario.id
  $('mode').add(new Option(`${saved.metadata.player} · recorded`, 'recorded'))
  $('mode').value = 'recorded'
  $('mode').disabled = true
  recording = saved
  started = true
  playback = { steps: saved.steps.filter(x => x.result && x.action), summary: saved.summary, index: 0 }
  playback.total = playback.steps.length
  running = true
  $('status').textContent = `Replaying ${saved.metadata.player} on ${scenario.id}. No model calls are made during replay.`
  $('replay-progress').textContent = `0 / ${playback.total} steps · recorded episode · no API calls`
  draw()
}
$('replay').onchange = async event => {
  try {
    const saved = JSON.parse(await event.target.files[0].text())
    loadRecording(saved)
  } catch (error) { $('status').textContent = error.message }
}
function describeRecording(selected) {
  if (!selected) return
  const explanation = selected.id === 'checkpoint'
    ? 'Original checkpoint · Early October 26 run with current-state input and no previous decisions.'
    : selected.id.startsWith('h4-')
      ? '4 previous decisions · Current game state plus up to four earlier decisions and results from this episode.'
      : 'No history · Current game state and legal actions only, without previous decisions.'
  $('recording-context').textContent = explanation
}
async function watchModel() {
  const selected = savedEpisodes.find(item => item.id === $('model-recording').value)
  if (!selected) return
  describeRecording(selected)
  const request = ++replayRequest
  running = false
  draw()
  $('watch-model').disabled = true
  try {
    const response = await fetch(selected.path)
    if (!response.ok) throw new Error('Cannot load the saved Gemini trace')
    const saved = await response.json()
    if (request === replayRequest) loadRecording(saved)
  } catch (error) { if (request === replayRequest) $('status').textContent = error.message }
  finally { if (request === replayRequest) $('watch-model').disabled = false }
}
$('watch-model').onclick = watchModel
$('model-recording').onchange = watchModel
async function loadEpisodeChoices() {
  try {
    const response = await fetch('recordings/episodes.json')
    if (!response.ok) throw new Error('Cannot load the saved episode list')
    savedEpisodes = (await response.json()).episodes
    $('model-recording').replaceChildren()
    const groups = new Map()
    for (const item of savedEpisodes) {
      if (!groups.has(item.group)) {
        const group = document.createElement('optgroup')
        group.label = item.group
        groups.set(item.group, group)
        $('model-recording').append(group)
      }
      groups.get(item.group).append(new Option(item.label, item.id))
    }
    $('model-recording').disabled = false
    $('watch-model').disabled = false
    const params = new URLSearchParams(location.search)
    const id = params.get('episode')
    if (savedEpisodes.some(item => item.id === id)) $('model-recording').value = id
    describeRecording(savedEpisodes.find(item => item.id === $('model-recording').value))
    if (params.get('replay') === 'vertex' || id) await watchModel()
  } catch (error) { $('status').textContent = error.message }
}
function advancePlayback() {
  if (!playback || episode.outcome().terminal) return
    try {
      const record = playback.steps.shift()
      if (record) {
        playback.index++
        const forced = record.source === 'forced_wait'
        const humanInput = recording.metadata.timing === 'human-realtime-60hz'
        $('decision-label').textContent = humanInput ? 'Recorded human input' : forced ? 'Engine wait while claw is busy' : 'Recorded player decision'
        $('decision-meta').textContent = humanInput ? `${record.frames} recorded physics tick(s). Human input and clock advancement, no model request.` : forced ? 'Only waiting was legal in this interval, so the engine made no model request.' : `${record.modelVersion ?? recording.metadata.player} · request latency ${(record.latencyMs ?? 0).toFixed(0)} ms · action selected from the observation below`
        $('agent-observation').textContent = JSON.stringify(record.observation, null, 2)
        $('agent-action').textContent = JSON.stringify({ source: record.source, action: record.action, events: record.result.events, scoreAfter: record.result.observation.score, timeLeftAfter: record.result.observation.timeLeft }, null, 2)
        $('replay-progress').textContent = `${playback.index} / ${playback.total} steps · recorded episode · no API calls`
        const result = step(record.action, record.frames ?? 30)
        if (JSON.stringify(result?.observation) !== JSON.stringify(record.result.observation)) throw new Error('Replay mismatch: this game version produces a different observation')
      }
      if (!playback.steps.length) {
        finishReplay(episode, playback.summary)
        running = false; playback = null; draw()
        if (!episode.outcome().terminal) $('status').textContent = 'Saved partial trace ended.'
      }
    } catch (error) { running = false; playback = null; draw(); $('status').textContent = error.message }
}
$('next-recorded').onclick = () => { if (!running) advancePlayback() }
setInterval(() => {
  if (!running || episode.outcome().terminal || episode instanceof HumanEpisode) return
  if (playback) advancePlayback()
  else {
    const action = $('mode').value === 'baseline' ? baseline(episode.observe()) : queued ?? { type: 'wait' }
    queued = null
    step(action)
  }
}, 500)
function animate(now) {
  const elapsed = lastFrame === null ? 0 : Math.min(100, now - lastFrame)
  lastFrame = now
  if (running && episode instanceof HumanEpisode && !episode.outcome().terminal) {
    accumulatedMs += elapsed
    if (recording) {
      while (playback && accumulatedMs >= (playback.steps[0]?.frames ?? 1) * tickMs) {
        const duration = (playback.steps[0]?.frames ?? 1) * tickMs
        advancePlayback()
        accumulatedMs -= duration
      }
    } else {
      while (accumulatedMs >= tickMs && !episode.outcome().terminal) {
        step(queued ?? { type: 'wait' }, 1, false)
        queued = null
        accumulatedMs -= tickMs
      }
    }
    draw()
  }
  requestAnimationFrame(animate)
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) {
    running = false; queued = null; resetClock(); draw()
    $('status').textContent = 'Paused while this tab is hidden. Press Resume game or Resume replay to continue.'
  }
})
reset()
requestAnimationFrame(animate)
loadEpisodeChoices()
