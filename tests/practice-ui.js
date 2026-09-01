/* La pantalla de práctica: capas fijas, deck deslizable, panel de
   selección y cifrado con bajo.  ->  node tests/practice-ui.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

class ClassList {
  constructor(n) { this.n = n; this.set = new Set(); }
  add(...c) { c.forEach(x => x && this.set.add(x)); this.sync(); }
  remove(...c) { c.forEach(x => this.set.delete(x)); this.sync(); }
  contains(c) { return this.set.has(c); }
  sync() { this.n.attrs.class = Array.from(this.set).join(' '); }
}
class Node {
  constructor(tag) {
    this.tagName = String(tag).toLowerCase();
    this.attrs = {}; this.children = []; this.listeners = {}; this.style = {};
    this._text = ''; this.parentNode = null; this.disabled = false;
    this.scrollTop = 0; this.scrollLeft = 0;
  }
  get classList() {
    if (!this._cl) {
      this._cl = new ClassList(this);
      (this.attrs.class || '').split(/\s+/).filter(Boolean).forEach(c => this._cl.set.add(c));
    }
    return this._cl;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') { this._cl = null; } }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) {
    if (!c) { throw new Error('appendChild(null) en <' + this.tagName + '>'); }
    c.parentNode = this; this.children.push(c); return c;
  }
  removeChild(c) { this.children = this.children.filter(x => x !== c); }
  replaceChild(fresh, old) {
    this.children = this.children.map(c => (c === old ? fresh : c));
    fresh.parentNode = this;
  }
  set innerHTML(v) { this._html = v; if (v === '') { this.children = []; } }
  get innerHTML() { return this._html || ''; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text || this.children.map(c => c.textContent || '').join(''); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter(f => f !== fn); }
  dispatch(t, ev) {
    (this.listeners[t] || []).forEach(fn => fn(Object.assign({ preventDefault() {}, target: this }, ev || {})));
  }
  matches(sel) {
    if (sel.startsWith('.')) { return this.classList.contains(sel.slice(1)); }
    if (sel.indexOf('[') !== -1) { return false; }   // selectores de atributo: no hacen falta aquí
    return this.tagName === sel.toLowerCase();
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = n => n.children.forEach(c => { if (c.matches(sel)) { out.push(c); } walk(c); });
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
const document = {
  createElement: t => new Node(t),
  createElementNS: (ns, t) => new Node(t),
  createTextNode: t => { const n = new Node('#text'); n.textContent = t; return n; },
  body: new Node('body'),
  listeners: {},
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter(f => f !== fn); },
  dispatch(t, ev) { (this.listeners[t] || []).slice().forEach(fn => fn(Object.assign({ preventDefault() {} }, ev || {}))); },
  getElementById(id) {
    let found = null;
    const walk = n => { if (found) { return; } if (n.attrs.id === id) { found = n; return; } n.children.forEach(walk); };
    walk(this.body);
    return found;
  }
};
function audioParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} };
}
function audioNode(extra) {
  return Object.assign({
    connect() {}, disconnect() {}, start() {}, stop() {},
    gain: audioParam(), frequency: audioParam(), Q: audioParam(), detune: audioParam(),
    threshold: audioParam(), ratio: audioParam(), type: 'sine'
  }, extra || {});
}
class AudioContextStub {
  constructor() { this.currentTime = 1; this.sampleRate = 48000; this.state = 'running'; this.destination = audioNode(); }
  createGain() { return audioNode(); }
  createOscillator() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createDynamicsCompressor() { return audioNode(); }
  createBufferSource() { return audioNode(); }
  createBuffer() { return {}; }
  createAnalyser() { return audioNode({ fftSize: 2048, getFloatTimeDomainData() {} }); }
  resume() {}
}
const storage = new Map();
const window = {
  document, AudioContext: AudioContextStub, console,
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  },
  setTimeout: fn => { fn(); return 1; }, clearTimeout() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  location: { hash: '' }, navigator: {}, performance: { now: () => 0 }
};
window.window = window;
window.globalThis = window;

const app = new Node('div');
app.setAttribute('id', 'app');
document.body.appendChild(app);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map(m => m[1]);
const ctx = vm.createContext(window);
const errors = [];
function guard(label, fn) {
  try { fn(); } catch (e) { errors.push(label + ' :: ' + (e && e.message ? e.message : e)); }
}
scripts.forEach(src => guard('carga ' + src, () =>
  vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), ctx, { filename: src })));

guard('arranque', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/chords.json'), 'utf8'));
  window.Config.apply(window.Config.validate(data));
  window.Practice.start();
});

const { Theory, Shapes } = window;
const state = window.Practice.state;

let checks = 0;
function ok(cond, label) { checks++; if (!cond) { errors.push('FALLO: ' + label); } }
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    label + ' → esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(actual));
}
function texts(node, sel) { return node.querySelectorAll(sel).map(n => n.textContent); }
function repaint() { window.Practice.refresh(); }
function sheetOpen() { return document.body.querySelectorAll('.sheet').length > 0; }
function tok(kind) { return app.querySelectorAll('.tok-' + kind)[0]; }
function pickOpt(label) {
  const o = document.body.querySelectorAll('.opt')
    .find(b => (b.querySelector('.opt-big') || b).textContent === label);
  if (!o) { throw new Error('no hay opción "' + label + '"'); }
  o.dispatch('click');
}

/* ---- estructura de capas ---- */
guard('estructura', () => {
  ok(app.querySelectorAll('.deck').length === 1, 'hay un deck deslizable');
  ok(app.querySelectorAll('.panel').length === 2, 'dos planos: guitarra y piano');
  ok(app.querySelectorAll('.panel-inner').length === 2, 'cada plano tiene su contenido');
  ok(app.querySelectorAll('.pinned-top').length === 1, 'capa fija arriba');
  ok(app.querySelectorAll('.pinned-bottom').length === 1, 'capa fija abajo');
  ok(app.querySelectorAll('.watermark').length === 0, 'sin marca de agua detrás');
  ok(app.querySelectorAll('.top').length === 0, 'ya no hay barra de instrumento');
  ok(app.querySelectorAll('.dock').length === 0, 'ya no hay barra inferior de selección');
  const last = app.children[app.children.length - 1];
  ok((last.attrs.class || '').indexOf('pinned-bottom') !== -1,
    'la última capa es la de posición/inversión');
  ok(last.querySelectorAll('.pager').length === 1, 'la capa de abajo contiene el paginador');
});

