export function finishReplay(episode, recorded) {
  if (!recorded) return episode.outcome()
  const current = episode.outcome()
  if (recorded.score !== current.score || recorded.steps !== current.steps || Math.abs(recorded.simulatedSeconds - current.simulatedSeconds) > 1e-9) throw new Error('Replay mismatch: score, steps, or simulated time differs')
  if (recorded.terminal && !current.terminal) episode.stop(recorded.reason)
  const final = episode.outcome()
  if (recorded.reason !== final.reason || recorded.success !== final.success || recorded.terminal !== final.terminal) throw new Error('Replay mismatch: terminal outcome differs')
  return final
}
