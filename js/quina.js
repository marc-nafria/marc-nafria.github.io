/* ============================================================
   Quinacord — cada dia sona un acord i l'has de trobar al piano.

   El trencaclosques del dia es determinista: el mateix per a
   tothom, per mode (3, 5 o 7 notes). La fonamental ve donada;
   la resta es busquen tecla a tecla.
   El nucli (dia, atzar, puzle) es pur i es prova amb tests.

   El joc viu DINS l'app, com el pianet: una capa que s'obre i es
   tanca sense navegar (en PWA, saltar de pagina treu la barra del
   navegador i trenca la sensacio d'app).
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
    '4': {
      label: '4 notes',
      pool: [
        { id: 'maj7', suffix: 'maj7', name: 'major setena', steps: [0, 4, 7, 11] },
        { id: 'dom7', suffix: '7', name: 'setena de dominant', steps: [0, 4, 7, 10] },
        { id: 'min7', suffix: 'm7', name: 'menor setena', steps: [0, 3, 7, 10] },
        { id: 'six', suffix: '6', name: 'sisena', steps: [0, 4, 7, 9] },
        { id: 'm7b5', suffix: 'm7b5', name: 'semidisminuït', steps: [0, 3, 6, 10] },
        { id: 'mmaj7', suffix: 'mMaj7', name: 'menor amb setena major', steps: [0, 3, 7, 11] }
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

  /* el mode del dia: varia entre 3, 4 i 5 notes (determinista: el
     mateix per a tothom) perque no surtin sempre els mateixos acords */
  var DAY_MODES = ['3', '4', '5'];

  function dailyMode(day) {
    var r = rng(day * 613 + 29);
    return DAY_MODES[Math.floor(r() * DAY_MODES.length)];
  }

  global.Quina = {
    LAUNCH: LAUNCH, MODES: MODES, dayIndex: dayIndex,
    puzzleFor: puzzleFor, dailyMode: dailyMode, rng: rng
  };

  /* ================================================================
     D'aqui en avall, nomes el navegador: la capa, el so i el dia.
     ================================================================ */
  if (!global.document) { return; }

  var WHITE = [0, 2, 4, 5, 7, 9, 11];
  var wrap = null;      /* la capa sencera; null = tancat */
  var els = null;
  var day = 0;
  var modeId = '5';     /* el del dia es tria a setDaily */
  var puzzle = null;
  var state = null;     /* { found: [midi], misses, wrong: [midi], done } */
  var kbMaps = [];      /* un mapa de tecles per cada fila del teclat */
  var voices = [];
  var earTimer = null;
  var earHold = null;
  var dayTimer = null;
  var isDaily = true;   /* la ronda del dia; despres, lliures i au */
  var coachStage = 2;   /* 0 escolta, 1 posa'l, 2 apres */

  function store(k, v) {
    try {
      if (v === undefined) { return global.localStorage.getItem('qc.' + k); }
      global.localStorage.setItem('qc.' + k, v);
    } catch (e) { return null; }
    return null;
  }

  /* el joc segueix el tema de l'app, no el del sistema: coherencia */
  function cols() {
    var light = false;
    try { light = document.documentElement.getAttribute('data-theme') === 'light'; } catch (e) { /* fosc */ }
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
    if (els && els.ear && els.ear.classList) { els.ear.classList.remove('sona'); }
  }

  function coachPaint() {
    if (!els || !els.coach) { return; }
    els.coach.hidden = coachStage >= 2;
    var arrDot = wrap && wrap.querySelector('.q-arr-dot');
    var arrKb = els.coach.querySelector('.q-arr-kb');
    if (arrDot) {
      if (coachStage === 0) { arrDot.removeAttribute('hidden'); }
      else { arrDot.setAttribute('hidden', ''); }
    }
    if (coachStage >= 2) { return; }
    if (coachStage === 0) {
      els.coachT.textContent = 'toca el punt per escoltar';
      if (arrKb) { arrKb.setAttribute('hidden', ''); }
      coachPlace();
    } else {
      els.coachT.textContent = 'posa l’acord que creus que sona';
      if (arrKb) { arrKb.removeAttribute('hidden'); }
    }
  }

  /* la fletxa del punt es col·loca mirant el punt DE DEBO: amb mides
     fixes des del centre, a mitges pantalles queia sobre el "dia." */
  function coachPlace() {
    if (!wrap || coachStage !== 0 || !els || !els.ear) { return; }
    var arr = wrap.querySelector('.q-arr-dot');
    if (!arr || !els.ear.getBoundingClientRect) { return; }
    var d = els.ear.getBoundingClientRect();
    if (!d.width) { return; }
    /* la punta del dibuix cau a (37, 8) del quadre de 48x58:
       la posem just sota el punt, una mica a la dreta */
    var tipX = d.left + d.width / 2 + 3;
    var tipY = d.bottom + 8;
    arr.style.left = (tipX - 37) + 'px';
    arr.style.top = (tipY - 8) + 'px';
  }

  function hear(ms) {
    if (!puzzle || !els) { return; }
    if (coachStage === 0) {
      coachStage = 1;
      coachPaint();
    }
    var dur = ms || 5000;
    Sound.ready();
    if (!voices.length) {
      puzzle.midis.forEach(function (m) { voices.push(Sound.padOn(m)); });
    }
    if (els.ear && els.ear.classList) { els.ear.classList.add('sona'); }
    if (earTimer && global.clearTimeout) { global.clearTimeout(earTimer); }
    earTimer = global.setTimeout(function () {
      stopChord();
      /* el punt es reomple: torna a ser el punt de "dia." */
      if (!els) { return; }
      els.earFill.style.transition = 'height .4s ease';
      els.earFill.style.height = '100%';
    }, dur);
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

  function streakFor() {
    var raw = store('ratxa.dia') || store('ratxa.5');   /* migra la vella */
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* res */ }
    }
    return { last: 0, count: 0, best: 0 };
  }

  function noteStreak(win) {
    var s = streakFor();
    if (s.last === day) { return s; }
    s.count = win ? (s.last === day - 1 ? s.count + 1 : 1) : 0;
    s.best = Math.max(s.best, s.count);
    s.last = day;
    store('ratxa.dia', JSON.stringify(s));
    return s;
  }

  /* ---------------- pintar ---------------- */
  function paintAll() {
    if (!els) { return; }
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

    wrap.classList.toggle('acabat', !!state.done);
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
    if (coachStage === 1) {
      coachStage = 2;
      store('coach', '1');
      coachPaint();
    }
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
    if (!els) { return; }
    els.kb.innerHTML = '';
    kbMaps = [];
    /* la finestra s'ancora al voicing: hi cap sencer, sigui quin sigui.
       Al mobil (vertical) el teclat va partit en dues files de vuit
       blanques: tecles de dit, no de cursor. En apaisat o a pantalla
       gran, d'una tirada. */
    var w0 = Math.min.apply(null, puzzle.midis) - 1;
    while (WHITE.indexOf(((w0 % 12) + 12) % 12) === -1) { w0 -= 1; }
    var land = false;
    try {
      land = global.matchMedia('(max-height: 480px)').matches
        || global.matchMedia('(min-width: 900px)').matches;
    } catch (e) { /* partit */ }
    var rows;   /* [from, blanques, vores] */
    if (land) {
      rows = [[w0, 15, 'both']];
    } else {
      /* la fila de baix comenca a la blanca SEGÜENT de l'ultima de
         dalt: cap tecla repetida. La negra de la costura viu nomes a
         la fila de baix (vora esquerra). */
      var n = 1, m = w0;
      while (n < 8) {
        m += 1;
        if (WHITE.indexOf(((m % 12) + 12) % 12) !== -1) { n += 1; }
      }
      var w8 = m + 1;
      while (WHITE.indexOf(((w8 % 12) + 12) % 12) === -1) { w8 += 1; }
      rows = [[w0, 8, 'left'], [w8, 8, 'both']];
    }
    var kh = 138;   /* el piano de sempre, sense inflar */
    rows.forEach(function (r) {
      var svg = Piano.render({
        from: r[0], keys: r[1], fluid: true,
        keyHeight: kh, edges: r[2],
        keyHandlers: { press: onKey, release: function () {}, move: null },
        labels: 'none', footLabels: 'none'
      });
      kbMaps.push(svg.keyRefs);
      els.kb.appendChild(svg);
    });
  }

  function freeRound() {
    isDaily = false;
    stopChord();
    modeId = DAY_MODES[Math.floor(Math.random() * DAY_MODES.length)];
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
    buildKb();
    paintAll();
    hear();
  }

  /* la ronda del dia, sencera: puzle, estat guardat i teclat */
  function setDaily() {
    isDaily = true;
    stopChord();
    day = dayIndex(new Date());
    modeId = dailyMode(day);
    puzzle = puzzleFor(day, modeId);
    state = loadState();
    buildKb();
    paintAll();
  }

  /* ---------------- compartir i compte enrere ---------------- */
  function shareText() {
    var base = '';
    try { base = location.origin + location.pathname; } catch (e) { /* res */ }
    var lines = [
      'L’acord del dia #' + puzzle.number,
      state.misses === 0 ? 'sense cap errada' : state.misses + ' errades',
    ];
    var s = streakFor();
    if (s.count > 1) { lines.push('ratxa ' + s.count); }
    if (base) { lines.push(base + '#quina'); }
    return lines.join('\n');
  }

  /* si passa mitjanit amb el joc obert, entra el puzle nou */
  function tickNext() {
    if (wrap && isDaily && dayIndex(new Date()) !== day) { setDaily(); }
  }

  function onShare() {
    var text = shareText();
    if (global.navigator && navigator.share) {
      navigator.share({ text: text }).catch(function () { /* ha plegat */ });
    } else if (global.navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      els.share.textContent = 'copiat!';
      global.setTimeout(function () { els.share.textContent = 'comparteix'; }, 1400);
    }
  }

  /* tocar = 5 segons; aguantar el punt = mentre el tinguis premut
     (s'allarga sol); anar clicant tambe suma temps */
  function earDown(ev) {
    if (ev && ev.preventDefault) { ev.preventDefault(); }
    hear(5000);
    if (earHold && global.clearInterval) { global.clearInterval(earHold); }
    earHold = global.setInterval(function () {
      if (voices.length) { hear(5000); }
    }, 2600);
  }
  function earUp() {
    if (earHold && global.clearInterval) { global.clearInterval(earHold); }
    earHold = null;
  }

  var kbRaf = false;
  function onResize() {
    if (!wrap || kbRaf) { return; }
    kbRaf = true;
    (global.requestAnimationFrame || global.setTimeout)(function () {
      kbRaf = false;
      if (!wrap) { return; }
      buildKb();
      paintAll();
      coachPlace();
    });
  }

  /* ---------------- la capa ---------------- */
  var ARROW = (global.Tools && global.Tools.BACK_ARROW) ||
    '<svg viewBox="0 0 36 26" aria-hidden="true"><path d="M34 6.5 C 27 15, 17 18.5, 5.5 15.6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M14 9.4 Q 9 12.8, 5 15.8 Q 10.6 17.4, 15.4 20.8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var TEMPLATE =
    '<main class="q">' +
    '<button type="button" class="q-back" aria-label="Tornar a Acords">' + ARROW + '</button>' +
    /* la fletxa del punt viu fora del titol: el titol duu filter (blur
       d’entrada) i faria de contenidor fals per a una posicio fixa */
    '<svg class="q-arr q-arr-dot" viewBox="0 0 64 76" aria-hidden="true" hidden>' +
    '<path d="M8 72 C 24 62, 42 44, 49 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M40 25 L 49 10 L 57 26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>' +
    '<h1 class="q-title">' +
    '<span class="q-lock">' +
    '<span class="t1">L’acord</span>' +
    '<span class="t2">del</span>' +
    '<span class="t3">dia<button type="button" class="q-dot" id="q-ear" aria-label="Sentir l’acord del dia">' +
    '<span class="q-dot-c"><i id="q-ear-fill"></i>' +
    '<svg class="q-dot-n" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 7.4 L17.2 12 L9.6 16.6 Z" fill="currentColor"/></svg>' +
    '</span></button></span>' +
    '</span>' +
    '<span class="q-coach" id="q-coach" hidden>' +
    '<b id="q-coach-t">toca el punt per escoltar</b>' +
    '<svg class="q-arr q-arr-kb" viewBox="0 0 46 90" aria-hidden="true" hidden>' +
    '<path d="M26 5 C 14 28, 31 50, 21 76" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M11 64 L 21 80 L 32 65" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>' +
    '</span>' +
    '</h1>' +
    '<section class="q-stage">' +
    '<div class="q-name" id="q-name" aria-live="polite"></div>' +
    '<div class="q-kb" id="q-kb" aria-label="Teclat"></div>' +
    '<div class="q-row"><div class="q-done" id="q-done" hidden>' +
    '<button type="button" class="q-share" id="q-share">comparteix</button>' +
    '<button type="button" class="q-more" id="q-more">seguir jugant</button>' +
    '</div></div>' +
    '</section>' +
    '</main>';

  function open() {
    if (wrap) { return; }
    wrap = document.createElement('div');
    wrap.className = 'q-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'L’acord del dia');
    wrap.innerHTML = TEMPLATE;
    if (!wrap.querySelector || !wrap.querySelector('.q-back')) {
      /* entorn retallat (tests): innerHTML no fa arbre, no hi ha joc */
      wrap = null;
      return;
    }
    document.body.appendChild(wrap);

    els = {
      kb: wrap.querySelector('#q-kb'),
      name: wrap.querySelector('#q-name'),
      ear: wrap.querySelector('#q-ear'),
      earFill: wrap.querySelector('#q-ear-fill'),
      done: wrap.querySelector('#q-done'),
      share: wrap.querySelector('#q-share'),
      more: wrap.querySelector('#q-more'),
      coach: wrap.querySelector('#q-coach'),
      coachT: wrap.querySelector('#q-coach-t')
    };

    wrap.querySelector('.q-back').addEventListener('click', close);
    els.share.addEventListener('click', onShare);
    els.more.addEventListener('click', freeRound);
    els.ear.addEventListener('pointerdown', earDown);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      els.ear.addEventListener(t, earUp);
    });

    coachStage = store('coach') ? 2 : 0;
    setDaily();
    coachPaint();
    /* quan entren les lletres de debo, el punt es belluga: recol·loca */
    try {
      if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        document.fonts.ready.then(function () { coachPlace(); });
      }
    } catch (e) { /* res */ }

    global.addEventListener('resize', onResize);
    dayTimer = global.setInterval(tickNext, 30000);
    if (global.Sound && Sound.ready) { Sound.ready(); }
  }

  function close() {
    if (!wrap) { return; }
    stopChord();
    earUp();
    global.removeEventListener('resize', onResize);
    if (dayTimer) { global.clearInterval(dayTimer); dayTimer = null; }
    if (earTimer) { global.clearTimeout(earTimer); earTimer = null; }
    var node = wrap;
    wrap = null;
    els = null;
    kbMaps = [];
    /* si s'havia entrat per enllaç, que recarregar no reobri el joc */
    try {
      if (location.hash === '#quina' && global.history && history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) { /* res */ }
    node.classList.add('closing');
    global.setTimeout(function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    }, 190);
  }

  global.Quina.open = open;
  global.Quina.close = close;
})(typeof window !== 'undefined' ? window : this);