/* ---- el armazón no se reconstruye: si se reconstruyera, el
       deslizamiento se reiniciaría en cada cambio ---- */
guard('el deslizamiento no se reinicia', () => {
  const deckBefore = app.querySelectorAll('.deck')[0];
  const panelsBefore = app.querySelectorAll('.panel');
  state.rootPc = 7; state.quality = 'min';
  repaint();
  tok('root').dispatch('click');
  pickOpt('D');
  const deckAfter = app.querySelectorAll('.deck')[0];
  ok(deckAfter === deckBefore, 'el deck sobrevive a los cambios');
  ok(app.querySelectorAll('.panel')[0] === panelsBefore[0], 'y los planos también');
});

/* ---- cambiar de instrumento: solo deslizando o con las flechas ---- */
guard('cambio de instrumento', () => {
  window.Practice.goTo('piano');
  ok(state.ins === 'piano', 'goTo lleva al piano');
  ok(storage.get('ac.ins') === 'piano', 'y lo recuerda');
  ok(texts(app, '.pager-label')[0].length > 0, 'el paginador pasa a las inversiones');
  ok(app.querySelectorAll('.ind-bar').length === 0, 'sin indicador de deslizamiento');
  ok(app.querySelectorAll('.deck-ind').length === 0, 'ni rótulo de instrumento');
  window.Practice.goTo('guitar');
  ok(state.ins === 'guitar', 'y vuelve a la guitarra');
});

