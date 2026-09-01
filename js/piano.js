/* ============================================================
   piano.js - SVG keyboard renderer.
   Keys are drawn at their natural size; the caller wraps the SVG
   in a .scroll-x container so wide ranges stay legible on mobile.
   ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

  var WW = 34, WH = 138, BW = 19, PAD = 1, FOOT = 16;
  var BLACK_RATIO = 0.63;

  var ROLE = {
    root:  { fill: '#DCC9A6', text: '#0A0A0A' },
    chord: { fill: '#F2EFE9', text: '#0A0A0A' },
    scale: { fill: '#3C3B38', text: '#CFC9BF' },
    mark:  { fill: '#8C877E', text: '#0A0A0A' }
  };

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) { node.setAttribute(k, attrs[k]); }
    });
    return node;
  }

  function isWhite(pc) { return WHITE_PCS.indexOf(Theory.mod12(pc)) !== -1; }

  function snapToWhite(midi) {
    var m = midi;
    while (!isWhite(m)) { m -= 1; }
    return m;
  }

  function nextWhite(midi) {
    var pc = Theory.mod12(midi);
    return midi + (pc === 4 || pc === 11 ? 1 : 2);
  }

  /** Normalize a mark list into {byPc, byMidi} lookups. */
  function buildMarks(opts) {
    var byPc = {}, byMidi = {};
    (opts.marks || []).forEach(function (m) {
      var key = Theory.mod12(m.pc !== undefined ? m.pc : Theory.nameToPc(m.note));
      byPc[key] = m;
    });
    (opts.midiMarks || []).forEach(function (m) { byMidi[m.midi] = m; });
    return { byPc: byPc, byMidi: byMidi };
  }

  /**
   * Una etiqueta explícita en la marca siempre gana; `mode` solo decide
   * qué se escribe cuando la marca no trae texto propio ('none' = nada).
   */
  function labelFor(mark, midi, mode) {
    if (mark && mark.label) { return mark.label; }
    if (mode === 'none') { return ''; }
    if (mode === 'degree') { return mark && mark.degree ? mark.degree : ''; }
    return Theory.pcName(midi, { flats: !!mark && !!mark.flats });
  }

  /**
   * render(opts)
   *   from        primera nota MIDI (se ajusta a la tecla blanca inferior)
   *   keys        número de teclas blancas (8 por defecto, una octava)
   *   marks       [{pc|note, label, degree, role, flats}] en todas las octavas
   *   midiMarks   [{midi, label, degree, role}] para una nota concreta
   *   labels      'note' | 'degree' | 'none'  (texto dentro del círculo)
   *   footLabels  'octaves' (por defecto) | 'marked' | 'none'
   *   keyHeight   alto de las teclas blancas (138 por defecto)
   *   playable    clic para sonar (por defecto sí)
   *   fluid       escala al ancho del contenedor
   */
  function render(opts) {
    var o = opts || {};
    var from = snapToWhite(o.from === undefined ? 48 : o.from);
    var whiteCount = o.keys || 8;
    var labels = o.labels || 'note';
    var footMode = o.footLabels || 'octaves';
    var wh = o.keyHeight || WH;
    var bh = Math.round(wh * BLACK_RATIO);
    var playable = o.playable !== false;
    var marks = buildMarks(o);

    var whiteMidis = [];
    var m = from;
    for (var i = 0; i < whiteCount; i++) { whiteMidis.push(m); m = nextWhite(m); }

    var width = whiteCount * WW + PAD * 2;
    var height = wh + FOOT + PAD * 2;

    var svg = el('svg', {
      width: o.fluid ? '100%' : width, height: o.fluid ? null : height,
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', 'aria-label': 'Teclado de piano'
    });
    svg.setAttribute('data-width', width);

    function markOf(midi) {
      if (marks.byMidi[midi]) { return marks.byMidi[midi]; }
      return marks.byPc[Theory.mod12(midi)] || null;
    }

    function foot(midi, x, w) {
      if (footMode === 'none') { return null; }
      var mk = markOf(midi);
      var text;
      if (footMode === 'marked') {
        if (!mk) { return null; }
        text = Theory.pcName(midi, { flats: !!mk.flats });
      } else {
        if (Theory.mod12(midi) !== 0) { return null; }
        text = Theory.midiToName(midi);
      }
      var t = el('text', {
        x: x + w / 2, y: PAD + wh + 12, 'text-anchor': 'middle',
        fill: mk ? '#9C958B' : '#5E5852', 'font-size': 9.8, 'font-weight': 700,
        'font-family': 'JetBrains Mono, ui-monospace, monospace'
      });
      t.textContent = text;
      return t;
    }

    function addKey(midi, x, w, h, white) {
      var mk = markOf(midi);
      var group = el('g', { 'data-midi': midi, class: 'pk' });

      group.appendChild(el('rect', {
        x: x, y: PAD, width: w, height: h, rx: 1.5,
        fill: white ? (mk ? '#F7F4EF' : '#8E887F') : (mk ? '#332F29' : '#0F0E0D'),
        stroke: white ? '#0A0A0A' : '#3D3A35', 'stroke-width': white ? 1.4 : 1
      }));

      if (mk) {
        var role = ROLE[mk.role] || ROLE.chord;
        var cy = white ? PAD + h - 25 : PAD + h - 17;
        var r = white ? 13 : 9.3;
        group.appendChild(el('circle', { cx: x + w / 2, cy: cy, r: r, fill: role.fill }));
        var text = labelFor(mk, midi, labels);
        if (text) {
          var long = text.length > 1;
          var t = el('text', {
            x: x + w / 2, y: cy + (white ? 3.8 : 3.2),
            'text-anchor': 'middle', fill: role.text,
            'font-size': white ? (long ? 10 : 12.4) : (long ? 8 : 10),
            'font-weight': 700, 'font-family': 'JetBrains Mono, ui-monospace, monospace'
          });
          t.textContent = text;
          group.appendChild(t);
        }
      }

      if (playable) {
        group.setAttribute('cursor', 'pointer');
        group.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          Sound.note(midi, { timbre: 'piano' });
        });
      }
      return group;
    }

    // Primero las blancas, luego las negras encima.
    var whiteLayer = el('g', {});
    var blackLayer = el('g', {});
    var footLayer = el('g', {});

    whiteMidis.forEach(function (wm, idx) {
      var x = PAD + idx * WW;
      whiteLayer.appendChild(addKey(wm, x, WW - 1.5, wh, true));
      var fw = foot(wm, x, WW - 1.5);
      if (fw) { footLayer.appendChild(fw); }

      var next = whiteMidis[idx + 1];
      if (next !== undefined && next - wm === 2) {
        var bx = x + WW - BW / 2 - 0.75;
        blackLayer.appendChild(addKey(wm + 1, bx, BW, bh, false));
        var fb = foot(wm + 1, bx, BW);
        if (fb) { footLayer.appendChild(fb); }
      }
    });

    svg.appendChild(whiteLayer);
    svg.appendChild(blackLayer);
    svg.appendChild(footLayer);
    return svg;
  }

  /** Convert theory notes into piano marks. */
  function marksFromNotes(notes, opts) {
    var o = opts || {};
    return notes.map(function (n) {
      return {
        pc: n.pc,
        degree: n.degree,
        role: n.degree === '1' ? 'root' : (o.role || 'chord'),
        flats: !!o.flats
      };
    });
  }

  global.Piano = { render: render, marksFromNotes: marksFromNotes, ROLE: ROLE };
})(window);
