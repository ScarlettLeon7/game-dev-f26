/* 钩爪核心物理：钟摆摆动 → 直线伸出 → 按重量回收 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;

  var EXTEND_SPEED = 680;   // 伸出速度 px/s
  var EMPTY_RETRACT = 1020; // 空钩回收 px/s
  var PULL_BASE = 900;      // 负重回收基准：speed = PULL_BASE * 力量 / 重量
  var PULL_MIN = 48;
  var PULL_MAX = 620;
  var CLAW_R = 15;
  var MIN_LEN = 76;         // 待机时绳长：让钩爪悬在地面下方，绳索可见

  function Hook(world, angSpeed) {
    this.world = world;
    this.pivot = world.pivot;
    this.maxAngle = world.maxAngle;
    this.maxLen = world.maxLen;
    this.angSpeed = angSpeed;

    this.len = MIN_LEN;
    this.angle = 0;
    this.dir = 1;
    this.state = 'swing';   // swing | extend | hold | retract
    this.grabbed = null;
    this.open = 1;
    this.openTarget = 1;
    this.retractSpeed = EMPTY_RETRACT;
    this.hold = 0;
    this.clawR = CLAW_R;
    this.strain = 0;   // 0~1，越重越大，用于绳索绩紧与矿工发力姿态
    this.wob = 0;
  }

  Hook.prototype.tipAt = function (len) {
    return {
      x: this.pivot.x + Math.sin(this.angle) * len,
      y: this.pivot.y + Math.cos(this.angle) * len
    };
  };

  Hook.prototype.tip = function () { return this.tipAt(this.len); };

  Hook.prototype.canLaunch = function () { return this.state === 'swing'; };

  Hook.prototype.launch = function () {
    if (!this.canLaunch()) return false;
    this.state = 'extend';
    this.openTarget = 1;
    return true;
  };

  Hook.prototype.pullSpeedFor = function (item, strength) {
    return U.clamp(PULL_BASE * strength / item.weight, PULL_MIN, PULL_MAX);
  };

  /* 抛弃当前抓到的东西（引爆炸药后调用） */
  Hook.prototype.dropLoad = function () {
    this.grabbed = null;
    this.openTarget = 1;
    this.retractSpeed = EMPTY_RETRACT;
  };

  Hook.prototype.beginRetract = function (item, strength) {
    this.grabbed = item || null;
    this.openTarget = item ? 0 : 1;
    this.retractSpeed = item ? this.pullSpeedFor(item, strength) : EMPTY_RETRACT;
    this.hold = item ? 0.1 : 0;
    this.state = 'hold';
  };

  Hook.prototype.update = function (dt, game) {
    /* 爪指开合动画 */
    this.open += (this.openTarget - this.open) * Math.min(1, dt * 16);

    /* 负重张力：回收越慢 = 越吃力 */
    var wantStrain = 0;
    if (this.grabbed && (this.state === 'retract' || this.state === 'hold')) {
      wantStrain = U.clamp(1 - (this.retractSpeed - PULL_MIN) / (PULL_MAX - PULL_MIN), 0, 1);
    }
    this.strain += (wantStrain - this.strain) * Math.min(1, dt * 6);
    this.wob += dt * (8 + this.strain * 26);

    if (this.state === 'swing') {
      this.angle += this.dir * this.angSpeed * dt;
      if (this.angle > this.maxAngle) { this.angle = this.maxAngle; this.dir = -1; }
      if (this.angle < -this.maxAngle) { this.angle = -this.maxAngle; this.dir = 1; }
      this.len = MIN_LEN;
      return;
    }

    if (this.state === 'hold') {
      this.hold -= dt;
      if (this.hold <= 0) this.state = 'retract';
      this.syncLoad();
      return;
    }

    if (this.state === 'extend') {
      var remain = EXTEND_SPEED * dt;
      while (remain > 0) {
        var step = Math.min(12, remain);
        remain -= step;
        this.len += step;

        var tip = this.tip();
        var hit = this.pickAt(tip, game.items);
        if (hit) {
          GM.Audio.play('grab');
          var carry = game.onGrab(hit, tip);
          if (carry) {
            hit.grabbed = true;
            this.beginRetract(hit, game.strength());
          } else {
            this.beginRetract(null, 1);
          }
          return;
        }

        var w = this.world;
        var outX = tip.x < w.left + 6 || tip.x > w.right - 6;
        var outY = tip.y > w.bottom - 2;
        if (this.len >= this.maxLen || outX || outY) {
          GM.Audio.play('empty');
          game.puff(tip.x, tip.y);
          this.beginRetract(null, 1);
          return;
        }
      }
      this.syncLoad();
      return;
    }

    if (this.state === 'retract') {
      this.len -= this.retractSpeed * dt;
      if (this.len <= MIN_LEN) {
        this.len = MIN_LEN;
        var load = this.grabbed;
        this.grabbed = null;
        this.state = 'swing';
        this.openTarget = 1;
        if (load) game.onDeliver(load);
      }
      this.syncLoad();
    }
  };

  /* 让抓住的物品跟随爪子（偏移量让爪指能明确扣在物品顶部） */
  Hook.prototype.syncLoad = function () {
    var it = this.grabbed;
    if (!it) return;
    var d = this.len + this.clawR * 0.55 + it.r * 0.82;
    it.x = this.pivot.x + Math.sin(this.angle) * d;
    it.y = this.pivot.y + Math.cos(this.angle) * d;
  };

  /* 爪尖圆 vs 物品圆 */
  Hook.prototype.pickAt = function (tip, items) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead || it.grabbed) continue;
      if (U.dist(tip.x, tip.y, it.x, it.y) < this.clawR + it.r * 0.92) return it;
    }
    return null;
  };

  Hook.prototype.render = function (ctx) {
    var tip = this.tip();
    var wobble = this.strain > 0.05 ? Math.sin(this.wob) * this.strain * 4.5 : 0;
    GM.Sprites.rope(ctx, this.pivot.x, this.pivot.y, tip.x, tip.y, wobble);
    GM.Sprites.claw(ctx, tip.x, tip.y, this.angle, this.open);
  };

  GM.Hook = Hook;
  GM.Hook.MIN_LEN = MIN_LEN;
})(window.GM);