/* ---- cada acorde pinta los dos instrumentos ---- */
guard('todos los acordes', () => {
  for (let pc = 0; pc < 12; pc++) {
    Object.keys(Theory.CHORDS).forEach(q => {
      guard('acorde ' + Theory.pcName(pc) + q, () => {
        state.rootPc = pc;
        state.quality = q;
        state.posG = 0;
        state.posP = 0;
        repaint();
        var guitarPanel = app.querySelectorAll('.panel')[0];
        var hasShapes = Shapes.forChord(pc, q).length > 0;
        ok(app.querySelectorAll('svg').length >= (hasShapes ? 3 : 2),
          'guitarra y piano pintados para ' + Theory.pcName(pc) + q);
        ok(guitarPanel.querySelectorAll(hasShapes ? '.diagram' : '.empty').length === 1,
          'la guitarra muestra ' + (hasShapes ? 'una sola figura' : 'el aviso de sin posición') +
          ' en ' + Theory.pcName(pc) + q);
      });
    });
  }
});

/* ---- digitación del piano ---- */
guard('digitación de piano', () => {
  state.rootPc = 0; state.quality = 'maj7'; state.ins = 'piano'; state.posP = 0;
  repaint();
  const t = texts(app, 'text');
  ok(t.indexOf('R1') !== -1, 'digitación de la derecha: ' + t.slice(0, 12).join(' '));
  ok(t.indexOf('R5') !== -1, 'la derecha llega al meñique');
  ok(t.indexOf('L5') !== -1, 'digitación de la izquierda');
  ok(t.indexOf('L1') !== -1, 'la izquierda llega al pulgar');
  const heads = texts(app, '.kb-head');
  ok(heads.length === 2, 'hay dos cabeceras de mano: ' + heads.length);
  ok(/izquierda/.test(heads[0]) && /derecha/.test(heads[1]),
    'la izquierda arriba y la derecha abajo: ' + heads.join(' | '));
  ok(!/[1-5]/.test(heads.join('')),
    'la cabecera no repite los dedos, que ya están en las teclas: ' + heads.join(' | '));
});

/* ---- las manos del piano: distintas, correctas y digitables ---- */
guard('manos de piano', () => {
  const M = window.Practice._music;
  const asc = v => v.every((m, i) => i === 0 || m > v[i - 1]);
  window.ChordData.types.forEach(t => {
    state.quality = t.id;
    for (let pc = 0; pc < 12; pc++) {
      state.rootPc = pc;
      const allowed = Theory.buildChord(pc, t.id).map(n => n.pc);
      const positions = M.voicings(60);
      ok(positions.length >= Math.min(3, t.intervals.length),
        t.id + '/' + pc + ': hay inversiones suficientes (' + positions.length + ')');
      positions.forEach((full, inv) => {
        const rh = M.rhVoicing(inv);
        const lh = M.lhVoicing(rh[0]);
        const tag = t.id + '/' + Theory.pcName(pc) + ' inv' + inv;

        ok(asc(rh), tag + ': derecha de grave a agudo');
        ok(rh.length <= 4, tag + ': la derecha cabe en una mano (' + rh.length + ')');
        ok(rh.every(m => allowed.indexOf(Theory.mod12(m)) !== -1), tag + ': derecha sin notas ajenas');
        ok(Theory.mod12(rh[0]) === Theory.mod12(full[0]), tag + ': la reducción no cambia el bajo');

        ok(asc(lh), tag + ': izquierda de grave a agudo');
        ok(lh.length >= 1 && lh.length <= 2, tag + ': la izquierda es un bajo (1-2 notas)');
        ok(lh.every(m => allowed.indexOf(Theory.mod12(m)) !== -1), tag + ': izquierda sin notas ajenas');
        ok(Theory.mod12(lh[0]) === Theory.mod12(rh[0]), tag + ': las dos manos comparten bajo');
        if (lh.length === 2) {
          const gap = lh[1] - lh[0];
          ok(gap >= 3 && gap <= 12, tag + ': la izquierda se abarca (' + gap + ' st)');
        }
        ok(JSON.stringify(lh) !== JSON.stringify(rh), tag + ': las manos no hacen lo mismo');

        const rf = M.handFingers(rh, 'R'), lf = M.handFingers(lh, 'L');
        ok(rf.length === rh.length, tag + ': digitación derecha completa');
        ok(lf.length === lh.length, tag + ': digitación izquierda completa');
        ok(rf[0] === 1 || rh.length === 1, tag + ': la derecha empieza en el pulgar');
        ok(lf[0] === 5 || lh.length === 1, tag + ': la izquierda empieza en el meñique');
      });
    }
  });
  // caso concreto, contado a mano: C13 en fundamental
  state.rootPc = 0; state.quality = 'dom13';
  const rh13 = M.rhVoicing(0).map(m => Theory.mod12(m)).sort((a, b) => a - b);
  eq(rh13, [0, 4, 9, 10].sort((a, b) => a - b),
    'C13: la derecha suelta la quinta y la novena, se queda 1-3-b7-13');
  const lh7 = (state.quality = 'dom7', M.lhVoicing(48));
  eq(lh7.map(m => Theory.mod12(m)), [0, 10], 'C7: la izquierda es el shell 1-b7');
  state.quality = 'maj'; state.rootPc = 0;
  eq(M.lhVoicing(48).map(m => m - M.lhVoicing(48)[0]), [0, 12], 'C: la izquierda es bajo + octava');
});

