// Committed before live model tuning. Development and held-out layouts are separate.
export const scenarios = [
  { id: 'open-dev', split: 'development', seed: 101, quota: 750, seconds: 30, items: [
    { kind: 'gold_s', x: 340, y: 300 }, { kind: 'gold_m', x: 610, y: 340 }, { kind: 'gold_l', x: 260, y: 470 }, { kind: 'diamond', x: 700, y: 500 }, { kind: 'rock_s', x: 490, y: 420 }
  ] },
  { id: 'blocked-dev', split: 'development', seed: 102, quota: 700, seconds: 35, items: [
    { kind: 'diamond', x: 480, y: 530 }, { kind: 'rock_l', x: 480, y: 310 }, { kind: 'diamond', x: 740, y: 460 }, { kind: 'gold_l', x: 250, y: 420 }, { kind: 'gold_m', x: 610, y: 285 }
  ] },
  { id: 'budget-dev', split: 'development', seed: 103, quota: 650, seconds: 12, items: [
    { kind: 'gold_xl', x: 300, y: 520 }, { kind: 'diamond', x: 700, y: 520 }, { kind: 'gold_s', x: 400, y: 290 }, { kind: 'rock_l', x: 510, y: 370 }
  ] },
  { id: 'open-heldout', split: 'heldout', seed: 701, quota: 750, seconds: 30, items: [
    { kind: 'diamond', x: 250, y: 510 }, { kind: 'gold_l', x: 720, y: 470 }, { kind: 'gold_m', x: 350, y: 310 }, { kind: 'gold_s', x: 600, y: 290 }, { kind: 'rock_s', x: 490, y: 430 }
  ] },
  { id: 'blocked-heldout', split: 'heldout', seed: 702, quota: 700, seconds: 35, items: [
    { kind: 'diamond', x: 500, y: 540 }, { kind: 'rock_l', x: 491, y: 310 }, { kind: 'diamond', x: 220, y: 480 }, { kind: 'gold_l', x: 740, y: 430 }, { kind: 'gold_m', x: 360, y: 290 }
  ] },
  { id: 'budget-heldout', split: 'heldout', seed: 703, quota: 650, seconds: 12, items: [
    { kind: 'gold_xl', x: 710, y: 540 }, { kind: 'diamond', x: 270, y: 500 }, { kind: 'gold_s', x: 570, y: 285 }, { kind: 'rock_l', x: 450, y: 390 }
  ] }
]
