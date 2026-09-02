/* ============================================================
   Quinacord — cada dia sona un acord i l'has de trobar al piano.

   El trencaclosques del dia es determinista: el mateix per a
   tothom, per mode (3, 5 o 7 notes). La fonamental ve donada;
   la resta es busquen tecla a tecla amb 4 errades de marge.
   El nucli (dia, atzar, puzle) es pur i es prova amb tests.
   ============================================================ */
(function (global) {
  'use strict';

  var LAUNCH = '2026-09-02';   /* el dia del numero 1 */

  /* Els reculls de cada mode son del joc, no de l'app: un puzle
     diari ha de ser estable encara que l'app canvii les seves dades. */
  var MODES = {
    '3': {
      label: '3 notes',
      pool: [
        { id: 'maj', suffix: '', name: 'major', steps: [0, 4, 7] },
        { id: 'min', suffix: 'm', name: 'menor', steps: [0, 3, 7] },
        { id: 'dim', suffix: 'dim', name: 'disminuït', steps: [0, 3, 6] },
        { id: 'aug', suffix: 'aug', name: 'augmentat', steps: [0, 4, 8] },
        { id: 'sus2', suffix: 'sus2', name: 'suspès 2', steps: [0, 2, 7] },
        { id: 'sus4', suffix: 'sus4', name: 'suspès 4', steps: [0, 5, 7] }
      ]
    },
    '5': {
      label: '5 notes',
      pool: [
        { id: 'maj9', suffix: 'maj9', name: 'major amb novena', steps: [0, 4, 7, 11, 14] },
        { id: 'dom9', suffix: '9', name: 'dominant amb novena', steps: [0, 4, 7, 10, 14] },
        { id: 'min9', suffix: 'm9', name: 'menor amb novena', steps: [0, 3, 7, 10, 14] },
        { id: 'six9', suffix: '6/9', name: 'sisena amb novena', steps: [0, 4, 7, 9, 14] },
        { id: 'min69', suffix: 'm6/9', name: 'menor sisena amb novena', steps: [0, 3, 7, 9, 14] }
      ]
    },
    '7': {
      label: '7 notes',
      pool: [
        { id: 'maj13', suffix: 'maj13', name: 'major amb tretzena', steps: [0, 4, 7, 11, 14, 17, 21] },
        { id: 'dom13', suffix: '13', name: 'dominant amb tretzena', steps: [0, 4, 7, 10, 14, 17, 21] },
        { id: 'min13', suffix: 'm13', name: 'menor amb tretzena', steps: [0, 3, 7, 10, 14, 17, 21] }
      ]
    }
  };

  function ymd(d) {
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /* dies passats des de l'estrena, en dates LOCALS (el puzle canvia
     a mitjanit de qui juga) */
  function dayIndex(date) {
    var p = ymd(date).split('-');
    var l = LAUNCH.split('-');
    var a = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    var b = Date.UTC(+l[0], +l[1] - 1, +l[2]);
    return Math.round((a - b) / 86400000) + 1;
  }

  /* atzar determinista i decent (mulberry32) */
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function puzzleFor(day, modeId) {
    var mode = MODES[modeId];
    var r = rng(day * 131 + Number(modeId) * 17);
    var rootPc = Math.floor(r() * 12);
    var type = mode.pool[Math.floor(r() * mode.pool.length)];
    var pcs = [];
    type.steps.forEach(function (st) {
      var pc = ((rootPc + st) % 12 + 12) % 12;
      if (pcs.indexOf(pc) === -1) { pcs.push(pc); }
    });
    var flats = global.Theory && Theory.keyPrefersFlats
      ? Theory.keyPrefersFlats(rootPc, type.id.indexOf('min') === 0 ? 'min' : 'maj')
      : false;
    var rootName = global.Theory ? Theory.pcName(rootPc, { flats: flats }) : String(rootPc);
    return {
      number: day, modeId: modeId,
      rootPc: rootPc, type: type, pcs: pcs,
      name: rootName + type.suffix,
      midis: type.steps.map(function (st) { return 48 + rootPc + st; })
    };
  }

  global.Quina = { LAUNCH: LAUNCH, MODES: MODES, dayIndex: dayIndex, puzzleFor: puzzleFor, rng: rng };

  /* ================================================================
     D'aqui en avall, nomes el navegador: el teclat, el so i el dia.
     ================================================================ */
  if (!global.document || !document.getElementById || !document.getElementById('q-kb')) { return; }

  var els = {
    kb: document.getElementById('q-kb'),
    name: document.getElementById('q-name'),
    ear: document.getElementById('q-ear'),
    earFill: document.getElementById('q-ear-fill'),
    miss: document.getElementById('q-miss'),
    done: document.getElementById('q-done'),
    share: document.getElementById('q-share'),
    more: document.getElementById('q-more')
  };

  var WHITE = [0, 2, 4, 5, 7, 9, 11];
  var day = dayIndex(new Date());
  var modeId = '5';   /* un sol mode: cinc notes */
  var puzzle = null;
  var state = null;        /* { found: [pc], misses, log: [], done, win } */
  var kbMaps = [];   /* un mapa de tecles per cada fila del teclat */
  var voices = [];
  var earTimer = null;
  var lastMisses = 0;
  var isDaily = true;   /* la ronda del dia; despres, lliures i au */

  function store(k, v) {
    try {
      if (v === undefined) { return global.localStorage.getItem('qc.' + k); }
      global.localStorage.setItem('qc.' + k, v);
    } catch (e) { return null; }
    return null;
  }

  function cols() {
    var light = false;
    try { light = global.matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { /* fosc */ }
    return light
      ? { sel: '#CFA24A', ok: '#4F7A3C', bad: '#9E4A38' }
      : { sel: '#DCC9A6', ok: '#93B478', bad: '#A65B4B' };
  }

  /* pinta la tecla a TOTES les seves instancies (la frontera de les
     dues files es la mateixa nota a totes dues) */
  function paintMidi(midi, color) {
    kbMaps.forEach(function (m) {
      if (m[midi]) { paintKey(m[midi], color); }
    });
  }

  function paintKey(rf, color) {
    if (!rf) { return; }
    rf.rect.setAttribute('fill', color || rf.baseFill);
    if (rf.black) {
      rf.rect.setAttribute('stroke', color ? '#060605' : rf.baseStroke);
      rf.rect.setAttribute('stroke-width', color ? 2.4 : rf.baseStrokeW);
    }
    (rf.key || rf.rect).setAttribute('transform', color ? 'translate(0 2)' : '');
  }

  /* ---------------- so ---------------- */
  function stopChord() {
    voices.forEach(function (v) { v.release(); });
    voices = [];
  }

  function hear(ms) {
    if (!puzzle) { return; }
    var dur = ms || 3200;
    Sound.ready();
    if (!voices.length) {
      puzzle.midis.forEach(function (m) { voices.push(Sound.padOn(m)); });
    }
    if (earTimer && global.clearTimeout) { global.clearTimeout(earTimer); }
    earTimer = global.setTimeout(stopChord, dur);
    els.earFill.style.transition = 'none';
    els.earFill.style.height = '100%';
    void els.ear.offsetWidth;
    els.earFill.style.transition = 'height ' + dur + 'ms linear';
    els.earFill.style.height = '0%';
  }

  function tastNote(midi) {
    Sound.ready();
    var v = Sound.padOn(midi);
    global.setTimeout(function () { v.release(); }, 600);
  }

  /* ---------------- estat del dia ---------------- */
  function keyOf() { return modeId + ':' + day; }

  function roman(n) {
    if (n <= 0) { return ''; }
    var T = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
      [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var out = '';
    T.forEach(function (t) {
      while (n >= t[0]) { out += t[1]; n -= t[0]; }
    });
    return out;
  }

  function loadState() {
    var st = null;
    var raw = store('estat3.' + keyOf());
    if (raw) {
      try { st = JSON.parse(raw); } catch (e) { /* corrupte: de nou */ }
    }
    if (!st) { st = { found: [], misses: 0, wrong: [], done: false }; }
    if (!st.wrong) { st.wrong = []; }
    return st;
  }

  function saveState() {
    if (isDaily) { store('estat3.' + keyOf(), JSON.stringify(state)); }
  }

  function streakFor(m) {
    var raw = store('ratxa.' + m);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* res */ }
    }
    return { last: 0, count: 0, best: 0 };
  }

  function noteStreak(win) {
    var s = streakFor(modeId);
    if (s.last === day) { return s; }
    s.count = win ? (s.last === day - 1 ? s.count + 1 : 1) : 0;
    s.best = Math.max(s.best, s.count);
    s.last = day;
    store('ratxa.' + modeId, JSON.stringify(s));
    return s;
  }

  /* ---------------- pintar ---------------- */
  function paintAll() {
    var c = cols();
    var seen = {};
    kbMaps.forEach(function (map) {
      Object.keys(map).forEach(function (m) { seen[m] = true; });
    });
    Object.keys(seen).forEach(function (m) {
      var midi = Number(m);
      var color = null;
      if (state.wrong.indexOf(midi) !== -1) { color = c.bad; }
      else if (state.found.indexOf(midi) !== -1) { color = c.ok; }
      else if (state.done && puzzle.midis.indexOf(midi) !== -1) { color = c.sel; }
      paintMidi(midi, color);
    });

    els.miss.textContent = String(state.misses);
    els.miss.classList.toggle('some', state.misses > 0);
    els.miss.classList.remove('bump');
    if (state.misses > lastMisses) {
      void els.miss.offsetWidth;
      els.miss.classList.add('bump');
    }
    lastMisses = state.misses;

    els.name.classList.remove('ok');
    if (state.done) {
      els.name.textContent = puzzle.name;
      els.name.classList.add('ok');
      els.done.hidden = false;
      els.share.hidden = !isDaily;   /* el marcador es del dia, no del lliure */
    } else {
      els.name.textContent = '';
      els.done.hidden = true;
    }

  }

  /* ---------------- jugar ---------------- */
  function finish() {
    state.done = true;
    saveState();
    if (isDaily) { noteStreak(true); }
    hear();
    paintAll();
  }

  function onKey(midi, rf) {
    tastNote(midi);
    if (state.done) { return; }
    if (state.found.indexOf(midi) !== -1) { return; }
    /* una vermella es queda vermella: sona, pero ja no recompta */
    if (state.wrong.indexOf(midi) !== -1) { return; }
    var c = cols();
    /* nomes val la tecla exacta que sona: l'octava compta */
    if (puzzle.midis.indexOf(midi) !== -1) {
      state.found.push(midi);
      paintMidi(midi, c.ok);
      if (state.found.length === puzzle.midis.length) { finish(); return; }
    } else {
      state.misses += 1;
      state.wrong.push(midi);
      paintMidi(midi, c.bad);
      if (rf && rf.key && rf.key.classList) {
        rf.key.classList.add('q-shake');
        global.setTimeout(function () { rf.key.classList.remove('q-shake'); }, 240);
      }
      /* el correctiu: l'acord sona (o s'allarga) un moment i calla.
         Sense re-atacar si encara sona: aturar i tornar a engegar de
         cop apilava veus esvaint-se amb veus noves i s'empastifava. */
      hear(1500);
    }
    saveState();
    paintAll();
  }

  function buildKb() {
    els.kb.innerHTML = '';
    kbMaps = [];
    /* la finestra s'ancora al voicing: hi cap sencer, sigui quin sigui.
       Al mobil (vertical) el teclat va partit en dues files de vuit
       blanques: tecles de dit, no de cursor. En apaisat, d'una tirada. */
    var w0 = Math.min.apply(null, puzzle.midis) - 1;
    while (WHITE.indexOf(((w0 % 12) + 12) % 12) === -1) { w0 -= 1; }
    var land = !!(global.matchMedia && global.matchMedia('(max-height: 480px)').matches);
    var rows;
    if (land) {
      rows = [[w0, 15]];
    } else {
      var w7 = w0, n = 1, m = w0;
      while (n < 8) {
        m += 1;
        if (WHITE.indexOf(((m % 12) + 12) % 12) !== -1) { n += 1; w7 = m; }
      }
      rows = [[w0, 8], [w7, 8]];
    }
    rows.forEach(function (r) {
      var svg = Piano.render({
        from: r[0], keys: r[1], fluid: true,
        keyHandlers: { press: onKey, release: function () {}, move: null },
        labels: 'none', footLabels: 'octaves'
      });
      kbMaps.push(svg.keyRefs);
      els.kb.appendChild(svg);
    });
  }

  function freeRound() {
    isDaily = false;
    stopChord();
    var pool = MODES[modeId].pool;
    var rootPc = Math.floor(Math.random() * 12);
    var type = pool[Math.floor(Math.random() * pool.length)];
    var pcs = [];
    type.steps.forEach(function (st) {
      var pc = ((rootPc + st) % 12 + 12) % 12;
      if (pcs.indexOf(pc) === -1) { pcs.push(pc); }
    });
    var flats = Theory.keyPrefersFlats
      ? Theory.keyPrefersFlats(rootPc, type.id.indexOf('min') === 0 ? 'min' : 'maj')
      : false;
    puzzle = {
      number: 0, modeId: modeId,
      rootPc: rootPc, type: type, pcs: pcs,
      name: Theory.pcName(rootPc, { flats: flats }) + type.suffix,
      midis: type.steps.map(function (st) { return 48 + rootPc + st; })
    };
    state = { found: [], misses: 0, wrong: [], done: false };
    lastMisses = 1e9;
    buildKb();
    paintAll();
    hear();
  }

  function setMode(m) {
    modeId = m;
    stopChord();
    lastMisses = 1e9;   /* que el primer pintat no bategui */
    puzzle = puzzleFor(day, modeId);
    state = loadState();
    buildKb();
    paintAll();
  }

  /* ---------------- compartir i compte enrere ---------------- */
  function shareText() {
    var lines = [
      'Quinacord #' + puzzle.number,
      state.misses === 0 ? 'sense cap errada' : state.misses + ' errades',
    ];
    var s = streakFor(modeId);
    if (s.count > 1) { lines.push('ratxa ' + s.count); }
    lines.push(String(global.location && location.href ? location.href.split('?')[0] : ''));
    return lines.join('\n');
  }

  function tickNext() {
    if (isDaily && dayIndex(new Date()) !== day) { global.location.reload(); }
  }

  els.share.addEventListener('click', function () {
    var text = shareText();
    if (global.navigator && navigator.share) {
      navigator.share({ text: text }).catch(function () { /* ha plegat */ });
    } else if (global.navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      els.share.textContent = 'copiat!';
      global.setTimeout(function () { els.share.textContent = 'comparteix'; }, 1400);
    }
  });

  els.ear.addEventListener('click', hear);
  els.more.addEventListener('click', freeRound);
  setMode('5');
  var kbRaf = false;
  global.addEventListener('resize', function () {
    if (kbRaf) { return; }
    kbRaf = true;
    (global.requestAnimationFrame || global.setTimeout)(function () {
      kbRaf = false;
      buildKb();
      paintAll();
    });
  });
  global.setInterval(tickNext, 30000);
})(window);