/* ---- cifrado con bajo: C, C/E, C/G, C/B ---- */
guard('cifrado con bajo', () => {
  state.rootPc = 0; state.quality = 'maj7'; state.ins = 'piano'; state.posP = 0;
  repaint();
  const dots = app.querySelectorAll('.dot');
  ok(dots.length === 4, 'Cmaj7 tiene 4 inversiones: ' + dots.length);

  const seen = [];
  for (let i = 0; i < 4; i++) {
    app.querySelectorAll('.dot')[i].dispatch('click');
    seen.push(app.querySelectorAll('.pager-label')[0].querySelectorAll('b')[0].textContent);
  }
  ok(seen.join(' ') === 'Cmaj7 Cmaj7/E Cmaj7/G Cmaj7/B',
    'las inversiones se cifran con su bajo: ' + seen.join(' '));

  state.quality = 'maj'; state.posP = 0;
  repaint();
  const tri = [];
  for (let i = 0; i < 3; i++) {
    app.querySelectorAll('.dot')[i].dispatch('click');
    tri.push(app.querySelectorAll('.pager-label')[0].querySelectorAll('b')[0].textContent);
  }
  ok(tri.join(' ') === 'C C/E C/G', 'la tríada de C: ' + tri.join(' '));
});

/* ---- el título como mando: dos piezas ---- */
guard('título partido', () => {
  state.rootPc = 9; state.quality = 'sus2'; state.ins = 'guitar';
  repaint();
  ok(tok('root').textContent === 'A', 'la fundamental es su propia pieza: ' + tok('root').textContent);
  ok(tok('ext').textContent === 'sus2', 'la extensión es su propia pieza: ' + tok('ext').textContent);
  ok((tok('ext').attrs.class || '').indexOf('empty') === -1, 'sus2 no es un hueco fantasma');

  state.quality = 'maj';
  repaint();
  ok(tok('root').textContent === 'A', 'A mayor: la fundamental sigue siendo A');
  ok(tok('ext').textContent === 'may', 'el mayor muestra el hueco fantasma');
  ok((tok('ext').attrs.class || '').indexOf('empty') !== -1, 'y va marcado como vacío');
});

/* ---- panel de selección ---- */
guard('panel de fundamental', () => {
  state.rootPc = 0; state.quality = 'maj';
  repaint();
  ok(!sheetOpen(), 'el panel empieza cerrado');
  tok('root').dispatch('click');
  ok(sheetOpen(), 'pulsar la fundamental abre el panel');
  ok(document.body.querySelectorAll('.opt').length === 12,
    'trae solo las 12 notas: ' + document.body.querySelectorAll('.opt').length);
  ok((tok('root').attrs.class || '').indexOf('active') !== -1, 'el token abierto se marca');
  pickOpt('Eb');
  ok(!sheetOpen(), 'al elegir se cierra');
  ok(tok('root').textContent === 'Eb', 'la fundamental cambia a Eb: ' + tok('root').textContent);
  ok(storage.get('ac.root') === '3', 'y se guarda');
});

