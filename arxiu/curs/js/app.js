/* ============================================================
   app.js - state, router, course rendering and shared UI helpers.
   ============================================================ */
(function (global) {
  'use strict';

  var STORE_INSTRUMENT = 'cyt.instrument';
  var STORE_DONE = 'cyt.done';
  var STORE_LATIN = 'cyt.latin';

  var main = document.getElementById('main');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  /* ---------------- storage (never fatal) ---------------- */
  function read(key, fallback) {
    try {
      var v = global.localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  var state = {
    instrument: read(STORE_INSTRUMENT, 'both'),
    done: {},
    latin: read(STORE_LATIN, '0') === '1'
  };
  (read(STORE_DONE, '') || '').split(',').forEach(function (id) {
    if (id) { state.done[id] = true; }
  });
  Theory.prefs.latin = state.latin;

  function saveDone() {
    write(STORE_DONE, Object.keys(state.done).join(','));
  }

  /* ---------------- DOM helpers ---------------- */
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'html') { node.innerHTML = attrs[k]; }
      else if (k === 'text') { node.textContent = attrs[k]; }
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
        node.addEventListener(k.slice(2), attrs[k]);
      } else if (attrs[k] !== null && attrs[k] !== undefined) {
        node.setAttribute(k, attrs[k]);
      }
    });
    (children || []).forEach(function (c) {
      if (c) { node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    });
    return node;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function scrollBox(svg, hint) {
    var box = h('div', { class: 'scroll-x' }, [svg]);
    if (!hint) { return box; }
    return h('div', {}, [box, h('div', { class: 'scroll-hint', text: hint })]);
  }

  /* ---------------- musical playback helpers ---------------- */
  function shapeOrTheoryMidi(symbol, timbre) {
    var parsed = Theory.parseChord(symbol);
    if (!parsed) { return []; }
    if (timbre === 'guitar') {
      var shapes = Shapes.forChord(parsed.rootPc, parsed.quality);
      if (shapes.length) { return Fret.shapeMidi(shapes[0]); }
    }
    return Theory.chordMidi(parsed.rootPc, parsed.quality, 48);
  }

  function playProgression(symbols, timbre) {
    var ctx = Sound.ready();
    if (!ctx) { return; }
    var step = 1.25;
    var base = ctx.currentTime + 0.05;
    symbols.forEach(function (sym, i) {
      var midis = shapeOrTheoryMidi(sym, timbre);
      var strum = timbre === 'guitar' ? 0.03 : 0;
      midis.forEach(function (m, j) {
        Sound.note(m, {
          when: base + i * step + j * strum, dur: step * 0.95,
          timbre: timbre, gain: 0.2
        });
      });
    });
  }

  function scaleMidis(root, type, baseMidi) {
    var notes = Theory.buildScale(root, type);
    var rootPc = Theory.nameToPc(root);
    var start = baseMidi === undefined ? 60 : baseMidi;
    var low = start + Theory.mod12(rootPc - Theory.mod12(start));
    var midis = notes.map(function (n) { return low + n.semitones; });
    midis.push(low + 12);
    return midis;
  }

  function playSpec(play, timbre) {
    if (!play) { return; }
    Sound.ready();
    switch (play.kind) {
      case 'chord':
        Sound.chord(Theory.chordMidi(play.root, play.q, play.baseMidi || 48), { timbre: timbre });
        break;
      case 'scale':
        Sound.sequence(scaleMidis(play.root, play.type, play.baseMidi), { timbre: timbre, interval: 0.3 });
        break;
      case 'notes':
        Sound.sequence(play.midis, { timbre: timbre, interval: play.interval || 0.34 });
        break;
      case 'progression':
        playProgression(play.chords, timbre);
        break;
      default:
        break;
    }
  }

  /* ---------------- widget rendering ---------------- */
  function marksFor(spec) {
    var byPc = {};
    var flats = false;

    if (spec.scale) {
      var sRoot = Theory.nameToPc(spec.scale.root);
      flats = Theory.keyPrefersFlats(sRoot, spec.scale.type === 'naturalMinor' ? 'min' : 'maj');
      Theory.buildScale(spec.scale.root, spec.scale.type).forEach(function (n) {
        byPc[n.pc] = {
          pc: n.pc, degree: n.degree, flats: flats,
          role: n.degree === '1' ? 'root' : 'scale'
        };
      });
    }
    if (spec.chord) {
      var cRoot = Theory.nameToPc(spec.chord.root);
      flats = Theory.keyPrefersFlats(cRoot, spec.chord.q === 'min' ? 'min' : 'maj');
      Theory.buildChord(spec.chord.root, spec.chord.q).forEach(function (n) {
        byPc[n.pc] = {
          pc: n.pc, degree: n.degree, flats: flats,
          role: n.degree === '1' ? 'root' : 'chord'
        };
      });
    }
    (spec.extra || []).forEach(function (m) {
      var pc = Theory.mod12(m.pc !== undefined ? m.pc : Theory.nameToPc(m.note));
      byPc[pc] = { pc: pc, label: m.label, degree: m.degree, role: m.role || 'mark', flats: flats };
    });

    return Object.keys(byPc).map(function (k) { return byPc[k]; });
  }

  function renderWidget(spec) {
    var wrap = h('div', { class: 'widget' });
    if (spec.caption) {
      wrap.appendChild(h('div', { class: 'scroll-hint', style: 'text-align:left;margin:0 0 6px', text: spec.caption }));
    }

    if (spec.widget === 'html') {
      wrap.appendChild(h('div', { html: spec.html }));
      return wrap;
    }

    if (spec.widget === 'chordbox') {
      var row = h('div', { class: 'cp-used' });
      (spec.symbols || []).forEach(function (sym) {
        var shapes = Shapes.bySymbol(sym);
        var parsed = Theory.parseChord(sym);
        var cell = h('div', { style: 'text-align:center;flex:0 0 auto' });
        if (!shapes.length) {
          cell.appendChild(h('div', { class: 'note-chip', text: sym }));
          cell.appendChild(h('div', { class: 'sname', text: 'sin forma estándar' }));
        } else {
          var svg = Fret.chordBox(shapes[0], {
            size: spec.size || 'md',
            rootPc: parsed ? parsed.rootPc : undefined
          });
          svg.style.cursor = 'pointer';
          svg.addEventListener('pointerdown', function () {
            Sound.ready();
            Sound.chord(Fret.shapeMidi(shapes[0]), { timbre: 'guitar' });
          });
          cell.appendChild(svg);
          cell.appendChild(h('div', { class: 'sname', text: shapes[0].name || sym }));
        }
        row.appendChild(cell);
      });
      wrap.appendChild(row);
      return wrap;
    }

    var marks = marksFor(spec);
    var svgNode;
    if (spec.widget === 'fret') {
      var strings = null;
      if (spec.stringsSubset) {
        strings = spec.stringsSubset.map(function (i) { return Theory.GUITAR_STANDARD[i]; });
      }
      svgNode = Fret.render({
        fromFret: spec.fromFret, toFret: spec.toFret, labels: spec.labels,
        marks: marks, midiMarks: spec.midiMarks, strings: strings
      });
    } else {
      svgNode = Piano.render({
        from: spec.from, keys: spec.keys, labels: spec.labels,
        marks: marks, midiMarks: spec.midiMarks
      });
    }
    wrap.appendChild(scrollBox(svgNode, svgNode.getAttribute('width') > 340 ? 'desliza para ver más →' : null));
    return wrap;
  }

  function legend(spec) {
    var items = [];
    if (spec.chord || spec.scale) { items.push('<span class="l-root"><i></i>raíz</span>'); }
    if (spec.chord) { items.push('<span class="l-chord"><i></i>notas del acorde</span>'); }
    if (spec.scale) { items.push('<span class="l-scale"><i></i>notas de la escala</span>'); }
    if (!items.length) { return null; }
    return h('div', { class: 'legend', html: items.join('') });
  }

  function renderPane(pane, instrument) {
    var node = h('div', { class: 'pane', 'data-ins': instrument });
    node.appendChild(h('div', {
      class: 'pane-label',
      text: pane.label || (instrument === 'piano' ? 'Piano' : 'Guitarra')
    }));

    var specs = pane.diagrams || [pane];
    specs.forEach(function (spec) {
      if (!spec.widget) { return; }
      node.appendChild(renderWidget(spec));
    });

    var lg = legend(specs[0] || {});
    if (lg) { node.appendChild(lg); }

    if (pane.play) {
      node.appendChild(h('div', { class: 'btn-row', style: 'margin-top:10px' }, [
        h('button', {
          class: 'btn small', type: 'button',
          onclick: function () { playSpec(pane.play, instrument); }
        }, [h('span', { html: '&#9654;' }), h('span', { text: pane.play.label || 'Escuchar' })])
      ]));
    }
    if (pane.note) {
      node.appendChild(h('p', { class: 'note', html: pane.note }));
    }
    return node;
  }

  /* ---------------- block rendering ---------------- */
  function renderCompare(block) {
    var wrap = h('div', { class: 'compare' });
    var head = h('div', { class: 'compare-head' }, [
      h('div', { class: 'ttl', text: block.title || 'Piano y guitarra' })
    ]);

    var panes = h('div', { class: 'compare-panes' });
    var view = state.instrument;

    function paint() {
      panes.innerHTML = '';
      panes.className = 'compare-panes' + (view === 'both' ? ' two' : '');
      if (view !== 'guitar' && block.piano) { panes.appendChild(renderPane(block.piano, 'piano')); }
      if (view !== 'piano' && block.guitar) { panes.appendChild(renderPane(block.guitar, 'guitar')); }
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-v') === view ? 'true' : 'false');
      });
    }

    var seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Instrumento en este bloque' });
    [['piano', 'Piano'], ['guitar', 'Guitarra'], ['both', 'Ambos']].forEach(function (opt) {
      seg.appendChild(h('button', {
        type: 'button', role: 'tab', 'data-v': opt[0], text: opt[1],
        class: 'is-red',
        onclick: function () { view = opt[0]; paint(); }
      }));
    });
    head.appendChild(seg);
    wrap.appendChild(head);
    wrap.appendChild(panes);
    paint();
    return wrap;
  }

  function renderIntervalTable() {
    var rows = Theory.INTERVALS.map(function (iv) {
      return h('tr', {}, [
        h('td', { html: '<b>' + iv.short + '</b>' }),
        h('td', { text: iv.name }),
        h('td', { class: 'mono', text: String(iv.s) }),
        h('td', { text: iv.feel })
      ]);
    });
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, [
        h('th', { text: 'Cifra' }), h('th', { text: 'Intervalo' }),
        h('th', { text: 'Semitonos' }), h('th', { text: 'Carácter' })
      ])]),
      h('tbody', {}, rows)
    ]);
    var wrap = h('div', { class: 'table-wrap' }, [table]);
    var play = h('div', { class: 'btn-row', style: 'margin-bottom:18px' }, [
      h('button', {
        class: 'btn small', type: 'button', html: '&#9654; Oír todos desde C',
        onclick: function () {
          Sound.ready();
          Sound.sequence([60, 61, 60, 62, 60, 63, 60, 64, 60, 65, 60, 66, 60, 67, 60, 68, 60, 69, 60, 70, 60, 71, 60, 72],
            { interval: 0.26, dur: 0.5, timbre: state.instrument === 'guitar' ? 'guitar' : 'piano' });
        }
      })
    ]);
    return h('div', {}, [wrap, play]);
  }

  function renderDiatonic(block) {
    var chords = Theory.diatonic(block.root, block.mode, block.sevenths);
    var isMajor = block.mode !== 'naturalMinor';
    var rows = chords.map(function (c, i) {
      var btn = h('button', {
        class: 'chip', type: 'button', text: c.symbol,
        onclick: function () {
          Sound.ready();
          var timbre = state.instrument === 'guitar' ? 'guitar' : 'piano';
          Sound.chord(shapeOrTheoryMidi(c.symbol, timbre), { timbre: timbre });
        }
      });
      return h('tr', {}, [
        h('td', { html: '<b class="mono">' + c.roman + '</b>' }),
        h('td', {}, [btn]),
        h('td', { text: Theory.CHORDS[c.quality].name }),
        h('td', { text: c.role || (isMajor ? '' : ['Tónica menor', 'Inestable', 'Relativo mayor', 'Subdominante', 'Dominante suave', 'Color luminoso', 'Vuelta al i'][i]) })
      ]);
    });
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, [
        h('th', { text: 'Grado' }), h('th', { text: 'Acorde' }),
        h('th', { text: 'Tipo' }), h('th', { text: 'Función' })
      ])]),
      h('tbody', {}, rows)
    ]);
    var caption = h('p', {
      html: 'Acordes de <strong>' + Theory.pcName(Theory.nameToPc(block.root)) +
        (isMajor ? ' mayor' : ' menor') + '</strong>. Toca cualquiera para oírlo.'
    });
    return h('div', {}, [caption, h('div', { class: 'table-wrap' }, [table])]);
  }

  function renderQuiz(block) {
    var wrap = h('div', { class: 'quiz' });
    wrap.appendChild(h('div', { class: 'q', html: block.q }));
    var fb = h('div', { class: 'fb', html: block.explain });
    var opts = h('div', { class: 'quiz-opts' });
    var answered = false;

    block.options.forEach(function (label, idx) {
      var btn = h('button', { class: 'quiz-opt', type: 'button', html: label });
      btn.addEventListener('click', function () {
        if (answered) { return; }
        answered = true;
        var ok = idx === block.answer;
        btn.classList.add(ok ? 'ok' : 'ko');
        if (!ok) {
          opts.children[block.answer].classList.add('ok');
        }
        fb.classList.add('show');
        toast(ok ? 'Correcto' : 'Casi: mira la explicación');
      });
      opts.appendChild(btn);
    });

    wrap.appendChild(opts);
    wrap.appendChild(fb);
    return wrap;
  }

  function renderChordsBlock(block) {
    var wrap = h('div', { class: 'card' });
    if (block.title) { wrap.appendChild(h('h3', { text: block.title })); }
    var row = h('div', { class: 'chip-row' });
    block.symbols.forEach(function (sym) {
      row.appendChild(h('button', {
        class: 'chip', type: 'button', text: sym,
        onclick: function () {
          Sound.ready();
          var timbre = state.instrument === 'guitar' ? 'guitar' : 'piano';
          Sound.chord(shapeOrTheoryMidi(sym, timbre), { timbre: timbre });
        }
      }));
    });
    wrap.appendChild(row);
    if (block.html) { wrap.appendChild(h('p', { html: block.html, style: 'margin:8px 0 0;font-size:.86rem' })); }
    return wrap;
  }

  function renderTable(block) {
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, block.head.map(function (t) { return h('th', { html: t }); }))]),
      h('tbody', {}, block.rows.map(function (r) {
        return h('tr', {}, r.map(function (c) { return h('td', { html: c }); }));
      }))
    ]);
    return h('div', { class: 'table-wrap' }, [table]);
  }

  function renderBlock(block) {
    switch (block.k) {
      case 'h': return h('h2', { text: block.text });
      case 'p': return h('p', { html: block.html });
      case 'note': return h('div', { class: 'callout' }, [
        block.title ? h('div', { class: 'ct', text: block.title }) : null,
        h('p', { html: block.html })
      ]);
      case 'tip': return h('div', { class: 'callout tip' }, [
        h('div', { class: 'ct', text: block.title || 'Truco' }),
        h('p', { html: block.html })
      ]);
      case 'exercise': return h('div', { class: 'callout exercise' }, [
        h('div', { class: 'ct', text: block.title || 'Ejercicio' }),
        h('p', { html: block.html })
      ]);
      case 'compare': return renderCompare(block);
      case 'quiz': return renderQuiz(block);
      case 'table': return renderTable(block);
      case 'intervalTable': return renderIntervalTable();
      case 'diatonic': return renderDiatonic(block);
      case 'chords': return renderChordsBlock(block);
      case 'link': return h('a', { class: 'btn primary block', href: block.href, style: 'margin-bottom:18px' }, [
        h('span', { text: block.label }), block.hint ? h('span', { style: 'opacity:.75;font-weight:400', text: '· ' + block.hint }) : null
      ]);
      default: return h('div', { text: '' });
    }
  }

  /* ---------------- views ---------------- */
  function viewCourse() {
    var lessons = Lessons.all();
    var doneCount = lessons.filter(function (l) { return state.done[l.id]; }).length;
    var pct = lessons.length ? Math.round(doneCount / lessons.length * 100) : 0;

    var frag = document.createDocumentFragment();

    frag.appendChild(h('div', { class: 'hero' }, [
      h('div', { class: 'eyebrow', text: 'Curso completo · ' + Lessons.totalMinutes() + ' min' }),
      h('h1', { html: 'Teoría musical para <span class="hl">guitarra y piano</span>' }),
      h('p', {
        class: 'lead',
        html: 'Doce módulos, unas dos horas. Cada idea explicada <strong>en los dos instrumentos a la vez</strong>, para que entiendas la música y no solo las posiciones. Todos los diagramas suenan si los tocas.'
      })
    ]));

    frag.appendChild(h('div', { class: 'stats' }, [
      h('div', { class: 'stat' }, [h('b', { text: String(lessons.length) }), h('span', { text: 'módulos' })]),
      h('div', { class: 'stat' }, [h('b', { text: Lessons.totalMinutes() + '′' }), h('span', { text: 'duración' })]),
      h('div', { class: 'stat' }, [h('b', { text: pct + '%' }), h('span', { text: 'completado' })])
    ]));

    frag.appendChild(h('div', { class: 'progress', style: 'margin:6px 0 20px' }, [
      h('i', { style: 'width:' + pct + '%' })
    ]));

    var list = h('div', { class: 'lesson-list' });
    lessons.forEach(function (l) {
      var isDone = !!state.done[l.id];
      list.appendChild(h('a', {
        class: 'lesson-card' + (isDone ? ' is-done' : ''), href: '#/leccion/' + l.id
      }, [
        h('div', { class: 'num', html: isDone ? '&#10003;' : String(l.id) }),
        h('div', {}, [
          h('div', { class: 't', text: l.title }),
          h('div', { class: 's', text: l.subtitle })
        ]),
        h('div', { class: 'meta', text: l.minutes + ' min' })
      ]));
    });
    frag.appendChild(list);

    frag.appendChild(h('h2', { text: 'Herramientas', style: 'margin-top:28px' }));
    var tools = h('div', { class: 'grid2' });
    [
      ['#/herramientas/afinador', 'Afinador', 'Por micrófono, con tonos de referencia.'],
      ['#/herramientas/metronomo', 'Metrónomo', 'Tap tempo, acentos y subdivisiones.'],
      ['#/herramientas/chordpro', 'ChordPro', 'Escribe, transpone y toca tus canciones.'],
      ['#/acordes', 'Diccionario de acordes', 'Formas de guitarra y voicings de piano.']
    ].forEach(function (t) {
      tools.appendChild(h('a', { class: 'card', href: t[0], style: 'display:block;margin:0' }, [
        h('h3', { text: t[1], style: 'margin-bottom:4px' }),
        h('p', { text: t[2], style: 'margin:0;font-size:.85rem' })
      ]));
    });
    frag.appendChild(tools);

    frag.appendChild(h('p', {
      class: 'footer-note',
      html: 'Hecho para aprender rápido. Sin cuentas, sin datos, sin conexión necesaria una vez cargada la página.'
    }));

    return frag;
  }

  function viewLesson(id) {
    var lesson = Lessons.byId(id);
    if (!lesson) { return viewCourse(); }
    var idx = Lessons.indexOfId(id);
    var all = Lessons.all();
    var frag = document.createDocumentFragment();

    frag.appendChild(h('div', { class: 'lesson-top' }, [
      h('a', { class: 'back', href: '#/curso', html: '&#8592; Curso' }),
      h('span', { class: 'pill neutral', text: 'Módulo ' + lesson.id + ' · ' + lesson.minutes + ' min' })
    ]));

    frag.appendChild(h('div', { class: 'section-head' }, [
      h('h1', { text: lesson.title }),
      h('p', { class: 'lead', text: lesson.subtitle })
    ]));

    if (lesson.goal) {
      frag.appendChild(h('div', { class: 'callout' }, [
        h('div', { class: 'ct', text: 'Objetivo' }),
        h('p', { text: lesson.goal })
      ]));
    }

    var body = h('div', { class: 'lesson-body' });
    lesson.blocks.forEach(function (b) {
      var node = renderBlock(b);
      node.classList.add('block');
      body.appendChild(node);
    });
    frag.appendChild(body);

    var doneBtn = h('button', {
      class: 'btn block' + (state.done[lesson.id] ? '' : ' primary'), type: 'button',
      text: state.done[lesson.id] ? '✓ Completado (quitar)' : 'Marcar como completado'
    });
    doneBtn.addEventListener('click', function () {
      if (state.done[lesson.id]) { delete state.done[lesson.id]; }
      else { state.done[lesson.id] = true; toast('Módulo ' + lesson.id + ' completado'); }
      saveDone();
      if (state.done[lesson.id] && idx < all.length - 1) {
        global.location.hash = '#/leccion/' + all[idx + 1].id;
      } else {
        render();
      }
    });
    frag.appendChild(h('div', { style: 'margin-top:24px' }, [doneBtn]));

    var nav = h('div', { class: 'lesson-nav' });
    if (idx > 0) {
      nav.appendChild(h('a', { class: 'btn', href: '#/leccion/' + all[idx - 1].id, html: '&#8592; Anterior' }));
    }
    if (idx < all.length - 1) {
      nav.appendChild(h('a', { class: 'btn', href: '#/leccion/' + all[idx + 1].id, html: 'Siguiente &#8594;' }));
    } else {
      nav.appendChild(h('a', { class: 'btn', href: '#/curso', text: 'Volver al curso' }));
    }
    frag.appendChild(nav);

    return frag;
  }

  function viewTools(which) {
    var tab = which || 'afinador';
    var frag = document.createDocumentFragment();

    frag.appendChild(h('div', { class: 'section-head' }, [
      h('div', { class: 'eyebrow', text: 'Herramientas' }),
      h('h1', { text: tab === 'metronomo' ? 'Metrónomo' : tab === 'chordpro' ? 'ChordPro' : 'Afinador' })
    ]));

    var seg = h('div', { class: 'seg' });
    [['afinador', 'Afinador'], ['metronomo', 'Metrónomo'], ['chordpro', 'ChordPro']].forEach(function (t) {
      seg.appendChild(h('button', {
        type: 'button', text: t[1], 'aria-selected': t[0] === tab ? 'true' : 'false',
        class: 'is-red',
        onclick: function () { global.location.hash = '#/herramientas/' + t[0]; }
      }));
    });
    frag.appendChild(seg);

    var host = h('div', { class: 'tool-wrap' });
    frag.appendChild(host);

    global.setTimeout(function () {
      if (tab === 'metronomo') { Metronome.render(host); }
      else if (tab === 'chordpro') { ChordPro.render(host); }
      else { Tuner.render(host); }
    }, 0);

    return frag;
  }

  /* ---------------- router ---------------- */
  var cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }

  function render() {
    cleanups.forEach(function (fn) {
      try { fn(); } catch (e) { /* ignore */ }
    });
    cleanups = [];
    Sound.stopSequence();

    var hash = global.location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);
    var section = parts[0] || 'curso';

    main.innerHTML = '';
    var node;
    if (section === 'leccion') { node = viewLesson(parts[1]); }
    else if (section === 'acordes') { node = h('div'); }
    else if (section === 'herramientas') { node = viewTools(parts[1]); }
    else if (section === 'guia') { node = h('div'); }
    else { node = viewCourse(); }
    main.appendChild(node);

    if (section === 'acordes') { ChordBook.render(main, parts.slice(1)); }
    if (section === 'guia') { Guide.render(main); }

    var navSection = section === 'leccion' ? 'curso' : section;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (a) {
      if (a.getAttribute('data-section') === navSection) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });

    global.scrollTo(0, 0);
  }

  /* ---------------- instrument switch ---------------- */
  function paintInstrument() {
    Array.prototype.forEach.call(document.querySelectorAll('.ins-btn'), function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-instrument') === state.instrument ? 'true' : 'false');
    });
    Sound.setInstrument(state.instrument === 'guitar' ? 'guitar' : 'piano');
  }

  Array.prototype.forEach.call(document.querySelectorAll('.ins-btn'), function (b) {
    b.addEventListener('click', function () {
      state.instrument = b.getAttribute('data-instrument');
      write(STORE_INSTRUMENT, state.instrument);
      paintInstrument();
      render();
    });
  });

  /* ---------------- boot ---------------- */
  global.UI = {
    h: h,
    toast: toast,
    state: state,
    scrollBox: scrollBox,
    renderWidget: renderWidget,
    playSpec: playSpec,
    playProgression: playProgression,
    shapeOrTheoryMidi: shapeOrTheoryMidi,
    onLeave: onLeave,
    write: write,
    read: read,
    setLatin: function (on) {
      state.latin = on;
      Theory.prefs.latin = on;
      write(STORE_LATIN, on ? '1' : '0');
      render();
    },
    refresh: render
  };

  global.addEventListener('hashchange', render);
  document.addEventListener('pointerdown', function once() {
    Sound.ready();
    document.removeEventListener('pointerdown', once);
  }, { once: true });

  paintInstrument();
  if (!global.location.hash) { global.location.hash = '#/curso'; }
  render();
})(window);
