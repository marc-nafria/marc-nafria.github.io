/* ============================================================
   fretboard.js - SVG guitar fretboard + chord-box diagrams.
   String 1 (high E) is drawn on top, as in tablature.
   ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var LEFT = 24, NUT = 24, FRET_W = 44, STR_GAP = 21, TOP = 14, BOTTOM = 22;
  var STRING_WIDTH = [1.2, 1.5, 1.8, 2.2, 2.6, 3.0]; // string 1 -> 6
  var INLAYS = [3, 5, 7, 9, 15, 17, 19];

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

  function txt(attrs, content) {
    var t = el('text', attrs);
    t.textContent = content;
    return t;
  }

  function tuning(custom) {
    return (custom || Theory.GUITAR_STANDARD).slice();
  }

  /**
   * render(opts)
   *   fromFret / toFret  window of frets (default 0..12)
   *   marks / midiMarks  same shape as Piano
   *   labels             'note' | 'degree' | 'none'
   *   playable           click to play (default true)
   *   strings            custom tuning (Theory.GUITAR_STANDARD by default)
   */
  function render(opts) {
    var o = opts || {};
    var fromFret = o.fromFret === undefined ? 0 : o.fromFret;
    var toFret = o.toFret === undefined ? 12 : o.toFret;
    var labels = o.labels || 'note';
    var playable = o.playable !== false;
    var strs = tuning(o.strings);

    var byPc = {}, byMidi = {};
    (o.marks || []).forEach(function (mk) {
      var pc = Theory.mod12(mk.pc !== undefined ? mk.pc : Theory.nameToPc(mk.note));
      byPc[pc] = mk;
    });
    (o.midiMarks || []).forEach(function (mk) { byMidi[mk.midi] = mk; });

    var rows = strs.length;
    var span = STR_GAP * (rows - 1);
    var showOpen = fromFret === 0;
    var firstFret = showOpen ? 1 : fromFret;
    var fretCount = toFret - firstFret + 1;
    var boardX = LEFT + (showOpen ? NUT : 6);
    var width = boardX + fretCount * FRET_W + 8;
    var height = TOP + span + BOTTOM;

    var svg = el('svg', {
      width: o.fluid ? '100%' : width, height: o.fluid ? null : height,
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', 'aria-label': 'Mástil de guitarra'
    });

    // Fingerboard background
    svg.appendChild(el('rect', {
      x: boardX, y: TOP - 8, width: fretCount * FRET_W, height: span + 16,
      fill: '#171614', stroke: '#3A3833', rx: 3
    }));

    // Inlay dots
    var midY = TOP + span / 2;
    for (var f = firstFret; f <= toFret; f++) {
      var cx = boardX + (f - firstFret + 0.5) * FRET_W;
      if (INLAYS.indexOf(f) !== -1) {
        svg.appendChild(el('circle', { cx: cx, cy: midY, r: 3.4, fill: '#302E2A' }));
      } else if (f === 12 || f === 24) {
        svg.appendChild(el('circle', { cx: cx, cy: midY - STR_GAP, r: 3.4, fill: '#2E3542' }));
        svg.appendChild(el('circle', { cx: cx, cy: midY + STR_GAP, r: 3.4, fill: '#2E3542' }));
      }
    }

    // Frets
    for (var i = 0; i <= fretCount; i++) {
      var x = boardX + i * FRET_W;
      svg.appendChild(el('line', {
        x1: x, y1: TOP - 8, x2: x, y2: TOP + span + 8,
        stroke: i === 0 && showOpen ? '#F7F4EF' : '#464339',
        'stroke-width': i === 0 && showOpen ? 5 : 1.8
      }));
    }

    // Fret numbers
    for (var fn = firstFret; fn <= toFret; fn++) {
      svg.appendChild(txt({
        x: boardX + (fn - firstFret + 0.5) * FRET_W, y: TOP + span + 20,
        'text-anchor': 'middle', fill: '#7A756D', 'font-size': 9.5, 'font-weight': 700,
        'font-family': 'JetBrains Mono, ui-monospace, monospace'
      }, String(fn)));
    }

    function addDot(cx, cy, mk, midi) {
      var role = ROLE[mk.role] || ROLE.chord;
      var g = el('g', { 'data-midi': midi });
      g.appendChild(el('circle', {
        cx: cx, cy: cy, r: 10, fill: role.fill
      }));
      var label = mk.label || (labels === 'degree' ? (mk.degree || '') :
        labels === 'none' ? '' : Theory.pcName(midi, { flats: !!mk.flats }));
      if (label) {
        g.appendChild(txt({
          x: cx, y: cy + 3.2, 'text-anchor': 'middle', fill: role.text,
          'font-size': label.length > 2 ? 8 : 9.8, 'font-weight': 700,
          'font-family': 'JetBrains Mono, ui-monospace, monospace'
        }, label));
      }
      if (playable) {
        g.setAttribute('cursor', 'pointer');
        g.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          Sound.note(midi, { timbre: 'guitar' });
        });
      }
      return g;
    }

    // Strings (index 0 = string 1 = high E, drawn on top) and note markers
    for (var s = strs.length - 1; s >= 0; s--) {
      var rowIndex = rows - 1 - s;             // 0 for the thinnest string given
      var y = TOP + rowIndex * STR_GAP;
      // Thickness follows the real string, so single-string diagrams look right.
      var realIndex = Theory.GUITAR_STANDARD.indexOf(strs[s]);
      var thickness = STRING_WIDTH[realIndex === -1 ? rowIndex : 5 - realIndex];
      svg.appendChild(el('line', {
        x1: boardX, y1: y, x2: boardX + fretCount * FRET_W, y2: y,
        stroke: '#8E8A82', 'stroke-width': thickness
      }));
      svg.appendChild(txt({
        x: LEFT - 6, y: y + 3.4, 'text-anchor': 'end', fill: '#7A756D',
        'font-size': 9.5, 'font-weight': 700, 'font-family': 'JetBrains Mono, ui-monospace, monospace'
      }, strs[s].label.replace(/^\d+ª\s*/, '')));

      // Open string marker
      if (showOpen) {
        var openMidi = strs[s].midi;
        var openMark = byMidi[openMidi] || byPc[Theory.mod12(openMidi)];
        if (openMark) {
          svg.appendChild(addDot(LEFT + NUT / 2 + 2, y, openMark, openMidi));
        }
      }

      for (var fr = firstFret; fr <= toFret; fr++) {
        var midi = strs[s].midi + fr;
        var mk = byMidi[midi] || byPc[Theory.mod12(midi)];
        if (mk) {
          svg.appendChild(addDot(boardX + (fr - firstFret + 0.5) * FRET_W, y, mk, midi));
        }
      }
    }

    return svg;
  }

  function marksFromNotes(notes, opts) {
    var o = opts || {};
    return notes.map(function (n) {
      return {
        pc: n.pc, degree: n.degree,
        role: n.degree === '1' ? 'root' : (o.role || 'chord'),
        flats: !!o.flats
      };
    });
  }

  /**
   * chordBox(shape, opts) - diagrama vertical de acorde.
   * shape: {name, frets:[6, de 6ª a 1ª, -1 = al aire silenciada], fingers?}
   * opts:  {size:number|'md', fluid, rootPc, strings:false}
   *
   * Dibuja la cejilla como barra cuando un mismo dedo ocupa el mismo
   * traste en varias cuerdas, que es como se toca de verdad.
   */
  function chordBox(shape, opts) {
    var o = opts || {};
    var k = typeof o.size === 'number' ? o.size : (o.size === 'md' ? 1.28 : 1);

    var G = 15 * k;            // separación entre cuerdas
    var C = 20 * k;            // alto de cada traste
    var L = 16 * k;            // margen izquierdo (número de traste)
    var Rm = 10 * k;           // margen derecho
    var T = 22 * k;            // hueco para las marcas x / o
    var B = (o.strings === false ? 8 : 17) * k;
    var ROWS = 5;

    var width = L + G * 5 + Rm;
    var height = T + C * ROWS + B;

    var played = shape.frets.filter(function (f) { return f > 0; });
    var minF = played.length ? Math.min.apply(null, played) : 1;
    var maxF = played.length ? Math.max.apply(null, played) : 1;
    var base = (maxF <= 4) ? 1 : minF;
    if (maxF - base >= ROWS) { base = maxF - ROWS + 1; }

    var svg = el('svg', {
      width: o.fluid ? '100%' : width, height: o.fluid ? null : height,
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', 'aria-label': 'Acorde ' + (shape.name || '')
    });

    function colX(idx) { return L + idx * G; }        // idx 0 = 6ª cuerda
    function rowY(fret) { return T + (fret - base) * C + C / 2; }

    // trastes
    for (var r = 0; r <= ROWS; r++) {
      if (r === 0 && base === 1) { continue; }
      svg.appendChild(el('line', {
        x1: L, y1: T + r * C, x2: L + G * 5, y2: T + r * C,
        stroke: '#403C36', 'stroke-width': 1.4 * k
      }));
    }
    // cejuela
    if (base === 1) {
      svg.appendChild(el('rect', {
        x: L - 0.5 * k, y: T - 4 * k, width: G * 5 + k, height: 4 * k,
        rx: 0.5 * k, fill: '#F7F4EF'
      }));
    } else {
      svg.appendChild(el('line', {
        x1: L, y1: T, x2: L + G * 5, y2: T, stroke: '#403C36', 'stroke-width': 1.4 * k
      }));
      svg.appendChild(txt({
        x: L - 5 * k, y: T + C * 0.68, 'text-anchor': 'end', fill: '#DCC9A6',
        'font-size': 10.5 * k, 'font-weight': 700, 'font-family': 'JetBrains Mono, ui-monospace, monospace'
      }, String(base)));
    }

    // cuerdas: la 6ª es la más gruesa
    var GAUGE = [2.2, 1.95, 1.7, 1.45, 1.2, 1.0];
    for (var c = 0; c < 6; c++) {
      svg.appendChild(el('line', {
        x1: colX(c), y1: T, x2: colX(c), y2: T + ROWS * C,
        stroke: '#7A746C', 'stroke-width': GAUGE[c] * k
      }));
    }

    function isRoot(idx, fret) {
      return o.rootPc !== undefined &&
        Theory.mod12(Theory.GUITAR_STANDARD[idx].midi + fret) === Theory.mod12(o.rootPc);
    }

    // marcas de al aire y silenciada; la cuerda al aire que es
    // fundamental se marca en beige, igual que los puntos pisados
    shape.frets.forEach(function (fret, idx) {
      var x = colX(idx);
      if (fret === -1 || fret === 'x') {
        svg.appendChild(txt({
          x: x, y: T - 6 * k, 'text-anchor': 'middle', fill: '#6A645C',
          'font-size': 11 * k, 'font-weight': 700, 'font-family': 'Outfit, system-ui, sans-serif'
        }, '×'));
      } else if (fret === 0) {
        var openRoot = isRoot(idx, 0);
        svg.appendChild(el('circle', {
          cx: x, cy: T - 10 * k, r: 4 * k,
          fill: openRoot ? '#DCC9A6' : 'none',
          stroke: openRoot ? '#DCC9A6' : '#C6C0B6', 'stroke-width': 1.7 * k
        }));
      }
    });

    // cejillas: mismo dedo, mismo traste, dos cuerdas o más
    var barred = {};
    if (shape.fingers) {
      var groups = {};
      shape.frets.forEach(function (fret, idx) {
        if (fret <= 0) { return; }
        var finger = shape.fingers[idx];
        if (!finger) { return; }
        var key = fret + ':' + finger;
        (groups[key] = groups[key] || []).push(idx);
      });
      Object.keys(groups).forEach(function (key) {
        var idxs = groups[key];
        if (idxs.length < 2) { return; }
        var fret = parseInt(key.split(':')[0], 10);
        var finger = key.split(':')[1];
        var from = Math.min.apply(null, idxs);
        var to = Math.max.apply(null, idxs);
        var y = rowY(fret);
        var h = 14.2 * k;
        svg.appendChild(el('rect', {
          x: colX(from) - h / 2, y: y - h / 2,
          width: colX(to) - colX(from) + h, height: h, rx: h / 2,
          fill: '#F2EFE9'
        }));
        idxs.forEach(function (i) {
          barred[i] = true;
          if (isRoot(i, fret)) {
            svg.appendChild(el('circle', { cx: colX(i), cy: y, r: 5 * k, fill: '#C9B48C' }));
          }
        });
        svg.appendChild(txt({
          x: colX(from), y: y + 3.4 * k, 'text-anchor': 'middle', fill: '#14120F',
          'font-size': 9.6 * k, 'font-weight': 700, 'font-family': 'JetBrains Mono, ui-monospace, monospace'
        }, finger));
      });
    }

    // puntos sueltos
    shape.frets.forEach(function (fret, idx) {
      if (fret <= 0 || barred[idx]) { return; }
      var x = colX(idx);
      var y = rowY(fret);
      var root = isRoot(idx, fret);
      svg.appendChild(el('circle', {
        cx: x, cy: y, r: 7.2 * k, fill: root ? '#DCC9A6' : '#F2EFE9'
      }));
      var finger = shape.fingers && shape.fingers[idx];
      if (finger) {
        svg.appendChild(txt({
          x: x, y: y + 3.4 * k, 'text-anchor': 'middle', fill: '#14120F',
          'font-size': 9.6 * k, 'font-weight': 700, 'font-family': 'JetBrains Mono, ui-monospace, monospace'
        }, String(finger)));
      }
    });

    // nombres de las cuerdas
    if (o.strings !== false) {
      ['E', 'A', 'D', 'G', 'B', 'E'].forEach(function (name, idx) {
        svg.appendChild(txt({
          x: colX(idx), y: T + ROWS * C + 11 * k, 'text-anchor': 'middle',
          fill: '#6A645C', 'font-size': 8.6 * k, 'font-weight': 700,
          'font-family': 'JetBrains Mono, ui-monospace, monospace'
        }, name));
      });
    }

    return svg;
  }

  /** MIDI notes produced by a chord shape (low to high), for playback. */
  function shapeMidi(shape) {
    var out = [];
    shape.frets.forEach(function (fret, idx) {
      if (fret === -1 || fret === 'x') { return; }
      out.push(Theory.GUITAR_STANDARD[idx].midi + fret);
    });
    return out;
  }

  global.Fret = {
    render: render,
    marksFromNotes: marksFromNotes,
    chordBox: chordBox,
    shapeMidi: shapeMidi,
    ROLE: ROLE
  };
})(window);