guard('panel de extensión', () => {
  tok('ext').dispatch('click');
  ok(sheetOpen(), 'pulsar la extensión abre su panel');
  const labels = document.body.querySelectorAll('.opt-big').map(o => o.textContent);
  ok(labels.indexOf('m7') !== -1 && labels.indexOf('sus4') !== -1 && labels.indexOf('may') !== -1,
    'trae los tipos con el mayor como hueco fantasma: ' + labels.slice(0, 6).join(' '));
  ok(labels.length === window.ChordData.types.length,
    'salen todos los tipos del archivo de datos: ' + labels.length);
  pickOpt('m7');
  ok(!sheetOpen(), 'al elegir se cierra');
  ok(tok('ext').textContent === 'm7', 'la extensión cambia a m7');
  ok(tok('root').textContent === 'Eb', 'la fundamental no se toca');
});

guard('cerrar sin elegir', () => {
  const before = tok('root').textContent;
  tok('root').dispatch('click');
  ok(sheetOpen(), 'el panel se abre');
  document.body.querySelectorAll('.sheet-backdrop')[0].dispatch('click');
  ok(!sheetOpen(), 'el fondo lo cierra');
  ok(tok('root').textContent === before, 'y no cambia el acorde');
  ok((tok('root').attrs.class || '').indexOf('active') === -1,
    'el token deja de estar marcado al cerrar');

  tok('ext').dispatch('click');
  ok(sheetOpen(), 'se abre el de extensión');
  document.dispatch('keydown', { key: 'Escape' });
  ok(!sheetOpen(), 'Escape lo cierra');
});

/* ---- guitarra: cejilla y posiciones ---- */
guard('guitarra', () => {
  state.rootPc = 5; state.quality = 'maj'; state.ins = 'guitar'; state.posG = 0;
  repaint();
  state.posG = 0;
  repaint();
  const bars = app.querySelectorAll('rect').filter(r =>
    r.attrs.fill === '#F2EFE9' && parseFloat(r.attrs.width) > parseFloat(r.attrs.height));
  ok(bars.length >= 1, 'F dibuja la barra de cejilla');
  const strings = texts(app, 'text').filter(t => t === 'E');
  ok(strings.length >= 2, 'el diagrama rotula las cuerdas');
  const total = Shapes.forChord(5, 'maj').length;
  ok(app.querySelectorAll('.dot').length === total,
    'hay un punto por posición de F (' + total + ')');
  ok(app.querySelectorAll('.panel')[0].querySelectorAll('.diagram').length === 1,
    'la guitarra ya no lleva el diapasón debajo: solo la figura');
});

/* ---- clic en todo, sin excepciones ---- */
guard('clics', () => {
  state.rootPc = 0; state.quality = 'maj'; state.ins = 'guitar';
  repaint();
  const nodes = [];
  const walk = n => {
    if ((n.listeners.click || []).length || (n.listeners.pointerdown || []).length) { nodes.push(n); }
    n.children.forEach(walk);
  };
  walk(app);
  ok(nodes.length > 10, 'hay controles suficientes (' + nodes.length + ')');
  nodes.forEach((n, i) => guard('clic ' + i + ' <' + n.tagName + ' ' + (n.attrs.class || '') + '>', () => {
    n.dispatch('click');
    n.dispatch('pointerdown');
  }));
});

if (errors.length) {
  console.log('FALLOS (' + errors.length + '):');
  Array.from(new Set(errors)).slice(0, 20).forEach(e => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK · ' + checks + ' comprobaciones (12 fundamentales x ' +
  Object.keys(Theory.CHORDS).length + ' tipos, capas, panel y cifrado con bajo)');
