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
  var INV_NAMES = ['fonamental', '1a inversió', '2a inversió', '3a inversió', '4a inversió'];
  /* l'ordre del carrusel: eines als extrems, L'instrument al mig.
     Nomes un: guitarra o piano es tria a la configuracio, i tota la
     plataforma es d'aquell instrument (res duplicat). */
  var PANELS = ['eines', 'piano', 'cercle'];
  function panelsFor() { return ['eines', state.ins, 'cercle']; }
  var INSTRUMENTS = { guitar: true, piano: true };
  /* plans on l'acord de dalt segueix visible (al cercle no: allà dalt
     hi va COM ES TOCA l'acord, no el seu nom) */
  var TOPPED = { guitar: true, piano: true };
  /* plans amb roda a sota (el cercle es gira a si mateix) */
  var WHEELED = ['guitar', 'piano'];

  var RH_BASE = 60;   // la derecha toca alrededor de C4
  var LH_BASE = 45;   // la izquierda, una décima por debajo

  var OUT_MS = 130;   // lo que tarda el desenfoque de salida

  var state = { rootPc: 0, quality: 'maj', ins: 'guitar', posG: 0, posP: 0, cIdx: 0, cSeq: [] };
  var activeId = 'guitar';
  var toolHandles = {};

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
    var ins = read('ins', 'piano');
    state.ins = INSTRUMENTS[ins] ? ins : 'piano';
    PANELS = panelsFor();
    var ck = parseInt(read('ckey', '0'), 10);
    state.cIdx = (!isNaN(ck) && ck >= 0 && ck < 12) ? ck : 0;
    state.cSeq = [];
    try {
      var sq = JSON.parse(read('cseq', '[]'));
      if (Object.prototype.toString.call(sq) === '[object Array]') {
        state.cSeq = sq.filter(function (x) {
          return x && typeof x.d === 'number' && (x.ring === 'in' || x.ring === 'out');
        }).slice(0, 8);
      }
    } catch (e) { /* res */ }
    state.theme = read('theme', 'dark') === 'light' ? 'light' : 'dark';
    applyTheme(state.theme);
    var v = read('voice', 'pad');
    state.voice = VOICES.some(function (x) { return x.id === v; }) ? v : 'pad';
    if (global.Sound && Sound.setVoice) { Sound.setVoice(state.voice); }
  }

  /* La marca de l'app: tres blanques, dues negres i la tecla alçada.
     La mateixa que icon.svg, aquí en una caixa de 24x20. */
  var PIANO_MARK = '<svg viewBox="0 0 24 20" aria-hidden="true" focusable="false"><path class="k-w" d="M-2 0h6.2v16.6a1.4 1.4 0 0 1-1.4 1.4H-2z"/><path class="k-w" d="M4.9 0h6.2v16.6a1.4 1.4 0 0 1-1.4 1.4H6.3a1.4 1.4 0 0 1-1.4-1.4z"/><path class="k-on" d="M11.8 1.6h6.2v16.8a1.4 1.4 0 0 1-1.4 1.4h-3.4a1.4 1.4 0 0 1-1.4-1.4z"/><path class="k-w" d="M18.7 0H24v18h-3.9a1.4 1.4 0 0 1-1.4-1.4z"/><path class="k-b" d="M3.2 0h3.5v10.6H3.2z"/><path class="k-b" d="M16.9 0h3.5v10.6h-3.5z"/></svg>';

  /* ---------------- clar o fosc ---------------- */
  /* Es guarda l'eleccio i s'avisa el navegador (la barra de l'iPhone
     i els controls natius han d'anar a joc). */
  function applyTheme(name) {
    var light = name === 'light';
    var root = document.documentElement;
    if (!root) { return; }
    if (light) { root.setAttribute('data-theme', 'light'); }
    else { root.removeAttribute('data-theme'); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { meta.setAttribute('content', light ? '#F4F1EB' : '#060605'); }
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) { scheme.setAttribute('content', light ? 'light' : 'dark'); }
  }

  /* Les tres lletres NO es trien: son rols fixos (vegeu ESTIL.md).
     Outfit es la veu de l'app, Fraunces la de la musica i
     Instrument Serif la que xiuxiueja. */
  var VOICES = [
    { id: 'pad', name: 'coixí' },
    { id: 'ep', name: 'elèctric' }
  ];

  function setVoicePref(id) {
    state.voice = id;
    write('voice', id);
    if (global.Sound && Sound.setVoice) { Sound.setVoice(id); }
  }

  function setTheme(name) {
    state.theme = name === 'light' ? 'light' : 'dark';
    write('theme', state.theme);
    /* el canvi de pell fa la mateixa respiracio que un canvi d'acord:
       desenfocar, girar els colors, tornar a enfocar */
    change(function () { applyTheme(state.theme); });
  }

  /* triar l'instrument: el deck es refa amb nomes aquell pla */
  function setInstrument(id) {
    if (!INSTRUMENTS[id] || state.ins === id) { return; }
    if (toolHandles[activeId] && toolHandles[activeId].leave) { toolHandles[activeId].leave(); }
    if (INSTRUMENTS[activeId]) { activeId = id; }
    state.ins = id;
    write('ins', id);
    PANELS = panelsFor();
    cercleInst = null;   /* el dial reneix dins el deck nou */
    shell = buildShell(document.getElementById('app'));
    render(false);
    var idx = PANELS.indexOf(activeId);
    if (idx === -1) { activeId = id; idx = PANELS.indexOf(id); }
    if (shell.deck.clientWidth) { shell.deck.scrollLeft = idx * shell.deck.clientWidth; }
    shell.root.classList.toggle('on-tool', !TOPPED[activeId]);
    if (toolHandles[activeId] && toolHandles[activeId].enter) { toolHandles[activeId].enter(); }
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

  /* el mateix trencament que el CSS d'apaisat */
  var landscapeMq = global.matchMedia ? global.matchMedia('(max-height: 480px)') : null;
  function isLandscape() { return !!(landscapeMq && landscapeMq.matches); }

  function spell(pc) { return CANON[Theory.mod12(pc)]; }
  function useFlats(pc) { return FLAT_PCS.indexOf(Theory.mod12(pc)) !== -1; }

  /**
   * Nombre de una nota del acorde: los grados bemoles se escriben con
   * bemol (la b3 de Cm7 es Eb, no D#), los sostenidos con sostenido
   * (la #5 de Caug es G#) y el resto según la fundamental.
   */
  function spellDegree(pc, degree) {
    var flats = degree && degree.charAt(0) === 'b' ? true
      : degree && degree.charAt(0) === '#' ? false
        : useFlats(state.rootPc);
    return Theory.pcName(pc, { flats: flats });
  }
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

  var WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
  var KB_KEYS = 10;          // teclas blancas por teclado, fijas
  var KB_HEIGHT = 178;       // alto de las blancas: tecla llarga, de piano de debo

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

    // Dentro del círculo, solo el número de dedo: de quina mà és ja ho
    // diu la capçalera del teclat. El nom de la nota va debajo.
    var marks = midis.map(function (m, i) {
      var deg = degreeOfMidi(m);
      return {
        midi: m, label: String(fingers[i]),
        flats: deg ? deg.charAt(0) === 'b' : flats,
        /* mentre l'slider mana, el que encara no sona va de fantasma */
        ghost: !!(arp && !arp.played[m]),
        role: Theory.mod12(m) === Theory.mod12(state.rootPc) ? 'root' : 'chord'
      };
    });

    var win = kbWindow(midis);
    var svg = Piano.render({
      from: win.from, keys: win.keys, midiMarks: marks, playable: false,
      labels: 'none', footLabels: 'marked', fluid: true, keyHeight: KB_HEIGHT
    });

    // La caja lleva la proporción exacta del dibujo: así no sobra hueco
    // y los dos teclados quedan pegados en el centro.
    var boxW = Number(svg.getAttribute('data-width')) || (win.keys * 34 + 2);
    var boxH = KB_HEIGHT + 18;
    var diagram = h('div', {
      class: 'diagram',
      style: 'aspect-ratio:' + boxW + '/' + boxH
    }, [svg]);

    // El dedo ya va escrito en cada tecla: la cabecera solo dice de qué
    // mano es, en su lado y por fuera, para no separar los teclados.
    var head = h('div', { class: 'kb-head kb-' + hand.toLowerCase() }, [
      h('span', { text: hand === 'R' ? 'dreta' : 'esquerra' })
    ]);
    return h('div', { class: 'kb' }, hand === 'L' ? [head, diagram] : [diagram, head]);
  }

  /* ----------------------------------------------------------------
     Entrar l'acord amb un slider: arrossegues i tu decideixes quan
     entra cada nota (de la mes greu cap amunt, so de pad que es queda
     sonant); enrere, les notes surten en ordre invers. En deixar anar,
     el que sona es queda fins que ho tornis a moure o canviis res.
     ---------------------------------------------------------------- */
  var arp = null;     /* { notes, level, voices, played } mentre en sona alguna */
  var arpUI = null;   /* { track, bar, thumb } de l'slider viu */

  function arpNotes() {
    var total = voicings(RH_BASE).length;
    var rh = rhVoicing(Math.min(state.posP, total - 1));
    var lh = lhVoicing(rh[0]);
    var all = lh.concat(rh).sort(function (a, b) { return a - b; });
    return all.filter(function (m, i) { return i === 0 || m !== all[i - 1]; });
  }

  function paintPiano(fx) {
    var total = voicings(RH_BASE).length;
    if (state.posP >= total) { state.posP = 0; }
    var rh = rhVoicing(state.posP);
    var lh = lhVoicing(rh[0]);
    // izquierda arriba, derecha abajo, con el slider entremedio
    fill(shell.panels.piano.kbL, [keyboard(lh, 'L')], fx);
    fill(shell.panels.piano.kbR, [keyboard(rh, 'R')], fx);
  }

  var ARP_BARS = 26;   /* més barres que notes: una ona, no un compte */

  /* alçades pseudoaleatòries però deterministes per acord: canvien
     quan canvia l'acord, no a cada repintat */
  function arpWave(seed) {
    var hs = [];
    var t = (seed * 2654435761) >>> 0;
    for (var i = 0; i < ARP_BARS; i++) {
      t = (t * 1103515245 + 12345) >>> 0;
      var r = (t >>> 16) / 65536;
      var wave = .5 + .5 * Math.sin(i * .82 + seed % 7);
      hs.push(Math.round(16 + 44 * wave * (.45 + .55 * r) + 12 * r));
    }
    return hs;
  }

  function arpPaintUI(frac, level) {
    if (!arpUI) { return; }
    var on = Math.round(frac * arpUI.bars.length);
    arpUI.bars.forEach(function (b, i) {
      if (i < on) { b.classList.add('on'); } else { b.classList.remove('on'); }
    });
    arpUI.track.setAttribute('aria-valuenow', level);
  }

  function stopArp(skipPaint) {
    if (!arp) { return; }
    Object.keys(arp.voices).forEach(function (m) { arp.voices[m].release(); });
    arp = null;
    arpPaintUI(0, 0);
    if (!skipPaint) { paintPiano(); }
  }

  /* el nivell k = quantes notes sonen; pujar n'enceta, baixar n'apaga */
  function arpSetLevel(k) {
    if (!arp) {
      if (k <= 0) { return; }
      Sound.ready();
      arp = { notes: arpNotes(), level: 0, voices: {}, played: {} };
    }
    k = Math.max(0, Math.min(arp.notes.length, k));
    if (k === arp.level) { return; }
    while (arp.level < k) {
      var m = arp.notes[arp.level];
      arp.voices[m] = Sound.padOn(m);
      arp.played[m] = true;
      arp.level += 1;
    }
    while (arp.level > k) {
      arp.level -= 1;
      var m2 = arp.notes[arp.level];
      if (arp.voices[m2]) { arp.voices[m2].release(); delete arp.voices[m2]; }
      delete arp.played[m2];
    }
    if (arp.level === 0) { arp = null; }
    paintPiano();
  }

  function arpSlider() {
    var notes = arpNotes();
    var total = notes.length;
    var seed = notes.reduce(function (a, m) { return a + m; }, 17) + total * 31;
    var bars = arpWave(seed).map(function (hh) {
      return h('i', { class: 'arp-bar', style: 'height:' + hh + '%' });
    });
    var track = h('div', {
      class: 'arp-track', role: 'slider', tabindex: '0',
      'aria-label': 'Entrar l\u2019acord nota a nota',
      'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0'
    }, bars);

    /* continu: la barra segueix el dit tal qual, i cada nota entra en
       creuar la seva fraccio del recorregut */
    function moveTo(ev) {
      if (!track.getBoundingClientRect) { return; }
      var r = track.getBoundingClientRect();
      if (!r.width) { return; }
      var frac = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      var level = Math.floor(frac * total + 0.0001);
      arpPaintUI(frac, level);
      arpSetLevel(level);
    }

    track.addEventListener('pointerdown', function (ev) {
      if (ev.preventDefault) { ev.preventDefault(); }
      moveTo(ev);
      function move(e) {
        moveTo(e);
      }
      function up() {
        track.removeEventListener('pointermove', move);
        track.removeEventListener('pointerup', up);
        track.removeEventListener('pointercancel', up);
      }
      track.addEventListener('pointermove', move);
      track.addEventListener('pointerup', up);
      track.addEventListener('pointercancel', up);
      try {
        if (track.setPointerCapture && ev.pointerId !== undefined) {
          track.setPointerCapture(ev.pointerId);
        }
      } catch (e) { /* la captura es un extra */ }
    });

    arpUI = { track: track, bars: bars };
    return h('div', { class: 'arp' }, [track]);
  }

  /* ---------------- contenido: guitarra ---------------- */
  function guitarContent() {
    var list = shapes();
    if (!list.length) {
      return [h('div', { class: 'empty' }, [
        h('b', { text: 'sense posició estàndard' }),
        h('span', {
          text: 'Les notes són ' + chordNotes().map(function (n) {
            return Theory.pcName(n.pc, { flats: useFlats(state.rootPc) });
          }).join(' · ') + '.'
        })
      ])];
    }

    if (state.posG >= list.length) { state.posG = 0; }
    var shape = list[state.posG];
    var box = Fret.chordBox(shape, {
      size: 1, rootPc: state.rootPc, fluid: true, playable: false,
      /* mut, i sobretot: sense gestors que li robin el gest de lliscar
         al carrusel (al mobil, preventDefault el deixava clavat) */
      horizontal: isLandscape()      /* en apaisat, el mastil s'ajeu */
    });
    return [h('div', { class: 'diagram narrow' }, [box])];
  }

  /* ---------------- capa fija de abajo ---------------- */
  function bassOfShape(shape) {
    var midis = Fret.shapeMidi(shape);
    return midis.length ? Theory.mod12(midis[0]) : state.rootPc;
  }

  function pagerData(ins) {
    if ((ins || state.ins) === 'piano') {
      var v = voicings(RH_BASE);
      return {
        index: Math.min(state.posP, v.length - 1),
        items: v.map(function (notes, i) {
          return { title: slashSymbol(notes[0]), sub: INV_NAMES[i] || 'inversió' };
        }),
        onChange: function (n) {
          change(function () { state.posP = n; }, { keepTitle: true, keepWheel: true });
        }
      };
    }
    var list = shapes();
    if (!list.length) {
      return {
        index: 0, items: [{ title: symbol(), sub: 'sense posicions' }],
        onChange: function () {}
      };
    }
    return {
      index: Math.min(state.posG, list.length - 1),
      items: list.map(function (shape) {
        return {
          title: slashSymbol(bassOfShape(shape)),
          sub: (shape.label || 'posició') + (shape.base > 1 ? ' · trast ' + shape.base : '')
        };
      }),
      onChange: function (n) {
        change(function () { state.posG = n; }, { keepTitle: true, keepWheel: true });
      }
    };
  }

  /* ----------------------------------------------------------------
     La roda: totes les inversions (o posicions) en una tira que es
     llisca. La del mig es llegeix neta; les del costat es fan petites,
     es desdibuixen i s'aparten, com una roda que gira. Cap fletxa.
     ---------------------------------------------------------------- */
  var WH_W = 118;          /* ample d'una peca; el mateix que al CSS */
  var WH_P = 46;           /* coixi interior: el limit fisic mai no es una peca */
  var WH_R = 560;          /* el radi del dial, ben gran */
  /* l'angle per pas: el que fa que la corda de l'arc valgui un pas */
  var WH_THETA = Math.asin(WH_W / WH_R) * 180 / Math.PI;
  var wheels = {};         /* una roda per instrument, dins de la seva seccio */
  var wheelTimer = null;

  function wheelPaint(el) {
    var wheelEl = el;
    if (!wheelEl) { return; }
    var kids = wheelEl.children;
    var at = ((wheelEl.scrollLeft || 0) - WH_P) / WH_W;
    for (var i = 0; i < kids.length; i++) {
      var d = Math.abs(i - at);
      var off = i - at;
      /* dial de debo: totes les peces al mateix punt (es desfa el pas
         de la fila) i despres giren al voltant d'un centre profund; el
         radi els dona el desplaçament, la inclinacio i la caiguda */
      kids[i].style.transform = 'translateX(' + (-off * WH_W).toFixed(1) + 'px)'
        + ' rotate(' + (off * WH_THETA).toFixed(2) + 'deg)';
      kids[i].style.opacity = (1 - 0.62 * Math.min(d, 1)).toFixed(3);
      kids[i].classList.toggle('on', d < 0.5);
    }
  }

  function wheelSettle(el, onChange, current) {
    var at = Math.round(((el.scrollLeft || 0) - WH_P) / WH_W);
    var n = Math.max(0, Math.min(el.children.length - 1, at));
    if (n !== current) { onChange(n); }
  }

  function wheel(ins) {
    var d = pagerData(ins);
    var strip = h('div', {
      class: 'wheel', role: 'listbox', 'aria-label': 'Inversions i posicions'
    });

    d.items.forEach(function (it, i) {
      strip.appendChild(h('button', {
        class: 'wh-item', type: 'button', role: 'option',
        'aria-selected': i === d.index ? 'true' : 'false',
        onclick: function () {
          /* tocar-ne una del costat la porta al centre */
          if (i === d.index) { return; }
          if (strip.scrollTo) { strip.scrollTo({ left: WH_P + i * WH_W, behavior: 'smooth' }); }
          else { strip.scrollLeft = WH_P + i * WH_W; }
          wheelPaint(strip);
          d.onChange(i);
        }
      }, [h('b', { text: it.title }), h('span', { text: it.sub })]));
    });

    /* un repintat per frame com a molt: el scroll dispara mes
       esdeveniments que frames i pintar-los tots es malbaratar-los */
    var rafPending = false;
    strip.addEventListener('scroll', function () {
      if (!rafPending) {
        rafPending = true;
        (global.requestAnimationFrame || global.setTimeout)(function () {
          rafPending = false;
          wheelPaint(strip);
        });
      }
      if (wheelTimer && global.clearTimeout) { global.clearTimeout(wheelTimer); }
      wheelTimer = global.setTimeout(function () {
        wheelSettle(strip, d.onChange, d.index);
      }, 110);
    });

    wheels[ins] = strip;
    strip.scrollLeft = WH_P + d.index * WH_W;
    wheelPaint(strip);
    return strip;
  }

  /* ---------------- título: el mando ---------------- */
  function titleContent() {
    var notes = chordNotes();
    var kind = Theory.CHORDS[state.quality].name.toLowerCase();
    var ext = suffix();

    var rootTok = h('button', {
      class: 'tok tok-root' + (openKind === 'root' ? ' active' : ''),
      type: 'button', text: spell(state.rootPc),
      'aria-haspopup': 'dialog',
      'aria-label': 'Canviar la fonamental, ara ' + spell(state.rootPc),
      onclick: function () { openSheet('root'); }
    });

    // El major es mostra com Cmaj, amb el sufix a plena visibilitat:
    // així la fonamental queda on toca dins d'una paraula completa
    // i el sufix sempre es pot clicar.
    var extTok = h('button', {
      class: 'tok tok-ext' + (openKind === 'ext' ? ' active' : ''),
      type: 'button', text: ext || 'maj',
      'aria-haspopup': 'dialog',
      'aria-label': 'Canviar extensió, ara ' + kind,
      onclick: function () { openSheet('ext'); }
    });

    var kindBtn = h('button', {
      class: 'line-ext' + (openKind === 'ext' ? ' active' : ''),
      type: 'button', text: kind,
      'aria-haspopup': 'dialog',
      'aria-label': 'Canviar extensió, ara ' + kind,
      onclick: function () { openSheet('ext'); }
    });

    /* la mateixa marca que la icona de l'app: un teclat amb una
       tecla alcada, que es justament el que obre */
    var pianoBtn = h('button', {
      class: 'piano-btn', type: 'button',
      'aria-label': 'Pianet lliure',
      html: PIANO_MARK,
      onclick: function () { if (global.Tools) { global.Tools.openFreePiano(); } }
    });

    /* el lockup del joc, en miniatura: la seva propia marca fa de boto */
    var quinaBtn = h('button', {
      class: 'quina-btn', type: 'button',
      'aria-label': 'L\u2019acord del dia: el joc',
      onclick: function () { if (global.Quina && global.Quina.open) { global.Quina.open(); } }
    }, [h('span', { class: 'qm' }, [
      h('i', { class: 'qm1', text: 'L\u2019acord' }),
      h('i', { class: 'qm2', text: 'del' }),
      h('i', { class: 'qm3', text: 'dia' }, [h('u', { class: 'qm-dot' })])
    ])]);

    var trainBtn = h('button', {
      class: 'train-btn', type: 'button',
      'aria-label': 'Pr\u00e0ctica d\u2019o\u00efda',
      onclick: function () { if (global.Tools) { global.Tools.openPractice(); } }
    }, [h('i')]);

    var lookBtn = h('button', {
      class: 'look-btn', type: 'button',
      'aria-label': 'Ajustos: color, lletra i so',
      'aria-haspopup': 'dialog',
      onclick: function () { openSheet('look'); }
    }, [h('i'), h('i'), h('i')]);

    return [
      quinaBtn,
      trainBtn,
      lookBtn,
      pianoBtn,
      h('h1', { class: 'chord-name' }, [rootTok, extTok]),
      h('div', { class: 'chord-line' }, [
        kindBtn,
        h('em', {
          text: notes.map(function (n) { return spellDegree(n.pc, n.degree); }).join(' ')
        })
      ]),
      /* la primera vegada, una pista; al primer canvi, fora per sempre */
      read('coached', '') ? null : h('div', {
        class: 'coach', 'aria-hidden': 'true',
        text: 'toca la lletra per canviar l\u2019acord'
      })
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

  /**
   * Los selectores van por niveles de popularidad (rootTiers y tier en
   * data/chords.json): lo más tocado, grande; lo raro, pequeño.
   */
  function sheetBody(kind) {
    var wrap = h('div', {});
    var idx = 0;

    if (kind === 'look') {
      /* cada grup, com un sistema de particel·la: clau, icona i opcions */
      var group = function (icon, grid) {
        /* la icona al mig d'un filet: ----- icona ----- i a sota, les opcions */
        return h('div', { class: 'grp' }, [
          h('div', { class: 'grp-head' }, [
            h('span', { class: 'grp-icon', 'aria-hidden': 'true', text: icon })
          ]),
          grid
        ]);
      };

      /* l'instrument: la tria mare de la plataforma */
      var instr = h('div', { class: 'opt-grid modes' });
      [['piano', 'piano'], ['guitar', 'guitarra']].forEach(function (m) {
        instr.appendChild(option(m[1], {
          pressed: state.ins === m[0],
          index: idx++,
          onPick: function () { closeSheet(); setInstrument(m[0]); }
        }));
      });
      wrap.appendChild(group('\u266C', instr));

      var modes = h('div', { class: 'opt-grid modes' });
      [['dark', 'fosc'], ['light', 'clar']].forEach(function (m) {
        modes.appendChild(option(m[1], {
          pressed: state.theme === m[0],
          index: idx++,
          onPick: function () { setTheme(m[0]); closeSheet(); }
        }));
      });
      wrap.appendChild(group('\u25D0', modes));

      /* el so: la veu amb que sona tot el que toques */
      var voices = h('div', { class: 'opt-grid voices' });
      VOICES.forEach(function (v) {
        voices.appendChild(option(v.name, {
          pressed: state.voice === v.id,
          index: idx++,
          onPick: function () { setVoicePref(v.id); closeSheet(); }
        }));
      });
      wrap.appendChild(group('\u266A', voices));
      return wrap;
    }

    if (kind === 'root') {
      var tiers = global.ChordData.rootTiers || [CANON];
      tiers.forEach(function (names, ti) {
        var grid = h('div', { class: 'opt-grid roots tier' + (ti + 1) });
        names.forEach(function (name) {
          var pc = Theory.nameToPc(name);
          grid.appendChild(option(spell(pc), {
            pressed: pc === state.rootPc,
            index: idx++,
            onPick: (function (p) { return function () { pick(p, state.quality); }; })(pc)
          }));
        });
        wrap.appendChild(grid);
      });
      return wrap;
    }

    [1, 2, 3].forEach(function (tier) {
      var types = global.ChordData.types.filter(function (t) { return (t.tier || 3) === tier; });
      if (!types.length) { return; }
      var grid = h('div', { class: 'opt-grid exts tier' + tier });
      types.forEach(function (t) {
        grid.appendChild(option(t.suffix || 'maj', {
          pressed: t.id === state.quality,
          index: idx++,
          onPick: function () { pick(state.rootPc, t.id); }
        }));
      });
      wrap.appendChild(grid);
    });
    return wrap;
  }

  function openSheet(kind) {
    // als plans d'eines el títol està dissolt: no s'obre res des d'allà
    if (!INSTRUMENTS[activeId]) { return; }
    if (kind !== 'look' && !read('coached', '')) { write('coached', '1'); }
    if (sheetEl) { closeSheet(); }
    openKind = kind;

    var panel = h('div', {
      class: 'sheet', 'data-kind': kind, role: 'dialog', 'aria-modal': 'true',
      'aria-label': kind === 'root' ? 'Triar la fonamental'
        : (kind === 'look' ? 'Aparença' : 'Triar extensió')
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

  /* ---------------- el cambio: desenfocar, cambiar, enfocar ----------------
     keepTitle: en un canvi d'inversio o posicio el nom de dalt no canvia,
     aixi que no te sentit desenfocar-lo. */
  function change(mutate, o) {
    var keep = o || {};
    stopArp(true);   /* el que sonava ja no es el que es veura */
    if (busy || reducedMotion()) {
      mutate();
      render(true, keep);
      return;
    }
    busy = true;
    if (shell.panels.guitar) { blurOut(shell.panels.guitar.inner); }
    /* al piano, els nius son fixos: es desenfoquen els teclats de dins,
       no els nius (que la classe s'hi quedaria per sempre) */
    if (shell.panels.piano) {
      blurOut(shell.panels.piano.kbL);
      blurOut(shell.panels.piano.kbR);
    }
    if (!keep.keepTitle) { blurOut(shell.topInner); }
    /* la roda de baix no es desdibuixa mai: ja te la seva propia
       manera de dir que hi ha, i el blur alla no s'entenia */
    global.setTimeout(function () {
      busy = false;
      mutate();
      render(true, keep);
    }, OUT_MS);
  }

  /* ---------------- instrumento ---------------- */
  /**
   * Activar un pla: als extrems (eines) les capes fixes es dissolen;
   * al mig (instruments) tornen, i el paginador es refà. L'afinador
   * engega el micròfon en arribar-hi i el deixa anar en marxar.
   */
  function activate(id) {
    if (id === activeId) { return; }
    var prev = activeId;
    activeId = id;
    stopArp();
    if (toolHandles[prev] && toolHandles[prev].leave) { toolHandles[prev].leave(); }
    if (toolHandles[id] && toolHandles[id].enter) { toolHandles[id].enter(); }
    shell.root.classList.toggle('on-tool', !TOPPED[id]);
    if (INSTRUMENTS[id]) {
      state.ins = id;
      write('ins', id);
    }
  }

  /** Anar a un pla concret (teclat o codi), amb lliscament suau. */
  function goTo(id) {
    var idx = PANELS.indexOf(id);
    if (idx === -1) { return; }
    var deck = shell.deck;
    if (deck.clientWidth) {
      if (deck.scrollTo) {
        deck.scrollTo({ left: idx * deck.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
      } else {
        deck.scrollLeft = idx * deck.clientWidth;
      }
    }
    activate(id);
  }

  var deckStillTimer = null;

  function onDeckScroll() {
    /* mentre la pagina llisca, la bruixola calla: s'esvaeix i torna
       quan el pla ha encaixat */
    shell.root.classList.add('deck-moving');
    if (deckStillTimer && global.clearTimeout) { global.clearTimeout(deckStillTimer); }
    deckStillTimer = global.setTimeout(function () {
      shell.root.classList.remove('deck-moving');
    }, 150);

    var deck = shell.deck;
    // el fos de les capes és immediat, perquè es vegi mentre llisques
    if (deck.clientWidth) {
      var near = Math.round(deck.scrollLeft / deck.clientWidth);
      near = Math.max(0, Math.min(PANELS.length - 1, near));
      shell.root.classList.toggle('on-tool', !TOPPED[PANELS[near]]);
    }
    if (scrollTimer) { global.clearTimeout(scrollTimer); }
    scrollTimer = global.setTimeout(function () {
      scrollTimer = null;
      if (!deck.clientWidth) { return; }
      var idx = Math.round(deck.scrollLeft / deck.clientWidth);
      activate(PANELS[Math.max(0, Math.min(PANELS.length - 1, idx))]);
    }, 110);
  }

  /* ---------------- armazón y pintado ---------------- */
  function buildShell(root) {
    var deck = h('div', { class: 'deck' });
    var panels = {};
    if (global.Tools) {
      /* afinador i tempo comparteixen un sol pla, partit per la meitat */
      var tn = global.Tools.tuner();
      var mt = global.Tools.metronome();
      toolHandles.eines = {
        el: h('div', { class: 'tools-split' }, [tn.el, mt.el]),
        enter: function () {
          if (tn.enter) { tn.enter(); }
          if (mt.enter) { mt.enter(); }
        },
        leave: function () {
          if (tn.leave) { tn.leave(); }
          if (mt.leave) { mt.leave(); }
        }
      };
    }
    PANELS.forEach(function (p) {
      if (INSTRUMENTS[p] || p === 'cercle') {
        /* l'escenari (diagrames) i, just a sota, la roda de la seccio:
           es seva, hi llisca i queda a l'altura que li toca */
        var stage = h('div', { class: 'stage' });
        var wheelHost = h('div', { class: 'wheel-host' });
        var inner = h('div', { class: 'panel-inner' }, [stage, wheelHost]);
        deck.appendChild(h('div', { class: 'panel', 'data-ins': p }, [inner]));
        panels[p] = { inner: stage, wheelHost: wheelHost };
        if (p === 'piano') {
          /* nius fixos: teclat esquerre, slider entremig, teclat dret.
             Aixi cada nota repinta els teclats sense matar l'slider
             que tens sota el dit. */
          panels.piano.kbL = h('div', { class: 'kb-slot' });
          panels.piano.arpHost = h('div', { class: 'arp-host' });
          panels.piano.kbR = h('div', { class: 'kb-slot' });
          stage.appendChild(panels.piano.kbL);
          stage.appendChild(panels.piano.arpHost);
          stage.appendChild(panels.piano.kbR);
        }
      } else {
        deck.appendChild(h('div', { class: 'panel panel-tool', 'data-ins': p },
          toolHandles[p] ? [toolHandles[p].el] : []));
      }
    });
    deck.addEventListener('scroll', onDeckScroll, { passive: true });

    var topInner = h('div', { class: 'pinned-inner' });

    root.innerHTML = '';
    root.appendChild(deck);
    root.appendChild(h('div', { class: 'pinned pinned-top' }, [topInner]));

    return { root: root, deck: deck, panels: panels, topInner: topInner };
  }

  /* el cercle de quintes: l'acord viu de l'app hi surt marcat, i el
     que s'hi toca puja com a acord de l'app i s'apunta a la seqüència.
     La instància persisteix entre renders: així la roda pot GIRAR amb
     transició quan canvia la tonalitat, en lloc de renéixer. */
  var cercleInst = null;
  var cRec = false;   /* s'està creant una roda (no es guarda: és un gest) */

  function cercleOpts() {
    return {
      keyIdx: state.cIdx,
      curPc: state.rootPc,
      curQuality: state.quality,
      seq: state.cSeq,
      rec: cRec,
      coach: !read('coachC', '')
    };
  }

  function liveChord(info) {
    state.rootPc = info.pc;
    state.quality = info.quality;
    state.posG = 0;
    state.posP = 0;
    write('root', String(state.rootPc));
    write('quality', info.quality);
  }

  /* progressions de la casa: per aprendre'n el gust, amb alguna
     modulacio (acords de fora que estiren cap a una tonalitat veïna) */
  var PROGS = [
    { name: 'la de sempre', label: 'I · V · vi · IV',
      items: [{ d: 0, ring: 'out' }, { d: 1, ring: 'out' }, { d: 0, ring: 'in' }, { d: -1, ring: 'out' }] },
    { name: 'anys 50', label: 'I · vi · IV · V',
      items: [{ d: 0, ring: 'out' }, { d: 0, ring: 'in' }, { d: -1, ring: 'out' }, { d: 1, ring: 'out' }] },
    { name: 'jazz que torna', label: 'ii7 · V7 · Imaj7',
      items: [{ d: -1, ring: 'in', q: 'min7' }, { d: 1, ring: 'out', q: 'dom7' }, { d: 0, ring: 'out', q: 'maj7' }] },
    { name: 'andalusa', label: 'vi · V · IV · III',
      items: [{ d: 0, ring: 'in' }, { d: 1, ring: 'out' }, { d: -1, ring: 'out' }, { d: 4, ring: 'out' }] },
    { name: 'dominant secundària', label: 'I · III7 · vi · IV',
      items: [{ d: 0, ring: 'out' }, { d: 4, ring: 'out', q: 'dom7' }, { d: 0, ring: 'in' }, { d: -1, ring: 'out' }] },
    { name: 'cap a la dominant', label: 'I · IV · II7 · V',
      items: [{ d: 0, ring: 'out' }, { d: -1, ring: 'out' }, { d: 2, ring: 'out', q: 'dom7' }, { d: 1, ring: 'out' }] },
    { name: 'pachelbel', label: 'I · V · vi · iii · IV · I · IV · V',
      items: [{ d: 0, ring: 'out' }, { d: 1, ring: 'out' }, { d: 0, ring: 'in' }, { d: 1, ring: 'in' },
        { d: -1, ring: 'out' }, { d: 0, ring: 'out' }, { d: -1, ring: 'out' }, { d: 1, ring: 'out' }] }
  ];

  function openProgSheet() {
    if (sheetEl) { closeSheet(); }
    openKind = 'progs';
    var rows = PROGS.map(function (pg, i) {
      return h('button', {
        class: 'prog-row', type: 'button', style: '--i:' + i,
        onclick: function () {
          state.cSeq = pg.items.map(function (it) {
            return { d: it.d, ring: it.ring, q: it.q };
          });
          write('cseq', JSON.stringify(state.cSeq));
          cRec = false;
          closeSheet();
          render(false);
        }
      }, [
        h('b', { text: pg.label }),
        h('span', { text: pg.name })
      ]);
    });
    sheetEl = h('div', { class: 'sheet-wrap' }, [
      h('div', { class: 'sheet-backdrop', onclick: function () { closeSheet(); } }),
      h('div', {
        class: 'sheet progs', 'data-kind': 'progs', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'Progressions d’exemple'
      }, rows)
    ]);
    document.body.appendChild(sheetEl);
  }

  function cercleContent() {
    if (!cercleInst) {
      cercleInst = Cercle.create({
        onTap: function (info) {
          if (cRec) {
            /* creant la roda: cada toc s'hi apunta (vuit com a molt:
               una roda es un cicle, no una llista de la compra) */
            if (state.cSeq.length < 8) {
              state.cSeq.push({ d: info.d, ring: info.ring });
              write('cseq', JSON.stringify(state.cSeq));
            }
            liveChord(info);
            render(false);
            return;
          }
          /* explorant: el toc ensenya com es toca */
          liveChord(info);
          render(false);
          openChordCard();
        },
        onChip: function (idx, info) {
          if (cRec) {
            /* mentre es crea, tocar-ne un de la línia el treu */
            state.cSeq.splice(idx, 1);
            write('cseq', JSON.stringify(state.cSeq));
            render(false);
            return;
          }
          /* la ronda fixada: la fitxa d'aquell acord, amb l'extensió editable */
          liveChord(info);
          render(false);
          openChordCard(idx);
        },
        decorate: function (info, item) {
          if (!item || !item.q || !Theory.CHORDS[item.q]) { return null; }
          return {
            quality: item.q,
            name: Theory.pcName(info.pc, { flats: useFlats(info.pc) }) + Theory.CHORDS[item.q].suffix
          };
        },
        onExplore: function () {
          openProgSheet();
        },
        onRound: function () {
          cRec = true;
          state.cSeq = [];
          write('cseq', '[]');
          render(false);
        },
        onDone: function () {
          cRec = false;
          render(false);
        },
        onClear: function () {
          state.cSeq = [];
          write('cseq', '[]');
          render(false);
        },
        onKey: function (n) {
          write('coachC', '1');
          state.cIdx = n;
          write('ckey', String(n));
          if (cercleInst) { cercleInst.update(cercleOpts()); }
        }
      });
    }
    cercleInst.update(cercleOpts());
    return cercleInst.el;
  }

  /* la fitxa emergent: COM ES TOCA l'acord viu amb L'instrument triat
     a la configuracio, en el format de l'app pero reduit */
  /* editIdx: si ve d'una ronda fixada, la fitxa duu l'acord EN GRAN amb
     l'extensi\u00f3 com a pe\u00e7a pr\u00f2pia, i les extensions per personalitzar-lo */
  function openChordCard(editIdx) {
    if (sheetEl) { closeSheet(); }
    openKind = 'card';

    var slot = h('div', { class: 'card-slot' });
    var editing = typeof editIdx === 'number' && !!state.cSeq[editIdx];

    function inner() {
      var deg = Cercle.degreeFor(state.rootPc, state.quality, state.cIdx);
      var body;
      if (state.ins === 'piano') {
        var rhAll = voicings(RH_BASE);
        var rh = rhVoicing(Math.min(state.posP, rhAll.length - 1));
        var lh = lhVoicing(rh[0]);
        body = h('div', { class: 'cfp-kbs' }, [keyboard(lh, 'L'), keyboard(rh, 'R')]);
      } else {
        body = h('div', { class: 'cfp-gtr' }, guitarContent());
      }

      /* l'acord en gran, partit com el t\u00edtol: fonamental + extensi\u00f3 */
      var big = h('b', { class: 'cfp-sym' }, [
        h('span', { text: spell(state.rootPc) }),
        h('i', { class: 'cfp-ext', text: suffix() || 'maj' })
      ]);

      /* el grau amb la seva inscripci\u00f3, i la funci\u00f3 en la veu que
         xiuxiueja (vegeu ESTIL.md) */
      var degEl;
      if (deg) {
        var minor = /^[a-z]/.test(deg.num);
        degEl = h('span', { class: 'cfp-deg' }, [
          h('span', {
            class: 'grau' + (minor ? ' min' : '') + ' g-' + deg.num.toLowerCase(),
            text: deg.num
          }),
          h('i', { class: 'cfp-fn', text: deg.fn })
        ]);
      } else {
        degEl = h('span', { class: 'cfp-deg' }, [
          h('i', { class: 'cfp-fn', text: 'fora de la tonalitat' })
        ]);
      }

      var kids = [
        h('div', { class: 'cfp-head' }, [big, degEl]),
        body
      ];

      if (editing) {
        var extWrap = h('div', { class: 'card-exts' });
        var oi = 0;
        [1, 2, 3].forEach(function (tier) {
          var types = global.ChordData.types.filter(function (tp) { return (tp.tier || 3) === tier; });
          if (!types.length) { return; }
          var grid = h('div', { class: 'opt-grid exts tier' + tier });
          types.forEach(function (tp) {
            grid.appendChild(option(tp.suffix || 'maj', {
              pressed: tp.id === state.quality,
              index: oi++,
              onPick: function () {
                var item = state.cSeq[editIdx];
                if (!item) { return; }
                item.q = tp.id;
                write('cseq', JSON.stringify(state.cSeq));
                state.quality = tp.id;
                write('quality', tp.id);
                render(false);
                paintCard();
                if (global.Cercle && Cercle.play) { Cercle.play(state.rootPc, tp.id); }
              }
            }));
          });
          extWrap.appendChild(grid);
        });
        kids.push(extWrap);
      }

      return h('div', { class: 'cfp' }, kids);
    }

    function paintCard() { fill(slot, [inner()]); }
    paintCard();

    /* la creu de sortir: dibuixada, al racó de la fitxa */
    var closeX = h('button', {
      class: 'card-x', type: 'button', 'aria-label': 'Tancar la fitxa',
      html: '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M5.5 5.5 L18.5 18.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
        + '<path d="M18.5 5.5 L5.5 18.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
        + '</svg>',
      onclick: function () { closeSheet(); }
    });

    sheetEl = h('div', { class: 'sheet-wrap' }, [
      h('div', { class: 'sheet-backdrop', onclick: function () { closeSheet(); } }),
      h('div', {
        class: 'sheet card', 'data-kind': 'card', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'Com es toca ' + symbol()
      }, [closeX, slot])
    ]);
    document.body.appendChild(sheetEl);
  }

  function render(fx, o) {
    var keep = o || {};
    if (shell.panels.guitar) { fill(shell.panels.guitar.inner, guitarContent(), fx); }
    if (shell.panels.piano) {
      paintPiano(fx);
      fill(shell.panels.piano.arpHost, [arpSlider()]);
    }
    fill(shell.panels.cercle.inner, [cercleContent()], fx);
    fill(shell.topInner, titleContent(), fx && !keep.keepTitle);

    WHEELED.filter(function (ins) { return shell.panels[ins]; }).forEach(function (ins) {
      var host = shell.panels[ins].wheelHost;
      if (keep.keepWheel && wheels[ins]) {
        /* mateixa roda: nomes canvia quina peca esta triada */
        var kids = wheels[ins].children;
        var at = pagerData(ins).index;
        for (var i = 0; i < kids.length; i++) {
          kids[i].setAttribute('aria-selected', i === at ? 'true' : 'false');
        }
      } else {
        fill(host, [wheel(ins)]);
      }
    });
  }

  function start() {
    restore();
    activeId = state.ins;
    shell = buildShell(document.getElementById('app'));
    render(false);

    // col·locar el deck al pla guardat, sense animació
    var idx = PANELS.indexOf(state.ins);
    if (shell.deck.clientWidth) { shell.deck.scrollLeft = idx * shell.deck.clientWidth; }

    /* l'empenta d'estrena: una ullada al pla del costat i tornar.
       Diu "aixo llisca" sense dir res. Un sol cop a la vida. */
    if (!read('nudged', '') && !reducedMotion()) {
      global.setTimeout(function () {
        if (activeId !== state.ins || sheetEl) { return; }
        var d = shell.deck;
        if (!d.clientWidth || !d.scrollTo) { return; }
        var here = d.scrollLeft;
        d.scrollTo({ left: here + 46, behavior: 'smooth' });
        global.setTimeout(function () {
          d.scrollTo({ left: here, behavior: 'smooth' });
          write('nudged', '1');
        }, 420);
      }, 1300);
    }

    if (landscapeMq && landscapeMq.addEventListener) {
      landscapeMq.addEventListener('change', function () {
        render(false);
        var i = PANELS.indexOf(activeId);
        if (shell.deck.clientWidth) { shell.deck.scrollLeft = i * shell.deck.clientWidth; }
      });
    }
    global.addEventListener('resize', function () {
      var i = PANELS.indexOf(activeId);
      if (shell.deck.clientWidth) { shell.deck.scrollLeft = i * shell.deck.clientWidth; }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && sheetEl) { closeSheet(); return; }
      if (sheetEl) { return; }
      var idx = PANELS.indexOf(activeId);
      if (ev.key === 'ArrowRight' && idx < PANELS.length - 1) { goTo(PANELS[idx + 1]); }
      if (ev.key === 'ArrowLeft' && idx > 0) { goTo(PANELS[idx - 1]); }
    });
  }

  global.Practice = {
    start: start,
    state: state,
    refresh: function () { render(false); },
    setInstrument: setInstrument,
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
