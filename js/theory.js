/* ============================================================
   theory.js - music model shared by every widget of the site.
   Pitch classes are integers 0..11 (0 = C). MIDI: A4 = 69.
   ============================================================ */
(function (global) {
  'use strict';

  var SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  /* Spanish (latin) note names, the ones most learners here grew up with. */
  var LATIN_SHARP = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  var LATIN_FLAT  = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var LATIN_PC  = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

  /* Major keys usually written with flats: Db, Eb, F, Ab, Bb. */
  var FLAT_KEYS = { 1: true, 3: true, 5: true, 8: true, 10: true };
  /* Minor keys usually written with flats: Cm, Ebm, Fm, Gm, Abm, Bbm, Dm. */
  var FLAT_MINOR_KEYS = { 0: true, 2: true, 3: true, 5: true, 7: true, 8: true, 10: true };

  var DEGREE_BY_SEMITONE = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'];

  var INTERVALS = [
    { s: 0,  short: 'U',   name: 'Unísono',           feel: 'La misma nota' },
    { s: 1,  short: '2m',  name: 'Segunda menor',     feel: 'Tensión máxima (Tiburón)' },
    { s: 2,  short: '2M',  name: 'Segunda mayor',     feel: 'Paso de escala' },
    { s: 3,  short: '3m',  name: 'Tercera menor',     feel: 'Triste / oscuro' },
    { s: 4,  short: '3M',  name: 'Tercera mayor',     feel: 'Alegre / luminoso' },
    { s: 5,  short: '4J',  name: 'Cuarta justa',      feel: 'Abierto, suspendido' },
    { s: 6,  short: '4A',  name: 'Cuarta aumentada',  feel: 'Inquietante (Los Simpson)' },
    { s: 7,  short: '5J',  name: 'Quinta justa',      feel: 'Sólido, vacío, potente' },
    { s: 8,  short: '6m',  name: 'Sexta menor',       feel: 'Nostálgico' },
    { s: 9,  short: '6M',  name: 'Sexta mayor',       feel: 'Dulce' },
    { s: 10, short: '7m',  name: 'Séptima menor',     feel: 'Bluesy, quiere resolver' },
    { s: 11, short: '7M',  name: 'Séptima mayor',     feel: 'Sofisticado, jazzy' },
    { s: 12, short: '8J',  name: 'Octava',            feel: 'La misma nota, más aguda' }
  ];

  var SCALES = {
    major:        { name: 'Mayor (jónico)',    steps: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'] },
    naturalMinor: { name: 'Menor natural',     steps: [0, 2, 3, 5, 7, 8, 10], degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
    harmonicMinor:{ name: 'Menor armónica',    steps: [0, 2, 3, 5, 7, 8, 11], degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
    pentMinor:    { name: 'Pentatónica menor', steps: [0, 3, 5, 7, 10],       degrees: ['1', 'b3', '4', '5', 'b7'] },
    pentMajor:    { name: 'Pentatónica mayor', steps: [0, 2, 4, 7, 9],        degrees: ['1', '2', '3', '5', '6'] },
    blues:        { name: 'Blues',             steps: [0, 3, 5, 6, 7, 10],    degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
    dorian:       { name: 'Dórico',            steps: [0, 2, 3, 5, 7, 9, 10], degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
    phrygian:     { name: 'Frigio',            steps: [0, 1, 3, 5, 7, 8, 10], degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
    lydian:       { name: 'Lidio',             steps: [0, 2, 4, 6, 7, 9, 11], degrees: ['1', '2', '3', '#4', '5', '6', '7'] },
    mixolydian:   { name: 'Mixolidio',         steps: [0, 2, 4, 5, 7, 9, 10], degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
    chromatic:    { name: 'Cromática',         steps: [0,1,2,3,4,5,6,7,8,9,10,11], degrees: DEGREE_BY_SEMITONE.slice() }
  };

  /* Chord dictionary. `suffix` is what we append to the root to print the symbol. */
  var CHORDS = {
    maj:    { suffix: '',      name: 'Mayor',                 steps: [0, 4, 7],          degrees: ['1', '3', '5'] },
    min:    { suffix: 'm',     name: 'Menor',                 steps: [0, 3, 7],          degrees: ['1', 'b3', '5'] },
    dim:    { suffix: 'dim',   name: 'Disminuido',            steps: [0, 3, 6],          degrees: ['1', 'b3', 'b5'] },
    aug:    { suffix: 'aug',   name: 'Aumentado',             steps: [0, 4, 8],          degrees: ['1', '3', '#5'] },
    pow:    { suffix: '5',     name: 'Quinta (power chord)',  steps: [0, 7],             degrees: ['1', '5'] },
    sus2:   { suffix: 'sus2',  name: 'Suspendido 2',          steps: [0, 2, 7],          degrees: ['1', '2', '5'] },
    sus4:   { suffix: 'sus4',  name: 'Suspendido 4',          steps: [0, 5, 7],          degrees: ['1', '4', '5'] },
    six:    { suffix: '6',     name: 'Mayor con sexta',       steps: [0, 4, 7, 9],       degrees: ['1', '3', '5', '6'] },
    min6:   { suffix: 'm6',    name: 'Menor con sexta',       steps: [0, 3, 7, 9],       degrees: ['1', 'b3', '5', '6'] },
    dom7:   { suffix: '7',     name: 'Séptima de dominante',  steps: [0, 4, 7, 10],      degrees: ['1', '3', '5', 'b7'] },
    maj7:   { suffix: 'maj7',  name: 'Séptima mayor',         steps: [0, 4, 7, 11],      degrees: ['1', '3', '5', '7'] },
    min7:   { suffix: 'm7',    name: 'Séptima menor',         steps: [0, 3, 7, 10],      degrees: ['1', 'b3', '5', 'b7'] },
    m7b5:   { suffix: 'm7b5',  name: 'Semidisminuido',        steps: [0, 3, 6, 10],      degrees: ['1', 'b3', 'b5', 'b7'] },
    dim7:   { suffix: 'dim7',  name: 'Séptima disminuida',    steps: [0, 3, 6, 9],       degrees: ['1', 'b3', 'b5', 'bb7'] },
    mMaj7:  { suffix: 'mMaj7', name: 'Menor con séptima mayor', steps: [0, 3, 7, 11],    degrees: ['1', 'b3', '5', '7'] },
    add9:   { suffix: 'add9',  name: 'Mayor con novena añadida', steps: [0, 4, 7, 14],   degrees: ['1', '3', '5', '9'] },
    dom9:   { suffix: '9',     name: 'Novena de dominante',   steps: [0, 4, 7, 10, 14],  degrees: ['1', '3', '5', 'b7', '9'] },
    maj9:   { suffix: 'maj9',  name: 'Novena mayor',          steps: [0, 4, 7, 11, 14],  degrees: ['1', '3', '5', '7', '9'] },
    min9:   { suffix: 'm9',    name: 'Novena menor',          steps: [0, 3, 7, 10, 14],  degrees: ['1', 'b3', '5', 'b7', '9'] },
    dom7sus4: { suffix: '7sus4', name: 'Séptima suspendida',  steps: [0, 5, 7, 10],      degrees: ['1', '4', '5', 'b7'] }
  };

  /* Symbol suffix -> chord key. Longest match wins when parsing. */
  var SUFFIX_ALIASES = {
    '': 'maj', 'M': 'maj', 'maj': 'maj', 'mayor': 'maj',
    'm': 'min', 'min': 'min', '-': 'min', 'menor': 'min',
    'dim': 'dim', 'o': 'dim', '°': 'dim',
    'aug': 'aug', '+': 'aug', '#5': 'aug',
    '5': 'pow',
    'sus2': 'sus2', 'sus': 'sus4', 'sus4': 'sus4',
    '6': 'six', 'm6': 'min6', 'min6': 'min6',
    '7': 'dom7', 'dom7': 'dom7',
    'maj7': 'maj7', 'M7': 'maj7', 'Δ': 'maj7', '7M': 'maj7',
    'm7': 'min7', 'min7': 'min7', '-7': 'min7',
    'm7b5': 'm7b5', 'm7-5': 'm7b5', 'ø': 'm7b5', 'half-dim': 'm7b5',
    'dim7': 'dim7', 'o7': 'dim7',
    'mMaj7': 'mMaj7', 'mM7': 'mMaj7',
    'add9': 'add9', '2': 'add9',
    '9': 'dom9', 'maj9': 'maj9', 'M9': 'maj9', 'm9': 'min9', 'min9': 'min9',
    '7sus4': 'dom7sus4', '7sus': 'dom7sus4'
  };

  var ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  var ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  var TRIADS_MAJOR = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
  var TRIADS_MINOR = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
  var SEVENTHS_MAJOR = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'm7b5'];

  var FUNCTIONS_MAJOR = ['Tónica (casa)', 'Subdominante', 'Tónica (color)', 'Subdominante',
    'Dominante (tensión)', 'Tónica relativa menor', 'Dominante inestable'];

  /* Standard guitar tuning, thickest string first (6th -> 1st). */
  var GUITAR_STANDARD = [
    { label: '6ª E', midi: 40 },
    { label: '5ª A', midi: 45 },
    { label: '4ª D', midi: 50 },
    { label: '3ª G', midi: 55 },
    { label: '2ª B', midi: 59 },
    { label: '1ª E', midi: 64 }
  ];

  var prefs = { latin: false };

  function mod12(n) { return ((n % 12) + 12) % 12; }

  /** Parse a note name ("C#", "Bb", "Sol", "Mib", "F#4") into a pitch class. */
  function nameToPc(name) {
    if (typeof name === 'number') { return mod12(name); }
    var raw = String(name).trim();
    var latin = raw.match(/^(do|re|mi|fa|sol|la|si)(#{1,2}|b{1,2})?/i);
    if (latin) {
      var basePc = LATIN_PC[latin[1].toUpperCase()];
      return mod12(basePc + accidentalValue(latin[2]));
    }
    var m = raw.match(/^([A-Ga-g])(#{1,2}|b{1,2})?/);
    if (!m) { return null; }
    return mod12(LETTER_PC[m[1].toUpperCase()] + accidentalValue(m[2]));
  }

  function accidentalValue(acc) {
    if (!acc) { return 0; }
    return acc[0] === '#' ? acc.length : -acc.length;
  }

  /** Print a pitch class. opts: {flats, latin, octave} */
  function pcName(pc, opts) {
    var o = opts || {};
    var useLatin = o.latin === undefined ? prefs.latin : o.latin;
    var useFlats = !!o.flats;
    var table = useLatin ? (useFlats ? LATIN_FLAT : LATIN_SHARP) : (useFlats ? FLAT : SHARP);
    var label = table[mod12(pc)];
    return o.octave === undefined ? label : label + o.octave;
  }

  /** True when the key of `rootPc` is conventionally written with flats. */
  function keyPrefersFlats(rootPc, quality) {
    var pc = mod12(rootPc);
    if (quality === 'min') { return FLAT_MINOR_KEYS[pc] === true; }
    return FLAT_KEYS[pc] === true;
  }

  function noteToMidi(name) {
    var m = String(name).match(/^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/);
    if (!m) { return null; }
    var pc = LETTER_PC[m[1].toUpperCase()] + accidentalValue(m[2]);
    return (parseInt(m[3], 10) + 1) * 12 + pc;
  }

  function midiToName(midi, opts) {
    var o = opts || {};
    var pc = mod12(midi);
    var octave = Math.floor(midi / 12) - 1;
    return pcName(pc, { flats: o.flats, latin: o.latin }) + octave;
  }

  function midiToFreq(midi, a4) {
    return (a4 || 440) * Math.pow(2, (midi - 69) / 12);
  }

  function freqToMidi(freq, a4) {
    return 69 + 12 * Math.log2(freq / (a4 || 440));
  }

  function buildScale(rootPc, type) {
    var def = SCALES[type] || SCALES.major;
    var root = mod12(nameToPc(rootPc));
    return def.steps.map(function (s, i) {
      return { pc: mod12(root + s), semitones: s, degree: def.degrees[i] };
    });
  }

  function buildChord(rootPc, quality) {
    var def = CHORDS[quality] || CHORDS.maj;
    var root = mod12(nameToPc(rootPc));
    return def.steps.map(function (s, i) {
      return { pc: mod12(root + s), semitones: s, degree: def.degrees[i] };
    });
  }

  /** Chord voiced as MIDI notes from a starting octave (close position). */
  function chordMidi(rootPc, quality, baseMidi) {
    var def = CHORDS[quality] || CHORDS.maj;
    var root = mod12(nameToPc(rootPc));
    var start = baseMidi === undefined ? 48 : baseMidi;
    var low = start + mod12(root - mod12(start));
    return def.steps.map(function (s) { return low + s; });
  }

  function chordSymbol(rootPc, quality, opts) {
    var def = CHORDS[quality] || CHORDS.maj;
    return pcName(rootPc, opts) + def.suffix;
  }

  /**
   * Parse a chord symbol like "F#m7/C#" or "Solm".
   * Returns {rootPc, quality, bassPc, suffix, text} or null.
   */
  function parseChord(text) {
    if (!text) { return null; }
    var raw = String(text).trim();
    if (!raw) { return null; }
    var parts = raw.split('/');
    var head = parts[0];
    var bassPc = parts.length > 1 ? nameToPc(parts[1]) : null;

    var rootMatch = head.match(/^(do|re|mi|fa|sol|la|si)(#{1,2}|b{1,2})?/i);
    if (!rootMatch) { rootMatch = head.match(/^([A-Ga-g])(#{1,2}|b{1,2})?/); }
    if (!rootMatch) { return null; }

    var rootText = rootMatch[0];
    var rootPc = nameToPc(rootText);
    if (rootPc === null) { return null; }

    var suffix = head.slice(rootText.length);
    var quality = SUFFIX_ALIASES[suffix];
    if (quality === undefined) { quality = SUFFIX_ALIASES[suffix.toLowerCase()]; }
    if (quality === undefined) { return null; }

    return { rootPc: rootPc, quality: quality, bassPc: bassPc, suffix: suffix, text: raw };
  }

  /** Transpose a chord symbol, keeping the original suffix spelling. */
  function transposeChordText(text, semitones, useFlats) {
    var parsed = parseChord(text);
    if (!parsed) { return text; }
    var opts = { flats: useFlats };
    var out = pcName(parsed.rootPc + semitones, opts) + parsed.suffix;
    if (parsed.bassPc !== null && parsed.bassPc !== undefined) {
      out += '/' + pcName(parsed.bassPc + semitones, opts);
    }
    return out;
  }

  /** Diatonic chords of a key. mode: 'major' | 'naturalMinor'. */
  function diatonic(rootPc, mode, sevenths) {
    var scale = buildScale(rootPc, mode === 'naturalMinor' ? 'naturalMinor' : 'major');
    var isMajor = mode !== 'naturalMinor';
    var romans = isMajor ? ROMAN_MAJOR : ROMAN_MINOR;
    var quals = isMajor ? (sevenths ? SEVENTHS_MAJOR : TRIADS_MAJOR) : TRIADS_MINOR;
    var flats = keyPrefersFlats(rootPc, isMajor ? 'maj' : 'min');
    return scale.map(function (n, i) {
      return {
        pc: n.pc,
        quality: quals[i],
        roman: romans[i],
        symbol: chordSymbol(n.pc, quals[i], { flats: flats }),
        role: isMajor ? FUNCTIONS_MAJOR[i] : ''
      };
    });
  }

  function degreeOf(rootPc, pc) {
    return DEGREE_BY_SEMITONE[mod12(pc - rootPc)];
  }

  /**
   * Sustituye el diccionario de acordes (lo usa data/chords.json).
   * Muta el objeto existente para que las referencias vivas lo vean,
   * y registra cada sufijo nuevo para poder cifrar y descifrar.
   */
  function setChordTypes(map) {
    Object.keys(CHORDS).forEach(function (k) { delete CHORDS[k]; });
    Object.keys(map).forEach(function (k) { CHORDS[k] = map[k]; });
    Object.keys(map).forEach(function (k) {
      SUFFIX_ALIASES[map[k].suffix] = k;
    });
  }

  function intervalInfo(semitones) {
    var s = ((semitones % 12) + 12) % 12;
    if (semitones !== 0 && s === 0) { return INTERVALS[12]; }
    return INTERVALS[s];
  }

  global.Theory = {
    SHARP: SHARP, FLAT: FLAT, LATIN_SHARP: LATIN_SHARP, LATIN_FLAT: LATIN_FLAT,
    SCALES: SCALES, CHORDS: CHORDS, INTERVALS: INTERVALS,
    GUITAR_STANDARD: GUITAR_STANDARD,
    ROMAN_MAJOR: ROMAN_MAJOR, ROMAN_MINOR: ROMAN_MINOR,
    DEGREE_BY_SEMITONE: DEGREE_BY_SEMITONE,
    prefs: prefs,
    mod12: mod12,
    nameToPc: nameToPc,
    pcName: pcName,
    keyPrefersFlats: keyPrefersFlats,
    noteToMidi: noteToMidi,
    midiToName: midiToName,
    midiToFreq: midiToFreq,
    freqToMidi: freqToMidi,
    buildScale: buildScale,
    buildChord: buildChord,
    chordMidi: chordMidi,
    chordSymbol: chordSymbol,
    parseChord: parseChord,
    transposeChordText: transposeChordText,
    diatonic: diatonic,
    degreeOf: degreeOf,
    intervalInfo: intervalInfo,
    setChordTypes: setChordTypes
  };
})(window);
