/* Modelo musical y validación de todas las formas de acorde.  ->  node tests/theory-shapes.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---- minimal DOM stub ---- */
function makeNode(name) {
  const node = {
    tagName: name, children: [], attrs: {}, style: {}, textContent: '',
    innerHTML: '', classList: { add() {}, remove() {}, contains: () => false },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelectorAll: () => [],
    select() {}
  };
  return node;
}
const document = {
  createElement: makeNode,
  createElementNS: (ns, name) => makeNode(name),
  createTextNode: (t) => ({ text: t }),
  getElementById: () => makeNode('div'),
  addEventListener() {},
  querySelectorAll: () => []
};

const window = { document, setTimeout, clearTimeout, localStorage: null, location: { hash: '' }, addEventListener() {} };
window.window = window;
global.window = window;
global.document = document;

function load(f) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  // Files are IIFEs taking `window`; run them with window/document in scope.
  new Function('window', 'document', code)(window, document);
}

['js/theory.js', 'js/piano.js', 'js/fretboard.js', 'js/shapes.js', 'js/chordpro.js'].forEach(load);
const { Theory, Piano, Fret, Shapes, ChordPro } = window;
global.Theory = Theory; global.Sound = { note() {}, chord() {}, ready() {} };

let fails = 0, checks = 0;
function eq(actual, expected, label) {
  checks++;
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) { fails++; console.log('FAIL ' + label + '\n   esperado ' + b + '\n   obtenido ' + a); }
}
function ok(cond, label) {
  checks++;
  if (!cond) { fails++; console.log('FAIL ' + label); }
}

/* ---- notes ---- */
eq(Theory.nameToPc('C'), 0, 'C = 0');
eq(Theory.nameToPc('Bb'), 10, 'Bb = 10');
eq(Theory.nameToPc('Sol#'), 8, 'Sol# = 8');
eq(Theory.nameToPc('Mib'), 3, 'Mib = 3');
eq(Theory.noteToMidi('A4'), 69, 'A4 = 69');
eq(Theory.noteToMidi('C4'), 60, 'C4 = 60');
eq(Theory.noteToMidi('E2'), 40, 'E2 = 40 (6a cuerda)');
eq(Math.round(Theory.midiToFreq(69)), 440, 'A4 = 440 Hz');
eq(Math.round(Theory.midiToFreq(40) * 100) / 100, 82.41, 'E2 = 82.41 Hz');
eq(Theory.midiToName(61, { flats: true }), 'Db4', 'midi 61 = Db4');

/* ---- scales ---- */
eq(Theory.buildScale('C', 'major').map(n => Theory.pcName(n.pc)),
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'C mayor');
eq(Theory.buildScale('G', 'major').map(n => Theory.pcName(n.pc)),
  ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], 'G mayor');
eq(Theory.buildScale('F', 'major').map(n => Theory.pcName(n.pc, { flats: true })),
  ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'F mayor');
