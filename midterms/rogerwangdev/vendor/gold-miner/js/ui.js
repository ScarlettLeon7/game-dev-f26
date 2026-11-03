/* DOM 弹窗层：主菜单 / 暂停 / 过关 / 商店 / 失败 / 通关 */
window.GM = window.GM || {};
(function (GM) {
  'use strict';

  var U = GM.Utils;
  var game = null;
  var elOverlay = null;
  var elModal = null;
  var elMute = null;

  var COLORS = {
    dynamite: '#e8564c', drink: '#c86ad6', watch: '#e0a83c',
    clover: '#5cba62', rockBook: '#9b8f80', polish: '#35b6e8', strengthBook: '#5b8dd6'
  };

  var elMusic = null;

  function h(html) { return html; }

  function tplMenu() {
    var diffs = ['easy', 'normal', 'hard'].map(function (k) {
      var d = GM.Level.DIFFS[k];
      return '<button class="diff' + (game.diff === k ? ' on' : '') + '" data-act="diff:' + k + '">' +
        '<b>' + d.name + '</b><span>' + d.desc + '</span></button>';
    }).join('');

    return h(
      '<div class="logo"><span class="logo-gold">黄金</span><span class="logo-sub">矿工</span></div>' +
      '<p class="tagline">纯 H5 / Canvas 实现 · 无任何图片与音频素材</p>' +
      '<div class="diffs">' + diffs + '</div>' +
      '<div class="records">' +
      '<div class="rec"><b>' + U.money(game.best) + '</b><span>最高资产</span></div>' +
      '<div class="rec"><b>' + (game.bestLevel || '-') + '</b><span>最远关卡</span></div>' +
      '</div>' +
      '<div class="rules">' +
      '<div><kbd>空格</kbd> / <kbd>点击</kbd> 放下钩子　<kbd>D</kbd> 引爆炸药</div>' +
      '<div class="tip">越重的矿石拉得越慢 · 连续抓到值钱矿藏可叠连击加成 · 抓到炸药桶会炸毁周围矿藏 · 含钻岩石需要用炸药开采</div>' +
      '</div>' +
      '<button class="btn primary" data-act="start">开始挖矿</button>'
    );
  }

  function tplPause() {
    return h(
      '<h2>已暂停</h2>' +
      '<p class="sub">当前资产 ' + U.money(game.money) + ' / 目标 ' + U.money(game.goal) + '</p>' +
      '<button class="btn primary" data-act="resume">继续</button>' +
      '<button class="btn ghost" data-act="menu">返回主菜单</button>'
    );
  }

  function tplLevelClear() {
    var nextGoal = GM.Level.config(game.level + 1, game.diff).goal;
    var g = game.grade();
    return h(
      '<h2 class="ok">第 ' + game.level + ' 关达成！</h2>' +
      '<div class="grade g-' + g + '">' + g + '</div>' +
      '<div class="stats">' +
      '<div><span>本关收入</span><b class="gold">' + U.money(game.levelEarned) + '</b></div>' +
      '<div><span>当前资产</span><b class="gold">' + U.money(game.money) + '</b></div>' +
      '<div><span>最高连击</span><b>×' + game.stats.bestCombo + '</b></div>' +
      '<div><span>下关目标</span><b>' + U.money(nextGoal) + '</b></div>' +
      '</div>' +
      '<button class="btn primary" data-act="shop">前往商店</button>'
    );
  }

  function tplShop() {
    var list = game.shopList();
    var cards = list.map(function (s) {
      var dis = s.full || !s.affordable;
      return '<div class="card' + (s.full ? ' owned' : '') + '">' +
        '<div class="glyph" style="border-color:' + COLORS[s.id] + ';color:' + COLORS[s.id] + '">' + s.glyph + '</div>' +
        '<div class="info">' +
        '<div class="name">' + s.name + (s.owned > 0 ? ' <i>×' + s.owned + '</i>' : '') + '</div>' +
        '<div class="desc">' + s.desc + '</div>' +
        '</div>' +
        '<button class="buy' + (dis ? ' dis' : '') + '"' + (dis ? ' disabled' : '') +
        ' data-act="buy:' + s.id + '">' + (s.full ? '已满' : U.money(s.price)) + '</button>' +
        '</div>';
    }).join('');

    return h(
      '<h2>矿工商店</h2>' +
      '<p class="sub">可用资金 <b class="gold">' + U.money(game.money) + '</b>　·　注意：消费会减少总资产，而目标是累计资产</p>' +
      '<div class="shop-grid">' + cards + '</div>' +
      '<button class="btn primary" data-act="next">进入第 ' + (game.level + 1) + ' 关</button>'
    );
  }

  function tplGameOver() {
    var short = Math.max(0, game.goal - game.money);
    return h(
      '<h2 class="bad">挖矿失败</h2>' +
      '<p class="sub">第 ' + game.level + ' 关（' + GM.Level.diffOf(game.diff).name +
      '）时间耗尽，还差 <b class="bad">' + U.money(short) + '</b></p>' +
      '<div class="stats">' +
      '<div><span>最终资产</span><b class="gold">' + U.money(game.money) + '</b></div>' +
      '<div><span>累计收入</span><b>' + U.money(game.stats.earned) + '</b></div>' +
      '<div><span>最高纪录</span><b>' + U.money(game.best) + '</b></div>' +
      '</div>' +
      '<button class="btn primary" data-act="restart">再来一局</button>' +
      '<button class="btn ghost" data-act="menu">返回主菜单</button>'
    );
  }

  function tplWin() {
    return h(
      '<h2 class="ok">全部 ' + GM.Level.MAX_LEVEL + ' 关通关！</h2>' +
      '<p class="sub">难度：' + GM.Level.diffOf(game.diff).name + '　你已经是传奇矿工了</p>' +
      '<div class="stats">' +
      '<div><span>最终资产</span><b class="gold">' + U.money(game.money) + '</b></div>' +
      '<div><span>累计收入</span><b>' + U.money(game.stats.earned) + '</b></div>' +
      '<div><span>最高连击</span><b>×' + game.stats.bestCombo + '</b></div>' +
      '<div><span>引爆次数</span><b>' + game.stats.boom + '</b></div>' +
      '</div>' +
      '<button class="btn primary" data-act="endless">继续无尽挖矿</button>' +
      '<button class="btn ghost" data-act="restart">再来一局</button>'
    );
  }

  var TPL = {
    menu: tplMenu,
    paused: tplPause,
    levelclear: tplLevelClear,
    shop: tplShop,
    gameover: tplGameOver,
    win: tplWin
  };

  function render() {
    var t = TPL[game.state];
    if (!t) {
      elOverlay.classList.add('hidden');
      elModal.innerHTML = '';
      return;
    }
    elModal.className = 'modal modal-' + game.state;
    elModal.innerHTML = t();
    elOverlay.classList.remove('hidden');
  }

  function syncMute() {
    if (elMute) elMute.textContent = GM.Audio.isMuted() ? '音效 关' : '音效 开';
    if (elMusic) elMusic.textContent = GM.Audio.isMusicOn() ? '音乐 开' : '音乐 关';
  }

  function handle(act) {
    if (act.indexOf('buy:') === 0) {
      if (game.buy(act.slice(4))) render();
      return;
    }
    if (act.indexOf('diff:') === 0) {
      GM.Audio.play('click');
      game.setDiff(act.slice(5));
      render();
      return;
    }
    switch (act) {
      case 'start':
      case 'restart':
        GM.Audio.unlock();
        GM.Audio.play('click');
        game.newRun();
        game.startLevel(1);
        break;
      case 'endless':
        GM.Audio.play('click');
        game.nextLevel();
        break;
      case 'resume':
        GM.Audio.play('click');
        game.togglePause();
        break;
      case 'menu':
        GM.Audio.play('click');
        game.setState('menu');
        break;
      case 'shop':
        GM.Audio.play('click');
        game.setState('shop');
        break;
      case 'next':
        GM.Audio.play('click');
        game.nextLevel();
        break;
      case 'pause':
        game.togglePause();
        break;
      case 'dyn':
        game.useDynamite();
        break;
      case 'mute':
        GM.Audio.toggle();
        syncMute();
        break;
      case 'music':
        GM.Audio.unlock();
        GM.Audio.toggleMusic();
        syncMute();
        break;
    }
  }

  GM.UI = {
    init: function (g) {
      game = g;
      elOverlay = document.getElementById('overlay');
      elModal = document.getElementById('modal');
      elMute = document.querySelector('[data-act="mute"]');
      elMusic = document.querySelector('[data-act="music"]');

      document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el || el.disabled) return;
        e.preventDefault();
        handle(el.getAttribute('data-act'));
      });

      game.onStateChange = render;
      syncMute();
      render();
    },
    /* 回车触发当前面板的主按钮 */
    primary: function () {
      var b = elModal.querySelector('.btn.primary');
      if (b) b.click();
    },
    toggleMute: function () { GM.Audio.toggle(); syncMute(); },
    syncAudioButtons: syncMute,
    refresh: render
  };
})(window.GM);
