/* ============================================================
   shapes.js - guitar chord shapes.
   Two sources: a dictionary of open/first-position chords, and
   movable (barre / CAGED) templates that work for any root.
   frets arrays are always low-E first; -1 means muted string.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---- open and first-position chords -------------------------------- */
  var OPEN = [
    { root: 'C',  q: 'maj',  name: 'C',      frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    { root: 'C',  q: 'maj7', name: 'Cmaj7',  frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    { root: 'C',  q: 'dom7', name: 'C7',     frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
    { root: 'C',  q: 'add9', name: 'Cadd9',  frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },

    { root: 'D',  q: 'maj',  name: 'D',      frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    { root: 'D',  q: 'min',  name: 'Dm',     frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    { root: 'D',  q: 'dom7', name: 'D7',     frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 3, 1, 2] },
    { root: 'D',  q: 'min7', name: 'Dm7',    frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
    { root: 'D',  q: 'maj7', name: 'Dmaj7',  frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
    { root: 'D',  q: 'sus4', name: 'Dsus4',  frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
    { root: 'D',  q: 'sus2', name: 'Dsus2',  frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },

    { root: 'E',  q: 'maj',  name: 'E',      frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    { root: 'E',  q: 'min',  name: 'Em',     frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    { root: 'E',  q: 'dom7', name: 'E7',     frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    { root: 'E',  q: 'min7', name: 'Em7',    frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] },
    { root: 'E',  q: 'sus4', name: 'Esus4',  frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },

    { root: 'F',  q: 'maj',  name: 'F',      frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
    { root: 'F',  q: 'maj',  name: 'F (fácil)', frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] },
    { root: 'F',  q: 'maj7', name: 'Fmaj7',  frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },

    { root: 'G',  q: 'maj',  name: 'G',      frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
    { root: 'G',  q: 'dom7', name: 'G7',     frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    { root: 'G',  q: 'maj7', name: 'Gmaj7',  frets: [3, 2, 0, 0, 0, 2], fingers: [3, 1, 0, 0, 0, 2] },

    { root: 'A',  q: 'maj',  name: 'A',      frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    { root: 'A',  q: 'min',  name: 'Am',     frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    { root: 'A',  q: 'dom7', name: 'A7',     frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
    { root: 'A',  q: 'min7', name: 'Am7',    frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    { root: 'A',  q: 'maj7', name: 'Amaj7',  frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 3, 1, 2, 0] },
    { root: 'A',  q: 'sus2', name: 'Asus2',  frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
    { root: 'A',  q: 'sus4', name: 'Asus4',  frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },

    { root: 'B',  q: 'dom7', name: 'B7',     frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
    { root: 'B',  q: 'min',  name: 'Bm',     frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
    { root: 'B',  q: 'min7', name: 'Bm7',    frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 2, 0, 3, 0, 4] }
  ];

  /**
   * Movable templates. `rel` is the fret offset from the barre position
   * (null = muted string), `rootString` the index (0 = 6th) holding the root
   * and `rootRel` that string's offset.
   */
  var MOVABLE = [
    { q: 'maj',  family: 'E', label: 'Cejilla forma E', rootString: 0, rootRel: 0,
      rel: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], minBase: 1 },
    { q: 'maj',  family: 'A', label: 'Cejilla forma A', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 2, 2, 0], fingers: [0, 1, 3, 3, 3, 1], minBase: 1 },
    { q: 'min',  family: 'E', label: 'Cejilla forma Em', rootString: 0, rootRel: 0,
      rel: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], minBase: 1 },
    { q: 'min',  family: 'A', label: 'Cejilla forma Am', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1], minBase: 1 },
    { q: 'dom7', family: 'E', label: 'Cejilla forma E7', rootString: 0, rootRel: 0,
      rel: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1], minBase: 1 },
    { q: 'dom7', family: 'A', label: 'Cejilla forma A7', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1], minBase: 1 },
    { q: 'min7', family: 'E', label: 'Cejilla forma Em7', rootString: 0, rootRel: 0,
      rel: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1], minBase: 1 },
    { q: 'min7', family: 'A', label: 'Cejilla forma Am7', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1], minBase: 1 },
    { q: 'maj7', family: 'E', label: 'Maj7 raíz 6ª', rootString: 0, rootRel: 0,
      rel: [0, null, 1, 1, 0, null], fingers: [1, 0, 2, 3, 1, 0], minBase: 1 },
    { q: 'maj7', family: 'A', label: 'Maj7 raíz 5ª', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 1, 2, null], fingers: [0, 1, 3, 2, 4, 0], minBase: 1 },
    { q: 'm7b5', family: 'A', label: 'Semidisminuido raíz 5ª', rootString: 1, rootRel: 0,
      rel: [null, 0, 1, 0, 1, null], fingers: [0, 2, 3, 1, 4, 0], minBase: 1 },
    { q: 'dim7', family: 'A', label: 'Dim7 raíz 5ª', rootString: 1, rootRel: 0,
      rel: [null, 0, 1, -1, 1, null], fingers: [0, 2, 3, 1, 4, 0], minBase: 1 },
    { q: 'sus4', family: 'E', label: 'Sus4 raíz 6ª', rootString: 0, rootRel: 0,
      rel: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1], minBase: 1 },
    { q: 'sus2', family: 'A', label: 'Sus2 raíz 5ª', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, 2, 0, null], fingers: [0, 1, 3, 4, 0, 0], minBase: 1 },
    { q: 'pow',  family: 'E', label: 'Power chord raíz 6ª', rootString: 0, rootRel: 0,
      rel: [0, 2, null, null, null, null], fingers: [1, 3, 0, 0, 0, 0], minBase: 1 },
    { q: 'pow',  family: 'A', label: 'Power chord raíz 5ª', rootString: 1, rootRel: 0,
      rel: [null, 0, 2, null, null, null], fingers: [0, 1, 3, 0, 0, 0], minBase: 1 },
    { q: 'min',  family: 'D', label: 'Forma Dm (raíz 4ª)', rootString: 2, rootRel: 0,
      rel: [null, null, 0, 2, 3, 1], fingers: [0, 0, 1, 2, 4, 1], minBase: 0 },
    { q: 'maj',  family: 'D', label: 'Forma D (raíz 4ª)', rootString: 2, rootRel: 0,
      rel: [null, null, 0, 2, 3, 2], fingers: [0, 0, 1, 2, 4, 3], minBase: 0 }
  ];

  var MAX_BASE = 12;

  function movableShape(tpl, rootPc) {
    var openMidi = Theory.GUITAR_STANDARD[tpl.rootString].midi;
    var base = Theory.mod12(rootPc - openMidi - tpl.rootRel);
    var minRel = Math.min.apply(null, tpl.rel.filter(function (r) { return r !== null; }));
    while (base + minRel < tpl.minBase) { base += 12; }
    if (base > MAX_BASE) { return null; }
    var frets = tpl.rel.map(function (r) { return r === null ? -1 : r + base; });
    return {
      name: Theory.chordSymbol(rootPc, tpl.q, { flats: Theory.keyPrefersFlats(rootPc, tpl.q === 'min' ? 'min' : 'maj') }),
      label: tpl.label,
      family: tpl.family,
      frets: frets,
      fingers: tpl.fingers,
      base: base,
      movable: true
    };
  }

  /** All known shapes for a chord: open ones first, then movable barre forms. */
  function forChord(rootPc, quality) {
    var pc = Theory.mod12(rootPc);
    var out = [];
    OPEN.forEach(function (s) {
      if (Theory.nameToPc(s.root) === pc && s.q === quality) {
        out.push({
          name: s.name, label: 'posició oberta', frets: s.frets.slice(),
          fingers: s.fingers.slice(), base: 1, movable: false
        });
      }
    });
    var movable = [];
    MOVABLE.forEach(function (tpl) {
      if (tpl.q !== quality) { return; }
      var shape = movableShape(tpl, pc);
      if (shape) { movable.push(shape); }
    });
    // Lowest position first: that is the one a learner should try.
    movable.sort(function (a, b) { return a.base - b.base; });
    return out.concat(movable);
  }

  /** Look up an open chord by symbol text, e.g. "Am7". Used by ChordPro. */
  function bySymbol(text) {
    var parsed = Theory.parseChord(text);
    if (!parsed) { return []; }
    return forChord(parsed.rootPc, parsed.quality);
  }

  /** Sustituye las posiciones (lo usa data/chords.json). Muta en sitio. */
  function setData(open, movable) {
    OPEN.length = 0;
    Array.prototype.push.apply(OPEN, open);
    MOVABLE.length = 0;
    Array.prototype.push.apply(MOVABLE, movable);
  }

  global.Shapes = {
    OPEN: OPEN, MOVABLE: MOVABLE,
    forChord: forChord, bySymbol: bySymbol, setData: setData
  };
})(window);
