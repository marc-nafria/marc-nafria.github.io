/* ============================================================
   cercle.js — el cercle de quintes, per ENTENDRE, no per consultar.

   Una brúixola, no un pòster: el cercle es dibuixa sencer però
   només se'n veu l'arc de dalt, ben gran; la resta llisca fora
   de la pantalla. La RODA GIRA i la tonalitat és sempre a dalt,
   sota el marc fix de la família (IV·I·V a fora, ii·vi·iii a
   dins). Girar és transposar.

   ES GIRA AMB EL DIT: agafes la roda per on sigui i l'arrossegues;
   en deixar-la anar, encaixa a la tonalitat més propera. Cap
   control a banda: la roda és el control.

   Tocar una casella fa sonar l'acord i l'AFEGEIX A LA SEQÜÈNCIA,
   que es guarda per GRAUS: quan gires la roda, la mateixa
   seqüència es torna a marcar amb la tonalitat nova, i la línia
   de dalt es reescriu. Tocar un acord de la línia obre la fitxa
   de com es toca (piano i guitarra).
   ============================================================ */
(function (global) {
  'use strict';

  /* l'ordre de quintes, des de C en sentit horari */
  var PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  var MAJ = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  var MIN = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

  /* la família diatònica sobre el cercle: el veí esquerre, el lloc
     propi i el veí dret — a fora les majors, a dins els relatius */
  var DEG_OUT = {
    '-1': { num: 'IV', fn: 'subdominant' },
    '0':  { num: 'I', fn: 'tònica' },
    '1':  { num: 'V', fn: 'dominant' }
  };
  var DEG_IN = {
    '-1': { num: 'ii', fn: 'supertònica' },
    '0':  { num: 'vi', fn: 'relatiu menor' },
    '1':  { num: 'iii', fn: 'mediant' }
  };

  var NS = 'http://www.w3.org/2000/svg';
  var CX = 200, CY = 200;
  var R2 = 197, R1 = 146, R0 = 101;   /* vores: fora, mitja, dins */
  var GAP = 1.6;                       /* aire entre caselles, en graus */
  /* dues finestres: l'arc de dalt ampliat (bruixola) o el cercle sencer */
  var VIEW_CROP = '48 0 304 230';
  var VIEW_FULL = '-4 -4 408 408';

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function xy(aDeg, r) {
    var a = aDeg * Math.PI / 180;
    return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
  }

  function pt(aDeg, r) {
    var p = xy(aDeg, r);
    return p[0].toFixed(2) + ' ' + p[1].toFixed(2);
  }

  function sector(a0, a1, r0, r1) {
    return 'M ' + pt(a0, r1)
      + ' A ' + r1 + ' ' + r1 + ' 0 0 1 ' + pt(a1, r1)
      + ' L ' + pt(a1, r0)
      + ' A ' + r0 + ' ' + r0 + ' 0 0 0 ' + pt(a0, r0) + ' Z';
  }

  function labelAt(aDeg, r, cls, size, text) {
    var p = xy(aDeg, r);
    var t = el('text', {
      x: p[0].toFixed(2), y: p[1].toFixed(2),
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'class': cls, 'font-size': size
    });
    t.textContent = text;
    return t;
  }

  /* distància circular a la tonalitat: -5..6 passos de quinta */
  function rel(i, t) {
    var d = ((i - t) % 12 + 12) % 12;
    return d > 6 ? d - 12 : d;
  }

  function degOf(d, ring) {
    if (d < -1 || d > 1) { return null; }
    return ring === 'in' ? DEG_IN[d] : DEG_OUT[d];
  }

  function triad(pc, quality) {
    var root = 55 + ((pc - 7 + 12) % 12);   /* dins la finestra G3..F#4 */
    var steps = quality === 'min' ? [0, 3, 7] : [0, 4, 7];
    return steps.map(function (s) { return root + s; });
  }

  /* les notes de l'acord, per a qualsevol qualitat (la teoria mana;
     si no hi és, la tríada de sempre) */
  function chordMidis(pc, quality) {
    if ((quality !== 'maj' && quality !== 'min')
      && global.Theory && Theory.buildChord && Theory.CHORDS && Theory.CHORDS[quality]) {
      var root = 55 + ((pc - 7 + 12) % 12);
      var pcs = Theory.buildChord(pc, quality).map(function (n) { return n.pc; });
      var midis = [root];
      var prev = root;
      for (var i = 1; i < pcs.length && i < 5; i++) {
        var step = ((pcs[i] - (prev % 12)) % 12 + 12) % 12 || 12;
        prev += step;
        midis.push(prev);
      }
      return midis;
    }
    return triad(pc, quality);
  }

  function playChord(pc, quality) {
    if (!global.Sound || !Sound.padOn) { return; }
    Sound.ready();
    var voices = chordMidis(pc, quality).map(function (m) { return Sound.padOn(m); });
    global.setTimeout(function () {
      voices.forEach(function (v) { v.release(); });
    }, 900);
  }

  /* la casella i (anell out/in) vista des de la tonalitat t */
  function infoFor(i, ring, t) {
    var pc = ring === 'in' ? (PCS[i] + 9) % 12 : PCS[i];
    return {
      i: i, ring: ring, pc: pc,
      quality: ring === 'in' ? 'min' : 'maj',
      name: ring === 'in' ? MIN[i] : MAJ[i],
      d: rel(i, t),
      deg: degOf(rel(i, t), ring)
    };
  }

  /**
   * Es crea UNA vegada (la roda persisteix i pot girar amb transició);
   * cada update() només repinta l'estat.
   * cb = {
   *   onTap(info): s'ha tocat una casella (ja ha sonat aquí)
   *   onChip(index, info): s'ha tocat un acord de la seqüència (ja sona)
   *   onClear(): esborrar la seqüència
   *   onKey(n): la roda s'ha deixat anar sobre la tonalitat n
   * }
   */
  function create(cb) {
    cb = cb || {};
    var t = 0;                 /* la tonalitat de l'últim update */
    var seq = [];
    var rec = false;           /* mode edició: s'està creant una roda */
    var rot = 0;               /* la rotació visual de l'anell, en graus */
    var drag = null;           /* { a0, r0, moved } mentre el dit mana */
    var justDragged = false;   /* el clic que segueix un gir no és un toc */

    var wrap = document.createElement('div');
    wrap.setAttribute('class', 'cf');

    /* la seqüència, a dalt en una línia */
    var line = document.createElement('div');
    line.setAttribute('class', 'cf-seq');
    wrap.appendChild(line);

    var coach = document.createElement('div');
    coach.setAttribute('class', 'cf-coach');
    coach.textContent = 'gira la roda per transposar';
    wrap.appendChild(coach);

    var svg = el('svg', { viewBox: VIEW_CROP, role: 'group', 'aria-label': 'Cercle de quintes' });
    wrap.appendChild(svg);

    /* l'anell que gira: totes les caselles */
    var ring = el('g', { 'class': 'cf-ring' });
    svg.appendChild(ring);

    var cells = [];
    function makeCell(i, ringName) {
      var inner = ringName === 'in';
      var a0 = i * 30 - 15 + GAP / 2;
      var a1 = i * 30 + 15 - GAP / 2;
      var r0 = inner ? R0 + 2 : R1 + 2;
      var r1 = inner ? R1 - 2 : R2;
      var g = el('g', { 'class': 'cf-cell', role: 'button', tabindex: '-1' });
      g.appendChild(el('path', { d: sector(a0, a1, r0, r1) }));
      var rName = inner ? (R0 + (R1 - R0) * 0.62) : (R1 + (R2 - R1) * 0.62);
      var rNum = inner ? (R0 + (R1 - R0) * 0.2) : (R1 + (R2 - R1) * 0.2);
      var name = labelAt(i * 30, rName, 'cf-name', inner ? 12.5 : 17, inner ? MIN[i] : MAJ[i]);
      var num = labelAt(i * 30, rNum, 'cf-num', 9.5, '');
      var np = xy(i * 30, rNum);
      /* la marca del grau (el peu del IV, l'espurna del V, el sostre
         del iii) es dibuixa a part: els glifs no es poden pintar a trossos */
      var deco = el('path', { 'class': 'cf-deco', hidden: '' });
      g.appendChild(name);
      g.appendChild(num);
      g.appendChild(deco);
      var lp = xy(i * 30, rName);
      var cell = {
        g: g, name: name, num: num, deco: deco,
        lx: lp[0], ly: lp[1], nx: np[0], ny: np[1],
        i: i, ring: ringName
      };
      g.addEventListener('click', function () {
        if (justDragged) { return; }   /* venies de girar, no de tocar */
        var info = infoFor(i, ringName, t);
        playChord(info.pc, info.quality);
        if (cb.onTap) { cb.onTap(info); }
      });
      ring.appendChild(g);
      cells.push(cell);
    }
    for (var i = 0; i < 12; i++) { makeCell(i, 'out'); makeCell(i, 'in'); }

    /* el marc de la família: FIX a dalt; el món gira per sota */
    svg.appendChild(el('path', {
      'class': 'cf-frame',
      d: sector(-45 + GAP / 2, 45 - GAP / 2, R0 + 1.5, R2 - 0.5)
    }));

    /* el centre: NOMES la tonalitat, i el boto de fer gran (que amaga
       la progressio i ensenya la roda sencera) */
    var full = false;
    var sym = el('text', {
      x: CX, y: CY - 42, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'class': 'cf-sym'
    });
    /* fer gran / fer petita: una icona dibuixada, com les de la casa */
    var zoom = el('g', { 'class': 'cf-zoom', role: 'button', 'aria-label': 'Veure la roda sencera' });
    zoom.appendChild(el('rect', { x: -8, y: -8, width: 40, height: 40, fill: 'transparent' }));
    var zl = [el('path', { 'class': 'cf-zoom-ln' }), el('path', { 'class': 'cf-zoom-ln' }),
      el('path', { 'class': 'cf-zoom-ln' }), el('path', { 'class': 'cf-zoom-ln' })];
    zl.forEach(function (ln) { zoom.appendChild(ln); });
    svg.appendChild(sym);
    svg.appendChild(zoom);

    /* la finestra s'obre i es tanca lliscant: el viewBox s'interpola
       (no es pot transicionar amb CSS) i la roda es mou i creix */
    var viewAnim = null;

    function animateView(target) {
      viewAnim = null;
      var cur = (svg.getAttribute('viewBox') || target).split(' ').map(Number);
      var to = target.split(' ').map(Number);
      var same = cur.every(function (v, i) { return v === to[i]; });
      var reduced = false;
      try {
        reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) { /* res */ }
      if (same || reduced || !global.requestAnimationFrame) {
        svg.setAttribute('viewBox', target);
        return;
      }
      var t0 = perfNow();
      var DUR = 460;
      var id = {};
      viewAnim = id;
      function step() {
        if (viewAnim !== id) { return; }
        var k = Math.min(1, (perfNow() - t0) / DUR);
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   /* easeInOut */
        var vb = cur.map(function (v, i) { return v + (to[i] - v) * e; });
        svg.setAttribute('viewBox', vb.join(' '));
        if (k < 1) { global.requestAnimationFrame(step); }
        else { viewAnim = null; }
      }
      global.requestAnimationFrame(step);
      /* xarxa de seguretat: passi el que passi, s'acaba al lloc */
      global.setTimeout(function () {
        if (viewAnim === id) {
          viewAnim = null;
          svg.setAttribute('viewBox', target);
        }
      }, DUR + 80);
    }

    function paintView() {
      animateView(full ? VIEW_FULL : VIEW_CROP);
      wrap.setAttribute('class', 'cf' + (full ? ' full' : ''));
      /* al cercle sencer, el centre es al mig de debo */
      sym.setAttribute('y', full ? CY - 16 : CY - 42);
      var zy = full ? CY + 4 : CY - 24;
      zoom.setAttribute('transform', 'translate(' + (CX - 12) + ' ' + zy + ')');
      var ds = full
        ? ['M20 4 L13.4 10.6', 'M13.4 5 V10.6 H19', 'M4 20 L10.6 13.4', 'M10.6 19 V13.4 H5']
        : ['M14 4 H20 V10', 'M20 4 L13 11', 'M10 20 H4 V14', 'M4 20 L11 13'];
      zl.forEach(function (ln, i) {
        if (ds[i]) { ln.setAttribute('d', ds[i]); ln.removeAttribute('hidden'); }
        else { ln.setAttribute('hidden', ''); }
      });
      zoom.setAttribute('aria-label', full ? 'Tancar la roda sencera' : 'Veure la roda sencera');
    }
    zoom.addEventListener('click', function () {
      full = !full;
      paintView();
    });

    /* al cercle sencer, tocar fora de la roda la torna a fer petita */
    wrap.addEventListener('click', function (ev) {
      if (!full || justDragged) { return; }
      /* el boto de fer gran/petita mana ell; i un clic sense
         coordenades (sintetic) no es cap toc de fora */
      if (ev.target && ev.target.closest && ev.target.closest('.cf-zoom')) { return; }
      if (ev.clientX === undefined || (ev.clientX === 0 && ev.clientY === 0)) { return; }
      if (!svg.getBoundingClientRect) { return; }
      var r = svg.getBoundingClientRect();
      if (!r.width) { return; }
      var sc = r.width / 408;
      var cx2 = r.left + (CX + 4) * sc;
      var cy2 = r.top + (CY + 4) * sc;
      var dx = (ev.clientX || 0) - cx2;
      var dy = (ev.clientY || 0) - cy2;
      if (Math.sqrt(dx * dx + dy * dy) > (R2 + 6) * sc) {
        full = false;
        paintView();
      }
    });

    /* ---------------- girar la roda amb el dit ----------------
       La rotació segueix l'angle del punter al voltant del centre
       del dial (que és avall, fora de la finestra: arrossegar en
       horitzontal gira, com una roda de debò). */
    var glide = null;   /* l'animacio d'encaix, si esta en marxa */

    function setRot(deg) {
      rot = deg;
      ring.setAttribute('transform', 'rotate(' + deg + ' ' + CX + ' ' + CY + ')');
      /* les lletres es contragiren al voltant de la SEVA ancora:
         atribut SVG pur, que els transform de CSS sobre text peten a iOS */
      var back = -deg;
      cells.forEach(function (c) {
        c.name.setAttribute('transform', 'rotate(' + back + ' ' + c.lx + ' ' + c.ly + ')');
        c.num.setAttribute('transform', 'rotate(' + back + ' ' + c.nx + ' ' + c.ny + ')');
        c.deco.setAttribute('transform', 'rotate(' + back + ' ' + c.nx + ' ' + c.ny + ')');
      });
    }

    /* lliscar fins al lloc: l'encaix i la transposicio, amb la
       corba de la casa pero moguda pel JS */
    function glideTo(target) {
      glide = null;
      if (!global.requestAnimationFrame) { setRot(target); return; }
      try {
        if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setRot(target);
          return;
        }
      } catch (e) { /* res */ }
      var from = rot;
      if (from === target) { return; }
      var t0 = perfNow();
      var DUR = 460;
      var id = {};
      glide = id;
      function step() {
        if (glide !== id) { return; }
        var k = Math.min(1, (perfNow() - t0) / DUR);
        var e = 1 - Math.pow(1 - k, 3);   /* easeOutCubic */
        setRot(from + (target - from) * e);
        if (k < 1) { global.requestAnimationFrame(step); }
        else { glide = null; }
      }
      global.requestAnimationFrame(step);
    }

    /* l'espurna del V: quatre puntes, dibuixada */
    function sparkle(x, y) {
      return 'M ' + x + ' ' + (y - 3.4)
        + ' L ' + (x + 0.9) + ' ' + (y - 0.9) + ' L ' + (x + 3.4) + ' ' + y
        + ' L ' + (x + 0.9) + ' ' + (y + 0.9) + ' L ' + x + ' ' + (y + 3.4)
        + ' L ' + (x - 0.9) + ' ' + (y + 0.9) + ' L ' + (x - 3.4) + ' ' + y
        + ' L ' + (x - 0.9) + ' ' + (y - 0.9) + ' Z';
    }

    var spin = null;   /* { v, last } mentre la roda va sola */

    function perfNow() {
      try { return global.performance.now(); } catch (e) { return Date.now(); }
    }

    function settle() {
      svg.removeAttribute('data-grab');
      var n = ((Math.round(-rot / 30) % 12) + 12) % 12;
      if (cb.onKey) { cb.onKey(n); }
    }

    function spinStep() {
      if (!spin) { return; }
      var now = perfNow();
      var dt = Math.min(48, now - spin.last);
      spin.last = now;
      setRot(rot + spin.v * dt);
      spin.v *= Math.exp(-dt / 300);   /* la friccio de la roda */
      if (Math.abs(spin.v) < 0.02) {
        spin = null;
        settle();
        return;
      }
      (global.requestAnimationFrame || global.setTimeout)(spinStep);
    }

    function angleOf(ev) {
      if (!svg.getBoundingClientRect) { return 0; }
      var r = svg.getBoundingClientRect();
      if (!r.width) { return 0; }
      var s = r.width / 304;               /* el viewBox fa 304 d'ample */
      var cx = r.left + (200 - 48) * s;    /* el centre del dial, en píxels */
      var cy = r.top + 200 * s;
      return Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180 / Math.PI;
    }

    function dragEnd() {
      if (!drag) { return; }
      var moved = drag.moved;
      var v = drag.v || 0;
      drag = null;
      if (!moved) { svg.removeAttribute('data-grab'); return; }
      justDragged = true;
      global.setTimeout(function () { justDragged = false; }, 60);
      /* amb embranzida, la roda segueix girant sola; si no, encaixa */
      if (Math.abs(v) > 0.08) {
        spin = { v: Math.max(-1.6, Math.min(1.6, v)), last: perfNow() };
        (global.requestAnimationFrame || global.setTimeout)(spinStep);
      } else {
        settle();
      }
    }

    svg.addEventListener('pointerdown', function (ev) {
      spin = null;    /* agafar la roda l'atura */
      glide = null;   /* i talla l'encaix que estigues en marxa */
      drag = { a0: angleOf(ev), r0: rot, moved: false, v: 0, t: perfNow(), a: 0 };
    });
    svg.addEventListener('pointermove', function (ev) {
      if (!drag) { return; }
      var da = angleOf(ev) - drag.a0;
      da = ((da + 180) % 360 + 360) % 360 - 180;   /* el camí curt */
      if (!drag.moved && Math.abs(da) < 4) { return; }
      if (!drag.moved) {
        drag.moved = true;
        svg.setAttribute('data-grab', '');
        try {
          if (svg.setPointerCapture && ev.pointerId !== undefined) {
            svg.setPointerCapture(ev.pointerId);
          }
        } catch (e) { /* la captura és un extra */ }
      }
      if (ev.preventDefault) { ev.preventDefault(); }
      /* la velocitat del canell, suavitzada: l'embranzida del deixar anar */
      var now = perfNow();
      var dt = now - drag.t;
      if (dt > 0) {
        var inst = (da - drag.a) / dt;
        drag.v = drag.v * 0.7 + inst * 0.3;
        drag.t = now;
        drag.a = da;
      }
      setRot(drag.r0 + da);
    });
    svg.addEventListener('pointerup', dragEnd);
    svg.addEventListener('pointercancel', dragEnd);

    function lineBtn(cls, text, aria, fn) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('class', cls);
      btn.textContent = text;
      if (aria) { btn.setAttribute('aria-label', aria); }
      btn.addEventListener('click', function () { if (fn) { fn(); } });
      return btn;
    }

    function lineHint(text) {
      var sp = document.createElement('span');
      sp.setAttribute('class', 'cf-hint');
      sp.textContent = text;
      return sp;
    }

    /* la línia de dalt, amb l'espai sempre reservat:
       - en repòs i buida: «explora els graus · o crea una roda»
       - creant la roda: els acords van entrant; tocar-ne un de la
         línia el treu; «acceptar» la fixa
       - fixada: els acords hi queden; tocar-ne un (o el seu al dial)
         ensenya com es toca; la creueta la buida */
    function paintChips() {
      line.innerHTML = '';
      /* dues files: els acords (que poden ocupar el que calgui) i,
         a sota, els controls — mai es tallen l'un a l'altre */
      var rowChips = document.createElement('div');
      rowChips.setAttribute('class', 'cf-chips n' + Math.min(seq.length || 1, 8));
      var rowCtrl = document.createElement('div');
      rowCtrl.setAttribute('class', 'cf-ctrl');
      line.appendChild(rowChips);
      line.appendChild(rowCtrl);
      if (!rec && !seq.length) {
        rowChips.appendChild(lineHint('explora els graus'));
        rowCtrl.appendChild(lineBtn('cf-round', 'crea una roda d’acords', 'Crear una roda d’acords', cb.onRound));
        rowCtrl.appendChild(lineBtn('cf-round fosc', 'explora progressions', 'Explorar progressions d’exemple', cb.onExplore));
        return;
      }
      if (rec && !seq.length) {
        rowChips.appendChild(lineHint('posa els acords que vulguis'));
      }
      seq.forEach(function (item, idx) {
        var i = ((t + item.d) % 12 + 12) % 12;
        var info = infoFor(i, item.ring, t);
        /* l'acord personalitzat: l'extensió del qui l'ha fet seva */
        if (cb.decorate) {
          var deco = cb.decorate(info, item);
          if (deco) {
            info.name = deco.name;
            info.quality = deco.quality;
          }
        }
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.setAttribute('class', 'cf-chip' + (info.deg ? '' : ' fora') + (rec ? ' rec' : ''));
        var b = document.createElement('b');
        b.textContent = info.name;
        chip.appendChild(b);
        var sp = document.createElement('span');
        sp.textContent = info.deg ? info.deg.num : '·';
        if (info.deg) {
          var m = /^[a-z]/.test(info.deg.num);
          sp.setAttribute('class', 'grau' + (m ? ' min' : '') + ' g-' + info.deg.num.toLowerCase());
        } else {
          sp.setAttribute('class', 'grau');
        }
        chip.appendChild(sp);
        chip.setAttribute('aria-label', rec ? info.name + ': treure de la roda' : info.name + ': com es toca');
        chip.addEventListener('click', function () {
          if (!rec) { playChord(info.pc, info.quality); }
          if (cb.onChip) { cb.onChip(idx, info); }
        });
        rowChips.appendChild(chip);
      });
      if (rec) {
        rowCtrl.appendChild(lineBtn('cf-done', 'acceptar', 'Fixar la roda', cb.onDone));
      } else {
        rowCtrl.appendChild(lineBtn('cf-done', 'guarda-la', 'Guardar una postal de la roda', cb.onSave));
        rowCtrl.appendChild(lineBtn('cf-round', 'nova roda', 'Crear una roda nova', cb.onRound));
      }
    }

    /**
     * o = { keyIdx, curPc, curQuality, seq: [{d, ring}], coach }
     */
    function update(o) {
      t = o.keyIdx || 0;
      seq = o.seq || [];
      rec = !!o.rec;

      /* girar la roda: la tonalitat puja a dalt; les lletres es
         contragiren per quedar sempre dretes. Si el dit està girant,
         la roda és seva i no s'hi toca. */
      if (!drag && !spin) {
        /* pel camí curt: de F (rot -330) a C val més tornar a 0 girant
           30 graus enrere, no 330 endavant */
        var target = -t * 30;
        var k = Math.round((rot - target) / 360);
        glideTo(target + k * 360);
      }

      cells.forEach(function (c) {
        var info = infoFor(c.i, c.ring, t);
        var cls = 'cf-cell';
        if (info.deg) { cls += ' fam'; }
        if (info.deg && c.ring === 'out' && info.d === 0) { cls += ' ton'; }
        if (info.pc === o.curPc && info.quality === o.curQuality) { cls += ' now'; }
        c.g.setAttribute('class', cls);
        c.g.setAttribute('aria-label', info.name + (info.deg ? ' · ' + info.deg.num + ' · ' + info.deg.fn : ''));
        c.num.textContent = info.deg ? info.deg.num : '';
        /* la inscripcio del grau: menors en italica i cadascu la seva marca */
        var minor = !!(info.deg && /^[a-z]/.test(info.deg.num));
        c.num.setAttribute('class', 'cf-num' + (minor ? ' min' : ''));
        var d = '';
        var star = false;
        if (info.deg) {
          if (info.deg.num === 'IV') {
            d = 'M ' + (c.nx - 6.5) + ' ' + (c.ny + 7.5) + ' h 13';           /* el peu */
          } else if (info.deg.num === 'V') {
            d = sparkle(c.nx + 7.5, c.ny - 7);                                 /* l'espurna */
            star = true;
          } else if (info.deg.num === 'iii') {
            d = 'M ' + (c.nx - 6) + ' ' + (c.ny - 7)
              + ' Q ' + c.nx + ' ' + (c.ny - 10) + ' ' + (c.nx + 6) + ' ' + (c.ny - 7);   /* el sostre */
          }
        }
        c.deco.setAttribute('class', 'cf-deco' + (star ? ' star' : ''));
        if (d) {
          c.deco.setAttribute('d', d);
          c.deco.removeAttribute('hidden');
        } else {
          c.deco.setAttribute('hidden', '');
        }
      });

      sym.textContent = MAJ[t];
      paintView();
      paintChips();
      coach.hidden = !o.coach;
    }

    return { el: wrap, update: update };
  }

  /* el grau de l'acord (pc, qualitat) dins la tonalitat t, si en té */
  function degreeFor(pc, quality, t) {
    var ring = quality === 'min' ? 'in' : 'out';
    for (var i = 0; i < 12; i++) {
      var info = infoFor(i, ring, t);
      if (info.pc === pc) { return info.deg; }
    }
    return null;
  }

  global.Cercle = {
    create: create,
    play: playChord,
    KEYS: PCS.map(function (pc, i) { return { pc: pc, maj: MAJ[i], min: MIN[i] }; }),
    infoFor: infoFor,
    degreeFor: degreeFor,
    _rel: rel
  };
})(typeof window !== 'undefined' ? window : this);
