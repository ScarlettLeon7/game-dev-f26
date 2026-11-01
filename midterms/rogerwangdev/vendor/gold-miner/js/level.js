/* 关卡：目标金额、时间、矿藏分布与不重叠布点 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;
  var Items = GM.Items;

  /* 累计目标金额（与经典版一致：目标是"总资产"，商店消费会拖慢进度） */
  var GOALS = [275, 700, 1300, 2000, 2900, 3900, 5100, 6500, 8000, 9700, 11600, 13700, 16000, 18500, 21200];
  var MAX_LEVEL = 20;

  /* 难度：只影响目标金额与时间，矿藏分布保持一致 */
  var DIFFS = {
    easy:   { key: 'easy',   name: '休闲', goalMul: 0.75, timeMul: 1.3,  desc: '目标 −25%，时间 +30%' },
    normal: { key: 'normal', name: '经典', goalMul: 1,    timeMul: 1,    desc: '原汁原味的经典手感' },
    hard:   { key: 'hard',   name: '硬核', goalMul: 1.28, timeMul: 0.85, desc: '目标 +28%，时间 −15%' }
  };

  function diffOf(key) { return DIFFS[key] || DIFFS.normal; }

  function rawGoal(n) {
    if (n <= GOALS.length) return GOALS[n - 1];
    var g = GOALS[GOALS.length - 1];
    for (var i = GOALS.length + 1; i <= n; i++) g += 2700 + 200 * (i - GOALS.length);
    return g;
  }

  function goalOf(n, diffKey) {
    var d = diffOf(diffKey);
    return Math.round(rawGoal(n) * d.goalMul / 5) * 5;
  }

  function config(n, diffKey) {
    var d = diffOf(diffKey);
    var base = n <= 3 ? 62 : Math.max(46, 62 - (n - 3) * 2);
    return {
      goal: goalOf(n, diffKey),
      prevGoal: n > 1 ? goalOf(n - 1, diffKey) : 0,
      time: Math.round(base * d.timeMul)
    };
  }

  /* 本关的矿藏清单（越靠前越优先：既决定布点优先级，也决定超数时保留哪些） */
  var MAX_ITEMS = 38;

  function buildPlan(n) {
    var list = [];
    function add(kind, count) { for (var i = 0; i < count; i++) list.push(kind); }
    var cap = function (v, m) { return Math.min(v, m); };

    add('chest', n >= 6 ? 1 : 0);
    add('rock_gem', n >= 5 ? cap(Math.floor(n / 5), 2) : 0);
    add('diamond', n >= 3 ? cap(1 + Math.floor(n / 6), 2) : 0);
    add('gold_xl', n >= 4 ? cap(Math.floor((n - 1) / 3), 3) : 0);
    add('tnt', n >= 4 ? cap(Math.floor(n / 6) + 1, 3) : 0);
    add('gold_l', cap(1 + Math.floor(n / 2), 5));
    add('gold_m', cap(3 + Math.floor(n / 2), 6));
    add('bag', cap(1 + Math.floor(n / 3), 3));
    add('mole', n >= 3 ? cap(1 + Math.floor(n / 8), 2) : 0);
    add('rock_l', cap(Math.floor(n / 2), 5));
    add('gold_s', cap(5 + Math.floor(n / 4), 8));
    add('rock_s', cap(2 + Math.floor(n * 0.6), 8));
    add('skull', n >= 5 ? 1 : 0);
    add('bone', n >= 2 ? cap(Math.floor(n / 4) + 1, 2) : 0);

    return list.slice(0, MAX_ITEMS);
  }

  /* 某个深度上，钩爪能覆盖的水平范围（额外内缩，避开屏幕边缘裁切） */
  var EDGE_PAD = 16;

  function xRangeAt(world, y, r) {
    var dy = y - world.pivot.y;
    if (dy <= 8) return null;
    var byAngle = dy * Math.tan(world.maxAngle);
    var byLen = Math.sqrt(Math.max(0, world.maxLen * world.maxLen - dy * dy));
    var half = Math.min(byAngle, byLen) - r - 4;
    if (half <= 0) return null;
    return [
      Math.max(world.left + r + EDGE_PAD, world.pivot.x - half),
      Math.min(world.right - r - EDGE_PAD, world.pivot.x + half)
    ];
  }

  function tryPlace(placed, world, rng, it) {
    var depth = it.type.depth;
    for (var t = 0; t < 260; t++) {
      var dt = U.clamp(depth + rng.range(-0.3, 0.3), 0.02, 0.98);
      var y = U.lerp(world.top + it.r, world.bottom - it.r, dt);
      var range = xRangeAt(world, y, it.r);
      if (!range || range[1] <= range[0]) continue;
      var x = rng.range(range[0], range[1]);
      var ok = true;
      for (var i = 0; i < placed.length; i++) {
        var o = placed[i];
        if (U.dist(x, y, o.x, o.y) < it.r + o.r + 7) { ok = false; break; }
      }
      if (ok) { it.x = x; it.y = y; it.homeX = x; it.homeY = y; return true; }
    }
    return false;
  }

  function generate(n, world, rng) {
    var plan = buildPlan(n);
    var placed = [];
    for (var i = 0; i < plan.length; i++) {
      var it = Items.create(plan[i], rng);
      if (tryPlace(placed, world, rng, it)) {
        if (it.kind === 'mole') {
          var range = xRangeAt(world, it.y, it.r) || [it.x, it.x];
          it.minX = Math.max(range[0], it.x - rng.range(60, 150));
          it.maxX = Math.min(range[1], it.x + rng.range(60, 150));
          if (it.maxX - it.minX < 30) { it.minX = it.x - 15; it.maxX = it.x + 15; }
        }
        placed.push(it);
      }
    }
    return placed;
  }

  function totalValue(items) {
    var v = 0;
    for (var i = 0; i < items.length; i++) v += items[i].value;
    return v;
  }

  GM.Level = {
    MAX_LEVEL: MAX_LEVEL,
    DIFFS: DIFFS,
    diffOf: diffOf,
    config: config,
    generate: generate,
    xRangeAt: xRangeAt,
    totalValue: totalValue
  };
})(window.GM);
