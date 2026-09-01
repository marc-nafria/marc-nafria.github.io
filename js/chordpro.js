/* ============================================================
   chordpro.js - ChordPro editor, live preview, transposition and
   chord diagrams for the detected chords.
   Format: [C] inline chords, {directives} between braces.
   ============================================================ */
(function (global) {
  'use strict';

  var STORE_SONG = 'cyt.song';

  var SAMPLE = [
    '{title: Mi primera canción}',
    '{artist: Cuatro acordes y ya}',
    '',
    '{comment: Verso}',
    '[Am]Suena la [F]tarde en el [C]patio de al [G]lado,',
    '[Am]y el mismo a[F]corde me [C]vuelve a encon[G]trar.',
    '',
    '{start_of_chorus}',
    '{comment: Estribillo}',
    '[F]Cuatro acordes [C]bastan para em[G]pezar,',
    '[F]el resto es [C]tiempo y ganas de to[G]car.',
    '{end_of_chorus}',
    '',
    '{comment: Puente}',
    '[Dm]Sube al [G]quinto, [C]vuelve a [Am]casa,',
    '[Dm]cierra en [E7]tensión y resuelve en [Am]La menor.'
  ].join('\n');

  var transpose = 0;
  var useFlats = false;
  var mode = 'view';

  function h(tag, attrs, kids) { return UI.h(tag, attrs, kids); }

  /* ---- parser --------------------------------------------------------- */
  function parseSong(text) {
    var out = { title: '', artist: '', lines: [] };
    var inChorus = false;

    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');
      var directive = line.match(/^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/);

      if (directive) {
        var name = directive[1].toLowerCase();
        var value = directive[2].trim();
        if (name === 'title' || name === 't') { out.title = value; }
        else if (name === 'artist' || name === 'subtitle' || name === 'st') { out.artist = value; }
        else if (name === 'comment' || name === 'c' || name === 'comment_italic') {
          out.lines.push({ type: 'comment', text: value, chorus: inChorus });
        } else if (name === 'start_of_chorus' || name === 'soc') { inChorus = true; }
        else if (name === 'end_of_chorus' || name === 'eoc') { inChorus = false; }
        return;
      }

      if (!line.trim()) {
        out.lines.push({ type: 'blank' });
        return;
      }

      // Split into [chord]lyric segments.
      var segs = [];
      var re = /\[([^\]]+)\]/g;
      var lastIndex = 0;
      var match = re.exec(line);
      if (match && match.index > 0) {
        segs.push({ chord: '', text: line.slice(0, match.index) });
      }
      while (match) {
        var chord = match[1];
        lastIndex = match.index + match[0].length;
        var next = re.exec(line);
        var text = line.slice(lastIndex, next ? next.index : line.length);
        segs.push({ chord: chord, text: text });
        match = next;
      }
      if (!segs.length) { segs.push({ chord: '', text: line }); }
      out.lines.push({ type: 'line', segs: segs, chorus: inChorus });
    });

    return out;
  }

  function usedChords(song) {
    var seen = [];
    song.lines.forEach(function (l) {
      if (l.type !== 'line') { return; }
      l.segs.forEach(function (s) {
        if (s.chord && seen.indexOf(s.chord) === -1) { seen.push(s.chord); }
      });
    });
    return seen;
  }

  function shown(chord) {
    return transpose === 0 ? chord : Theory.transposeChordText(chord, transpose, useFlats);
  }

  /* ---- preview -------------------------------------------------------- */
  function renderSong(song) {
    var wrap = h('div', { class: 'cp-song' });
    if (song.title) { wrap.appendChild(h('div', { class: 'cp-title', text: song.title })); }
    if (song.artist) { wrap.appendChild(h('div', { class: 'cp-artist', text: song.artist })); }

    var chorusBox = null;

    song.lines.forEach(function (l) {
      var target = wrap;
      if (l.chorus) {
        if (!chorusBox) {
          chorusBox = h('div', { class: 'cp-chorus' });
          wrap.appendChild(chorusBox);
        }
        target = chorusBox;
      } else {
        chorusBox = null;
      }

      if (l.type === 'blank') { target.appendChild(h('div', { class: 'cp-blank' })); return; }
      if (l.type === 'comment') { target.appendChild(h('div', { class: 'cp-comment', text: l.text })); return; }

      var lineEl = h('div', { class: 'cp-line' });
      l.segs.forEach(function (s) {
        var label = s.chord ? shown(s.chord) : '';
        // A trailing space keeps the chord from colliding with the next one.
        var chordText = label ? label + ' ' : '';
        lineEl.appendChild(h('div', { class: 'cp-seg' }, [
          h('div', { class: 'ch', text: chordText }),
          h('div', { class: 'ly', text: s.text })
        ]));
      });
      target.appendChild(lineEl);
    });

    return wrap;
  }

  function renderDiagrams(chords) {
    var view = UI.state.instrument;
    var wrap = h('div', { class: 'compare', style: 'margin-top:14px' });
    wrap.appendChild(h('div', { class: 'compare-head' }, [
      h('div', { class: 'ttl', text: 'Acordes de la canción' }),
      h('button', {
        class: 'btn small', type: 'button', html: '&#9654; Escuchar la vuelta',
        onclick: function () {
          Sound.ready();
          UI.playProgression(chords.map(shown), view === 'guitar' ? 'guitar' : 'piano');
        }
      })
    ]));

    var panes = h('div', { class: 'compare-panes' + (view === 'both' ? ' two' : '') });

    if (view !== 'guitar') {
      var pianoPane = h('div', { class: 'pane', 'data-ins': 'piano' }, [
        h('div', { class: 'pane-label', text: 'Piano' })
      ]);
      chords.forEach(function (c) {
        var parsed = Theory.parseChord(shown(c));
        if (!parsed) { return; }
        var notes = Theory.buildChord(parsed.rootPc, parsed.quality);
        pianoPane.appendChild(h('div', {
          class: 'scroll-hint', style: 'text-align:left;margin:8px 0 2px',
          text: shown(c) + '  ·  ' + notes.map(function (n) {
            return Theory.pcName(n.pc, { flats: useFlats });
          }).join(' – ')
        }));
        pianoPane.appendChild(UI.scrollBox(Piano.render({
          from: 48, keys: 8, labels: 'degree',
          marks: notes.map(function (n) {
            return { pc: n.pc, degree: n.degree, role: n.degree === '1' ? 'root' : 'chord', flats: useFlats };
          })
        })));
      });
      panes.appendChild(pianoPane);
    }

    if (view !== 'piano') {
      var guitarPane = h('div', { class: 'pane', 'data-ins': 'guitar' }, [
        h('div', { class: 'pane-label', text: 'Guitarra' })
      ]);
      var row = h('div', { class: 'cp-used' });
      chords.forEach(function (c) {
        var symbol = shown(c);
        var shapes = Shapes.bySymbol(symbol);
        var parsed = Theory.parseChord(symbol);
        var cell = h('div', { style: 'text-align:center;flex:0 0 auto' });
        if (shapes.length) {
          var svg = Fret.chordBox(shapes[0], { size: 'md', rootPc: parsed ? parsed.rootPc : undefined });
          svg.style.cursor = 'pointer';
          svg.addEventListener('pointerdown', function () {
            Sound.ready();
            Sound.chord(Fret.shapeMidi(shapes[0]), { timbre: 'guitar' });
          });
          cell.appendChild(svg);
        }
        cell.appendChild(h('div', { class: 'sname', text: symbol }));
        row.appendChild(cell);
      });
      guitarPane.appendChild(row);
      if (transpose > 0) {
        guitarPane.appendChild(h('p', {
          class: 'note',
          html: 'Atajo de guitarrista: pon la <strong>cejilla en el traste ' + transpose +
            '</strong> y toca las formas originales. Suena transportado sin aprender nada nuevo.'
        }));
      }
      panes.appendChild(guitarPane);
    }

    wrap.appendChild(panes);
    return wrap;
  }

  /* ---- view ----------------------------------------------------------- */
  function render(host) {
    host.innerHTML = '';

    var saved = UI.read(STORE_SONG, '');
    var editor = h('textarea', {
      class: 'cp-editor', spellcheck: 'false',
      'aria-label': 'Editor ChordPro'
    });
    editor.value = saved || SAMPLE;

    var preview = h('div', { class: 'card' });
    var diagrams = h('div', {});

    function repaint() {
      var song = parseSong(editor.value);
      preview.innerHTML = '';
      preview.appendChild(renderSong(song));
      diagrams.innerHTML = '';
      var chords = usedChords(song);
      if (chords.length) { diagrams.appendChild(renderDiagrams(chords)); }
      UI.write(STORE_SONG, editor.value);
    }

    editor.addEventListener('input', function () {
      global.clearTimeout(editor._t);
      editor._t = global.setTimeout(repaint, 250);
    });

    /* toolbar */
    var tSpan = h('span', { text: transpose > 0 ? '+' + transpose : String(transpose) });
    function setTranspose(v) {
      transpose = Math.max(-11, Math.min(11, v));
      tSpan.textContent = transpose > 0 ? '+' + transpose : String(transpose);
      repaint();
    }

    var toolbar = h('div', { class: 'cp-toolbar' }, [
      h('div', { class: 'seg' }, [
        h('button', {
          type: 'button', text: 'Ver', class: 'is-red', 'aria-selected': mode === 'view' ? 'true' : 'false',
          onclick: function () { mode = 'view'; paintMode(); }
        }),
        h('button', {
          type: 'button', text: 'Editar', class: 'is-red', 'aria-selected': mode === 'edit' ? 'true' : 'false',
          onclick: function () { mode = 'edit'; paintMode(); }
        })
      ]),
      h('div', { class: 'cp-transpose' }, [
        h('button', { class: 'btn small', type: 'button', text: '−', onclick: function () { setTranspose(transpose - 1); } }),
        h('span', { text: 'Tono' }), tSpan,
        h('button', { class: 'btn small', type: 'button', text: '+', onclick: function () { setTranspose(transpose + 1); } }),
        h('button', {
          class: 'btn small', type: 'button', text: useFlats ? 'b' : '#',
          onclick: function (ev) {
            useFlats = !useFlats;
            ev.target.textContent = useFlats ? 'b' : '#';
            repaint();
          }
        })
      ])
    ]);

    var actions = h('div', { class: 'btn-row', style: 'margin-top:12px' }, [
      h('button', {
        class: 'btn small', type: 'button', text: 'Copiar cifrado',
        onclick: function () {
          var text = editor.value;
          if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
            global.navigator.clipboard.writeText(text).then(function () {
              UI.toast('Cifrado copiado');
            }, function () { UI.toast('No se pudo copiar'); });
          } else {
            editor.select();
            UI.toast('Selecciona y copia manualmente');
          }
        }
      }),
      h('button', {
        class: 'btn small', type: 'button', text: 'Nueva canción',
        onclick: function () {
          editor.value = '{title: Sin título}\n{artist: }\n\n[Am]Escribe aquí tu [F]letra con los [C]acordes entre cor[G]chetes.\n';
          transpose = 0;
          setTranspose(0);
          mode = 'edit';
          paintMode();
        }
      }),
      h('button', {
        class: 'btn small', type: 'button', text: 'Cargar ejemplo',
        onclick: function () {
          editor.value = SAMPLE;
          repaint();
          UI.toast('Ejemplo cargado');
        }
      })
    ]);

    var editorCard = h('div', { class: 'card' }, [
      h('div', { class: 'field' }, [
        h('label', { text: 'Cifrado ChordPro' }),
        editor
      ]),
      h('p', {
        class: 'note', style: 'margin:0',
        html: 'Sintaxis: <code>[Am]</code> antes de la sílaba donde cambia el acorde. Directivas: <code>{title:}</code>, <code>{artist:}</code>, <code>{comment:}</code>, <code>{start_of_chorus}</code> / <code>{end_of_chorus}</code>. Se guarda automáticamente en este navegador.'
      })
    ]);

    function paintMode() {
      editorCard.style.display = mode === 'edit' ? '' : 'none';
      preview.style.display = mode === 'view' ? '' : 'none';
      diagrams.style.display = mode === 'view' ? '' : 'none';
      Array.prototype.forEach.call(toolbar.querySelectorAll('.seg button'), function (b, i) {
        b.setAttribute('aria-selected', (i === 0) === (mode === 'view') ? 'true' : 'false');
      });
    }

    host.appendChild(toolbar);
    host.appendChild(editorCard);
    host.appendChild(preview);
    host.appendChild(diagrams);
    host.appendChild(actions);

    repaint();
    paintMode();
  }

  global.ChordPro = { render: render, parseSong: parseSong };
})(window);
