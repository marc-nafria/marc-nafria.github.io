/* ============================================================
   practice.js - pantalla única de práctica de acordes.

   Tres capas:
     · arriba, fija: el acorde, partido en fundamental (blanca) y
       extensión (beige). Cada pieza abre su panel de selección.
     · en medio: el instrumento, a pantalla completa. Deslizar en
       horizontal pasa de guitarra a piano; no hay scroll vertical.
     · abajo, fija: la posición o la inversión, cifrada con su bajo
       (C, C/E, C/G), que es lo que una inversión es de verdad.

   El armazón se construye una sola vez y después solo se rellena su
   contenido: así el deslizamiento nunca se reinicia. Cada cambio
   sale y entra por desenfoque.
   ============================================================ */
(function (global) {
  'use strict';

  /* Ortografía canónica: la que se usa en los cifrados de verdad. */
  var CANON = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var FLAT_PCS = [3, 8, 10];

  /* Los acordes disponibles viven en data/chords.json (global.ChordData). */
  var INV_NAMES = ['fundamental', '1ª inversión', '2ª inversión', '3ª inversión', '4ª inversión'];
  var PANELS = ['guitar', 'piano'];

  var RH_BASE = 60;   // la derecha toca alrededor de C4
  var LH_BASE = 45;   // la izquierda, una décima por debajo

  var OUT_MS = 130;   // lo que tarda el desenfoque de salida

  var state = { rootPc: 0, quality: 'maj', ins: 'guitar', posG: 0, posP: 0 };

  /* Referencias al armazón: se crea una vez y se rellena. */
  var shell = null;
  var sheetEl = null;
  var openKind = null;
  var busy = false;
  var scrollTimer = null;

  /* ---------------- almacenamiento ---------------- */
  function read(key, fallback) {
    try {
      var v = global.localStorage.getItem('ac.' + key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem('ac.' + key, value); } catch (e) { /* modo privado */ }
  }
  function restore() {
    var pc = parseInt(read('root', '0'), 10);
    if (!isNaN(pc) && pc >= 0 && pc < 12) { state.rootPc = pc; }
    var q = read('quality', 'maj');
    if (Theory.CHORDS[q]) { state.quality = q; }
    var ins = read('ins', 'guitar');
    state.ins = PANELS.indexOf(ins) !== -1 ? ins : 'guitar';
  }

  /* ---------------- utilidades ---------------- */
  function h(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') { node.textContent = attrs[k]; }
      else if (k === 'html') { node.innerHTML = attrs[k]; }
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
        node.addEventListener(k.slice(2), attrs[k]);
      } else if (attrs[k] !== null && attrs[k] !== undefined) {
        node.setAttribute(k, attrs[k]);
      }
    });
    (kids || []).forEach(function (c) { if (c) { node.appendChild(c); } });
    return node;
  }

  function fill(node, kids, fx) {
    node.innerHTML = '';
    kids.forEach(function (k) {
      if (!k) { return; }
      if (fx) { k.classList.add('fx-in'); }
      node.appendChild(k);
    });
  }

  function blurOut(node) {
    Array.prototype.forEach.call(node.children, function (c) { c.classList.add('fx-out'); });
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function spell(pc) { return CANON[Theory.mod12(pc)]; }
  function useFlats(pc) { return FLAT_PCS.indexOf(Theory.mod12(pc)) !== -1; }
  function suffix() { return Theory.CHORDS[state.quality].suffix; }
  function symbol() { return spell(state.rootPc) + suffix(); }
  function chordNotes() { return Theory.buildChord(state.rootPc, state.quality); }
  function shapes() { return Shapes.forChord(state.rootPc, state.quality); }

  /** Cifrado con bajo: C, C/E, C/G. Una inversión es esto. */
  function slashSymbol(bassPc) {
    return Theory.mod12(bassPc) === Theory.mod12(state.rootPc)
      ? symbol()
      : symbol() + '/' + spell(bassPc);
  }

  function ascending(a, b) { return a - b; }

  /**
   * Inversiones cerradas. Se ordenan de grave a agudo porque en acordes
   * con novena la nota que sube una octava no siempre queda la más alta,
   * y tanto la digitación como la ventana del teclado cuentan con que
   * el primero es el bajo y el último el más agudo.
   */
  function voicings(baseMidi) {
    var base = Theory.chordMidi(state.rootPc, state.quality, baseMidi);
    var rotations = [base.slice().sort(ascending)];
    var work = base.slice();
    for (var i = 0; i < base.length - 1; i++) {
      work = work.slice(1).concat([work[0] + 12]);
      rotations.push(work.slice().sort(ascending));
    }
    // En acordes con novena, alguna rotación vuelve a dejar la fundamental
    // abajo: solo cuentan las inversiones con bajo nuevo.
    var seen = {};
    var out = [];
    rotations.forEach(function (v) {
      var bass = Theory.mod12(v[0]);
      if (!seen[bass]) { seen[bass] = true; out.push(v); }
    });
    return out;
  }

  function degreeOfMidi(m) {
    var notes = chordNotes();
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].pc === Theory.mod12(m)) { return notes[i].degree; }
    }
    return '';
  }

  /**
   * Mano derecha: la inversión elegida, reducida a lo que cabe en una
   * mano. Si sobran notas se sueltan por el orden del archivo de datos
   * (primero la fundamental, que ya la lleva la izquierda; luego la
   * quinta...), pero nunca el bajo, que es el que da nombre a la
   * inversión.
   */
  function rhVoicing(inv) {
    var all = voicings(RH_BASE);
    var v = all[Math.min(inv, all.length - 1)].slice();
    var cfg = global.ChordData.piano.rightHand;
    var omit = (cfg.omitOrder || []).slice();
    while (v.length > (cfg.maxNotes || 4) && omit.length) {
      var deg = omit.shift();
      for (var i = v.length - 1; i >= 1; i--) {
        if (degreeOfMidi(v[i]) === deg) { v.splice(i, 1); break; }
      }
    }
    return v;
  }

  /** Intervalo de séptima del acorde (b7, 7 o bb7), o null si no tiene. */
  function seventhInterval() {
    var t = Theory.CHORDS[state.quality];
    for (var i = 0; i < t.degrees.length; i++) {
      if (t.degrees[i].indexOf('7') !== -1) { return t.steps[i]; }
    }
    return null;
  }

  /**
   * Mano izquierda: el bajo de la inversión con su patrón, que sale del
   * archivo de datos. octave = bajo doblado; fifth = bajo y quinta;
   * shell = bajo y séptima, la izquierda del jazz. Así las dos manos
   * hacen cosas distintas, como al tocar de verdad.
   */
  function lhVoicing(rhBassMidi) {
    var cfg = global.ChordData.piano.leftHand;
    var pattern = (cfg.byType && cfg.byType[state.quality]) ||
      (seventhInterval() !== null ? cfg.withSeventh : cfg.default) || 'octave';

    var bassPc = Theory.mod12(rhBassMidi);
    var bass = LH_BASE + Theory.mod12(bassPc - Theory.mod12(LH_BASE));

    var inChord = function (midi) {
      var pcs = chordNotes().map(function (n) { return n.pc; });
      return pcs.indexOf(Theory.mod12(midi)) !== -1;
    };
    if (pattern === 'bass') { return [bass]; }
    if (pattern === 'fifth' && inChord(bass + 7)) { return [bass, bass + 7]; }
    if (pattern === 'fifth') { return [bass, bass + 12]; }
    if (pattern === 'shell') {
      var sev = seventhInterval();
      if (sev !== null) {
        var gap = Theory.mod12(Theory.mod12(state.rootPc + sev) - bassPc);
        // si la séptima cae encima del bajo (o casi), doblar a la octava:
        // un shell de más de una octava no se abarca
        if (gap >= 3) { return [bass, bass + gap]; }
      }
    }
    return [bass, bass + 12];
  }

  /** Digitación por mano, desde las tablas del archivo de datos. */
  function handFingers(midis, hand) {
    var table = global.ChordData.piano.fingers[hand === 'L' ? 'left' : 'right'];
    var n = midis.length;
    if (n === 3 && table['3wide']) {
      var wideGap = hand === 'R' ? midis[2] - midis[1] : midis[1] - midis[0];
      if (wideGap >= 5) { return table['3wide'].slice(); }
    }
    return (table[String(n)] || []).slice();
  }

  function play(midis, timbre) {
    Sound.ready();
    Sound.chord(midis, { timbre: timbre });
  }

  var WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
  var KB_KEYS = 10;          // teclas blancas por teclado, fijas
  var KB_HEIGHT = 150;       // alto de las blancas en el dibujo

  function isWhite(midi) { return WHITE_PCS.indexOf(Theory.mod12(midi)) !== -1; }
  function whiteDown(midi) {
    var m = midi;
    while (!isWhite(m)) { m -= 1; }
    return m;
  }
  function prevWhite(midi) {
    var m = midi - 1;
    while (!isWhite(m)) { m -= 1; }
    return m;
  }
  function whiteCountFor(lowMidi, highMidi) {
    var m = lowMidi, count = 0;
    while (m <= highMidi) {
      if (isWhite(m)) { count++; }
      m++;
    }
    return count;
  }

  /**
   * Ventana de teclado para un voicing: ancho fijo (así el hueco no baila
   * al cambiar de acorde) y las notas centradas dentro.
   */
  function kbWindow(midis) {
    var low = whiteDown(midis[0] - 1);
    var high = midis[midis.length - 1] + 1;
    var need = whiteCountFor(low, high);
    var keys = Math.max(KB_KEYS, need);
    var spare = Math.floor((keys - need) / 2);
    var from = low;
    for (var i = 0; i < spare; i++) { from = prevWhite(from); }
    return { from: from, keys: keys };
  }

  /* ---------------- contenido: piano ---------------- */
  function keyboard(midis, hand) {
    var flats = useFlats(state.rootPc);
    var fingers = handFingers(midis, hand);

    // Dentro del círculo, mano y dedo; el nombre de la nota va debajo
    // de la tecla, así no compiten.
    var marks = midis.map(function (m, i) {
      return {
        midi: m, label: hand + fingers[i], flats: flats,
        role: Theory.mod12(m) === Theory.mod12(state.rootPc) ? 'root' : 'chord'
      };
    });

    var win = kbWindow(midis);
    var svg = Piano.render({
      from: win.from, keys: win.keys, midiMarks: marks,
      labels: 'none', footLabels: 'marked', fluid: true, keyHeight: KB_HEIGHT
    });
    svg.addEventListener('pointerdown', function () { play(midis, 'piano'); });

    // La caja lleva la proporción exacta del dibujo: así no sobra hueco
    // y los dos teclados quedan pegados en el centro.
    var boxW = win.keys * 34 + 2;
    var boxH = KB_HEIGHT + 18;
    var diagram = h('div', {
      class: 'diagram',
      style: 'aspect-ratio:' + boxW + '/' + boxH
    }, [svg]);

    // El dedo ya va escrito en cada tecla: la cabecera solo dice de qué
    // mano es, en su lado y por fuera, para no separar los teclados.
    var head = h('div', { class: 'kb-head kb-' + hand.toLowerCase() }, [
      h('span', { text: hand === 'R' ? 'derecha' : 'izquierda' })
    ]);
    return h('div', { class: 'kb' }, hand === 'L' ? [head, diagram] : [diagram, head]);
  }

  function pianoContent() {
    var total = voicings(RH_BASE).length;
    if (state.posP >= total) { state.posP = 0; }
    var rh = rhVoicing(state.posP);
    var lh = lhVoicing(rh[0]);
    // izquierda arriba, derecha abajo
    return [keyboard(lh, 'L'), keyboard(rh, 'R')];
  }

  /* ---------------- contenido: guitarra ---------------- */
  function guitarContent() {
    var list = shapes();
    if (!list.length) {
      return [h('div', { class: 'empty' }, [
        h('b', { text: 'sin posición estándar' }),
        h('span', {
          text: 'Sus notas son ' + chordNotes().map(function (n) {
            return Theory.pcName(n.pc, { flats: useFlats(state.rootPc) });
          }).join(' · ') + '.'
        })
      ])];
    }

    if (state.posG >= list.length) { state.posG = 0; }
    var shape = list[state.posG];
    var box = Fret.chordBox(shape, { size: 1, rootPc: state.rootPc, fluid: true });
    box.addEventListener('pointerdown', function () { play(Fret.shapeMidi(shape), 'guitar'); });
    return [h('div', { class: 'diagram narrow' }, [box])];
  }

  /* ---------------- capa fija de abajo ---------------- */
  function bassOfShape(shape) {
    var midis = Fret.shapeMidi(shape);
    return midis.length ? Theory.mod12(midis[0]) : state.rootPc;
  }

  function pagerData() {
    if (state.ins === 'piano') {
      var v = voicings(RH_BASE);
      var i = Math.min(state.posP, v.length - 1);
      return {
        total: v.length, index: i,
        title: slashSymbol(v[i][0]),
        sub: INV_NAMES[i] || 'inversión',
        onChange: function (n) { change(function () { state.posP = n; }); }
      };
    }
    var list = shapes();
    if (!list.length) {
      return { total: 1, index: 0, title: symbol(), sub: 'sin posiciones', onChange: function () {} };
    }
    var j = Math.min(state.posG, list.length - 1);
    var shape = list[j];
    return {
      total: list.length, index: j,
      title: slashSymbol(bassOfShape(shape)),
      sub: (shape.label || 'posición') + (shape.base > 1 ? ' · traste ' + shape.base : ''),
      onChange: function (n) { change(function () { state.posG = n; }); }
    };
  }

  function pager() {
    var d = pagerData();
    var chevron = function (dir, label) {
      return h('button', {
        class: 'chev', type: 'button', 'aria-label': label,
        html: dir < 0 ? '&#8249;' : '&#8250;',
        disabled: d.total <= 1 ? 'disabled' : null,
        onclick: function () { d.onChange((d.index + dir + d.total) % d.total); }
      });
    };

    var dots = h('div', { class: 'dots' });
    for (var i = 0; i < d.total; i++) {
      dots.appendChild(h('button', {
        class: 'dot' + (i === d.index ? ' on' : ''), type: 'button',
        'aria-label': 'Posición ' + (i + 1),
        onclick: (function (n) { return function () { d.onChange(n); }; })(i)
      }));
    }

    return h('div', { class: 'pager' }, [
      h('div', { class: 'pager-main' }, [
        chevron(-1, 'Anterior'),
        h('div', { class: 'pager-label' }, [
          h('b', { text: d.title }),
          h('span', { text: d.sub })
        ]),
        chevron(1, 'Siguiente')
      ]),
      d.total > 1 ? dots : null
    ]);
  }

  function bottomContent() { return [pager()]; }

  /* ---------------- título: el mando ---------------- */
  function titleContent() {
    var flats = useFlats(state.rootPc);
    var notes = chordNotes();
    var kind = Theory.CHORDS[state.quality].name.toLowerCase();
    var ext = suffix();

    var rootTok = h('button', {
      class: 'tok tok-root' + (openKind === 'root' ? ' active' : ''),
      type: 'button', text: spell(state.rootPc),
      'aria-haspopup': 'dialog',
      'aria-label': 'Cambiar la fundamental, ahora ' + spell(state.rootPc),
      onclick: function () { openSheet('root'); }
    });

    var extTok = h('button', {
      class: 'tok tok-ext' + (ext ? '' : ' empty') + (openKind === 'ext' ? ' active' : ''),
      type: 'button', text: ext || 'may',
      'aria-haspopup': 'dialog',
      'aria-label': 'Cambiar la extensión, ahora ' + kind,
      onclick: function () { openSheet('ext'); }
    });

    return [
      h('h1', { class: 'chord-name' }, [rootTok, extTok]),
      h('div', { class: 'chord-line' }, [
        h('span', { text: kind }),
        h('em', {
          text: notes.map(function (n) { return Theory.pcName(n.pc, { flats: flats }); }).join(' ')
        })
      ])
    ];
  }

  /* ----------------------------------------------------------------
     El selector no tiene cajas: es tipografía sobre el cristal.
     Cada opción son dos líneas — el símbolo, grande, y su nombre en
     letra pequeña — y la elegida va en el color de su pieza del
     título, con el mismo subrayado.
     ---------------------------------------------------------------- */
  function option(big, opts) {
    return h('button', {
      class: 'opt' + (opts.ghost ? ' ghost' : ''),
      type: 'button',
      'aria-pressed': opts.pressed ? 'true' : 'false',
      style: '--i:' + opts.index,
      onclick: opts.onPick
    }, [h('span', { class: 'opt-big', text: big })]);
  }

  function sheetBody(kind) {
    if (kind === 'root') {
      var grid = h('div', { class: 'opt-grid roots' });
      CANON.forEach(function (name, pc) {
        grid.appendChild(option(name, {
          pressed: pc === state.rootPc,
          index: pc,
          onPick: function () { pick(pc, state.quality); }
        }));
      });
      return grid;
    }
    var types = h('div', { class: 'opt-grid exts' });
    global.ChordData.types.forEach(function (t, i) {
      types.appendChild(option(t.suffix || 'may', {
        pressed: t.id === state.quality,
        ghost: !t.suffix,
        index: i,
        onPick: function () { pick(state.rootPc, t.id); }
      }));
    });
    return types;
  }

  function openSheet(kind) {
    if (sheetEl) { closeSheet(); }
    openKind = kind;

    var panel = h('div', {
      class: 'sheet', 'data-kind': kind, role: 'dialog', 'aria-modal': 'true',
      'aria-label': kind === 'root' ? 'Elegir fundamental' : 'Elegir extensión'
    }, [sheetBody(kind)]);

    sheetEl = h('div', { class: 'sheet-wrap' }, [
      h('div', { class: 'sheet-backdrop', onclick: function () { closeSheet(); } }),
      panel
    ]);

    document.body.appendChild(sheetEl);
    fill(shell.topInner, titleContent());
  }

  function closeSheet() {
    var node = sheetEl;
    var wasOpen = openKind;
    openKind = null;
    sheetEl = null;
    if (!node) { return; }
    if (wasOpen) { fill(shell.topInner, titleContent()); }
    if (reducedMotion()) {
      if (node.parentNode) { node.parentNode.removeChild(node); }
      return;
    }
    node.classList.add('closing');
    global.setTimeout(function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    }, 190);
  }

  function pick(pc, quality) {
    closeSheet();
    change(function () {
      state.rootPc = Theory.mod12(pc);
      state.quality = quality;
      state.posG = 0;
      state.posP = 0;
      write('root', String(state.rootPc));
      write('quality', quality);
    });
  }

  /* ---------------- el cambio: desenfocar, cambiar, enfocar ---------------- */
  function change(mutate) {
    if (busy || reducedMotion()) {
      mutate();
      render(true);
      return;
    }
    busy = true;
    blurOut(shell.panels.guitar.inner);
    blurOut(shell.panels.piano.inner);
    blurOut(shell.topInner);
    blurOut(shell.bottomInner);
    global.setTimeout(function () {
      busy = false;
      mutate();
      render(true);
    }, OUT_MS);
  }

  /* ---------------- instrumento ---------------- */
  function setInstrument(ins) {
    if (state.ins === ins) { return; }
    state.ins = ins;
    write('ins', ins);
    fill(shell.bottomInner, bottomContent());
  }

  /** Ir a un instrumento: deslizamiento suave, también con teclado o barra. */
  function goTo(ins) {
    var idx = PANELS.indexOf(ins);
    if (idx === -1) { return; }
    var deck = shell.deck;
    if (deck.clientWidth) {
      if (deck.scrollTo) {
        deck.scrollTo({ left: idx * deck.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
      } else {
        deck.scrollLeft = idx * deck.clientWidth;
      }
    }
    setInstrument(ins);
  }

  function onDeckScroll() {
    if (scrollTimer) { global.clearTimeout(scrollTimer); }
    scrollTimer = global.setTimeout(function () {
      scrollTimer = null;
      var deck = shell.deck;
      if (!deck.clientWidth) { return; }
      var idx = Math.round(deck.scrollLeft / deck.clientWidth);
      setInstrument(PANELS[Math.max(0, Math.min(PANELS.length - 1, idx))]);
    }, 110);
  }

  /* ---------------- armazón y pintado ---------------- */
  function buildShell(root) {
    var deck = h('div', { class: 'deck' });
    var panels = {};
    PANELS.forEach(function (p) {
      var inner = h('div', { class: 'panel-inner' });
      deck.appendChild(h('div', { class: 'panel', 'data-ins': p }, [inner]));
      panels[p] = { inner: inner };
    });
    deck.addEventListener('scroll', onDeckScroll, { passive: true });

    var topInner = h('div', { class: 'pinned-inner' });
    var bottomInner = h('div', { class: 'pinned-inner' });

    root.innerHTML = '';
    root.appendChild(deck);
    root.appendChild(h('div', { class: 'pinned pinned-top' }, [topInner]));
    root.appendChild(h('div', { class: 'pinned pinned-bottom' }, [bottomInner]));

    return { root: root, deck: deck, panels: panels, topInner: topInner, bottomInner: bottomInner };
  }

  function render(fx) {
    fill(shell.panels.guitar.inner, guitarContent(), fx);
    fill(shell.panels.piano.inner, pianoContent(), fx);
    fill(shell.topInner, titleContent(), fx);
    fill(shell.bottomInner, bottomContent(), fx);
  }

  function start() {
    restore();
    shell = buildShell(document.getElementById('app'));
    render(false);

    // colocar el deck en el instrumento guardado, sin animación
    var idx = PANELS.indexOf(state.ins);
    if (shell.deck.clientWidth) { shell.deck.scrollLeft = idx * shell.deck.clientWidth; }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && sheetEl) { closeSheet(); return; }
      if (sheetEl) { return; }
      if (ev.key === 'ArrowRight') { goTo('piano'); }
      if (ev.key === 'ArrowLeft') { goTo('guitar'); }
    });
    document.addEventListener('pointerdown', function once() {
      Sound.ready();
      document.removeEventListener('pointerdown', once);
    });
  }

  global.Practice = {
    start: start,
    state: state,
    refresh: function () { render(false); },
    goTo: goTo,
    /* solo para los tests: la lógica musical, con el estado actual */
    _music: {
      voicings: voicings,
      rhVoicing: rhVoicing,
      lhVoicing: lhVoicing,
      handFingers: handFingers
    }
  };
})(window);
