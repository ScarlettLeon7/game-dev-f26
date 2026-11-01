const clone = value => JSON.parse(JSON.stringify(value))

export async function runEpisode(episode, choose, {
  seed = 0, maxCalls = 120, maxInvalid = 3, callTimeoutMs = 15000, wallTimeoutMs = 180000,
  historySize = 0, metadata = {}
} = {}) {
  const started = performance.now(), steps = []
  let calls = 0, invalid = 0, forcedWaits = 0
  let inputTokens = 0, outputTokens = 0
  episode.reset(seed)
  while (!episode.outcome().terminal) {
    if (performance.now() - started >= wallTimeoutMs) { episode.stop('wall_timeout'); break }
    const observation = episode.observe(), legalActions = episode.legal_actions()
    let action = { type: 'wait' }, source = 'forced_wait', latencyMs = 0, usage = null, modelVersion = null
    if (legalActions.length > 1) {
      if (calls >= maxCalls) { episode.stop('call_limit'); break }
      calls++
      source = 'player'
      const begin = performance.now(), controller = new AbortController()
      let timer
      try {
        const remaining = wallTimeoutMs - (begin - started)
        const limit = Math.min(callTimeoutMs, remaining)
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort()
          const error = new Error(remaining <= callTimeoutMs ? 'wall_timeout' : 'provider_timeout')
          error.timeout = true
          reject(error)
        }, limit) })
        const payload = { observation, legalActions, history: historySize ? clone(steps.filter(x => x.source === 'player').slice(-historySize).map(x => ({ observation: x.observation, action: x.action, result: x.result }))) : [] }
        const response = await Promise.race([Promise.resolve().then(() => choose(clone(payload), { signal: controller.signal })), timeout])
        action = response?.action ?? response
        usage = response?.usage ?? null
        modelVersion = response?.modelVersion ?? null
        inputTokens += usage?.inputTokens ?? 0
        outputTokens += usage?.outputTokens ?? 0
      } catch (error) {
        const reason = error.timeout ? error.message : 'provider_error'
        episode.stop(reason)
        steps.push({ observation, action: null, source: 'failed_call', error: reason, latencyMs: performance.now() - begin })
        break
      } finally { clearTimeout(timer) }
      latencyMs = performance.now() - begin
    } else forcedWaits++
    try {
      const result = episode.step(0, action)
      steps.push({ observation, action, source, latencyMs, usage, modelVersion, result })
    } catch {
      invalid++
      steps.push({ observation, action, source: 'invalid_action', latencyMs, usage, modelVersion })
      if (invalid >= maxInvalid) episode.stop('invalid_limit')
    }
  }
  return {
    metadata: clone(metadata), seed, limits: { maxCalls, maxInvalid, callTimeoutMs, wallTimeoutMs, historySize },
    summary: { ...episode.outcome(), calls, invalid, forcedWaits, inputTokens, outputTokens, wallMs: performance.now() - started, fallbacks: 0 }, steps
  }
}
