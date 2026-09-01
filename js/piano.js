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

    /* Si just abans de la primera blanca o just despres de l'ultima hi ha
       una negra, es dibuixa tambe: un tros de teclat que acaba en Re sense
       el Re# sembla un Mi i despista. */
    var lastWhite = whiteMidis[whiteCount - 1];
    var edgeLeft = !isWhite(from - 1);
    var edgeRight = !isWhite(lastWhite + 1);
    var EDGE = BW / 2 + 2;
    var x0 = PAD + (edgeLeft ? EDGE : 0);

    var width = whiteCount * WW + PAD * 2 +
      (edgeLeft ? EDGE : 0) + (edgeRight ? EDGE : 0);
    var height = wh + FOOT + PAD * 2;

    var svg = el('svg', {
      width: o.fluid ? '100%' : width, height: o.fluid ? null : height,
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', 'aria-label': 'Teclat de piano'
    });
    svg.setAttribute('data-width', width);
    var keyRefs = {};
    svg.keyRefs = keyRefs;

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
      /* la tecla marcada baixa un pel, com si estigues polsada */
      if (mk) { group.setAttribute('transform', 'translate(0 2.5)'); }

      /* la negra marcada es tenyeix sencera del color del rol, amb una
         bona vora negra perque no es fongui amb les blanques. El mode
         interactiu (el pianet) va un punt mes clar que els diagrames,
         pero sense arribar a l'ivori. */
      var live = !!o.keyHandlers;
      var role = mk ? (ROLE[mk.role] || ROLE.chord) : null;
      var rect = el('rect', {
        x: x, y: PAD, width: w, height: h, rx: 1.5,
        fill: white ? (mk ? '#F7F4EF' : (live ? '#C7C0B2' : '#8E887F'))
                    : (mk ? role.fill : (live ? '#171614' : '#0F0E0D')),
        stroke: white ? '#0A0A0A' : (mk ? '#060605' : '#4A463F'),
        'stroke-width': white ? 1.4 : (mk ? 2.4 : 1.8)
      });
      group.appendChild(rect);

      if (mk) {
        var cy = white ? PAD + h - 25 : PAD + h - 17;
        if (white) {
          group.appendChild(el('circle', { cx: x + w / 2, cy: cy, r: 13, fill: role.fill }));
        }
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

      if (o.keyHandlers) {
        /* mode instrument: la tecla nomes es construeix aqui; els gestors
           van delegats a l'svg sencer (mes robust que 150 listeners) */
        group.setAttribute('cursor', 'pointer');
        keyRefs[midi] = {
          rect: rect, black: !white,
          baseFill: rect.getAttribute('fill'),
          baseStroke: rect.getAttribute('stroke'),
          baseStrokeW: rect.getAttribute('stroke-width')
        };
      } else if (playable) {
        group.setAttribute('cursor', 'pointer');
        var baseFill = rect.getAttribute('fill');
        group.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          Sound.note(midi, { timbre: 'piano' });
          rect.setAttribute('fill', '#DCC9A6');
          setTimeout(function () { rect.setAttribute('fill', baseFill); }, 180);
        });
      }
      return group;
    }

    // Primero las blancas, luego las negras encima.
    var whiteLayer = el('g', {});
    var blackLayer = el('g', {});
    var footLayer = el('g', {});

    whiteMidis.forEach(function (wm, idx) {
      var x = x0 + idx * WW;
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

    /* les negres de les vores, senceres */
    if (edgeLeft) {
      var lx = x0 - BW / 2 - 0.75;
      blackLayer.appendChild(addKey(from - 1, lx, BW, bh, false));
      var fl = foot(from - 1, lx, BW);
      if (fl) { footLayer.appendChild(fl); }
    }
    if (edgeRight) {
      var rx = x0 + whiteCount * WW - BW / 2 - 0.75;
      blackLayer.appendChild(addKey(lastWhite + 1, rx, BW, bh, false));
      var fr = foot(lastWhite + 1, rx, BW);
      if (fr) { footLayer.appendChild(fr); }
    }

    svg.appendChild(whiteLayer);
    svg.appendChild(blackLayer);
    svg.appendChild(footLayer);

    if (o.keyHandlers) {
      /* un sol joc de gestors per a tot el teclat, amb seguiment per
         punter: multitactil, i cap tecla morta si un listener falla */
      var activePointers = {};

      var keyOf = function (target) {
        var t = target;
        while (t && t !== svg) {
          if (t.getAttribute) {
            var m = t.getAttribute('data-midi');
            if (m !== null && m !== undefined) { return Number(m); }
          }
          t = t.parentNode;
        }
        return null;
      };

      svg.addEventListener('pointerdown', function (ev) {
        var midi = keyOf(ev.target);
        if (midi === null) { return; }
        if (ev.preventDefault) { ev.preventDefault(); }
        activePointers[ev.pointerId] = {
          midi: midi, x: ev.clientX || 0, y: ev.clientY || 0
        };
        o.keyHandlers.press(midi, keyRefs[midi]);
        try {
          if (svg.setPointerCapture && ev.pointerId !== undefined) {
            svg.setPointerCapture(ev.pointerId);
          }
        } catch (e) { /* la captura es un extra, no una condicio */ }
      });

      svg.addEventListener('pointermove', function (ev) {
        var a = activePointers[ev.pointerId];
        if (!a || !o.keyHandlers.move) { return; }
        o.keyHandlers.move(a.midi, keyRefs[a.midi],
          (ev.clientX || 0) - a.x, (ev.clientY || 0) - a.y);
      });

      var endPointer = function (ev) {
        var a = activePointers[ev.pointerId];
        if (!a) { return; }
        delete activePointers[ev.pointerId];
        o.keyHandlers.release(a.midi, keyRefs[a.midi]);
      };
      svg.addEventListener('pointerup', endPointer);
      svg.addEventListener('pointercancel', endPointer);
    }

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
