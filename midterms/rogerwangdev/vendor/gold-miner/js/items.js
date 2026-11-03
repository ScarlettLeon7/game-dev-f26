/* 物品表：价值 / 重量 / 体积。重量直接决定钩爪回收速度 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;

  var TYPES = {
    gold_s:   { key: 'gold_s',   name: '小金块',   art: 'gold',    cat: 'gold',    value: 50,  weight: 2.4,  r: 16, pts: 8,  jit: 0.30, depth: 0.22 },
    gold_m:   { key: 'gold_m',   name: '中金块',   art: 'gold',    cat: 'gold',    value: 100, weight: 4.2,  r: 22, pts: 9,  jit: 0.28, depth: 0.40 },
    gold_l:   { key: 'gold_l',   name: '大金块',   art: 'gold',    cat: 'gold',    value: 250, weight: 7.5,  r: 29, pts: 10, jit: 0.26, depth: 0.62 },
    gold_xl:  { key: 'gold_xl',  name: '巨型金块', art: 'gold',    cat: 'gold',    value: 500, weight: 12,   r: 37, pts: 11, jit: 0.24, depth: 0.82 },
    diamond:  { key: 'diamond',  name: '钻石',     art: 'diamond', cat: 'diamond', value: 600, weight: 1.6,  r: 15, pts: 6,  jit: 0.10, depth: 0.72 },
    chest:    { key: 'chest',    name: '宝箱',     art: 'chest',   cat: 'chest',   value: 0,   weight: 9.5,  r: 27, pts: 8,  jit: 0.1,  depth: 0.85 },
    bag:      { key: 'bag',      name: '神秘袋',   art: 'bag',     cat: 'bag',     value: 0,   weight: 3.2,  r: 19, pts: 8,  jit: 0.2,  depth: 0.5 },
    rock_s:   { key: 'rock_s',   name: '小石头',   art: 'rock',    cat: 'rock',    value: 11,  weight: 10.5, r: 22, pts: 9,  jit: 0.30, depth: 0.4 },
    rock_l:   { key: 'rock_l',   name: '大石头',   art: 'rock',    cat: 'rock',    value: 20,  weight: 17,   r: 32, pts: 11, jit: 0.28, depth: 0.6 },
    rock_gem: { key: 'rock_gem', name: '含钻岩石', art: 'rockgem', cat: 'rock',    value: 35,  weight: 20,   r: 33, pts: 11, jit: 0.26, depth: 0.7 },
    bone:     { key: 'bone',     name: '骨头',     art: 'bone',    cat: 'junk',    value: 6,   weight: 2.0,  r: 16, pts: 8,  jit: 0.2,  depth: 0.35 },
    skull:    { key: 'skull',    name: '头骨',     art: 'skull',   cat: 'junk',    value: 20,  weight: 3.0,  r: 18, pts: 8,  jit: 0.2,  depth: 0.55 },
    tnt:      { key: 'tnt',      name: '炸药桶',   art: 'tnt',     cat: 'tnt',     value: 0,   weight: 3.0,  r: 18, pts: 8,  jit: 0.2,  depth: 0.45 },
    mole:     { key: 'mole',     name: '金鼠',     art: 'mole',    cat: 'mole',    value: 180, weight: 2.2,  r: 17, pts: 8,  jit: 0.2,  depth: 0.3 }
  };

  var BAG_VALUES = [15, 40, 90, 180, 320, 500, 750];
  var CHEST_VALUES = [400, 550, 700, 900, 1200, 1500];

  function create(kind, rng) {
    var t = TYPES[kind];
    var it = {
      type: t,
      kind: kind,
      x: 0, y: 0,
      r: t.r,
      rot: rng.range(-0.6, 0.6),
      seed: rng.range(0, 20),
      value: t.value,
      weight: t.weight,
      grabbed: false,
      dead: false,
      dir: rng.sign(),
      shape: U.blob(rng, t.pts, t.jit),
      speck: []
    };

    if (t.cat === 'rock') {
      for (var i = 0; i < 7; i++) {
        it.speck.push({
          x: rng.range(-0.6, 0.6), y: rng.range(-0.5, 0.5),
          r: rng.range(0.08, 0.2), a: rng.range(0, 3), d: rng.chance(0.55)
        });
      }
    }
    if (kind === 'bag') it.value = rng.pick(BAG_VALUES);
    if (kind === 'chest') it.value = rng.pick(CHEST_VALUES);
    if (kind === 'mole') it.speed = rng.range(28, 52);
    /* 含钻岩石被炸开后会在原地留下钻石 */
    if (kind === 'rock_gem') {
      it.gem = true;
      it.gemAngle = rng.range(0, U.TAU);
      it.gemDist = rng.range(0.15, 0.4);
    }

    return it;
  }

  GM.Items = {
    TYPES: TYPES,
    create: create
  };
})(window.GM);
