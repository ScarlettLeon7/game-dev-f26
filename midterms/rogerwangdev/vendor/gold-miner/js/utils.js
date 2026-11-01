/* 通用工具：数学、随机数、碰撞、绘图辅助、本地存档 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function deg(d) { return d * Math.PI / 180; }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

  /* mulberry32：可复现的伪随机数发生器 */
  function makeRng(seed) {
    var a = seed >>> 0;
    function rng() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    rng.range = function (lo, hi) { return lo + rng() * (hi - lo); };
    rng.int = function (lo, hi) { return Math.floor(lo + rng() * (hi - lo + 1)); };
    rng.pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
    rng.chance = function (p) { return rng() < p; };
    rng.sign = function () { return rng() < 0.5 ? -1 : 1; };
    return rng;
  }

  /* 生成一个稳定的不规则多边形轮廓（单位半径），用于矿石外形 */
  function blob(rng, points, jitter) {
    var out = [], i;
    for (i = 0; i < points; i++) {
      out.push({
        a: (i / points) * TAU + rng.range(-0.12, 0.12),
        r: 1 - rng.range(0, jitter)
      });
    }
    return out;
  }

  function blobPath(ctx, shape, r, sx, sy) {
    sx = sx === undefined ? 1 : sx;
    sy = sy === undefined ? 1 : sy;
    ctx.beginPath();
    for (var i = 0; i < shape.length; i++) {
      var p = shape[i];
      var x = Math.cos(p.a) * r * p.r * sx;
      var y = Math.sin(p.a) * r * p.r * sy;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(ctx, x, y, r1, r2, n, rot) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var rr = i % 2 ? r2 : r1;
      var a = (i / (n * 2)) * TAU + (rot || 0);
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* 千分位金额 */
  function money(n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function timeText(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function load(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }

  function save(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略隐私模式报错 */ }
  }

  GM.Utils = {
    TAU: TAU,
    clamp: clamp,
    lerp: lerp,
    deg: deg,
    dist: dist,
    makeRng: makeRng,
    blob: blob,
    blobPath: blobPath,
    roundRect: roundRect,
    star: star,
    money: money,
    timeText: timeText,
    load: load,
    save: save
  };
})(window.GM);
