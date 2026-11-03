/* 入口：画布自适应、主循环、键鼠触摸输入 */
(function () {
  'use strict';

  var LW = 960, LH = 640;
  var canvas = document.getElementById('game');
  var stage = document.getElementById('stage');
  var elDyn = document.getElementById('btn-dyn');
  var game = new GM.Game(canvas, LW, LH);

  GM.UI.init(game);

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== LW * dpr) {
      canvas.width = LW * dpr;
      canvas.height = LH * dpr;
    }
    game.dpr = dpr;

    var availW = window.innerWidth - 28;
    var availH = window.innerHeight - 84;
    var scale = Math.min(availW / LW, availH / LH);
    scale = Math.max(0.3, Math.min(scale, 1.4));
    stage.style.width = Math.round(LW * scale) + 'px';
    stage.style.height = Math.round(LH * scale) + 'px';
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  /* 点击 / 触摸放钩 */
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    GM.Audio.unlock();
    game.launch();
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowDown') {
      e.preventDefault();
      GM.Audio.unlock();
      if (game.state === 'playing') game.launch();
      else GM.UI.primary();
    } else if (k === 'd' || k === 'D') {
      game.useDynamite();
    } else if (k === 'p' || k === 'P' || k === 'Escape') {
      e.preventDefault();
      game.togglePause();
    } else if (k === 'm' || k === 'M') {
      GM.UI.toggleMute();
    } else if (k === 'n' || k === 'N') {
      GM.Audio.unlock();
      GM.Audio.toggleMusic();
      GM.UI.syncAudioButtons();
    } else if (k === 'Enter') {
      e.preventDefault();
      GM.UI.primary();
    }
  });

  /* 炸药按钮（触屏与鼠标通用）：独立于渲染帧定时同步 */
  var dynKey = '';
  function syncDyn() {
    var show = game.state === 'playing' && game.dynamite > 0;
    var key = show ? game.dynamite + '|' + (game.hook.grabbed ? 1 : 0) : '';
    if (key === dynKey) return;
    dynKey = key;
    if (show) {
      elDyn.classList.remove('hidden');
      elDyn.textContent = '引爆 ×' + game.dynamite;
      if (game.hook.grabbed) elDyn.classList.add('ready');
      else elDyn.classList.remove('ready');
    } else {
      elDyn.classList.add('hidden');
    }
  }
  window.setInterval(syncDyn, 150);
  syncDyn();

  /* 主循环 */
  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* 切到后台自动暂停 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (game.state === 'playing') game.togglePause();
      GM.Audio.suspendMusic();
    } else {
      GM.Audio.resumeMusic();
    }
    last = 0;
  });

  window.GoldMiner = game;
})();
