/* ============================================================
   metronome.js - lookahead-scheduled metronome.
   Clicks are scheduled on the audio clock (not setTimeout), so the
   tempo stays steady even when the browser throttles timers.
   ============================================================ */
(function (global) {
  'use strict';

  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD = 0.12;

  var SUBDIVISIONS = [
    { value: 1, label: 'Negras' },
    { value: 2, label: 'Corcheas' },
    { value: 3, label: 'Tresillos' },
    { value: 4, label: 'Semicorcheas' }
  ];

  // Defaults only: the stored values are loaded on first render, because UI
  // (and therefore storage access) does not exist yet at load time.
  var state = { bpm: 90, beats: 4, sub: 1, running: false, loaded: false };

  function loadPrefs() {
    if (state.loaded) { return; }
    state.loaded = true;
    state.bpm = parseInt(UI.read('cyt.bpm', '90'), 10) || 90;
    state.beats = parseInt(UI.read('cyt.beats', '4'), 10) || 4;
  }

  var timerId = null;
  var nextTickTime = 0;
  var tickIndex = 0;
  var visualQueue = [];
  var rafId = null;
  var taps = [];

  function h(tag, attrs, kids) { return UI.h(tag, attrs, kids); }

  function stop() {
    state.running = false;
    if (timerId) { global.clearInterval(timerId); timerId = null; }
    if (rafId) { global.cancelAnimationFrame(rafId); rafId = null; }
    visualQueue = [];
  }

  function render(host) {
    host.innerHTML = '';
    stop();
    loadPrefs();

    var bpmValue = h('div', { class: 'bpm-value' }, [
      h('span', { text: String(state.bpm) }),
      h('small', { text: 'BPM' })
    ]);
    var markName = h('div', { class: 'tuner-freq', text: '' });
    var dots = h('div', { class: 'beat-dots' });
    var slider = h('input', { type: 'range', min: '30', max: '260', step: '1', value: String(state.bpm) });
    var startBtn = h('button', { class: 'btn primary block', type: 'button', text: 'Iniciar' });

    function tempoName(bpm) {
      if (bpm < 60) { return 'Largo · muy lento'; }
      if (bpm < 76) { return 'Adagio · lento'; }
      if (bpm < 108) { return 'Andante / Moderato'; }
      if (bpm < 132) { return 'Allegro · rápido'; }
      if (bpm < 168) { return 'Vivace'; }
      return 'Presto · muy rápido';
    }

    function paintDots() {
      dots.innerHTML = '';
      for (var i = 0; i < state.beats; i++) {
        dots.appendChild(h('i', { class: i === 0 ? 'accent' : '' }));
      }
    }

    function setBpm(v) {
      state.bpm = Math.max(30, Math.min(260, Math.round(v)));
      bpmValue.children[0].textContent = String(state.bpm);
      markName.textContent = tempoName(state.bpm) + '  ·  un compás = ' +
        (state.beats * 60 / state.bpm).toFixed(1) + ' s';
      slider.value = String(state.bpm);
      UI.write('cyt.bpm', String(state.bpm));
    }

    slider.addEventListener('input', function () { setBpm(parseInt(slider.value, 10)); });

    /* ---- scheduling ---- */
    function schedule() {
      var ctx = Sound.ctx;
      if (!ctx) { return; }
      var ticksPerBar = state.beats * state.sub;
      while (nextTickTime < ctx.currentTime + SCHEDULE_AHEAD) {
        var isBeat = tickIndex % state.sub === 0;
        var beatNumber = Math.floor(tickIndex / state.sub);
        var kind = (tickIndex === 0) ? 'accent' : (isBeat ? 'beat' : 'sub');
        Sound.click(nextTickTime, kind);
        if (isBeat) {
          visualQueue.push({ time: nextTickTime, beat: beatNumber });
        }
        nextTickTime += 60 / state.bpm / state.sub;
        tickIndex = (tickIndex + 1) % ticksPerBar;
      }
    }

    function animate() {
      rafId = global.requestAnimationFrame(animate);
      var ctx = Sound.ctx;
      if (!ctx) { return; }
      while (visualQueue.length && visualQueue[0].time <= ctx.currentTime) {
        var ev = visualQueue.shift();
        Array.prototype.forEach.call(dots.children, function (d, i) {
          if (i === ev.beat) { d.classList.add('on'); }
          else { d.classList.remove('on'); }
        });
      }
    }

    function start() {
      var ctx = Sound.ready();
      if (!ctx) { UI.toast('Tu navegador no soporta Web Audio'); return; }
      state.running = true;
      tickIndex = 0;
      nextTickTime = ctx.currentTime + 0.06;
      visualQueue = [];
      timerId = global.setInterval(schedule, LOOKAHEAD_MS);
      rafId = global.requestAnimationFrame(animate);
      startBtn.textContent = 'Parar';
      startBtn.classList.remove('primary');
    }

    function toggle() {
      if (state.running) {
        stop();
        startBtn.textContent = 'Iniciar';
        startBtn.classList.add('primary');
        Array.prototype.forEach.call(dots.children, function (d) { d.classList.remove('on'); });
      } else {
        start();
      }
    }

    startBtn.addEventListener('click', toggle);

    /* ---- controls ---- */
    var minus = h('button', { class: 'btn', type: 'button', text: '−', onclick: function () { setBpm(state.bpm - 1); } });
    var plus = h('button', { class: 'btn', type: 'button', text: '+', onclick: function () { setBpm(state.bpm + 1); } });
    var tapBtn = h('button', { class: 'btn', type: 'button', text: 'Tap tempo' });
    tapBtn.addEventListener('click', function () {
      var now = global.performance.now();
      taps = taps.filter(function (t) { return now - t < 2500; });
      taps.push(now);
      if (taps.length >= 2) {
        var gaps = [];
        for (var i = 1; i < taps.length; i++) { gaps.push(taps[i] - taps[i - 1]); }
        var avg = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length;
        setBpm(60000 / avg);
      }
      if (taps.length > 5) { taps.shift(); }
    });

    var beatsSeg = h('div', { class: 'seg' });
    [2, 3, 4, 5, 6].forEach(function (b) {
      beatsSeg.appendChild(h('button', {
        type: 'button', text: b + '/4', class: 'is-red',
        'aria-selected': state.beats === b ? 'true' : 'false',
        onclick: function () {
          state.beats = b;
          UI.write('cyt.beats', String(b));
          paintDots();
          setBpm(state.bpm);
          Array.prototype.forEach.call(beatsSeg.children, function (btn, i) {
            btn.setAttribute('aria-selected', [2, 3, 4, 5, 6][i] === b ? 'true' : 'false');
          });
          if (state.running) { tickIndex = 0; }
        }
      }));
    });

    var subSeg = h('div', { class: 'seg' });
    SUBDIVISIONS.forEach(function (s) {
      subSeg.appendChild(h('button', {
        type: 'button', text: s.label, class: 'is-red',
        'aria-selected': state.sub === s.value ? 'true' : 'false',
        onclick: function () {
          state.sub = s.value;
          Array.prototype.forEach.call(subSeg.children, function (btn, i) {
            btn.setAttribute('aria-selected', SUBDIVISIONS[i].value === s.value ? 'true' : 'false');
          });
          if (state.running) { tickIndex = 0; }
        }
      }));
    });

    host.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'bpm-display' }, [bpmValue, markName]),
      dots,
      slider,
      h('div', { class: 'tempo-marks' }, [
        h('span', { text: '30' }), h('span', { text: '90' }), h('span', { text: '260' })
      ]),
      h('div', { class: 'btn-row', style: 'margin:10px 0 12px' }, [minus, plus, tapBtn]),
      startBtn
    ]));

    host.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'field' }, [h('label', { text: 'Compás' }), beatsSeg]),
      h('div', { class: 'field' }, [h('label', { text: 'Subdivisión' }), subSeg]),
      h('p', {
        class: 'note',
        html: 'Consejo: empieza a <strong>60 bpm</strong> con negras. Cuando el patrón te salga sin pensar, sube de 5 en 5. Practicar rápido con errores solo consolida los errores.'
      })
    ]));

    paintDots();
    setBpm(state.bpm);
    UI.onLeave(stop);
  }

  global.Metronome = { render: render };
})(window);
