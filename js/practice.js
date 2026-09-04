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

  function paintPiano(fx) {
    var total = voicings(RH_BASE).length;
    if (state.posP >= total) { state.posP = 0; }
    var rh = rhVoicing(state.posP);
    var lh = lhVoicing(rh[0]);
    // izquierda arriba, derecha abajo, con el slider entremedio
    fill(shell.panels.piano.kbL, [keyboard(lh, 'L')], fx);
    fill(shell.panels.piano.kbR, [keyboard(rh, 'R')], fx);
  }

  function arpPaintUI() { /* l'slider ja no existeix: res a pintar */ }

  function stopArp(skipPaint) {
    if (!arp) { return; }
    Object.keys(arp.voices).forEach(function (m) { arp.voices[m].release(); });
    arp = null;
    arpPaintUI(0, 0);
    if (!skipPaint) { paintPiano(); }
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
    var out = [h('div', { class: 'diagram narrow' }, [box])];

    /* mes posicions: la fletxa al final del diapaso, pero EN FLUX
       (ocupa el seu lloc sota el mastil: mai no es toca amb els
       cartells de baix). Les posicions van de mes avall a mes amunt. */
    if (list.length > 1) {
      out.push(h('div', { class: 'pos-row' }, [h('button', {
        class: 'pos-next', type: 'button',
        'aria-label': 'Més posicions',
        onclick: function () {
          change(function () {
            state.posG = (state.posG + 1) % list.length;
          }, { keepTitle: true });
        }
      }, [
        h('span', { text: 'més posicions' }),
        h('span', {
          class: 'pos-arrow',
          html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5 Q16.5 12 8 19.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
        })
      ])]));
    }
    return out;
  }

  /* ---------------- capa fija de abajo ---------------- */
  function bassOfShape(shape) {
    var midis = Fret.shapeMidi(shape);
    return midis.length ? Theory.mod12(midis[0]) : state.rootPc;
  }

  /* la inversio, en linia sota els teclats: el xifrat amb el baix,
     el seu nom, i una fletxa per passar a la seguent (com el "mes
     posicions" de la guitarra: un sol patro per a tota la casa) */
  function invControl() {
    var v = voicings(RH_BASE);
    var i = Math.min(state.posP, v.length - 1);
    if (v.length < 2) { return null; }
    return h('button', {
      class: 'inv-next', type: 'button',
      'aria-label': 'Canviar la inversió, ara ' + (INV_NAMES[i] || 'inversió'),
      onclick: function () {
        change(function () { state.posP = (i + 1) % v.length; }, { keepTitle: true });
      }
    }, [
      h('b', { text: slashSymbol(v[i][0]) }),
      h('span', { text: INV_NAMES[i] || 'inversió' }),
      h('span', {
        class: 'pos-arrow',
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5 Q16.5 12 8 19.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
      })
    ]);
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
      'aria-label': 'L’acord del dia: el joc',
      onclick: function () { if (global.Quina && global.Quina.open) { global.Quina.open(); } }
    }, [h('span', { class: 'qm' }, [
      h('i', { class: 'qm1', text: 'L’acord' }),
      h('i', { class: 'qm2', text: 'del' }),
      h('i', { class: 'qm3', text: 'dia' }, [h('u', { class: 'qm-dot' })])
    ])]);

    var lookBtn = h('button', {
      class: 'look-btn', type: 'button',
      'aria-label': 'Ajustos: color, lletra i so',
      'aria-haspopup': 'dialog',
      onclick: function () { openSheet('look'); }
    }, [h('i'), h('i'), h('i')]);

    return [
      quinaBtn,
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
          /* nius fixos: un teclat per ma, i la inversio ARRAN del
             teclat (si anes a baix, es confondria amb els cartells) */
          panels.piano.kbL = h('div', { class: 'kb-slot' });
          panels.piano.kbR = h('div', { class: 'kb-slot' });
          panels.piano.invHost = h('div', { class: 'inv-host' });
          stage.appendChild(panels.piano.kbL);
          stage.appendChild(panels.piano.kbR);
          stage.appendChild(panels.piano.invHost);
        }
        if (INSTRUMENTS[p]) {
          /* 15) els retols de cami: eines a l'esquerra, explora a la dreta */
          inner.appendChild(h('button', {
            class: 'sign sign-l', type: 'button',
            'aria-label': 'Afinador i tempo',
            onclick: function () { goTo('eines'); }
          }, [h('span', { class: 'sign-ico', text: '\uD83C\uDF9B \u23F1' }), h('b', { text: 'eines' })]));
          inner.appendChild(h('button', {
            class: 'sign sign-r', type: 'button',
            'aria-label': 'El cercle de quintes',
            onclick: function () { goTo('cercle'); }
          }, [h('b', { text: 'explora!' })]));
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

  /* ----------------------------------------------------------------
     La postal de la roda: una imatge 1080x1350 amb els acords, els
     graus i com es toquen (l'instrument triat), per guardar o
     compartir. Tot dibuixat a ma sobre canvas, amb les tres veus.
     ---------------------------------------------------------------- */
  function postalChord(item) {
    var i = ((state.cIdx + item.d) % 12 + 12) % 12;
    var info = Cercle.infoFor(i, item.ring, state.cIdx);
    var q = item.q && Theory.CHORDS[item.q] ? item.q : info.quality;
    return {
      pc: info.pc,
      q: q,
      name: Theory.pcName(info.pc, { flats: useFlats(info.pc) }) + Theory.CHORDS[q].suffix,
      deg: info.deg
    };
  }

  function postalKeys(ctx, x, y, w, hh, pc, q) {
    /* un teclat de 10 blanques amb l'acord marcat, des de la blanca
       de sota de la fonamental */
    var WHITE = [0, 2, 4, 5, 7, 9, 11];
    var from = pc;
    while (WHITE.indexOf(((from % 12) + 12) % 12) === -1) { from -= 1; }
    from -= 2;
    while (WHITE.indexOf(((from % 12) + 12) % 12) === -1) { from -= 1; }
    var pcs = Theory.buildChord(pc, q).map(function (n) { return n.pc; });
    var kw = w / 10;
    var whites = [];
    var m = from;
    while (whites.length < 10) {
      if (WHITE.indexOf(((m % 12) + 12) % 12) !== -1) { whites.push(m); }
      m += 1;
    }
    var seen = {};
    whites.forEach(function (mid, k) {
      var kx = x + k * kw;
      var on = pcs.indexOf(((mid % 12) + 12) % 12) !== -1 && !seen[mid % 12];
      if (on) { seen[mid % 12] = true; }
      ctx.fillStyle = on ? '#DCC9A6' : '#C7C0B2';
      ctx.fillRect(kx + 1, y, kw - 2, hh);
    });
    /* negres per sobre */
    whites.slice(0, 9).forEach(function (mid, k) {
      var next = mid + 1;
      if (WHITE.indexOf(((next % 12) + 12) % 12) === -1) {
        var on = pcs.indexOf(((next % 12) + 12) % 12) !== -1 && !seen[next % 12];
        if (on) { seen[next % 12] = true; }
        ctx.fillStyle = on ? '#B08B3C' : '#161513';
        ctx.fillRect(x + (k + 1) * kw - kw * 0.32, y, kw * 0.64, hh * 0.62);
      }
    });
  }

  function postalFrets(ctx, x, y, w, hh, pc, q) {
    var list = Shapes.forChord(pc, q);
    if (!list.length) { postalKeys(ctx, x, y + hh * 0.2, w, hh * 0.6, pc, q); return; }
    var sh = list[0];
    var L = x + w * 0.12, R = x + w * 0.88;
    var sw = (R - L) / 5;
    var fh = hh / 4.6;
    ctx.strokeStyle = '#6A645C';
    ctx.lineWidth = 2;
    for (var c = 0; c < 6; c++) {
      ctx.beginPath();
      ctx.moveTo(L + c * sw, y + fh * 0.5);
      ctx.lineTo(L + c * sw, y + fh * 4.5);
      ctx.stroke();
    }
    for (var f = 0; f < 5; f++) {
      ctx.lineWidth = (f === 0 && sh.base === 1) ? 6 : 2;
      ctx.strokeStyle = (f === 0 && sh.base === 1) ? '#F2EFE9' : '#6A645C';
      ctx.beginPath();
      ctx.moveTo(L, y + fh * (0.5 + f));
      ctx.lineTo(R, y + fh * (0.5 + f));
      ctx.stroke();
    }
    sh.frets.forEach(function (fr, c) {
      var cx2 = L + c * sw;
      if (fr > 0) {
        var rel = fr - (sh.base > 1 ? sh.base - 1 : 0);
        ctx.fillStyle = '#DCC9A6';
        ctx.beginPath();
        ctx.arc(cx2, y + fh * (rel), fh * 0.34, 0, 7);
        ctx.fill();
      } else {
        ctx.strokeStyle = fr === 0 ? '#DCC9A6' : '#6A645C';
        ctx.lineWidth = 2.4;
        if (fr === 0) {
          ctx.beginPath();
          ctx.arc(cx2, y + fh * 0.1, fh * 0.2, 0, 7);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(cx2 - fh * 0.18, y - fh * 0.08);
          ctx.lineTo(cx2 + fh * 0.18, y + fh * 0.28);
          ctx.moveTo(cx2 + fh * 0.18, y - fh * 0.08);
          ctx.lineTo(cx2 - fh * 0.18, y + fh * 0.28);
          ctx.stroke();
        }
      }
    });
  }

  function savePostal() {
    if (!state.cSeq.length || !global.document.createElement) { return; }
    var chords = state.cSeq.slice(0, 8).map(postalChord);
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    if (!ctx) { return; }

    var paint = function () {
      /* el fons de la casa: negre calid, llum alta, vinyeta */
      ctx.fillStyle = '#060605';
      ctx.fillRect(0, 0, W, H);
      var g1 = ctx.createRadialGradient(W / 2, H * 0.3, 80, W / 2, H * 0.3, W * 0.9);
      g1.addColorStop(0, 'rgba(255,255,255,.07)');
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      var g2 = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      /* dalt: la tonalitat, en la veu de la musica */
      ctx.textAlign = 'center';
      ctx.fillStyle = '#948D83';
      ctx.font = '800 26px Outfit, sans-serif';
      ctx.fillText('L A   R O D A   E N', W / 2, 96);
      ctx.fillStyle = '#F4F1EB';
      ctx.font = '900 130px Fraunces, Georgia, serif';
      ctx.fillText(Cercle.KEYS[state.cIdx].maj, W / 2, 220);
      ctx.fillStyle = '#DCC9A6';
      ctx.font = 'italic 400 40px "Instrument Serif", Georgia, serif';
      ctx.fillText('major', W / 2, 272);

      /* la graella: nom + grau + com es toca */
      var n = chords.length;
      var cols = n <= 2 ? n : (n <= 4 ? 2 : (n <= 6 ? 3 : 4));
      var rows = Math.ceil(n / cols);
      var top = 340;
      var cw = (W - 120) / cols;
      var ch = Math.min(300, (H - top - 120) / rows);
      chords.forEach(function (c, k) {
        var col = k % cols, row = Math.floor(k / cols);
        var cx2 = 60 + col * cw + cw / 2;
        var cy2 = top + row * ch;
        ctx.fillStyle = '#F4F1EB';
        ctx.font = '900 ' + (n <= 4 ? 64 : 48) + 'px Outfit, sans-serif';
        ctx.fillText(c.name, cx2, cy2 + 56);
        if (c.deg) {
          var minor = /^[a-z]/.test(c.deg.num);
          ctx.fillStyle = '#DCC9A6';
          ctx.font = minor
            ? 'italic 400 30px "Instrument Serif", Georgia, serif'
            : '700 28px Fraunces, Georgia, serif';
          ctx.fillText(c.deg.num, cx2, cy2 + 96);
        }
        var dw = Math.min(cw - 44, 230);
        if (state.ins === 'guitar') {
          postalFrets(ctx, cx2 - dw / 2, cy2 + 116, dw, ch - 150, c.pc, c.q);
        } else {
          postalKeys(ctx, cx2 - dw / 2, cy2 + 122, dw, Math.min(ch - 170, 96), c.pc, c.q);
        }
      });

      /* el peu, discret */
      ctx.fillStyle = '#66605A';
      ctx.font = '800 22px Outfit, sans-serif';
      ctx.fillText('A C O R D S   ·   E L   C E R C L E   D E   Q U I N T E S', W / 2, H - 56);

      cv.toBlob(function (blob) {
        if (!blob) { return; }
        var file;
        try { file = new File([blob], 'roda.png', { type: 'image/png' }); } catch (e) { file = null; }
        if (file && global.navigator && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(function () { /* ha plegat */ });
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'roda.png';
        document.body.appendChild(a);
        a.click();
        global.setTimeout(function () {
          URL.revokeObjectURL(a.href);
          if (a.parentNode) { a.parentNode.removeChild(a); }
        }, 400);
      }, 'image/png');
    };

    /* que les lletres de debo hi siguin abans de pintar */
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(paint);
    } else {
      paint();
    }
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
        onSave: function () {
          savePostal();
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
      var degEl = null;
      if (deg) {
        var minor = /^[a-z]/.test(deg.num);
        degEl = h('span', { class: 'cfp-deg' }, [
          h('span', {
            class: 'grau' + (minor ? ' min' : '') + ' g-' + deg.num.toLowerCase(),
            text: deg.num
          }),
          h('i', { class: 'cfp-fn', text: deg.fn })
        ]);
      }

      var kids = [
        h('div', { class: 'cfp-head' }, degEl ? [big, degEl] : [big]),
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
    if (shell.panels.piano) { paintPiano(fx); }
    fill(shell.panels.cercle.inner, [cercleContent()], fx);
    fill(shell.topInner, titleContent(), fx && !keep.keepTitle);

    if (shell.panels.piano) {
      fill(shell.panels.piano.invHost, [invControl()]);
    }
  }

  function start() {
    restore();

    /* Al navegador del mobil (sense web app) la barra d'adreces creix
       i encongeix el viewport: l'alcada de l'app es fixa en pixels
       reals a cada canvi, i res no es trenca. */
    var appEl = document.getElementById('app');
    function fitApp() {
      var vh = (global.visualViewport && global.visualViewport.height) || global.innerHeight;
      if (vh && appEl) { appEl.style.height = Math.round(vh) + 'px'; }
    }
    fitApp();
    global.addEventListener('resize', fitApp);
    if (global.visualViewport && global.visualViewport.addEventListener) {
      global.visualViewport.addEventListener('resize', fitApp);
    }
    global.addEventListener('orientationchange', function () {
      global.setTimeout(fitApp, 250);
    });
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
