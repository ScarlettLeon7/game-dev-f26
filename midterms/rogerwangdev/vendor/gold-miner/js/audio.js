/* 程序化音效：全部用 WebAudio 实时合成，项目不含任何音频文件 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var ctx = null;
  var master = null;
  var musicBus = null;
  var muted = GM.Utils.load('gm_muted', false);
  var noiseBuf = null;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function getNoise() {
    if (!noiseBuf) {
      var len = Math.floor(ctx.sampleRate * 1.2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  /* 单个振荡器音符 */
  function tone(o) {
    if (!ensure() || muted) return;
    var t0 = ctx.currentTime + (o.delay || 0);
    var dur = o.dur || 0.15;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    var vol = o.vol === undefined ? 0.18 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* 噪声（打击、爆炸、落地） */
  function noise(o) {
    if (!ensure() || muted) return;
    var t0 = ctx.currentTime + (o.delay || 0);
    var dur = o.dur || 0.2;
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.playbackRate.value = o.rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.cut || 1200, t0);
    if (o.cutTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.cutTo), t0 + dur);
    f.Q.value = o.q || 1;
    var g = ctx.createGain();
    var vol = o.vol === undefined ? 0.25 : o.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  var SFX = {
    launch: function () {
      tone({ type: 'sawtooth', freq: 760, to: 190, dur: 0.22, vol: 0.09 });
      noise({ dur: 0.16, cut: 2400, cutTo: 400, vol: 0.06 });
    },
    grab: function () {
      noise({ dur: 0.07, cut: 3800, q: 2, vol: 0.2 });
      tone({ type: 'square', freq: 200, to: 420, dur: 0.07, vol: 0.09 });
    },
    empty: function () {
      noise({ dur: 0.16, cut: 700, cutTo: 180, vol: 0.16 });
    },
    coin: function () {
      tone({ type: 'triangle', freq: 988, dur: 0.09, vol: 0.16 });
      tone({ type: 'triangle', freq: 1319, dur: 0.16, vol: 0.14, delay: 0.06 });
    },
    bigcoin: function () {
      [784, 988, 1319, 1568].forEach(function (f, i) {
        tone({ type: 'triangle', freq: f, dur: 0.16, vol: 0.14, delay: i * 0.055 });
      });
    },
    junk: function () {
      tone({ type: 'square', freq: 150, to: 90, dur: 0.14, vol: 0.1 });
    },
    boom: function () {
      noise({ dur: 0.55, cut: 1800, cutTo: 90, vol: 0.42, rate: 0.85 });
      tone({ type: 'sine', freq: 160, to: 32, dur: 0.5, vol: 0.32 });
      tone({ type: 'sawtooth', freq: 90, to: 25, dur: 0.35, vol: 0.14 });
    },
    fuse: function () {
      noise({ dur: 0.3, cut: 5200, q: 3, vol: 0.1, filter: 'highpass' });
    },
    tick: function () {
      tone({ type: 'square', freq: 1500, dur: 0.05, vol: 0.06 });
    },
    levelup: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        tone({ type: 'triangle', freq: f, dur: 0.28, vol: 0.14, delay: i * 0.09 });
      });
    },
    fail: function () {
      [440, 349, 277, 208].forEach(function (f, i) {
        tone({ type: 'sawtooth', freq: f, dur: 0.34, vol: 0.12, delay: i * 0.14 });
      });
    },
    click: function () {
      tone({ type: 'square', freq: 660, dur: 0.05, vol: 0.07 });
    },
    buy: function () {
      tone({ type: 'triangle', freq: 880, dur: 0.08, vol: 0.13 });
      tone({ type: 'triangle', freq: 1245, dur: 0.14, vol: 0.12, delay: 0.07 });
    },
    nope: function () {
      tone({ type: 'square', freq: 210, to: 150, dur: 0.16, vol: 0.1 });
    }
  };

  /* ---------- 程序化 BGM：A 小调五声循环，16 分音步进式序列器 ---------- */
  var MUSIC = {
    on: GM.Utils.load('gm_music', true),
    playing: false,
    step: 0,
    nextTime: 0,
    timer: null,
    leadIdx: 0
  };

  var BPM = 100;
  var BAR_ROOT = [0, 0, -4, -2];              // Am Am F G
  var BASS_STEPS = [0, 3, 6, 8, 11, 14];
  var LEAD_STEPS = [2, 7, 10, 13];
  var LEAD_NOTES = [12, 15, 19, 17, 22, 19, 15, 12, 10, 15, 17, 19];

  function nf(semi) { return 110 * Math.pow(2, semi / 12); }

  function schedTone(t0, freq, dur, type, vol) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function schedHat(t0) {
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.playbackRate.value = 1.8;
    var f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6800;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.035, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(f); f.connect(g); g.connect(musicBus);
    src.start(t0);
    src.stop(t0 + 0.07);
  }

  function playStep(s, t) {
    var bar = Math.floor(s / 16), st = s % 16;
    var root = BAR_ROOT[bar];

    if (BASS_STEPS.indexOf(st) >= 0) {
      schedTone(t, nf(root), st === 0 ? 0.3 : 0.2, 'triangle', 0.14);
    }
    if (st === 0) {
      /* 长音垫底 */
      schedTone(t, nf(root + 12), 1.5, 'sine', 0.045);
      schedTone(t, nf(root + 19), 1.5, 'sine', 0.03);
    }
    if (LEAD_STEPS.indexOf(st) >= 0) {
      var n = LEAD_NOTES[MUSIC.leadIdx % LEAD_NOTES.length];
      MUSIC.leadIdx++;
      schedTone(t, nf(root + n), 0.3, 'square', 0.032);
    }
    if (st % 4 === 2) schedHat(t);
  }

  function scheduler() {
    if (!ctx || !MUSIC.playing) return;
    var spb = 60 / BPM / 4;
    var horizon = ctx.currentTime + 0.2;
    var guard = 0;
    while (MUSIC.nextTime < horizon && guard++ < 64) {
      playStep(MUSIC.step, MUSIC.nextTime);
      MUSIC.step = (MUSIC.step + 1) % 64;
      MUSIC.nextTime += spb;
    }
  }

  function musicStart() {
    if (!MUSIC.on || MUSIC.playing) return;
    if (!ensure()) return;
    MUSIC.playing = true;
    MUSIC.step = 0;
    MUSIC.leadIdx = 0;
    MUSIC.nextTime = ctx.currentTime + 0.1;
    MUSIC.timer = window.setInterval(scheduler, 40);
    scheduler();
  }

  function musicStop() {
    MUSIC.playing = false;
    if (MUSIC.timer) { window.clearInterval(MUSIC.timer); MUSIC.timer = null; }
  }

  GM.Audio = {
    play: function (name) {
      var f = SFX[name];
      if (f) { try { f(); } catch (e) { /* 音频不可用时静默降级 */ } }
    },
    unlock: function () {
      ensure();
      if (MUSIC.on) { try { musicStart(); } catch (e) { /* 忽略 */ } }
    },
    isMuted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      GM.Utils.save('gm_muted', muted);
      if (!muted) GM.Audio.play('click');
      return muted;
    },
    isMusicOn: function () { return MUSIC.on; },
    toggleMusic: function () {
      MUSIC.on = !MUSIC.on;
      GM.Utils.save('gm_music', MUSIC.on);
      if (MUSIC.on) musicStart(); else musicStop();
      return MUSIC.on;
    },
    suspendMusic: musicStop,
    resumeMusic: function () { if (MUSIC.on) musicStart(); }
  };
})(window.GM);