eq(Theory.buildScale('A', 'naturalMinor').map(n => Theory.pcName(n.pc)),
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'], 'A menor natural');
eq(Theory.buildScale('A', 'pentMinor').map(n => Theory.pcName(n.pc)),
  ['A', 'C', 'D', 'E', 'G'], 'A pentatonica menor');
eq(Theory.buildScale('F#', 'pentMinor').map(n => Theory.pcName(n.pc)),
  ['F#', 'A', 'B', 'C#', 'E'], 'F# pentatonica (teclas negras? no: A/B/E blancas)');
eq(Theory.buildScale('Eb', 'pentMajor').map(n => Theory.pcName(n.pc, { flats: true })),
  ['Eb', 'F', 'G', 'Bb', 'C'], 'Eb pentatonica mayor');

/* ---- chords ---- */
eq(Theory.buildChord('C', 'maj').map(n => Theory.pcName(n.pc)), ['C', 'E', 'G'], 'C');
eq(Theory.buildChord('A', 'min').map(n => Theory.pcName(n.pc)), ['A', 'C', 'E'], 'Am');
eq(Theory.buildChord('G', 'dom7').map(n => Theory.pcName(n.pc)), ['G', 'B', 'D', 'F'], 'G7');
eq(Theory.buildChord('C', 'maj7').map(n => Theory.pcName(n.pc)), ['C', 'E', 'G', 'B'], 'Cmaj7');
eq(Theory.buildChord('B', 'm7b5').map(n => Theory.pcName(n.pc)), ['B', 'D', 'F', 'A'], 'Bm7b5');
eq(Theory.chordMidi(0, 'maj', 48), [48, 52, 55], 'C tríada desde C3');
eq(Theory.chordMidi(9, 'min', 48), [57, 60, 64], 'Am desde A3');

/* ---- symbols ---- */
eq(Theory.parseChord('F#m7').quality, 'min7', 'F#m7 quality');
eq(Theory.parseChord('F#m7').rootPc, 6, 'F#m7 root');
eq(Theory.parseChord('Bb').rootPc, 10, 'Bb root');
eq(Theory.parseChord('Solm').quality, 'min', 'Solm (latino)');
eq(Theory.parseChord('C/E').bassPc, 4, 'C/E bajo');
eq(Theory.parseChord('Cmaj7').quality, 'maj7', 'Cmaj7');
eq(Theory.parseChord('C7').quality, 'dom7', 'C7');
ok(Theory.parseChord('Hxyz') === null, 'símbolo inválido -> null');
eq(Theory.transposeChordText('Am', 2), 'Bm', 'Am +2 = Bm');
eq(Theory.transposeChordText('C/E', -2, true), 'Bb/D', 'C/E -2 con bemoles');
eq(Theory.transposeChordText('F#m7', 3), 'Am7', 'F#m7 +3');

/* ---- diatonic ---- */
eq(Theory.diatonic('C', 'major', false).map(c => c.symbol),
  ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'], 'grados de C mayor');
eq(Theory.diatonic('G', 'major', false).map(c => c.symbol),
  ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'], 'grados de G mayor');
eq(Theory.diatonic('A', 'naturalMinor', false).map(c => c.symbol),
  ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'], 'grados de A menor');
eq(Theory.diatonic('C', 'major', true).map(c => c.symbol),
  ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'], 'séptimas de C mayor');

/* ---- guitar shapes: every sounded note must belong to the chord ---- */
const TUNING = Theory.GUITAR_STANDARD.map(s => s.midi);
function shapePcs(frets) {
  const out = [];
  frets.forEach((f, i) => { if (f !== -1 && f !== 'x') { out.push(Theory.mod12(TUNING[i] + f)); } });
  return out;
}
Shapes.OPEN.forEach(s => {
  const rootPc = Theory.nameToPc(s.root);
  const allowed = Theory.buildChord(rootPc, s.q).map(n => n.pc);
  const pcs = shapePcs(s.frets);
  const bad = pcs.filter(p => allowed.indexOf(p) === -1);
  ok(bad.length === 0, 'forma abierta ' + s.name + ': notas ajenas ' +
    bad.map(p => Theory.pcName(p)).join(','));
  ok(pcs.indexOf(rootPc) !== -1, 'forma abierta ' + s.name + ' contiene la fundamental');
  ok(s.frets.length === 6 && s.fingers.length === 6, 'forma ' + s.name + ' tiene 6 valores');
});

for (let pc = 0; pc < 12; pc++) {
  Object.keys(Theory.CHORDS).forEach(q => {
    Shapes.forChord(pc, q).forEach(shape => {
      const allowed = Theory.buildChord(pc, q).map(n => n.pc);
      const pcs = shapePcs(shape.frets);
      const bad = pcs.filter(p => allowed.indexOf(p) === -1);
      ok(bad.length === 0, 'forma ' + shape.name + ' (' + q + ', ' + (shape.label || '') + '): ajenas ' +
        bad.map(p => Theory.pcName(p)).join(','));
      ok(pcs.indexOf(pc) !== -1, 'forma ' + shape.name + ' (' + (shape.label || '') + ') incluye fundamental');
      ok(shape.frets.every(f => f === -1 || (f >= 0 && f <= 15)), 'forma ' + shape.name + ' en trastes razonables');
      const played = shape.frets.filter(f => f > 0);
      if (played.length) {
        ok(Math.max(...played) - Math.min(...played) <= 4,
          'forma ' + shape.name + ' (' + (shape.label || '') + ') abarcable: ' + shape.frets.join(' '));
      }
    });
  });
}
ok(Shapes.forChord(0, 'maj').length >= 3, 'C mayor tiene varias formas');
ok(Shapes.bySymbol('F#m').length >= 1, 'F#m tiene forma');
eq(Shapes.bySymbol('F#m')[0].frets, [2, 4, 4, 2, 2, 2], 'F#m cejilla en 2');
eq(Shapes.bySymbol('Bb')[0].frets, [-1, 1, 3, 3, 3, 1], 'Bb cejilla forma A en 1');
eq(Fret.shapeMidi({ frets: [-1, 3, 2, 0, 1, 0] }), [48, 52, 55, 60, 64], 'C abierto suena C E G C E');

/* ---- chordpro ---- */
const song = ChordPro.parseSong([
  '{title: Prueba}', '{artist: Nadie}', '', '{comment: Verso}',
  '[Am]Hola [F]mundo', '{start_of_chorus}', '[C]Coro [G]aquí', '{end_of_chorus}'
].join('\n'));
eq(song.title, 'Prueba', 'chordpro title');
eq(song.artist, 'Nadie', 'chordpro artist');
const lineTypes = song.lines.map(l => l.type);
ok(lineTypes.indexOf('comment') !== -1, 'chordpro comment');
const first = song.lines.filter(l => l.type === 'line')[0];
eq(first.segs.map(s => s.chord), ['Am', 'F'], 'chordpro acordes de la línea');
eq(first.segs.map(s => s.text), ['Hola ', 'mundo'], 'chordpro letra de la línea');
const chorusLine = song.lines.filter(l => l.type === 'line' && l.chorus);
eq(chorusLine.length, 1, 'chordpro estribillo marcado');
const noChord = ChordPro.parseSong('Solo letra sin acordes').lines[0];
eq(noChord.segs.map(s => s.text), ['Solo letra sin acordes'], 'línea sin acordes');
const midChord = ChordPro.parseSong('Antes [C]despues').lines[0];
eq(midChord.segs.map(s => s.chord), ['', 'C'], 'texto antes del primer acorde');

/* ---- renderers survive a stubbed DOM ---- */
const kb = Piano.render({ from: 48, keys: 15, labels: 'degree', marks: [{ pc: 0, degree: '1', role: 'root' }] });
ok(kb.tagName === 'svg' && Number(kb.getAttribute('width')) > 0, 'Piano.render devuelve svg');
eq(kb.getAttribute('width'), String(15 * 34 + 2), 'ancho del teclado');
const fb = Fret.render({ fromFret: 0, toFret: 12, marks: [{ pc: 0, degree: '1', role: 'root' }] });
ok(fb.tagName === 'svg', 'Fret.render devuelve svg');
const fb1 = Fret.render({ fromFret: 0, toFret: 5, strings: [Theory.GUITAR_STANDARD[0]] });
ok(Number(fb1.getAttribute('height')) < Number(fb.getAttribute('height')), 'una cuerda es más bajo');
const box = Fret.chordBox({ name: 'C', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] }, { size: 'md' });
ok(box.tagName === 'svg', 'chordBox devuelve svg');
const boxHigh = Fret.chordBox({ name: 'Bb', frets: [-1, 8, 10, 10, 10, 8], fingers: [0, 1, 3, 3, 3, 1] }, {});
ok(boxHigh.tagName === 'svg', 'chordBox con cejilla alta');


/* ================================================================
   data/chords.json: el archivo editable. Validación completa.
   ================================================================ */
load('js/config.js');
global.Shapes = Shapes;
const { Config } = window;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/chords.json'), 'utf8'));

try { Config.validate(data); ok(true, 'chords.json pasa la validación'); }
catch (e) { ok(false, 'chords.json no valida: ' + e.message); }
Config.apply(data);

/* Doble contabilidad: las fórmulas escritas aquí, a mano y por separado.
   Si alguien cambia un intervalo en el JSON, esto lo canta. */
const EXPECTED = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], pow: [0, 7],
  sus2: [0, 2, 7], sus4: [0, 5, 7], six: [0, 4, 7, 9], min6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], mMaj7: [0, 3, 7, 11], dom7sus4: [0, 5, 7, 10],
  dom7b5: [0, 4, 6, 10], aug7: [0, 4, 8, 10], dom9: [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14], six9: [0, 4, 7, 9, 14],
  dom7b9: [0, 4, 7, 10, 13], dom7s9: [0, 4, 7, 10, 15],
  dom11: [0, 7, 10, 14, 17], min11: [0, 3, 7, 10, 17], dom13: [0, 4, 7, 10, 14, 21]
};
data.types.forEach(t => {
  ok(!!EXPECTED[t.id], 'tipo conocido: ' + t.id);
  if (EXPECTED[t.id]) { eq(t.intervals, EXPECTED[t.id], 'fórmula de ' + t.id); }
});
Object.keys(EXPECTED).forEach(id =>
  ok(data.types.some(t => t.id === id), 'no falta el tipo ' + id));

/* El curso aparcado referencia estos ids: tienen que seguir existiendo. */
['maj', 'min', 'dim', 'aug', 'pow', 'sus2', 'sus4', 'six', 'min6', 'dom7', 'maj7',
 'min7', 'm7b5', 'dim7', 'mMaj7', 'add9', 'dom9', 'maj9', 'min9', 'dom7sus4']
  .forEach(id => ok(!!Theory.CHORDS[id], 'id usado por el curso: ' + id));

/* ---- reglas físicas de digitación ---- */
function fingeringIssues(frets, fingers) {
  const issues = [];
  const byFinger = {};
  for (let i = 0; i < 6; i++) {
    const f = frets[i], d = fingers[i];
    if (f > 0 && (!d || d < 1 || d > 4)) { issues.push('cuerda ' + (6 - i) + ' pisada sin dedo'); }
    if (f > 0 && d >= 1 && d <= 4) { (byFinger[d] = byFinger[d] || []).push({ i, f }); }
  }
  Object.keys(byFinger).forEach(d => {
    const g = byFinger[d];
    if (new Set(g.map(x => x.f)).size > 1) { issues.push('dedo ' + d + ' en dos trastes a la vez'); }
    if (g.length > 1) {
      // cejilla: entre sus extremos no puede quedar una cuerda al aire
      // ni una pisada por debajo (la barra las taparía)
      const fr = g[0].f;
      const lo = Math.min(...g.map(x => x.i)), hi = Math.max(...g.map(x => x.i));
      for (let k = lo + 1; k < hi; k++) {
        if (frets[k] === 0) { issues.push('dedo ' + d + ': cuerda al aire bajo la cejilla'); }
        else if (frets[k] > 0 && frets[k] < fr) { issues.push('dedo ' + d + ': nota por debajo de la cejilla'); }
      }
    }
  });
  // los dedos crecen con el traste
  const perFret = {};
  for (let i = 0; i < 6; i++) {
    if (frets[i] > 0 && fingers[i]) { (perFret[frets[i]] = perFret[frets[i]] || []).push(fingers[i]); }
  }
  const fretNums = Object.keys(perFret).map(Number).sort((a, b) => a - b);
  for (let a = 0; a < fretNums.length; a++) {
    for (let b = a + 1; b < fretNums.length; b++) {
      if (Math.max(...perFret[fretNums[a]]) > Math.min(...perFret[fretNums[b]])) {
        issues.push('dedos desordenados entre los trastes ' + fretNums[a] + ' y ' + fretNums[b]);
      }
    }
  }
  return issues;
}

function checkChordShape(label, shape, rootPc, typeId) {
  const allowed = Theory.buildChord(rootPc, typeId).map(n => n.pc);
  const pcs = shapePcs(shape.frets);
  ok(pcs.length >= 2, label + ': suenan al menos dos cuerdas');
  const bad = pcs.filter(p => allowed.indexOf(p) === -1);
  ok(bad.length === 0, label + ': notas ajenas ' + bad.map(p => Theory.pcName(p)).join(','));
  ok(pcs.indexOf(Theory.mod12(rootPc)) !== -1, label + ': falta la fundamental');
  const played = shape.frets.filter(f => f > 0);
  if (played.length) {
    ok(Math.max(...played) - Math.min(...played) <= 4,
      label + ': no se abarca (' + shape.frets.join(' ') + ')');
    ok(Math.max(...played) <= 15, label + ': traste demasiado alto');
  }
  const issues = fingeringIssues(shape.frets, shape.fingers || [0, 0, 0, 0, 0, 0]);
  ok(issues.length === 0, label + ': ' + issues.join(' · '));
}

let shapesChecked = 0;
data.types.forEach(t => {
  let covered = 0;
  for (let pc = 0; pc < 12; pc++) {
    const list = Shapes.forChord(pc, t.id);
    if (list.length) { covered++; }
    list.forEach(shape => {
      shapesChecked++;
      checkChordShape(t.id + ' · ' + Theory.pcName(pc) + t.suffix + ' · ' + (shape.label || 'abierta'),
        shape, pc, t.id);
    });
  }
  ok(covered >= 10, t.id + ': hay posición de guitarra para ' + covered + '/12 fundamentales');
});
console.log('   formas de guitarra revisadas: ' + shapesChecked);

console.log((fails ? 'FALLOS: ' + fails : 'OK') + '  ·  ' + checks + ' comprobaciones');
process.exit(fails ? 1 : 0);
