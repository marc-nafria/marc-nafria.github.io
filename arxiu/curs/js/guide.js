/* ============================================================
   guide.js - quick reference: tables, circle of fifths, glossary.
   ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var CIRCLE = [
    { major: 'C',  minor: 'Am',  acc: '' },
    { major: 'G',  minor: 'Em',  acc: '1#' },
    { major: 'D',  minor: 'Bm',  acc: '2#' },
    { major: 'A',  minor: 'F#m', acc: '3#' },
    { major: 'E',  minor: 'C#m', acc: '4#' },
    { major: 'B',  minor: 'G#m', acc: '5#' },
    { major: 'F#', minor: 'D#m', acc: '6#' },
    { major: 'Db', minor: 'Bbm', acc: '5b' },
    { major: 'Ab', minor: 'Fm',  acc: '4b' },
    { major: 'Eb', minor: 'Cm',  acc: '3b' },
    { major: 'Bb', minor: 'Gm',  acc: '2b' },
    { major: 'F',  minor: 'Dm',  acc: '1b' }
  ];

  function h(tag, attrs, kids) { return UI.h(tag, attrs, kids); }

  function svgEl(name, attrs) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function circleOfFifths() {
    var size = 340, c = size / 2;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + size + ' ' + size, class: 'cof',
      role: 'img', 'aria-label': 'Círculo de quintas'
    });

    svg.appendChild(svgEl('circle', { cx: c, cy: c, r: 152, fill: 'none', stroke: '#262D3A' }));
    svg.appendChild(svgEl('circle', { cx: c, cy: c, r: 98, fill: 'none', stroke: '#1E242F' }));

    CIRCLE.forEach(function (k, i) {
      var angle = (-90 + i * 30) * Math.PI / 180;
      var outer = { x: c + Math.cos(angle) * 128, y: c + Math.sin(angle) * 128 };
      var inner = { x: c + Math.cos(angle) * 74, y: c + Math.sin(angle) * 74 };

      var gMaj = svgEl('g', { cursor: 'pointer' });
      gMaj.appendChild(svgEl('circle', {
        cx: outer.x, cy: outer.y, r: 22,
        fill: i === 0 ? '#FF4B4B' : '#1C222C', stroke: '#2A3140'
      }));
      var tMaj = svgEl('text', {
        x: outer.x, y: outer.y + 4.5, 'text-anchor': 'middle',
        fill: i === 0 ? '#fff' : '#FAFAFA', 'font-size': 14, 'font-weight': 700,
        'font-family': 'JetBrains Mono, monospace'
      });
      tMaj.textContent = k.major;
      gMaj.appendChild(tMaj);
      gMaj.addEventListener('pointerdown', function () {
        Sound.ready();
        var pc = Theory.nameToPc(k.major);
        Sound.chord(Theory.chordMidi(pc, 'maj', 48), { timbre: UI.state.instrument === 'guitar' ? 'guitar' : 'piano' });
        UI.toast(k.major + ' mayor  ·  ' + (k.acc || 'sin alteraciones') + '  ·  relativo ' + k.minor);
      });
      svg.appendChild(gMaj);

      var gMin = svgEl('g', { cursor: 'pointer' });
      gMin.appendChild(svgEl('circle', { cx: inner.x, cy: inner.y, r: 17, fill: '#151A22', stroke: '#262D3A' }));
      var tMin = svgEl('text', {
        x: inner.x, y: inner.y + 3.8, 'text-anchor': 'middle',
        fill: '#B4BDCC', 'font-size': 11, 'font-weight': 700,
        'font-family': 'JetBrains Mono, monospace'
      });
      tMin.textContent = k.minor;
      gMin.appendChild(tMin);
      gMin.addEventListener('pointerdown', function () {
        Sound.ready();
        var pc = Theory.nameToPc(k.minor.replace('m', ''));
        Sound.chord(Theory.chordMidi(pc, 'min', 48), { timbre: UI.state.instrument === 'guitar' ? 'guitar' : 'piano' });
        UI.toast(k.minor + '  ·  relativo menor de ' + k.major);
      });
      svg.appendChild(gMin);
    });

    var label = svgEl('text', {
      x: c, y: c + 4, 'text-anchor': 'middle', fill: '#7C879A',
      'font-size': 11, 'font-weight': 700, 'font-family': 'Inter, sans-serif'
    });
    label.textContent = 'quintas →';
    svg.appendChild(label);
    return svg;
  }

  function tableFrom(head, rows) {
    return h('div', { class: 'table-wrap' }, [
      h('table', {}, [
        h('thead', {}, [h('tr', {}, head.map(function (t) { return h('th', { html: t }); }))]),
        h('tbody', {}, rows.map(function (r) {
          return h('tr', {}, r.map(function (cell) { return h('td', { html: cell }); }));
        }))
      ])
    ]);
  }

  function scaleRows() {
    return Object.keys(Theory.SCALES).filter(function (k) { return k !== 'chromatic'; }).map(function (key) {
      var s = Theory.SCALES[key];
      var btn = '<button class="chip" type="button" data-scale="' + key + '">▶</button>';
      return ['<b>' + s.name + '</b>', '<span class="mono">' + s.degrees.join(' ') + '</span>',
        '<span class="mono">' + s.steps.join('-') + '</span>', btn];
    });
  }

  function chordRows() {
    return Object.keys(Theory.CHORDS).map(function (key) {
      var c = Theory.CHORDS[key];
      return ['<b class="mono">C' + c.suffix + '</b>', c.name,
        '<span class="mono">' + c.degrees.join(' · ') + '</span>',
        '<button class="chip" type="button" data-chord="' + key + '">▶</button>'];
    });
  }

  function render(container) {
    var host = h('div');
    container.appendChild(host);

    host.appendChild(h('div', { class: 'section-head' }, [
      h('div', { class: 'eyebrow', text: 'Guía rápida' }),
      h('h1', { text: 'Chuleta de teoría' }),
      h('p', { class: 'lead', text: 'Todo lo del curso, en tablas, para consultar mientras tocas.' })
    ]));

    /* nomenclature switch */
    var latinSeg = h('div', { class: 'seg' }, [
      h('button', {
        type: 'button', text: 'C D E F G A B', class: 'is-red',
        'aria-selected': UI.state.latin ? 'false' : 'true',
        onclick: function () { UI.setLatin(false); }
      }),
      h('button', {
        type: 'button', text: 'Do Re Mi Fa Sol', class: 'is-red',
        'aria-selected': UI.state.latin ? 'true' : 'false',
        onclick: function () { UI.setLatin(true); }
      })
    ]);
    host.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'field', style: 'margin:0' }, [
        h('label', { text: 'Nomenclatura de las notas en todos los diagramas' }),
        latinSeg
      ])
    ]));

    /* circle of fifths */
    host.appendChild(h('h2', { text: 'Círculo de quintas' }));
    host.appendChild(h('p', {
      html: 'Vecinos = tonalidades parecidas (una alteración de diferencia). El <strong>anillo interior</strong> es el relativo menor. Toca cualquier círculo para oír el acorde.'
    }));
    host.appendChild(h('div', { class: 'card' }, [circleOfFifths()]));

    /* notes */
    host.appendChild(h('h2', { text: 'Notas y enarmonías' }));
    host.appendChild(tableFrom(['Cifrado', 'Latino', 'Equivale a'], [
      ['<b>C</b>', 'Do', '—'], ['<b>C#</b>', 'Do#', 'Db'], ['<b>D</b>', 'Re', '—'],
      ['<b>D#</b>', 'Re#', 'Eb'], ['<b>E</b>', 'Mi', 'Fb'], ['<b>F</b>', 'Fa', 'E#'],
      ['<b>F#</b>', 'Fa#', 'Gb'], ['<b>G</b>', 'Sol', '—'], ['<b>G#</b>', 'Sol#', 'Ab'],
      ['<b>A</b>', 'La', '—'], ['<b>A#</b>', 'La#', 'Bb'], ['<b>B</b>', 'Si', 'Cb']
    ]));

    /* intervals */
    host.appendChild(h('h2', { text: 'Intervalos' }));
    host.appendChild(tableFrom(['Semitonos', 'Nombre', 'Cifra', 'Carácter'],
      Theory.INTERVALS.map(function (iv) {
        return ['<span class="mono">' + iv.s + '</span>', '<b>' + iv.name + '</b>',
          '<span class="mono">' + iv.short + '</span>', iv.feel];
      })));

    /* scales */
    host.appendChild(h('h2', { text: 'Escalas' }));
    var scalesTable = tableFrom(['Escala', 'Grados', 'Semitonos', 'Oír en C'], scaleRows());
    scalesTable.addEventListener('click', function (ev) {
      var key = ev.target.getAttribute && ev.target.getAttribute('data-scale');
      if (!key) { return; }
      Sound.ready();
      var notes = Theory.buildScale('C', key);
      var midis = notes.map(function (n) { return 60 + n.semitones; });
      midis.push(72);
      Sound.sequence(midis, { interval: 0.28, timbre: UI.state.instrument === 'guitar' ? 'guitar' : 'piano' });
    });
    host.appendChild(scalesTable);

    /* chords */
    host.appendChild(h('h2', { text: 'Acordes' }));
    var chordsTable = tableFrom(['Cifrado', 'Nombre', 'Grados', 'Oír'], chordRows());
    chordsTable.addEventListener('click', function (ev) {
      var key = ev.target.getAttribute && ev.target.getAttribute('data-chord');
      if (!key) { return; }
      Sound.ready();
      Sound.chord(Theory.chordMidi(0, key, 48), { timbre: UI.state.instrument === 'guitar' ? 'guitar' : 'piano' });
    });
    host.appendChild(chordsTable);
    host.appendChild(h('p', {
      class: 'footer-note', style: 'text-align:left',
      html: 'Para ver cómo se toca cada uno, abre el <a href="#/acordes">diccionario de acordes</a>.'
    }));

    /* degrees per key */
    host.appendChild(h('h2', { text: 'Grados de las tonalidades más usadas' }));
    var keys = ['C', 'G', 'D', 'A', 'E', 'F'];
    host.appendChild(tableFrom(['Tonalidad', 'I', 'ii', 'iii', 'IV', 'V', 'vi'],
      keys.map(function (k) {
        var d = Theory.diatonic(k, 'major', false);
        return ['<b>' + k + ' mayor</b>'].concat(d.slice(0, 6).map(function (c) {
          return '<span class="mono">' + c.symbol + '</span>';
        }));
      })));

    /* tuning + capo */
    host.appendChild(h('h2', { text: 'Guitarra: afinación y cejilla' }));
    host.appendChild(tableFrom(['Cuerda', 'Nota', 'Frecuencia (A4=440)'],
      Theory.GUITAR_STANDARD.slice().reverse().map(function (s) {
        return ['<b>' + s.label + '</b>', Theory.midiToName(s.midi),
          '<span class="mono">' + Theory.midiToFreq(s.midi).toFixed(2) + ' Hz</span>'];
      })));
    host.appendChild(h('p', {
      html: 'Con la cejilla en el traste <span class="mono">N</span>, cualquier forma suena <span class="mono">N</span> semitonos más alta. Forma de C con cejilla en 2 = D; forma de Am con cejilla en 3 = Cm.'
    }));

    /* glossary */
    host.appendChild(h('h2', { text: 'Glosario' }));
    [
      ['Tónica', 'La nota o el acorde que sientes como "casa". Da nombre a la tonalidad.'],
      ['Tonalidad', 'El conjunto de notas y acordes que gobiernan una canción, con su tónica al mando.'],
      ['Grado', 'La posición de una nota o acorde dentro de la escala (1 a 7, o I a vii).'],
      ['Cifrado americano', 'Escribir los acordes con letras (C, Am, G7) en vez de con partitura.'],
      ['Enarmonía', 'Dos nombres para el mismo sonido: C# y Db son la misma tecla y el mismo traste.'],
      ['Inversión', 'El mismo acorde con otra nota en el bajo. Se escribe con barra: C/E.'],
      ['Voicing', 'La manera concreta de repartir las notas de un acorde entre las manos o las cuerdas.'],
      ['Cadencia', 'La fórmula de acordes que cierra una frase. La más fuerte es V7 → I.'],
      ['Transportar', 'Mover toda la canción el mismo número de semitonos. Cambia la altura, no la música.'],
      ['CAGED', 'Sistema de guitarra: cinco formas (C, A, G, E, D) que, movidas, dan todos los acordes.'],
      ['Pentatónica', 'Escala de cinco notas. Quita las notas más comprometidas y facilita improvisar.'],
      ['ChordPro', 'Formato de texto para cancioneros: los acordes van entre corchetes dentro de la letra.']
    ].forEach(function (g) {
      host.appendChild(h('details', { class: 'acc' }, [
        h('summary', { text: g[0] }),
        h('div', {}, [h('p', { text: g[1], style: 'margin:0' })])
      ]));
    });

    host.appendChild(h('p', {
      class: 'footer-note',
      html: 'Cuerdas y Teclas · curso de teoría musical para guitarra y piano. Todo se ejecuta en tu navegador.'
    }));
  }

  global.Guide = { render: render };
})(window);
