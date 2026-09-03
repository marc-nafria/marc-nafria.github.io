/* ============================================================
   chordbook.js - chord dictionary: guitar shapes + piano voicings
   for any root and quality, side by side.
   ============================================================ */
(function (global) {
  'use strict';

  var ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  var QUALITIES = [
    'maj', 'min', 'dom7', 'maj7', 'min7', 'sus4', 'sus2',
    'six', 'add9', 'dim', 'aug', 'm7b5', 'dim7', 'pow', 'dom9', 'min9'
  ];

  var current = { rootPc: 0, quality: 'maj', view: null };

  function h(tag, attrs, kids) { return UI.h(tag, attrs, kids); }

  function inversions(midis, count) {
    var out = [midis.slice()];
    var work = midis.slice();
    for (var i = 0; i < count; i++) {
      work = work.slice(1).concat([work[0] + 12]);
      out.push(work.slice());
    }
    return out;
  }

  function pianoPane(rootPc, quality, flats) {
    var base = Theory.chordMidi(rootPc, quality, 48);
    var voicings = inversions(base, Math.min(3, base.length - 1));
    var names = ['Fundamental', '1ª inversión', '2ª inversión', '3ª inversión'];
    var degrees = Theory.buildChord(rootPc, quality);

    var pane = h('div', { class: 'pane', 'data-ins': 'piano' }, [
      h('div', { class: 'pane-label', text: 'Piano' })
    ]);

    voicings.forEach(function (v, i) {
      var marks = v.map(function (m) {
        var deg = degrees.filter(function (d) { return d.pc === Theory.mod12(m); })[0];
        return {
          midi: m, role: Theory.mod12(m) === Theory.mod12(rootPc) ? 'root' : 'chord',
          label: deg ? deg.degree : Theory.pcName(m, { flats: flats })
        };
      });
      pane.appendChild(h('div', { class: 'scroll-hint', style: 'text-align:left;margin:8px 0 4px', text: names[i] + '  ·  bajo: ' + Theory.pcName(v[0], { flats: flats }) }));
      var svg = Piano.render({ from: 48, keys: 15, labels: 'degree', midiMarks: marks });
      var box = UI.scrollBox(svg);
      pane.appendChild(box);
      box.addEventListener('dblclick', function () { Sound.chord(v, { timbre: 'piano' }); });
    });

    pane.appendChild(h('div', { class: 'btn-row', style: 'margin-top:10px' },
      voicings.map(function (v, i) {
        return h('button', {
          class: 'btn small', type: 'button', html: '&#9654; ' + (i === 0 ? 'Fundamental' : i + 'ª inv.'),
          onclick: function () { Sound.ready(); Sound.chord(v, { timbre: 'piano' }); }
        });
      })
    ));

    pane.appendChild(h('p', {
      class: 'note',
      html: 'Al enlazar acordes, elige la inversión cuya nota más grave esté <strong>más cerca</strong> del acorde anterior. Con la izquierda basta la raíz (o raíz y quinta).'
    }));
    return pane;
  }

  function guitarPane(rootPc, quality, flats) {
    var shapes = Shapes.forChord(rootPc, quality);
    var pane = h('div', { class: 'pane', 'data-ins': 'guitar' }, [
      h('div', { class: 'pane-label', text: 'Guitarra' })
    ]);

    if (!shapes.length) {
      pane.appendChild(h('p', {
        class: 'note',
        html: 'Este acorde no tiene una <strong>forma estándar</strong> en la biblioteca. Mira abajo dónde caen sus notas en el mástil y construye tu propia posición: basta con tocar la raíz y la tercera o la séptima.'
      }));
    } else {
      var grid = h('div', { class: 'shape-grid' });
      shapes.slice(0, 6).forEach(function (shape) {
        var cell = h('div', { class: 'shape', role: 'button', tabindex: '0' });
        cell.appendChild(Fret.chordBox(shape, { size: 'md', rootPc: rootPc }));
        cell.appendChild(h('div', { class: 'sname', text: shape.label || 'Posición' }));
        function play() {
          Sound.ready();
          Sound.chord(Fret.shapeMidi(shape), { timbre: 'guitar' });
        }
        cell.addEventListener('click', play);
        cell.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); play(); }
        });
        grid.appendChild(cell);
      });
      pane.appendChild(grid);
      pane.appendChild(h('p', {
        class: 'note',
        html: 'Toca cualquier diagrama para oírlo. Los números son los dedos (1 = índice). Cuando el diagrama empieza en un traste alto, aparece el número a la izquierda: ahí va la cejilla.'
      }));
    }

    var notes = Theory.buildChord(rootPc, quality);
    pane.appendChild(h('div', { class: 'scroll-hint', style: 'text-align:left;margin:10px 0 4px', text: 'Todas las notas del acorde en el mástil' }));
    pane.appendChild(UI.scrollBox(Fret.render({
      fromFret: 0, toFret: 12, labels: 'degree',
      marks: notes.map(function (n) {
        return { pc: n.pc, degree: n.degree, role: n.degree === '1' ? 'root' : 'chord', flats: flats };
      })
    }), 'desliza para ver más →'));

    return pane;
  }

  function paint(host) {
    var rootPc = current.rootPc;
    var quality = current.quality;
    var flats = Theory.keyPrefersFlats(rootPc, quality === 'min' ? 'min' : 'maj');
    var symbol = Theory.chordSymbol(rootPc, quality, { flats: flats });
    var def = Theory.CHORDS[quality];
    var notes = Theory.buildChord(rootPc, quality);

    host.innerHTML = '';

    host.appendChild(h('div', { class: 'section-head' }, [
      h('div', { class: 'eyebrow', text: 'Diccionario de acordes' }),
      h('div', { class: 'chord-title' }, [
        h('h1', { text: symbol }),
        h('span', { class: 'chord-formula', text: def.name + '  ·  ' + def.degrees.join(' · ') })
      ])
    ]));

    /* root selector */
    var rootRow = h('div', { class: 'chip-row' });
    ROOTS.forEach(function (pc) {
      rootRow.appendChild(h('button', {
        class: 'chip', type: 'button', 'aria-pressed': pc === rootPc ? 'true' : 'false',
        text: Theory.pcName(pc, { flats: flats }),
        onclick: function () {
          current.rootPc = pc;
          global.location.hash = '#/acordes/' + Theory.pcName(pc).replace('#', 's') + '/' + quality;
        }
      }));
    });
    host.appendChild(h('div', { class: 'field' }, [h('label', { text: 'Fundamental' }), rootRow]));

    /* quality selector */
    var qRow = h('div', { class: 'chip-row' });
    QUALITIES.forEach(function (q) {
      qRow.appendChild(h('button', {
        class: 'chip', type: 'button', 'aria-pressed': q === quality ? 'true' : 'false',
        text: Theory.CHORDS[q].suffix === '' ? 'mayor' : Theory.CHORDS[q].suffix,
        onclick: function () {
          current.quality = q;
          global.location.hash = '#/acordes/' + Theory.pcName(rootPc).replace('#', 's') + '/' + q;
        }
      }));
    });
    host.appendChild(h('div', { class: 'field' }, [h('label', { text: 'Tipo de acorde' }), qRow]));

    /* notes of the chord */
    var noteRow = h('div', { class: 'notes-row' });
    notes.forEach(function (n) {
      noteRow.appendChild(h('div', {
        class: 'note-chip' + (n.degree === '1' ? ' root' : ''),
        html: Theory.pcName(n.pc, { flats: flats }) + '<small>' + n.degree + '</small>'
      }));
    });
    host.appendChild(h('div', { class: 'card tight' }, [
      noteRow,
      h('div', { class: 'btn-row', style: 'margin-top:10px' }, [
        h('button', {
          class: 'btn small primary', type: 'button', html: '&#9654; Escuchar',
          onclick: function () {
            Sound.ready();
            var timbre = UI.state.instrument === 'guitar' ? 'guitar' : 'piano';
            Sound.chord(UI.shapeOrTheoryMidi(symbol, timbre), { timbre: timbre });
          }
        }),
        h('button', {
          class: 'btn small', type: 'button', html: 'Arpegio',
          onclick: function () {
            Sound.ready();
            var timbre = UI.state.instrument === 'guitar' ? 'guitar' : 'piano';
            Sound.sequence(UI.shapeOrTheoryMidi(symbol, timbre), { timbre: timbre, interval: 0.28 });
          }
        })
      ])
    ]));

    /* panes */
    var view = current.view || UI.state.instrument;
    var wrap = h('div', { class: 'compare' });
    var head = h('div', { class: 'compare-head' }, [h('div', { class: 'ttl', text: 'Cómo se toca' })]);
    var seg = h('div', { class: 'seg' });
    [['piano', 'Piano'], ['guitar', 'Guitarra'], ['both', 'Ambos']].forEach(function (opt) {
      seg.appendChild(h('button', {
        type: 'button', text: opt[1], class: 'is-red',
        'aria-selected': opt[0] === view ? 'true' : 'false',
        onclick: function () { current.view = opt[0]; paint(host); }
      }));
    });
    head.appendChild(seg);
    wrap.appendChild(head);

    var panes = h('div', { class: 'compare-panes' + (view === 'both' ? ' two' : '') });
    if (view !== 'guitar') { panes.appendChild(pianoPane(rootPc, quality, flats)); }
    if (view !== 'piano') { panes.appendChild(guitarPane(rootPc, quality, flats)); }
    wrap.appendChild(panes);
    host.appendChild(wrap);

    host.appendChild(h('p', {
      class: 'footer-note',
      html: '¿No sabes qué acorde buscar? Empieza por <strong>C, G, Am, F, D, Em</strong>: con esos seis se toca media discografía del pop.'
    }));
  }

  function render(container, params) {
    if (params && params[0]) {
      var pc = Theory.nameToPc(params[0].replace(/s$/, '#'));
      if (pc !== null) { current.rootPc = pc; }
    }
    if (params && params[1] && Theory.CHORDS[params[1]]) { current.quality = params[1]; }
    var host = h('div');
    container.appendChild(host);
    paint(host);
  }

  global.ChordBook = { render: render };
})(window);
