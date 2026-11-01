export const PHYSICS_HZ = 60
export const DECISION_FRAMES = 30
const clone = value => JSON.parse(JSON.stringify(value))

export class Episode {
  #GM
  #scenario
  #game
  #events = []
  #frame = 0
  #steps = 0
  #reason = null
  #maxSteps

  constructor(GM, scenario, { maxSteps = 200 } = {}) {
    this.#GM = GM
    this.#scenario = clone(scenario)
    if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new Error('Invalid step limit')
    this.#maxSteps = maxSteps
    this.reset(0)
  }

  reset(seed = 0) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid seed')
    const GM = this.#GM, s = this.#scenario, rng = GM.Utils.makeRng(seed)
    const world = { left: 0, right: 960, top: 212, bottom: 614, pivot: { x: 480, y: 107.5 }, maxAngle: GM.Utils.deg(76), maxLen: 760 }
    const items = s.items.map((spec, id) => Object.assign(GM.Items.create(spec.kind, rng), { id, x: spec.x, y: spec.y }))
    const game = { world, items, money: 0, hook: new GM.Hook(world, s.speed ?? 1.18), strength: () => 1, puff() {} }
    game.hook.angle = s.angle ?? -0.8
    game.onGrab = item => {
      this.#events.push({ type: 'grab', id: item.id, kind: item.kind, frame: this.#frame })
      return true
    }
    game.onDeliver = item => {
      item.dead = true
      game.money += item.value
      this.#events.push({ type: 'delivery', id: item.id, value: item.value, frame: this.#frame })
    }
    this.#game = game
    this.#frame = 0
    this.#steps = 0
    this.#reason = null
    this.#events = []
    return this.observe()
  }

  #checkPlayer(player) {
    if (player !== 0) throw new Error('Unknown player')
  }

  observe(player = 0) {
    this.#checkPlayer(player)
    const g = this.#game, h = g.hook
    return clone({
      frame: this.#frame, steps: this.#steps, timeLeft: Math.max(0, this.#scenario.seconds - this.#frame / PHYSICS_HZ),
      score: g.money, quota: this.#scenario.quota,
      claw: { angle: h.angle, direction: h.dir, speed: h.angSpeed, state: h.state, length: h.len, carrying: h.grabbed?.id ?? null },
      physics: { hz: PHYSICS_HZ, decisionFrames: DECISION_FRAMES, ...g.world, restingLength: 76, clawRadius: 15, extendSpeed: 680, emptyReturnSpeed: 1020, pullBase: 900, pullMin: 48, pullMax: 620 },
      objects: g.items.filter(item => !item.dead).map(item => ({ id: item.id, kind: item.kind, x: item.x, y: item.y, radius: item.r, value: item.value, weight: item.weight, grabbed: item.grabbed }))
    })
  }

  legal_actions(player = 0) {
    this.#checkPlayer(player)
    if (this.outcome().terminal) return []
    const actions = [{ type: 'wait' }]
    if (this.#game.hook.canLaunch()) actions.push({ type: 'launch', frame_min: 0, frame_max: DECISION_FRAMES - 1 })
    return actions
  }

  step(player, action) {
    this.#checkPlayer(player)
    if (this.outcome().terminal) throw new Error('Episode is terminal')
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Invalid action')
    const keys = Object.keys(action).sort().join(',')
    const waiting = action.type === 'wait' && keys === 'type'
    const launching = action.type === 'launch' && keys === 'frame,type' && Number.isInteger(action.frame) && action.frame >= 0 && action.frame < DECISION_FRAMES && this.#game.hook.canLaunch()
    if (!waiting && !launching) throw new Error('Illegal action')
    this.#events = []
    this.#steps++
    const endFrame = Math.round(this.#scenario.seconds * PHYSICS_HZ)
    for (let i = 0; i < DECISION_FRAMES; i++) {
      if (launching && i === action.frame) this.#game.hook.launch()
      this.#frame++
      this.#game.hook.update(1 / PHYSICS_HZ, this.#game)
      if (this.#game.items.every(item => item.dead)) this.#reason = 'field_cleared'
      else if (this.#frame >= endFrame) this.#reason = 'timer_expired'
      if (this.#reason) break
    }
    if (!this.#reason && this.#steps >= this.#maxSteps) this.#reason = 'step_limit'
    return { observation: this.observe(), events: clone(this.#events), outcome: this.outcome() }
  }

  outcome() {
    const normal = ['field_cleared', 'timer_expired'].includes(this.#reason)
    return { terminal: this.#reason !== null, reason: this.#reason ?? 'ongoing', success: normal && this.#game.money >= this.#scenario.quota, score: this.#game.money, quota: this.#scenario.quota, simulatedSeconds: this.#frame / PHYSICS_HZ, steps: this.#steps }
  }

  stop(reason) {
    if (!['call_limit', 'wall_timeout', 'provider_timeout', 'provider_error', 'invalid_limit'].includes(reason)) throw new Error('Unknown runner reason')
    if (!this.outcome().terminal) this.#reason = reason
    return this.outcome()
  }

  // Rendering is runner-owned and never exposed to a playing agent.
  draw(ctx, sprites, background) {
    const g = this.#game
    ctx.clearRect(0, 0, 960, 640)
    ctx.drawImage(background, 0, 0)
    for (const item of g.items) if (!item.dead) sprites.item(ctx, item, this.#frame / PHYSICS_HZ)
    g.hook.render(ctx)
    sprites.miner(ctx, { x: 480, y: 150, t: this.#frame / PHYSICS_HZ, crank: this.#frame / 8, strain: g.hook.strain, scale: 1.25 })
    ctx.font = 'bold 16px system-ui'
    ctx.textAlign = 'center'
    for (const item of g.items) if (!item.dead && !item.grabbed) {
      ctx.strokeStyle = '#18100a'; ctx.lineWidth = 4; ctx.fillStyle = '#fff7cc'
      ctx.strokeText(`$${item.value}`, item.x, item.y - item.r - 10)
      ctx.fillText(`$${item.value}`, item.x, item.y - item.r - 10)
    }
  }
}
