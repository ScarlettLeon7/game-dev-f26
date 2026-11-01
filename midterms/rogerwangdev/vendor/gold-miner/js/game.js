/* 游戏主逻辑：状态机、计时、金钱、爆炸、粒子、HUD */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  var INTRO_TIME = 1.9;   // 开场横幅时长（此期间不计时、不能放钩）

  /* ---------- 商店 ---------- */
  var SHOP = [
    { id: 'dynamite',    name: '炸药',       glyph: '炸', price: 300,  max: 5, kind: 'item', desc: '抓到重物时按 D 引爆，立刻空钩收回' },
    { id: 'drink',       name: '大力药水',   glyph: '药', price: 420,  max: 1, kind: 'buff', desc: '本关拉力 +50%' },
    { id: 'watch',       name: '怀表',       glyph: '时', price: 520,  max: 2, kind: 'buff', desc: '本关时间 +12 秒' },
    { id: 'clover',      name: '幸运草',     glyph: '运', price: 560,  max: 1, kind: 'buff', desc: '本关神秘袋价值翻倍' },
    { id: 'rockBook',    name: '石头图鉴',   glyph: '石', price: 640,  max: 1, kind: 'buff', desc: '本关石头价值 ×4' },
    { id: 'polish',      name: '钻石抛光剂', glyph: '钻', price: 1200, max: 3, kind: 'perm', desc: '永久提升钻石价值 +20%' },
    { id: 'strengthBook',name: '力量之书',   glyph: '力', price: 1600, max: 3, kind: 'perm', desc: '永久提升拉力 +25%' }
  ];

  function Game(canvas, W, H) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = W;
    this.H = H;
    this.dpr = 1;
    this.groundY = 150;
    this.minerScale = 1.25;

    this.world = {
      left: 0, right: W,
      top: this.groundY + 62,
      bottom: H - 26,
      pivot: { x: W / 2, y: this.groundY - 34 * this.minerScale },
      maxAngle: U.deg(76),
      maxLen: 760
    };

    this.diff = U.load('gm_diff', 'normal');
    this.best = U.load('gm_best_' + this.diff, 0);
    this.bestLevel = U.load('gm_bestLevel_' + this.diff, 0);
    this.t = 0;
    this.onStateChange = null;

    this.newRun();
    this.startLevel(1);
    this.state = 'menu';
  }

  Game.prototype.setDiff = function (key) {
    if (!GM.Level.DIFFS[key] || key === this.diff) return;
    this.diff = key;
    U.save('gm_diff', key);
    this.best = U.load('gm_best_' + key, 0);
    this.bestLevel = U.load('gm_bestLevel_' + key, 0);
  };

  Game.prototype.setState = function (s) {
    if (this.state === s) return;
    this.state = s;
    if (this.onStateChange) this.onStateChange(s);
  };

  Game.prototype.newRun = function () {
    this.seed = (Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0;
    this.money = 0;
    this.level = 1;
    this.dynamite = 0;
    this.perm = { strengthBook: 0, polish: 0 };
    this.pending = { drink: 0, clover: 0, rockBook: 0, watch: 0 };
    this.stats = { grabbed: 0, boom: 0, earned: 0, bestCombo: 0 };
  };

  Game.prototype.startLevel = function (n) {
    var cfg = GM.Level.config(n, this.diff);
    this.level = n;
    this.goal = cfg.goal;
    this.prevGoal = cfg.prevGoal;
    this.levelStartMoney = this.money;

    this.buff = {
      drink: this.pending.drink,
      clover: this.pending.clover > 0,
      rockBook: this.pending.rockBook > 0,
      time: this.pending.watch * 12
    };
    this.pending = { drink: 0, clover: 0, rockBook: 0, watch: 0 };

    this.timeLimit = cfg.time + this.buff.time;
    this.timeLeft = this.timeLimit;

    var rng = U.makeRng((this.seed + n * 104729) >>> 0);
    this.items = GM.Level.generate(n, this.world, rng);
    this.hook = new GM.Hook(this.world, U.deg(Math.min(112, 64 + n * 3.4)));

    this.particles = [];
    this.texts = [];
    this.motes = this.makeMotes(rng);
    this.bg = GM.Sprites.background(this.W, this.H, this.groundY, n);
    this.shake = 0;
    this.crank = 0;
    this.endTimer = -1;
    this.lastTick = 99;
    this.levelEarned = 0;
    this.combo = 0;
    this.comboFlash = 0;
    this.intro = INTRO_TIME;
    this.setState('playing');
  };

  /* 环境浮尘 */
  Game.prototype.makeMotes = function (rng) {
    var out = [];
    for (var i = 0; i < 48; i++) {
      out.push({
        x: rng.range(0, this.W),
        y: rng.range(this.groundY, this.H),
        r: rng.range(0.6, 2.2),
        vy: rng.range(-9, -2),
        a: rng.range(0.05, 0.2),
        ph: rng.range(0, 6.5)
      });
    }
    return out;
  };

  Game.prototype.comboMul = function () {
    return this.combo >= 2 ? 1 + Math.min(this.combo - 1, 5) * 0.1 : 1;
  };

  Game.prototype.grade = function () {
    var need = Math.max(1, this.goal - this.prevGoal);
    var ratio = this.levelEarned / need;
    return ratio >= 2.2 ? 'S' : ratio >= 1.7 ? 'A' : ratio >= 1.25 ? 'B' : 'C';
  };

  Game.prototype.strength = function () {
    return 1 + 0.25 * this.perm.strengthBook + 0.5 * this.buff.drink;
  };

  Game.prototype.itemValue = function (it) {
    var v = it.value, cat = it.type.cat;
    if (cat === 'rock' && this.buff.rockBook) v *= 4;
    if (cat === 'diamond') v *= 1 + 0.2 * this.perm.polish;
    if (cat === 'bag' && this.buff.clover) v *= 2;
    return Math.round(v);
  };

  /* ---------- 输入动作 ---------- */
  Game.prototype.launch = function () {
    if (this.state !== 'playing' || this.intro > 0) return;
    if (this.hook.launch()) GM.Audio.play('launch');
  };

  Game.prototype.useDynamite = function () {
    if (this.state !== 'playing') return;
    var it = this.hook.grabbed;
    if (!it || this.dynamite <= 0) { GM.Audio.play('nope'); return; }
    this.dynamite--;
    this.stats.boom++;
    this.hook.dropLoad();
    this.hook.state = 'retract';
    it.dead = true;
    this.blast(it.x, it.y, 0, false);
    this.float(it.x, it.y - 20, '轰！', '#ff9a3c', 26);
    if (it.gem) this.spawnGem(it);
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') this.setState('paused');
    else if (this.state === 'paused') this.setState('playing');
  };

  /* ---------- 钩爪回调 ---------- */
  Game.prototype.onGrab = function (it) {
    this.stats.grabbed++;
    if (it.kind === 'tnt') {
      it.dead = true;
      this.combo = 0;
      GM.Audio.play('fuse');
      this.blast(it.x, it.y, 108, true);
      this.float(it.x, it.y - 26, '炸药！', '#ff6a4a', 24);
      return false;
    }
    return true;
  };

  Game.prototype.onDeliver = function (it) {
    var base = this.itemValue(it);
    it.dead = true;

    /* 连击：连续抓到 $50 以上的矿藏才累计 */
    if (base >= 50) {
      this.combo++;
      if (this.combo > this.stats.bestCombo) this.stats.bestCombo = this.combo;
      if (this.combo >= 2) this.comboFlash = 0.6;
    } else {
      this.combo = 0;
    }
    var mul = this.comboMul();
    var v = Math.round(base * mul);

    this.money += v;
    this.levelEarned += v;
    this.stats.earned += v;

    var px = this.world.pivot.x, py = this.world.pivot.y + 34;
    var color = it.type.cat === 'diamond' ? '#7fe3ff'
      : it.type.cat === 'gold' ? '#ffd75e'
        : v >= 200 ? '#ffd75e' : '#e8e2d4';
    var label = it.type.name + '  +' + U.money(v) + (mul > 1 ? '  ×' + mul.toFixed(1) : '');
    this.float(px, py, label, color, v >= 250 ? 26 : 20);
    this.coins(px, py, v);
    GM.Audio.play(v >= 400 ? 'bigcoin' : v >= 40 ? 'coin' : 'junk');
  };

  /* 含钻岩石被炸开 → 原地生成钻石 */
  Game.prototype.spawnGem = function (rock) {
    var rng = U.makeRng(((rock.seed * 99991) | 0) >>> 0);
    var d = GM.Items.create('diamond', rng);
    d.x = d.homeX = rock.homeX === undefined ? rock.x : rock.homeX;
    d.y = d.homeY = rock.homeY === undefined ? rock.y : rock.homeY;
    this.items.push(d);
    this.float(d.x, d.y - 32, '钻石现身！', '#7fe3ff', 20);
  };

  /* ---------- 效果 ---------- */
  Game.prototype.float = function (x, y, text, color, size) {
    this.texts.push({ x: x, y: y, text: text, color: color, size: size || 20, life: 1.5, max: 1.5 });
  };

  Game.prototype.puff = function (x, y) {
    this.combo = 0;
    for (var i = 0; i < 7; i++) {
      this.particles.push({
        x: x, y: y, vx: U.lerp(-60, 60, Math.random()), vy: U.lerp(-70, -10, Math.random()),
        g: 90, life: 0.5, max: 0.5, size: 3 + Math.random() * 5,
        color: 'rgba(190,166,138,', shape: 'smoke'
      });
    }
    this.shake = Math.max(this.shake, 3);
  };

  Game.prototype.coins = function (x, y, v) {
    var n = U.clamp(Math.round(v / 45) + 4, 5, 22);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + U.lerp(-1.1, 1.1, Math.random());
      var sp = 90 + Math.random() * 190;
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 620, life: 0.75, max: 0.75, size: 2 + Math.random() * 3.4,
        color: Math.random() < 0.75 ? 'rgba(255,214,86,' : 'rgba(255,255,255,', shape: 'circle'
      });
    }
  };

  /* 爆炸：radius > 0 时摧毁范围内矿藏 */
  Game.prototype.blast = function (x, y, radius, destroy) {
    GM.Audio.play('boom');
    this.shake = 22;
    var i, a, sp;
    for (i = 0; i < 34; i++) {
      a = Math.random() * U.TAU; sp = 60 + Math.random() * 340;
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        g: 420, life: 0.4 + Math.random() * 0.4, max: 0.8, size: 3 + Math.random() * 7,
        color: Math.random() < 0.5 ? 'rgba(255,196,60,' : 'rgba(255,110,40,', shape: 'circle'
      });
    }
    for (i = 0; i < 20; i++) {
      a = Math.random() * U.TAU; sp = 20 + Math.random() * 130;
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        g: -20, life: 0.7 + Math.random() * 0.6, max: 1.3, size: 8 + Math.random() * 14,
        color: 'rgba(96,86,76,', shape: 'smoke'
      });
    }
    for (i = 0; i < 16; i++) {
      a = Math.random() * U.TAU; sp = 90 + Math.random() * 260;
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
        g: 700, life: 0.9, max: 0.9, size: 2 + Math.random() * 4,
        color: 'rgba(122,96,66,', shape: 'square', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14
      });
    }

    if (!destroy || radius <= 0) return;
    var gems = [];
    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead) continue;
      if (U.dist(x, y, it.x, it.y) < radius + it.r * 0.6) {
        it.dead = true;
        if (this.hook.grabbed === it) this.hook.dropLoad();
        this.debris(it);
        if (it.gem) gems.push(it);
      }
    }
    for (i = 0; i < gems.length; i++) this.spawnGem(gems[i]);
  };

  Game.prototype.debris = function (it) {
    var isGold = it.type.cat === 'gold' || it.type.cat === 'diamond';
    for (var i = 0; i < 9; i++) {
      var a = Math.random() * U.TAU, sp = 50 + Math.random() * 200;
      this.particles.push({
        x: it.x, y: it.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
        g: 660, life: 0.7, max: 0.7, size: 2 + Math.random() * 4,
        color: isGold ? 'rgba(255,205,70,' : 'rgba(150,152,158,', shape: 'square',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16
      });
    }
  };

  /* ---------- 每帧更新 ---------- */
  Game.prototype.update = function (dt) {
    this.t += dt;
    var live = this.state === 'playing';
    var demo = this.state === 'menu';

    if (live || demo) {
      this.hook.update(dt, this);
      this.updateMoles(dt);

      /* 绞盘转动 */
      var st = this.hook.state;
      if (st === 'extend') this.crank += dt * 9;
      else if (st === 'retract') this.crank -= dt * (this.hook.retractSpeed / 90 + 1);
      else this.crank += dt * 0.5;
    }

    this.updateParticles(dt);
    this.updateMotes(dt);
    this.shake *= Math.pow(0.0015, dt);
    if (this.comboFlash > 0) this.comboFlash -= dt;

    if (!live) return;

    if (this.intro > 0) {
      this.intro -= dt;
      return;
    }

    this.timeLeft -= dt;
    var sec = Math.ceil(this.timeLeft);
    if (sec <= 10 && sec >= 1 && sec !== this.lastTick) {
      this.lastTick = sec;
      GM.Audio.play('tick');
    }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.endLevel(); return; }

    /* 矿藏被挖空时提前结束 */
    if (this.endTimer < 0 && this.hook.state === 'swing' && this.remaining() === 0) this.endTimer = 1.1;
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.endLevel();
    }
  };

  Game.prototype.remaining = function () {
    var n = 0;
    for (var i = 0; i < this.items.length; i++) if (!this.items[i].dead) n++;
    return n;
  };

  Game.prototype.updateMoles = function (dt) {
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.kind !== 'mole' || it.dead || it.grabbed) continue;
      it.x += it.dir * it.speed * dt;
      if (it.x <= it.minX) { it.x = it.minX; it.dir = 1; }
      if (it.x >= it.maxX) { it.x = it.maxX; it.dir = -1; }
    }
  };

  Game.prototype.updateMotes = function (dt) {
    if (!this.motes) return;
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      m.y += m.vy * dt;
      m.x += Math.sin(this.t * 0.7 + m.ph) * 6 * dt;
      if (m.y < this.groundY - 10) {
        m.y = this.H + 6;
        m.x = Math.random() * this.W;
      }
    }
  };

  Game.prototype.updateParticles = function (dt) {
    var i, p;
    for (i = this.particles.length - 1; i >= 0; i--) {
      p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.shape === 'smoke') p.size += dt * 16;
    }
    for (i = this.texts.length - 1; i >= 0; i--) {
      var tx = this.texts[i];
      tx.life -= dt;
      tx.y -= dt * 26;
      if (tx.life <= 0) this.texts.splice(i, 1);
    }
  };

  Game.prototype.endLevel = function () {
    var win = this.money >= this.goal;
    if (this.money > this.best) { this.best = this.money; U.save('gm_best_' + this.diff, this.best); }
    if (win && this.level > this.bestLevel) {
      this.bestLevel = this.level;
      U.save('gm_bestLevel_' + this.diff, this.level);
    }

    if (win) {
      GM.Audio.play('levelup');
      this.setState(this.level === GM.Level.MAX_LEVEL ? 'win' : 'levelclear');
    } else {
      GM.Audio.play('fail');
      this.setState('gameover');
    }
  };

  Game.prototype.nextLevel = function () { this.startLevel(this.level + 1); };

  /* ---------- 商店 ---------- */
  Game.prototype.shopList = function () {
    var self = this;
    return SHOP.map(function (s) {
      var owned = s.kind === 'perm' ? self.perm[s.id]
        : s.id === 'dynamite' ? self.dynamite
          : self.pending[s.id];
      return {
        id: s.id, name: s.name, glyph: s.glyph, price: s.price, desc: s.desc,
        owned: owned, max: s.max,
        full: owned >= s.max,
        affordable: self.money >= s.price
      };
    });
  };

  Game.prototype.buy = function (id) {
    var s = null;
    for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === id) s = SHOP[i];
    if (!s) return false;
    var owned = s.kind === 'perm' ? this.perm[s.id] : (s.id === 'dynamite' ? this.dynamite : this.pending[s.id]);
    if (owned >= s.max || this.money < s.price) { GM.Audio.play('nope'); return false; }

    this.money -= s.price;
    if (s.kind === 'perm') this.perm[s.id]++;
    else if (s.id === 'dynamite') this.dynamite++;
    else this.pending[s.id]++;
    GM.Audio.play('buy');
    return true;
  };

  /* ---------- 渲染 ---------- */
  Game.prototype.render = function () {
    var ctx = this.ctx, i;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);

    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    ctx.drawImage(this.bg, 0, 0);

    /* 环境浮尘 */
    if (this.motes) {
      for (i = 0; i < this.motes.length; i++) {
        var m = this.motes[i];
        ctx.fillStyle = 'rgba(255,236,200,' + m.a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, U.TAU);
        ctx.fill();
      }
    }

    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead || it.grabbed) continue;
      GM.Sprites.item(ctx, it, this.t);
    }
    if (this.hook.grabbed) GM.Sprites.item(ctx, this.hook.grabbed, this.t);
    this.hook.render(ctx);
    GM.Sprites.miner(ctx, {
      x: this.W / 2, y: this.groundY, t: this.t,
      crank: this.crank, strain: this.hook.strain, scale: this.minerScale
    });

    /* 粒子 */
    for (i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var a = U.clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color + (p.shape === 'smoke' ? (a * 0.45).toFixed(3) : a.toFixed(3)) + ')';
      if (p.shape === 'square') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, U.TAU);
        ctx.fill();
      }
    }

    /* 飘字 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < this.texts.length; i++) {
      var tx = this.texts[i];
      var al = U.clamp(tx.life / tx.max * 1.6, 0, 1);
      ctx.globalAlpha = al;
      ctx.font = 'bold ' + tx.size + 'px ' + FONT;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.renderHud(ctx);
  };

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(10,14,22,.55)';
    U.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function bar(ctx, x, y, w, h, p, c1, c2) {
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    U.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (p > 0.001) {
      var g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      U.roundRect(ctx, x, y, Math.max(h, w * p), h, h / 2);
      ctx.fill();
    }
  }

  Game.prototype.renderHud = function (ctx) {
    var W = this.W;
    ctx.save();
    ctx.textBaseline = 'middle';

    /* 资产 / 目标 */
    panel(ctx, 14, 12, 272, 64);
    ctx.textAlign = 'left';
    ctx.font = '600 12px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('资产', 28, 30);
    ctx.font = 'bold 26px ' + FONT;
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(U.money(this.money), 60, 30);
    ctx.font = '600 12px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillText('目标 ' + U.money(this.goal), 28, 58);
    var span = Math.max(1, this.goal - this.prevGoal);
    var prog = U.clamp((this.money - this.prevGoal) / span, 0, 1);
    bar(ctx, 148, 53, 122, 9, prog, '#ffb02e', '#ffe98a');

    /* 关卡 */
    panel(ctx, W / 2 - 56, 12, 112, 38);
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillStyle = '#eaf2ff';
    ctx.fillText('第 ' + this.level + ' 关', W / 2, 32);

    /* 时间 */
    var low = this.timeLeft <= 10;
    panel(ctx, W - 14 - 200, 12, 200, 64);
    ctx.textAlign = 'left';
    ctx.font = '600 12px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('时间', W - 186, 30);
    ctx.font = 'bold 26px ' + FONT;
    ctx.fillStyle = low && Math.floor(this.t * 4) % 2 ? '#ff6a5a' : '#eaf2ff';
    ctx.fillText(U.timeText(this.timeLeft), W - 150, 30);
    bar(ctx, W - 186, 53, 158, 9, U.clamp(this.timeLeft / this.timeLimit, 0, 1),
      low ? '#c0392b' : '#3b9dd6', low ? '#ff6a5a' : '#8fe3ff');

    /* 左侧状态栏：目标达成 / 连击（避开中间的矿工） */
    var leftY = 84;
    if (this.money >= this.goal && this.state === 'playing') {
      panel(ctx, 14, leftY, 152, 30);
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px ' + FONT;
      var pulse = 0.68 + 0.32 * Math.sin(this.t * 5);
      ctx.fillStyle = 'rgba(126,232,140,' + pulse.toFixed(2) + ')';
      ctx.fillText('✓ 目标已达成', 28, leftY + 16);
      leftY += 36;
    }

    if (this.combo >= 2) {
      var pop = this.comboFlash > 0 ? 1 + this.comboFlash * 0.35 : 1;
      ctx.save();
      ctx.translate(90, leftY + 16);
      ctx.scale(pop, pop);
      ctx.translate(-90, -(leftY + 16));
      panel(ctx, 14, leftY, 152, 32);
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillStyle = '#ff9a3c';
      ctx.fillText('连击 ×' + this.combo, 28, leftY + 17);
      ctx.font = 'bold 13px ' + FONT;
      ctx.fillStyle = '#8ce89a';
      ctx.fillText('收益 +' + Math.round((this.comboMul() - 1) * 100) + '%', 96, leftY + 17);
      ctx.restore();
    }

    /* 道具槽 */
    var chips = [];
    if (this.dynamite > 0) chips.push({ g: '炸', n: this.dynamite, c: '#e8564c', k: 'D 引爆' });
    if (this.perm.strengthBook > 0) chips.push({ g: '力', n: this.perm.strengthBook, c: '#5b8dd6' });
    if (this.perm.polish > 0) chips.push({ g: '钻', n: this.perm.polish, c: '#35b6e8' });
    if (this.buff.drink > 0) chips.push({ g: '药', n: 0, c: '#c86ad6' });
    if (this.buff.clover) chips.push({ g: '运', n: 0, c: '#5cba62' });
    if (this.buff.rockBook) chips.push({ g: '石', n: 0, c: '#9b8f80' });

    var cx = 26, cy = this.H - 28;
    for (var i = 0; i < chips.length; i++) {
      var c = chips[i];
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, U.TAU);
      ctx.fillStyle = 'rgba(8,12,18,.72)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.c;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillStyle = '#fff';
      ctx.fillText(c.g, cx, cy + 1);
      if (c.n > 1 || (c.n === 1 && c.k)) {
        ctx.beginPath();
        ctx.arc(cx + 12, cy - 12, 8, 0, U.TAU);
        ctx.fillStyle = c.c;
        ctx.fill();
        ctx.font = 'bold 11px ' + FONT;
        ctx.fillStyle = '#fff';
        ctx.fillText(String(c.n), cx + 12, cy - 11);
      }
      if (c.k) {
        ctx.textAlign = 'left';
        ctx.font = '600 11px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.fillText(c.k, cx + 20, cy + 12);
        cx += 46;
      }
      cx += 38;
    }

    /* 剩余矿藏 */
    ctx.textAlign = 'right';
    ctx.font = '600 12px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillText('剩余矿藏 ' + this.remaining(), W - 22, this.H - 24);

    /* 开场横幅 */
    if (this.intro > 0 && this.state === 'playing') {
      var elapsed = INTRO_TIME - this.intro;
      var appear = U.clamp(elapsed / 0.26, 0, 1);
      var fade = U.clamp(this.intro / 0.45, 0, 1);
      var al = appear * fade;
      var cy = this.H * 0.42;

      ctx.globalAlpha = al;
      var bandG = ctx.createLinearGradient(0, cy - 62, 0, cy + 62);
      bandG.addColorStop(0, 'rgba(8,10,16,0)');
      bandG.addColorStop(0.5, 'rgba(8,10,16,.78)');
      bandG.addColorStop(1, 'rgba(8,10,16,0)');
      ctx.fillStyle = bandG;
      ctx.fillRect(0, cy - 62, W, 124);

      ctx.save();
      ctx.translate(W / 2, cy);
      ctx.scale(0.86 + appear * 0.14, 0.86 + appear * 0.14);
      ctx.textAlign = 'center';
      ctx.font = 'bold 52px ' + FONT;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText('第 ' + this.level + ' 关', 0, -8);
      var tg = ctx.createLinearGradient(0, -34, 0, 14);
      tg.addColorStop(0, '#fff3b0');
      tg.addColorStop(0.55, '#ffcf45');
      tg.addColorStop(1, '#d68f14');
      ctx.fillStyle = tg;
      ctx.fillText('第 ' + this.level + ' 关', 0, -8);

      ctx.font = 'bold 17px ' + FONT;
      ctx.fillStyle = 'rgba(240,236,226,.9)';
      ctx.fillText('目标 ' + U.money(this.goal) + '　·　' +
        GM.Level.diffOf(this.diff).name + '　·　' + this.remaining() + ' 处矿藏', 0, 30);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };

  GM.Game = Game;
  GM.SHOP = SHOP;
})(window.GM);
