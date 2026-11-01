// Receding-horizon heuristic using only public observations. No engine imports.
export function baseline(observation) {
  const { claw: h, physics: p, objects, timeLeft } = observation
  if (h.state !== 'swing') return { type: 'wait' }
  let angle = h.angle, direction = h.direction, best = null
  for (let frame = 0; frame < 240; frame++) {
    const dx = Math.sin(angle), dy = Math.cos(angle)
    let first = null
    for (const item of objects) {
      if (item.grabbed) continue
      const x = item.x - p.pivot.x, y = item.y - p.pivot.y
      const along = x * dx + y * dy, cross = Math.abs(x * dy - y * dx)
      const radius = p.clawRadius + item.radius * 0.92
      if (along <= 0 || cross >= radius) continue
      const distance = along - Math.sqrt(radius ** 2 - cross ** 2)
      const hitX = p.pivot.x + dx * distance, hitY = p.pivot.y + dy * distance
      if (distance < p.restingLength || distance > p.maxLen || hitY > p.bottom - 2 || hitX < 6 || hitX > p.right - 6) continue
      if (!first || distance < first.distance) first = { ...item, distance }
    }
    if (first) {
      const wait = frame / p.hz
      const pull = Math.max(p.pullMin, Math.min(p.pullMax, p.pullBase / first.weight))
      const duration = wait + (first.distance - p.restingLength) / p.extendSpeed + (first.distance - p.restingLength) / pull + 0.15
      const utility = duration <= timeLeft ? first.value / duration : -Infinity
      if (utility > 0 && (!best || utility > best.utility)) best = { frame, utility }
    }
    angle += direction * h.speed / p.hz
    if (angle > p.maxAngle) { angle = p.maxAngle; direction = -1 }
    if (angle < -p.maxAngle) { angle = -p.maxAngle; direction = 1 }
  }
  return best && best.frame < p.decisionFrames ? { type: 'launch', frame: best.frame } : { type: 'wait' }
}
