/* 程序化美术：所有画面元素均由 Canvas 绘制，项目不含任何图片素材 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;

  /* ---------- 背景（离屏预渲染一次，逐关变色） ---------- */
  function background(W, H, groundY, level) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var rng = U.makeRng(level * 7919 + 13);
    var hue = 24 + ((level - 1) * 7) % 26;   // 泥土色相随关卡轻微变化

    /* 天空 */
    var sky = c.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#2b4a7a');
    sky.addColorStop(0.55, '#5f86b8');
    sky.addColorStop(1, '#b8cfe0');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, groundY);

    /* 太阳光晕 */
    var sun = c.createRadialGradient(W * 0.82, groundY * 0.32, 4, W * 0.82, groundY * 0.32, 120);
    sun.addColorStop(0, 'rgba(255,244,200,.95)');
    sun.addColorStop(0.25, 'rgba(255,224,150,.35)');
    sun.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, W, groundY);

    /* 远山 */
    function hills(baseY, amp, color) {
      c.beginPath();
      c.moveTo(0, groundY);
      c.lineTo(0, baseY);
      for (var x = 0; x <= W; x += 24) {
        var y = baseY - Math.sin(x * 0.011 + amp) * amp - Math.sin(x * 0.031) * amp * 0.4;
        c.lineTo(x, y);
      }
      c.lineTo(W, groundY);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    }
    hills(groundY - 22, 16, 'rgba(46,66,96,.55)');
    hills(groundY - 8, 11, 'rgba(38,54,78,.75)');

    /* 云 */
    for (var i = 0; i < 4; i++) {
      var cx = rng.range(30, W - 30), cy = rng.range(16, groundY * 0.5), s = rng.range(0.7, 1.4);
      c.fillStyle = 'rgba(255,255,255,' + rng.range(0.18, 0.4).toFixed(2) + ')';
      for (var k = 0; k < 4; k++) {
        c.beginPath();
        c.ellipse(cx + k * 17 * s - 25 * s, cy + Math.sin(k) * 4 * s, 22 * s - k * 2, 11 * s, 0, 0, U.TAU);
        c.fill();
      }
    }

    /* 草皮 */
    var grassH = 13;
    var gg = c.createLinearGradient(0, groundY - grassH, 0, groundY + 6);
    gg.addColorStop(0, '#7fc154');
    gg.addColorStop(0.6, '#4f9433');
    gg.addColorStop(1, '#2f6a22');
    c.fillStyle = gg;
    c.beginPath();
    c.moveTo(0, groundY - grassH + 2);
    for (var gx = 0; gx <= W; gx += 16) {
      c.lineTo(gx, groundY - grassH + Math.sin(gx * 0.09) * 2.4);
    }
    c.lineTo(W, groundY + 8);
    c.lineTo(0, groundY + 8);
    c.closePath();
    c.fill();

    /* 泥土主体 */
    var soil = c.createLinearGradient(0, groundY, 0, H);
    soil.addColorStop(0, 'hsl(' + hue + ',38%,32%)');
    soil.addColorStop(0.35, 'hsl(' + hue + ',36%,26%)');
    soil.addColorStop(0.75, 'hsl(' + (hue - 4) + ',33%,20%)');
    soil.addColorStop(1, 'hsl(' + (hue - 8) + ',30%,14%)');
    c.fillStyle = soil;
    c.fillRect(0, groundY, W, H - groundY);

    /* 地层带 */
    for (var s2 = 0; s2 < 5; s2++) {
      var by = groundY + 40 + s2 * (H - groundY) / 5.4 + rng.range(-8, 8);
      c.beginPath();
      c.moveTo(0, by);
      for (var bx = 0; bx <= W; bx += 30) {
        c.lineTo(bx, by + Math.sin(bx * 0.008 + s2) * 9 + Math.sin(bx * 0.021) * 4);
      }
      c.lineTo(W, by + 22);
      c.lineTo(0, by + 22);
      c.closePath();
      c.fillStyle = 'rgba(0,0,0,' + rng.range(0.05, 0.11).toFixed(3) + ')';
      c.fill();
    }

    /* 坑道木支撑与岩层裂纹（先画，再被颗粒噪点覆盖，看起来才像埋在土里） */
    var props = 2;
    for (var pr = 0; pr < props; pr++) {
      var ox = rng.range(90, W - 90);
      var oy = rng.range(groundY + 100, H - 120);
      var oh = rng.range(80, 140);
      var ow = rng.range(80, 130);
      c.save();
      c.globalAlpha = 0.55;
      c.fillStyle = '#422c14';
      c.strokeStyle = 'rgba(0,0,0,.5)';
      c.lineWidth = 1;
      c.fillRect(ox - ow / 2, oy, 10, oh); c.strokeRect(ox - ow / 2, oy, 10, oh);
      c.fillRect(ox + ow / 2 - 10, oy, 10, oh); c.strokeRect(ox + ow / 2 - 10, oy, 10, oh);
      c.fillRect(ox - ow / 2 - 7, oy - 10, ow + 14, 11);
      c.strokeRect(ox - ow / 2 - 7, oy - 10, ow + 14, 11);
      c.globalAlpha = 0.18;
      c.fillStyle = '#c79a5c';
      c.fillRect(ox - ow / 2, oy, 3, oh);
      c.fillRect(ox + ow / 2 - 10, oy, 3, oh);
      c.fillRect(ox - ow / 2 - 7, oy - 10, ow + 14, 3);
      c.restore();
    }

    c.strokeStyle = 'rgba(0,0,0,.16)';
    for (var ck = 0; ck < 9; ck++) {
      var cx0 = rng.range(30, W - 30), cy0 = rng.range(groundY + 40, H - 40);
      c.lineWidth = rng.range(1.4, 3);
      c.beginPath();
      c.moveTo(cx0, cy0);
      var ang = rng.range(-0.5, 0.5);   // 基本水平，跟随岩层
      for (var seg = 0; seg < 3; seg++) {
        ang += rng.range(-0.5, 0.5);
        cx0 += Math.cos(ang) * rng.range(12, 24) * rng.sign();
        cy0 += Math.sin(ang) * rng.range(4, 12);
        c.lineTo(cx0, cy0);
      }
      c.stroke();
    }

    /* 颗粒噪点 */
    for (var n = 0; n < 2600; n++) {
      var nx = rng.range(0, W), ny = rng.range(groundY + 2, H);
      var lightSpec = rng.chance(0.42);
      c.fillStyle = lightSpec
        ? 'rgba(255,222,180,' + rng.range(0.03, 0.10).toFixed(3) + ')'
        : 'rgba(0,0,0,' + rng.range(0.04, 0.13).toFixed(3) + ')';
      c.fillRect(nx, ny, rng.range(1, 2.6), rng.range(1, 2.2));
    }

    /* 小碎石 */
    for (var p = 0; p < 60; p++) {
      var px = rng.range(10, W - 10), py = rng.range(groundY + 14, H - 6);
      var pr = rng.range(2, 5.5);
      c.beginPath();
      c.ellipse(px, py, pr, pr * rng.range(0.6, 0.9), rng.range(0, 3), 0, U.TAU);
      c.fillStyle = 'rgba(120,104,88,.35)';
      c.fill();
      c.beginPath();
      c.ellipse(px - pr * 0.25, py - pr * 0.3, pr * 0.45, pr * 0.3, 0, 0, U.TAU);
      c.fillStyle = 'rgba(255,240,220,.14)';
      c.fill();
    }

    /* 地表阴影过渡 + 四周压暗 */
    var edge = c.createLinearGradient(0, groundY, 0, groundY + 34);
    edge.addColorStop(0, 'rgba(0,0,0,.45)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = edge;
    c.fillRect(0, groundY, W, 34);

    var vig = c.createRadialGradient(W / 2, H * 0.52, H * 0.34, W / 2, H * 0.52, H * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.34)');
    c.fillStyle = vig;
    c.fillRect(0, 0, W, H);

    return cv;
  }

  /* ---------- 矿工与绞盘 ---------- */
  function miner(ctx, o) {
    var x = o.x, y = o.y, t = o.t;
    var crank = o.crank || 0;
    var strain = o.strain || 0;
    var scale = o.scale || 1;
    var bob = Math.sin(t * 2.2) * 1.2 + strain * Math.sin(t * 22) * 0.9;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    /* 落地阴影 */
    var sh = ctx.createRadialGradient(-2, 2, 2, -2, 2, 54);
    sh.addColorStop(0, 'rgba(0,0,0,.3)');
    sh.addColorStop(0.6, 'rgba(0,0,0,.14)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(-2, 2, 54, 9, 0, 0, U.TAU);
    ctx.fill();

    /* 支架（木头） */
    function beam(bx, by, w, h, rot) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      var g = ctx.createLinearGradient(0, -h, 0, 0);
      g.addColorStop(0, '#a9753f');
      g.addColorStop(0.5, '#8a5c2c');
      g.addColorStop(1, '#653f1c');
      ctx.fillStyle = g;
      U.roundRect(ctx, -w / 2, -h, w, h, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(50,28,8,.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    beam(-16, 0, 9, 44, U.deg(-9));
    beam(16, 0, 9, 44, U.deg(9));
    beam(0, -40, 46, 8, 0);

    /* 滑轮 */
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(crank);
    var wg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
    wg.addColorStop(0, '#f0f3f6');
    wg.addColorStop(0.55, '#a8b2bd');
    wg.addColorStop(1, '#5d6873');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#3d454d'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,68,78,.85)';
    ctx.lineWidth = 1.8;
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * 8, -Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#3d454d';
    ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, U.TAU); ctx.fill();
    ctx.restore();

    /* 矿工本体，站在支架左侧；吃力时向后倾 */
    ctx.save();
    ctx.translate(-46, bob);
    ctx.rotate(-strain * 0.14);

    /* 腿 + 靴 */
    ctx.fillStyle = '#2f4d7a';
    U.roundRect(ctx, -9, -22, 8, 22, 3); ctx.fill();
    U.roundRect(ctx, 2, -22, 8, 22, 3); ctx.fill();
    ctx.fillStyle = '#4a3220';
    U.roundRect(ctx, -12, -5, 13, 6, 2.5); ctx.fill();
    U.roundRect(ctx, 1, -5, 13, 6, 2.5); ctx.fill();

    /* 身体（背带工装） */
    var bg = ctx.createLinearGradient(-12, -48, 12, -20);
    bg.addColorStop(0, '#4b74ad');
    bg.addColorStop(1, '#2c4a78');
    ctx.fillStyle = bg;
    U.roundRect(ctx, -12, -48, 24, 28, 6); ctx.fill();
    ctx.fillStyle = '#d9534f';
    U.roundRect(ctx, -12, -48, 24, 8, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(-7, -44, 2.4, 22);
    ctx.fillRect(4.6, -44, 2.4, 22);

    /* 手臂（摇绞盘时上下摆） */
    var armSwing = Math.sin(crank * 1.6) * 5;
    ctx.strokeStyle = '#e8b98f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, -42);
    ctx.lineTo(30 - strain * 5, -34 + armSwing + strain * 5);
    ctx.stroke();
    ctx.strokeStyle = '#3a5f96';
    ctx.lineWidth = 6.6;
    ctx.beginPath();
    ctx.moveTo(8, -42);
    ctx.lineTo(18, -39 + armSwing * 0.5);
    ctx.stroke();

    /* 头 */
    ctx.fillStyle = '#f0c49a';
    ctx.beginPath();
    ctx.ellipse(0, -56, 10, 10.5, 0, 0, U.TAU);
    ctx.fill();
    /* 胡子 */
    ctx.fillStyle = '#d9d3cb';
    ctx.beginPath();
    ctx.ellipse(0, -50, 8, 5.5, 0, 0, Math.PI);
    ctx.fill();
    /* 眼（吃力时闭眼皱眉） */
    ctx.fillStyle = '#2b2b2b';
    if (strain > 0.45) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#2b2b2b';
      ctx.beginPath(); ctx.moveTo(-5.2, -58); ctx.lineTo(-1.6, -58); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.8, -58); ctx.lineTo(5.4, -58); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-3.4, -58, 1.5, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(3.6, -58, 1.5, 0, U.TAU); ctx.fill();
    }
    /* 安全帽 */
    var hg = ctx.createLinearGradient(0, -74, 0, -60);
    hg.addColorStop(0, '#ffd24a');
    hg.addColorStop(1, '#d9932a');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, -64, 11.5, 10, 0, Math.PI, U.TAU);
    ctx.fill();
    U.roundRect(ctx, -14, -65, 28, 4.5, 2.2);
    ctx.fill();
    /* 头灯 */
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath(); ctx.arc(0, -70, 3.4, 0, U.TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,190,.9)';
    ctx.beginPath(); ctx.arc(0, -70, 1.7, 0, U.TAU); ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /* ---------- 绳索（wobble：负重时的绷紧抖动） ---------- */
  function rope(ctx, x1, y1, x2, y2, wobble) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (wobble) {
      var dx = x2 - x1, dy = y2 - y1;
      var L = Math.sqrt(dx * dx + dy * dy) || 1;
      mx += (-dy / L) * wobble;
      my += (dx / L) * wobble;
    }
    function line(color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx, my, x2, y2);
      ctx.stroke();
    }
    ctx.save();
    ctx.lineCap = 'round';
    line('rgba(0,0,0,.35)', 5);
    line('#6b4a24', 3.4);
    line('rgba(214,178,120,.75)', 1.1);
    ctx.restore();
  }

  /* ---------- 钩爪（angle: 0 = 正下方） ---------- */
  function claw(ctx, x, y, angle, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle);   // 让局部 +Y 指向绳索延伸方向
    ctx.scale(1.18, 1.18);

    var metal = ctx.createLinearGradient(-10, -8, 10, 14);
    metal.addColorStop(0, '#eef2f6');
    metal.addColorStop(0.45, '#aeb8c3');
    metal.addColorStop(1, '#5e6874');

    /* 连接头 */
    ctx.fillStyle = metal;
    U.roundRect(ctx, -5, -10, 10, 12, 3); ctx.fill();
    ctx.strokeStyle = '#333b44'; ctx.lineWidth = 1.3; ctx.stroke();

    /* 两根爪指 */
    var spread = U.lerp(6, 17, open);
    var curl = U.lerp(0.85, 0.15, open);
    for (var s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.scale(s, 1);
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(spread * 0.9, 6, spread, 16);
      ctx.quadraticCurveTo(spread * (1 - curl * 0.55), 21, spread * (1 - curl), 23);
      ctx.lineTo(spread * (1 - curl) - 3.4, 20.5);
      ctx.quadraticCurveTo(spread * 0.62, 15, 1 - 4.6, 1);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = '#2f363e';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }

    /* 铆钉 */
    ctx.fillStyle = '#3a424b';
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, U.TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.arc(-0.8, -0.8, 0.9, 0, U.TAU); ctx.fill();

    ctx.restore();
  }

  /* ---------- 各类矿物 ---------- */
  function sparkle(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    U.star(ctx, x, y, r, r * 0.28, 4, 0.3);
    ctx.fill();
    ctx.restore();
  }

  function drawGold(ctx, it, t) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);

    U.blobPath(ctx, it.shape, r, 1.1, 0.85);
    var g = ctx.createLinearGradient(-r, -r, r * 0.8, r);
    g.addColorStop(0, '#fff0a8');
    g.addColorStop(0.3, '#ffc93c');
    g.addColorStop(0.68, '#e29411');
    g.addColorStop(1, '#9d6206');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.3, r * 0.08);
    ctx.strokeStyle = 'rgba(88,52,2,.8)';
    ctx.stroke();

    ctx.save();
    ctx.clip();
    var n = it.shape.length;
    for (var i = 0; i < n; i++) {
      var p1 = it.shape[i], p2 = it.shape[(i + 1) % n];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(p1.a) * r * p1.r * 1.1, Math.sin(p1.a) * r * p1.r * 0.85);
      ctx.lineTo(Math.cos(p2.a) * r * p2.r * 1.1, Math.sin(p2.a) * r * p2.r * 0.85);
      ctx.closePath();
      ctx.fillStyle = (i % 2) ? 'rgba(255,255,255,.16)' : 'rgba(110,62,0,.16)';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.34, r * 0.3, r * 0.16, -0.5, 0, U.TAU);
    ctx.fill();
    ctx.restore();

    ctx.rotate(-it.rot);
    var ph = (t * 1.6 + it.seed) % 3;
    if (ph < 0.6) sparkle(ctx, r * 0.34, -r * 0.4, r * 0.4, 1 - Math.abs(ph - 0.3) / 0.3);
    ctx.restore();
  }

  function rockBody(ctx, it) {
    var r = it.r;
    U.blobPath(ctx, it.shape, r, 1.14, 0.82);
    var g = ctx.createLinearGradient(-r, -r, r * 0.7, r);
    g.addColorStop(0, '#b6bcc4');
    g.addColorStop(0.45, '#8b929b');
    g.addColorStop(1, '#535a63');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.3, r * 0.07);
    ctx.strokeStyle = 'rgba(38,42,48,.85)';
    ctx.stroke();
    ctx.save();
    ctx.clip();
    for (var i = 0; i < it.speck.length; i++) {
      var s = it.speck[i];
      ctx.fillStyle = s.d ? 'rgba(40,44,50,.35)' : 'rgba(255,255,255,.22)';
      ctx.beginPath();
      ctx.ellipse(s.x * r, s.y * r, s.r * r, s.r * r * 0.75, s.a, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.32, r * 0.3, r * 0.14, -0.5, 0, U.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRock(ctx, it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    rockBody(ctx, it);
    ctx.restore();
  }

  /* 含钻岩石：岩石里露出一角钻石，炸开后可得 */
  function drawRockGem(ctx, it, t) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    rockBody(ctx, it);

    var gx = Math.cos(it.gemAngle) * r * it.gemDist;
    var gy = Math.sin(it.gemAngle) * r * it.gemDist * 0.8;
    var gr = r * 0.34;
    /* 凹陷坑 */
    ctx.fillStyle = 'rgba(20,24,30,.55)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, gr * 1.35, gr * 1.15, 0, 0, U.TAU);
    ctx.fill();
    /* 钻石断面 */
    var g = ctx.createLinearGradient(gx - gr, gy - gr, gx + gr, gy + gr);
    g.addColorStop(0, '#f2feff');
    g.addColorStop(0.45, '#7fe0ff');
    g.addColorStop(1, '#1a8dc4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(gx - gr, gy);
    ctx.lineTo(gx - gr * 0.4, gy - gr);
    ctx.lineTo(gx + gr * 0.7, gy - gr * 0.7);
    ctx.lineTo(gx + gr, gy + gr * 0.3);
    ctx.lineTo(gx, gy + gr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.rotate(-it.rot);
    sparkle(ctx, gx, gy - gr * 0.4, gr * (0.55 + 0.25 * Math.sin(t * 4 + it.seed)), 0.9);
    ctx.restore();
  }

  /* 宝箱 */
  function drawChest(ctx, it, t) {
    var r = it.r, w = r * 1.05, h = r * 0.62;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.15);

    /* 箱体 */
    var bg = ctx.createLinearGradient(0, -h * 0.1, 0, h * 1.4);
    bg.addColorStop(0, '#a4712f');
    bg.addColorStop(0.5, '#7d5220');
    bg.addColorStop(1, '#4e3211');
    ctx.fillStyle = bg;
    U.roundRect(ctx, -w, -h * 0.05, w * 2, h * 1.35, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(38,22,4,.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    /* 箱盖（拱形） */
    var lg = ctx.createLinearGradient(0, -h * 1.5, 0, -h * 0.05);
    lg.addColorStop(0, '#c78e42');
    lg.addColorStop(1, '#8a5c26');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.05);
    ctx.quadraticCurveTo(-w * 0.92, -h * 1.5, 0, -h * 1.5);
    ctx.quadraticCurveTo(w * 0.92, -h * 1.5, w, -h * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    /* 金属包边 */
    ctx.fillStyle = '#e8b93c';
    ctx.strokeStyle = 'rgba(120,80,4,.7)';
    ctx.lineWidth = 1;
    U.roundRect(ctx, -w, -h * 0.16, w * 2, h * 0.24, 2); ctx.fill(); ctx.stroke();
    U.roundRect(ctx, -w * 0.22, -h * 1.5, w * 0.44, h * 1.5, 2); ctx.fill(); ctx.stroke();

    /* 锁 */
    ctx.fillStyle = '#f2d15a';
    U.roundRect(ctx, -w * 0.16, -h * 0.24, w * 0.32, h * 0.5, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(90,58,0,.85)';
    ctx.stroke();
    ctx.fillStyle = '#5a3a00';
    ctx.beginPath();
    ctx.arc(0, h * 0.02, w * 0.06, 0, U.TAU);
    ctx.fill();

    var ph = (t * 1.4 + it.seed) % 2.4;
    if (ph < 0.7) sparkle(ctx, -w * 0.6, -h * 1.05, r * 0.36, 1 - Math.abs(ph - 0.35) / 0.35);
    ctx.restore();
  }

  function drawDiamond(ctx, it, t) {
    var r = it.r, w = r * 1.15;
    var top = -r * 0.68, gird = -r * 0.16, bot = r * 1.0;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.2);

    ctx.beginPath();
    ctx.moveTo(-w * 0.44, top);
    ctx.lineTo(w * 0.44, top);
    ctx.lineTo(w, gird);
    ctx.lineTo(0, bot);
    ctx.lineTo(-w, gird);
    ctx.closePath();
    var g = ctx.createLinearGradient(-w, top, w, bot);
    g.addColorStop(0, '#f2feff');
    g.addColorStop(0.35, '#8fe8ff');
    g.addColorStop(0.7, '#35b6e8');
    g.addColorStop(1, '#1179ad');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,60,90,.85)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    /* 刻面 */
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.44, top); ctx.lineTo(0, top); ctx.lineTo(-w * 0.2, gird); ctx.lineTo(-w, gird);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.moveTo(0, top); ctx.lineTo(w * 0.44, top); ctx.lineTo(w, gird); ctx.lineTo(w * 0.2, gird);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, gird); ctx.lineTo(w * 0.2, gird); ctx.lineTo(0, bot);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w, gird); ctx.lineTo(w, gird);
    ctx.moveTo(-w * 0.44, top); ctx.lineTo(-w * 0.2, gird);
    ctx.moveTo(w * 0.44, top); ctx.lineTo(w * 0.2, gird);
    ctx.moveTo(-w * 0.2, gird); ctx.lineTo(0, bot);
    ctx.moveTo(w * 0.2, gird); ctx.lineTo(0, bot);
    ctx.stroke();
    ctx.restore();

    ctx.rotate(-it.rot * 0.2);
    var ph = (t * 2.2 + it.seed) % 1.8;
    sparkle(ctx, -r * 0.3, top * 0.7, r * (0.5 + 0.25 * Math.sin(t * 5 + it.seed)), ph < 1.2 ? 0.95 : 0.4);
    ctx.restore();
  }

  function drawBag(ctx, it) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.35);
    var g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#c9a06a');
    g.addColorStop(0.5, '#a97c46');
    g.addColorStop(1, '#7a5528');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.5);
    ctx.bezierCurveTo(-r * 1.15, -r * 0.05, -r * 1.02, r * 1.0, 0, r * 1.0);
    ctx.bezierCurveTo(r * 1.02, r * 1.0, r * 1.15, -r * 0.05, r * 0.42, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,38,12,.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    /* 束口 */
    ctx.fillStyle = '#6b4a22';
    U.roundRect(ctx, -r * 0.5, -r * 0.72, r, r * 0.3, r * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#3f2a10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    /* 金币符号 */
    ctx.fillStyle = '#ffd455';
    ctx.font = 'bold ' + Math.round(r * 1.05) + 'px "Trebuchet MS", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, r * 0.28);
    ctx.strokeStyle = 'rgba(110,70,0,.65)';
    ctx.lineWidth = 1;
    ctx.strokeText('$', 0, r * 0.28);
    ctx.restore();
  }

  function drawTNT(ctx, it, t) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.2);
    /* 三根炸药棒 */
    for (var i = -1; i <= 1; i++) {
      var bx = i * r * 0.52;
      var g = ctx.createLinearGradient(bx - r * 0.26, 0, bx + r * 0.26, 0);
      g.addColorStop(0, '#e8564c');
      g.addColorStop(0.4, '#c8302a');
      g.addColorStop(1, '#8e1c18');
      ctx.fillStyle = g;
      U.roundRect(ctx, bx - r * 0.26, -r * 0.72, r * 0.52, r * 1.5, r * 0.14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,10,8,.8)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    /* 绑带 */
    ctx.fillStyle = '#e0b23c';
    U.roundRect(ctx, -r * 0.86, -r * 0.24, r * 1.72, r * 0.34, 2); ctx.fill();
    U.roundRect(ctx, -r * 0.86, r * 0.34, r * 1.72, r * 0.34, 2); ctx.fill();
    ctx.fillStyle = '#3a2a08';
    ctx.font = 'bold ' + Math.round(r * 0.42) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 0, r * 0.05);
    /* 导火索 + 火星 */
    ctx.strokeStyle = '#4a3a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.35, -r * 1.05, r * 0.15, -r * 1.35);
    ctx.stroke();
    var flick = 0.6 + 0.4 * Math.sin(t * 18 + it.seed);
    ctx.fillStyle = 'rgba(255,200,60,' + flick.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 1.4, r * 0.2 * flick + 1.5, 0, U.TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,' + (flick * 0.9).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 1.4, r * 0.1 * flick + 0.8, 0, U.TAU); ctx.fill();
    ctx.restore();
  }

  function drawBone(ctx, it) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    ctx.fillStyle = '#f2ece0';
    ctx.strokeStyle = '#9c9384';
    ctx.lineWidth = 1.4;
    U.roundRect(ctx, -r * 0.8, -r * 0.2, r * 1.6, r * 0.4, r * 0.2);
    ctx.fill(); ctx.stroke();
    var knobs = [[-r * 0.82, -r * 0.34], [-r * 0.82, r * 0.34], [r * 0.82, -r * 0.34], [r * 0.82, r * 0.34]];
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(knobs[i][0], knobs[i][1], r * 0.3, 0, U.TAU);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, -r * 0.1, r * 0.4, r * 0.07, 0, 0, U.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSkull(ctx, it) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.3);
    ctx.fillStyle = '#efe9dc';
    ctx.strokeStyle = '#9b9285';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.12, r * 0.82, r * 0.78, 0, 0, U.TAU);
    ctx.fill(); ctx.stroke();
    U.roundRect(ctx, -r * 0.42, r * 0.42, r * 0.84, r * 0.4, r * 0.14);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2c2a26';
    ctx.beginPath(); ctx.ellipse(-r * 0.33, -r * 0.18, r * 0.24, r * 0.28, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.33, -r * 0.18, r * 0.24, r * 0.28, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, r * 0.06); ctx.lineTo(-r * 0.14, r * 0.32); ctx.lineTo(r * 0.14, r * 0.32);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9b9285';
    ctx.lineWidth = 1;
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.24, r * 0.42);
      ctx.lineTo(i * r * 0.24, r * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMole(ctx, it, t) {
    var r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.scale(it.dir >= 0 ? 1 : -1, 1);
    var step = Math.sin(t * 9 + it.seed) * (it.grabbed ? 0 : 1);

    /* 尾巴 */
    ctx.strokeStyle = '#e0a0a8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.05);
    ctx.quadraticCurveTo(-r * 1.4, -r * 0.1 + step * 2, -r * 1.35, r * 0.4);
    ctx.stroke();

    /* 身体 */
    var g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#8d6b4f');
    g.addColorStop(1, '#5a412c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.66, 0, 0, U.TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,14,.8)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    /* 脚 */
    ctx.fillStyle = '#43301f';
    ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.6 + step, r * 0.2, r * 0.13, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.6 - step, r * 0.2, r * 0.13, 0, 0, U.TAU); ctx.fill();

    /* 头 + 吻部 */
    ctx.fillStyle = '#7c5c42';
    ctx.beginPath();
    ctx.ellipse(r * 0.72, -r * 0.1, r * 0.42, r * 0.38, 0, 0, U.TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,14,.7)';
    ctx.stroke();
    ctx.fillStyle = '#f0a3ae';
    ctx.beginPath(); ctx.arc(r * 1.1, -r * 0.05, r * 0.13, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#1c1a18';
    ctx.beginPath(); ctx.arc(r * 0.78, -r * 0.24, r * 0.08, 0, U.TAU); ctx.fill();
    /* 胡须 */
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.9;
    for (var w = -1; w <= 1; w++) {
      ctx.beginPath();
      ctx.moveTo(r * 1.05, -r * 0.02);
      ctx.lineTo(r * 1.5, -r * 0.02 + w * r * 0.22);
      ctx.stroke();
    }
    /* 抱着的小金块 */
    ctx.save();
    ctx.translate(r * 0.1, r * 0.18);
    ctx.fillStyle = '#ffc93c';
    ctx.strokeStyle = 'rgba(90,54,2,.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.16); ctx.lineTo(-r * 0.2, -r * 0.2);
    ctx.lineTo(r * 0.24, -r * 0.16); ctx.lineTo(r * 0.3, r * 0.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  var DRAW = {
    gold: drawGold,
    rock: drawRock,
    rockgem: drawRockGem,
    chest: drawChest,
    diamond: drawDiamond,
    bag: drawBag,
    tnt: drawTNT,
    bone: drawBone,
    skull: drawSkull,
    mole: drawMole
  };

  function item(ctx, it, t) {
    var f = DRAW[it.type.art];
    if (!f) return;
    /* 埋在土里的投影 */
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(it.x + 3, it.y + it.r * 0.62, it.r * 0.9, it.r * 0.3, 0, 0, U.TAU);
    ctx.fill();
    ctx.restore();
    f(ctx, it, t);
  }

  GM.Sprites = {
    background: background,
    miner: miner,
    rope: rope,
    claw: claw,
    item: item
  };
})(window.GM);
