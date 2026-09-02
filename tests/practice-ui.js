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
  toggle(c, force) {
    const want = force === undefined ? !this.set.has(c) : !!force;
    if (want) { this.set.add(c); } else { this.set.delete(c); }
    this.sync();
    return want;
  }
  sync() { this.n.attrs.class = Array.from(this.set).join(' '); }
}
class Node {
  constructor(tag) {
    this.tagName = String(tag).toLowerCase();
    this.attrs = {}; this.children = []; this.listeners = {}; this.style = {};
    this._text = ''; this.parentNode = null; this.disabled = false;
    this.scrollTop = 0; this.scrollLeft = 0;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 260, height: 40 }; }
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
    if (sel.startsWith('.')) {
      return sel.slice(1).split('.').every(c => this.classList.contains(c));
    }
    if (sel.indexOf('[') !== -1) { return false; }   // selectors d'atribut: no calen aquí
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
  documentElement: new Node('html'),
  querySelector() { return null; },
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
  setInterval: () => 1, clearInterval() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  location: { hash: '' }, navigator: {},
  // el rellotge avança 500 ms per consulta: dos tocs = 120 bpm exactes
  performance: { now: (() => { let t = 0; return () => (t += 500); })() }
};
window.window = window;
window.globalThis = window;

const app = new Node('div');
app.setAttribute('id', 'app');
document.body.appendChild(app);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g))
  .map(m => m[1].replace(/\?v=\d+$/, ''));
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

const { Theory, Shapes, Fret } = window;
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
  ok(app.querySelectorAll('.deck').length === 1, 'hi ha un deck lliscant');
  ok(app.querySelectorAll('.panel').length === 4,
    'quatre plans: afinador, guitarra, piano i tempo');
  ok(app.querySelectorAll('.panel-inner').length === 2, 'els instruments tenen el seu contingut');
  ok(app.querySelectorAll('.tool-inner').length === 2, 'i les eines el seu');
  ok(app.querySelectorAll('.panel')[0].querySelectorAll('.tuner-note').length === 1,
    'el pla de l\'esquerra és l\'afinador');
  ok(app.querySelectorAll('.panel')[3].querySelectorAll('.mn-bpm').length === 1,
    'el pla de la dreta és el tempo');
  ok(app.querySelectorAll('.pinned-top').length === 1, 'capa fija arriba');
  ok(app.querySelectorAll('.pinned-bottom').length === 0,
    'ja no hi ha capa fixa a baix: la roda és de cada secció');
  ok(app.querySelectorAll('.watermark').length === 0, 'sin marca de agua detrás');
  ok(app.querySelectorAll('.top').length === 0, 'ya no hay barra de instrumento');
  ok(app.querySelectorAll('.dock').length === 0, 'ya no hay barra inferior de selección');
  const last = app.children[app.children.length - 1];
  ok((last.attrs.class || '').indexOf('pinned-top') !== -1,
    'la darrera capa és la de l’acord');
  ['guitar', 'piano'].forEach(ins => {
    const panel = app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === ins);
    ok(panel.querySelectorAll('.wheel').length === 1,
      'la secció de ' + ins + ' duu la seva pròpia roda');
    const inner = panel.querySelectorAll('.panel-inner')[0];
    const order = inner.children.map(c => c.attrs.class);
    ok(order.join('|') === 'stage|wheel-host',
      'amb la roda sota l’instrument: ' + order.join('|'));
    if (ins === 'piano') {
      const slots = panel.querySelectorAll('.stage')[0].children.map(c => c.attrs.class);
      ok(slots.join('|') === 'kb-slot|arp-host|kb-slot',
        'l’slider viu entre els dos pianos: ' + slots.join('|'));
    }
  });
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
  ok(app.querySelectorAll('.panel')[0] === panelsBefore[0], 'i els plans també');
});

/* ---- canvi de pla: instruments i eines ---- */
guard('canvi de pla', () => {
  ok(state.ins === 'piano', 'l’inici és el piano');
  window.Practice.goTo('guitar');
  window.Practice.goTo('piano');
  ok(state.ins === 'piano', 'goTo porta al piano');
  ok(storage.get('ac.ins') === 'piano', 'i ho recorda');
  ok(app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === 'piano')
    .querySelectorAll('.wh-item').length > 0, 'la secció del piano duu les inversions');
  ok(!app.classList.contains('on-tool'), 'als instruments les capes es veuen');

  window.Practice.goTo('metronome');
  ok(app.classList.contains('on-tool'), 'al tempo les capes fixes es dissolen');
  ok(state.ins === 'piano', 'i l\'instrument recordat no canvia');

  window.Practice.goTo('guitar');
  ok(state.ins === 'guitar', 'i torna a la guitarra');
  ok(!app.classList.contains('on-tool'), 'amb les capes visibles de nou');
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
        var guitarPanel = app.querySelectorAll('.panel')[1];
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
  ok(t.indexOf('1') !== -1 && t.indexOf('5') !== -1,
    'el dit és només el número, sense L ni R: ' + t.slice(0, 12).join(' '));
  ok(!t.some(x => /^[LR][1-5]$/.test(x)), 'cap etiqueta porta la mà al davant');
  ok(t.filter(x => x === '1').length === 2 && t.filter(x => x === '5').length === 2,
    'cada mà té el seu 1 i el seu 5: ' + t.filter(x => /^[1-5]$/.test(x)).join(' '));
  const heads = texts(app, '.kb-head');
  ok(heads.length === 2, 'hay dos cabeceras de mano: ' + heads.length);
  ok(/esquerra/.test(heads[0]) && /dreta/.test(heads[1]),
    'l\'esquerra a dalt i la dreta a baix: ' + heads.join(' | '));
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
  const wheelTitles = () => app.querySelectorAll('.panel')
    .find(p => p.attrs['data-ins'] === 'piano')
    .querySelectorAll('.wh-item').map(i => i.querySelectorAll('b')[0].textContent);
  ok(wheelTitles().length === 4, 'Cmaj7 tiene 4 inversiones: ' + wheelTitles().length);
  ok(wheelTitles().join(' ') === 'Cmaj7 Cmaj7/E Cmaj7/G Cmaj7/B',
    'las inversiones se cifran con su bajo: ' + wheelTitles().join(' '));

  state.quality = 'maj'; state.posP = 0;
  repaint();
  ok(wheelTitles().join(' ') === 'C C/E C/G', 'la tríada de C: ' + wheelTitles().join(' '));
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
  ok(tok('root').textContent === 'A', 'A major: la fonamental segueix sent A');
  ok(tok('ext').textContent === 'maj',
    'el major es mostra com Amaj: sufix visible i clicable');
  ok((tok('ext').attrs.class || '').indexOf('empty') === -1, 'sense fantasmes a mig gas');
  ok(app.querySelectorAll('.chord-name')[0].children.length === 2,
    'el títol té les dues peces, com qualsevol acord');
  const kindBtn = app.querySelectorAll('.line-ext')[0];
  ok(!!kindBtn && kindBtn.textContent === 'major', 'la paraula de sota diu el tipus');
  kindBtn.dispatch('click');
  ok(sheetOpen(), 'i prémer la paraula obre el selector d\'extensió');
  document.body.querySelectorAll('.sheet-backdrop')[0].dispatch('click');
  state.quality = 'min7';
  repaint();
  ok(tok('ext').textContent === 'm7', 'amb sufix real, el token el mostra');
  state.rootPc = 0;   // Cm7 = C Eb G Bb: la b3 y la b7 van con bemol
  repaint();
  const linea = texts(app, '.chord-line')[0];
  ok(linea.indexOf('Eb') !== -1 && linea.indexOf('Bb') !== -1 &&
     linea.indexOf('D#') === -1 && linea.indexOf('A#') === -1,
    'Cm7 se deletrea con bemoles: ' + linea);
  state.quality = 'aug';
  repaint();
  const lineaAug = texts(app, '.chord-line')[0];
  ok(lineaAug.indexOf('G#') !== -1 && lineaAug.indexOf('Ab') === -1,
    'la #5 de Caug se escribe con sostenido: ' + lineaAug);
});

/* ---- panel de selección ---- */
guard('panel de fundamental', () => {
  state.rootPc = 0; state.quality = 'maj';
  repaint();
  ok(!sheetOpen(), 'el panel empieza cerrado');
  tok('root').dispatch('click');
  ok(sheetOpen(), 'pulsar la fundamental abre el panel');
  ok(document.body.querySelectorAll('.opt').length === 12,
    'hi ha només les 12 notes: ' + document.body.querySelectorAll('.opt').length);
  const rg = [1, 2, 3].map(t => document.body.querySelectorAll('.opt-grid.tier' + t)[0]);
  ok(rg[0].children.length === 6 && rg[1].children.length === 3 && rg[2].children.length === 3,
    'fonamentals 6+3+3: files plenes, res asimètric');
  ok((tok('root').attrs.class || '').indexOf('active') !== -1, 'el token abierto se marca');
  pickOpt('Eb');
  ok(!sheetOpen(), 'al elegir se cierra');
  ok(tok('root').textContent === 'Eb', 'la fundamental cambia a Eb: ' + tok('root').textContent);
  ok(storage.get('ac.root') === '3', 'y se guarda');
});

guard('panel de extensión', () => {
  state.rootPc = 3; state.quality = 'maj';
  repaint();
  app.querySelectorAll('.line-ext')[0].dispatch('click');
  ok(sheetOpen(), 'pulsar la extensión abre su panel');
  const labels = document.body.querySelectorAll('.opt-big').map(o => o.textContent);
  ok(labels.indexOf('m7') !== -1 && labels.indexOf('sus4') !== -1 && labels.indexOf('maj') !== -1,
    'hi surten els tipus, amb el major com a maj: ' + labels.slice(0, 6).join(' '));
  ok(labels.length === window.ChordData.types.length,
    'surten tots els tipus de l\'arxiu de dades: ' + labels.length);
  const t1 = document.body.querySelectorAll('.opt-grid.tier1');
  const t2 = document.body.querySelectorAll('.opt-grid.tier2');
  const t3 = document.body.querySelectorAll('.opt-grid.tier3');
  ok(t1.length === 1 && t2.length === 1 && t3.length === 1,
    'el selector va per nivells de popularitat');
  ok(t1[0].children.length === 3 && t2[0].children.length === 9 && t3[0].children.length === 16,
    'extensions 3+9+16: files plenes de 3, 3 i 4');
  pickOpt('m7');
  ok(!sheetOpen(), 'al elegir se cierra');
  ok(tok('ext').textContent === 'm7', 'la extensión cambia a m7');
  ok(tok('root').textContent === 'Eb', 'la fundamental no se toca');
  ok(tok('ext').textContent === 'm7', 'y el sufijo aparece en el título');
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
  const gWheel = app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === 'guitar');
  ok(gWheel.querySelectorAll('.wh-item').length === total,
    'hay una peça de roda por posición de F (' + total + ')');
  ok(app.querySelectorAll('.panel')[1].querySelectorAll('.diagram').length === 1,
    'la guitarra només duu la figura');
});

/* ---- eines: afinador i tempo com a plans ---- */
guard('eines', () => {
  // afinador (pla 0): sense mediaDevices al stub, avisa i mostra el botó
  window.Practice.goTo('tuner');
  const tunerPanel = app.querySelectorAll('.panel')[0];
  ok(tunerPanel.querySelectorAll('.ticks')[0].children.length === 25, 'la regla té 25 tics');
  ok(/micròfon/.test(texts(tunerPanel, '.tool-hint')[0]),
    'sense mediaDevices avisa en lloc de trencar-se');

  // tempo (pla 3): arrossegar canvia, tocar engega
  window.Practice.goTo('metronome');
  const tool = app.querySelectorAll('.panel')[3];
  const bpmBtn = tool.querySelectorAll('.mn-bpm')[0];
  const before = parseInt(bpmBtn.textContent, 10);
  ok(before >= 30 && before <= 240, 'bpm inicial raonable: ' + before);
  ok(tool.querySelectorAll('.chev').length === 0, 'sense fletxes');
  ok(tool.querySelectorAll('.tool-hint').length === 0, 'sense textos que facin nosa');

  bpmBtn.dispatch('pointerdown', { clientY: 200, pointerId: 1 });
  bpmBtn.dispatch('pointermove', { clientY: 150, pointerId: 1 });
  bpmBtn.dispatch('pointerup', { pointerId: 1 });
  ok(parseInt(bpmBtn.textContent, 10) === before + 10,
    'arrossegar amunt puja el tempo: ' + bpmBtn.textContent);
  ok((bpmBtn.attrs.class || '').indexOf('running') === -1, 'i no l\'engega');
  ok(storage.get('ac.bpm') === String(before + 10), 'i es recorda');

  tool.querySelectorAll('.tool-inner')[0].dispatch('wheel', { deltaY: -120 });
  ok(parseInt(bpmBtn.textContent, 10) === before + 12, 'la roda també canvia el tempo');

  // el compàs s'obre com els acords: capa amb grans i petits
  const meterBtn = tool.querySelectorAll('.mn-meter')[0];
  meterBtn.dispatch('click');
  ok(document.body.querySelectorAll('.sheet').length === 1, 'el compàs obre la seva capa');
  const mOpts = document.body.querySelectorAll('.opt-big').map(o => o.textContent);
  ok(mOpts.join(' ') === '3/4 4/4 2/4 5/4 6/8',
    'compassos amb els populars primer: ' + mOpts.join(' '));
  ok(document.body.querySelectorAll('.opt-grid.meters.tier1')[0].children.length === 2,
    '3/4 i 4/4 van en gran');
  const opt34 = document.body.querySelectorAll('.opt')
    .find(o => o.querySelector('.opt-big').textContent === '3/4');
  opt34.dispatch('click');
  ok(document.body.querySelectorAll('.sheet').length === 0, 'triar tanca la capa');
  ok(meterBtn.textContent === '3/4', 'el mando mostra el compàs triat');
  ok(storage.get('ac.meter') === '3/4', 'i es recorda');
  ok(tool.querySelectorAll('.mn-beats')[0].children.length === 3, 'en 3/4 hi ha tres punts');

  // tap tempo: picar al ritme sobre l'espai buit del pla
  const inner = tool.querySelectorAll('.tool-inner')[0];
  inner.dispatch('pointerdown', { target: inner });
  inner.dispatch('pointerdown', { target: inner });
  inner.dispatch('pointerdown', { target: inner });
  ok(parseInt(bpmBtn.textContent, 10) === 120,
    'tres tocs a 500 ms fan 120 bpm: ' + bpmBtn.textContent);
  ok(storage.get('ac.bpm') === '120', 'i es recorda');
  ok((bpmBtn.attrs.class || '').indexOf('running') === -1,
    'picar el pla no engega el metrònom');

  // toc curt = engega / atura
  bpmBtn.dispatch('pointerdown', { clientY: 100, pointerId: 2 });
  bpmBtn.dispatch('pointerup', { pointerId: 2 });
  ok((bpmBtn.attrs.class || '').indexOf('running') !== -1, 'tocar el número engega');
  bpmBtn.dispatch('pointerdown', { clientY: 100, pointerId: 3 });
  bpmBtn.dispatch('pointerup', { pointerId: 3 });
  ok((bpmBtn.attrs.class || '').indexOf('running') === -1, 'i tornar-lo a tocar atura');

  // BUG (regressió): des del pla del tempo el títol invisible no pot
  // obrir el selector d'acords
  tok('root').dispatch('click');
  ok(!sheetOpen(), 'des del tempo el selector de fonamentals no s’obre');
  tok('ext').dispatch('click');
  ok(!sheetOpen(), 'ni el d’extensions');

  window.Practice.goTo('guitar');
  tok('root').dispatch('click');
  ok(sheetOpen(), 'de tornada a l’instrument, sí');
  document.body.querySelectorAll('.sheet-backdrop')[0].dispatch('click');
});

/* ---- pianet lliure: pantalla completa, llisc de sustain ---- */
guard('pianet lliure', () => {
  ok(typeof window.Sound.padOn === 'function', 'hi ha veu de pad');

  const btn = app.querySelectorAll('.piano-btn')[0];
  ok(!!btn && /k-on/.test(btn.innerHTML) && /k-b/.test(btn.innerHTML),
    'el botó duu la marca del teclat, la mateixa que la icona de l’app');
  btn.dispatch('click');
  const wrap = document.body.querySelectorAll('.fp-wrap')[0];
  ok(!!wrap, 'el piano ocupa tota la pantalla');
  ok(wrap.querySelectorAll('.chev').length === 0 && wrap.querySelectorAll('.fp-clear').length === 0,
    'sense fletxes ni botons: només tecles i la creu');
  const svg = wrap.querySelectorAll('svg')[0];
  ok(!!svg, 'amb el seu teclat');
  const foots = svg.querySelectorAll('text').map(t => t.textContent);
  ok(foots.indexOf('C2') !== -1 && foots.indexOf('C4') !== -1 && foots.indexOf('C6') !== -1,
    'cada Do porta el seu indicador d’octava: ' + foots.join(' '));
  ok(Object.keys(svg.keyRefs).length === 50,
    'quatre octaves amb la negra de la vora: ' + Object.keys(svg.keyRefs).length + ' tecles');

  // polsar: sona i s'il·lumina; deixar anar: calla (delegat a l'svg)
  const refs = svg.keyRefs['48'];
  svg.dispatch('pointerdown', { target: refs.rect, clientX: 100, clientY: 100, pointerId: 1 });
  ok(refs.rect.attrs.fill === '#FFFFFF', 'la tecla polsada s’encén en blanc');
  ok(refs.key.attrs.transform === 'translate(0 2)', 'i s’enfonsa un pèl');
  svg.dispatch('pointerup', { pointerId: 1 });
  ok(refs.rect.attrs.fill === refs.baseFill && refs.key.attrs.transform === '',
    'i s’apaga en deixar-la anar');
  ok(refs.baseFill === '#C7C0B2', 'les blanques del pianet: os càlid, ni ivori ni gris fosc');

  // lliscar cap avall fixa la nota sonant
  svg.dispatch('pointerdown', { target: refs.rect, clientX: 100, clientY: 100, pointerId: 2 });
  svg.dispatch('pointermove', { clientX: 100, clientY: 145, pointerId: 2 });
  svg.dispatch('pointerup', { pointerId: 2 });
  ok(refs.rect.attrs.fill === '#FFFFFF' && refs.key.attrs.transform === 'translate(0 2)',
    'lliscar cap avall deixa la nota fixada, blanca i enfonsada');

  // i cap amunt la deixa anar
  svg.dispatch('pointerdown', { target: refs.rect, clientX: 100, clientY: 100, pointerId: 3 });
  svg.dispatch('pointermove', { clientX: 100, clientY: 55, pointerId: 3 });
  svg.dispatch('pointerup', { pointerId: 3 });
  ok(refs.rect.attrs.fill === refs.baseFill, 'lliscar cap amunt la deixa anar');

  // una negra fixada: beix amb vora negra
  const refs49 = svg.keyRefs['49'];
  svg.dispatch('pointerdown', { target: refs49.rect, clientX: 100, clientY: 100, pointerId: 4 });
  svg.dispatch('pointermove', { clientX: 100, clientY: 145, pointerId: 4 });
  svg.dispatch('pointerup', { pointerId: 4 });
  ok(refs49.rect.attrs.fill === '#FFFFFF' && refs49.rect.attrs.stroke === '#060605'
    && refs49.rect.attrs['stroke-width'] === '2.4',
    'la negra fixada va en blanc amb vora negra');
  svg.dispatch('pointerdown', { target: refs49.rect, clientX: 100, clientY: 100, pointerId: 5 });
  svg.dispatch('pointermove', { clientX: 100, clientY: 55, pointerId: 5 });
  svg.dispatch('pointerup', { pointerId: 5 });
  ok(refs49.rect.attrs.fill === refs49.baseFill
    && refs49.rect.attrs['stroke-width'] === refs49.baseStrokeW,
    'i en deixar-la anar recupera cos i vora');

  // arrossegar de costat damunt d'una tecla mou el teclat i calla la nota
  const kb0 = wrap.querySelectorAll('.fp-kb')[0];
  kb0.scrollLeft = 150;
  svg.dispatch('pointerdown', { target: refs.rect, clientX: 100, clientY: 100, pointerId: 7 });
  svg.dispatch('pointermove', { clientX: 160, clientY: 100, pointerId: 7 });
  ok(kb0.scrollLeft === 90, 'llisc lateral damunt la tecla mou el teclat: ' + kb0.scrollLeft);
  ok(refs.rect.attrs.fill === refs.baseFill, 'i la nota encetada calla');
  svg.dispatch('pointerup', { pointerId: 7 });

  // el despcalament: arrossegar per on no hi ha tecla mou el teclat,
  // i la línia de posició beix hi és per acompanyar-lo
  ok(wrap.querySelectorAll('.fp-pos').length === 1, 'la línia de posició hi és');
  const kbHost = wrap.querySelectorAll('.fp-kb')[0];
  kbHost.scrollLeft = 200;
  kbHost.dispatch('pointerdown', { target: kbHost, clientX: 300, pointerId: 9 });
  kbHost.dispatch('pointermove', { target: kbHost, clientX: 240, pointerId: 9 });
  ok(kbHost.scrollLeft === 260, 'arrossegar per l’aire llisca el teclat: ' + kbHost.scrollLeft);
  kbHost.dispatch('pointerup', { pointerId: 9 });

  const close = wrap.querySelectorAll('.fp-close')[0];
  ok(!!close && close.textContent === '←', 'la fletxa de tornar hi és');
  close.dispatch('click');
  ok(document.body.querySelectorAll('.fp-wrap').length === 0, 'i tanca el piano');
});

guard('res no roba el gest de lliscar (al mòbil el carrusel ha de córrer)', () => {
  ['guitar', 'piano'].forEach(ins => {
    const panel = app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === ins);
    const svg = panel.querySelectorAll('svg')[0];
    const withHandlers = svg.querySelectorAll('g')
      .filter(g => g.listeners && Object.keys(g.listeners).length > 0).length;
    const onSvg = svg.listeners ? Object.keys(svg.listeners).length : 0;
    ok(withHandlers === 0 && onSvg === 0,
      'el diagrama de ' + ins + ' és mut i sense gestors: ' + withHandlers + '/' + onSvg);
  });
});

guard('l’afinador demana un toc (iOS no obre el micròfon tot sol)', () => {
  window.Practice.goTo('tuner');
  const tuner = app.querySelectorAll('.panel')[0].querySelectorAll('.tool-inner')[0];
  ok(!!tuner, 'el pla de l’afinador hi és');
  const mic = tuner.querySelectorAll('.mic-btn')[0];
  ok(!!mic, 'amb el seu botó de micròfon');
  ok(mic.hidden === false, 'que es mostra en arribar-hi, esperant el toc');
  ok(!!(tuner.listeners && tuner.listeners.pointerdown),
    'i qualsevol toc del pla també val');
});

guard('aparença: clar, fosc i tres lletres', () => {
  window.Practice.goTo('piano');
  const btn = app.querySelectorAll('.look-btn')[0];
  ok(!!btn, 'la icona d’aparença és a dalt a la dreta');
  btn.dispatch('click');
  const sheet = document.body.querySelectorAll('.sheet')[0];
  ok(!!sheet && sheet.attrs['data-kind'] === 'look', 'obre el seu popup');
  ok(sheet.querySelectorAll('.sheet-label').length === 0,
    'sense rètols: ja s’entén què s’hi tria');
  ok(sheet.querySelectorAll('.opt-grid').length === 3, 'tres graelles: color, lletra i so');
  ok(sheet.querySelectorAll('.grp-brace').length === 0
    && sheet.querySelectorAll('.staff').length === 0,
    'sense claus ni pentagrames: aire i prou');
  const icons = sheet.querySelectorAll('.grp-icon').map(i => i.textContent);
  ok(icons.join(' ') === '◐ Aa ♪', 'les icones diuen què és cada grup: ' + icons.join(' '));
  const opts = sheet.querySelectorAll('.opt-big').map(o => o.textContent);
  ok(opts.join(' ') === 'fosc clar Outfit Fraunces Instrument coixí elèctric',
    'dos modes, tres lletres i dues veus: ' + opts.join(' '));

  // triar tanca el popup
  const clar = sheet.querySelectorAll('.opt').find(o => o.textContent === 'clar');
  clar.dispatch('click');
  ok(document.body.querySelectorAll('.sheet').length === 0, 'en triar, es tanca');
  ok(document.documentElement.getAttribute('data-theme') === 'light',
    'la pàgina passa a clar');
  ok(window.localStorage.getItem('ac.theme') === 'light', 'i es recorda');

  // els diagrames es tornen a dibuixar amb la paleta clara
  const kb = app.querySelectorAll('.kb')[0].querySelectorAll('svg')[0];
  const fills = kb.querySelectorAll('rect').map(r => r.attrs.fill);
  ok(fills.indexOf('#E6E0D2') !== -1, 'les tecles blanques passen a paper: ' + fills.slice(0, 3));
  ok(fills.indexOf('#8E887F') === -1, 'i no queda cap gris del mode fosc');
  const ring = kb.querySelectorAll('circle').find(c => c.attrs.stroke === '#141210');
  ok(!!ring, 'la bombolla clara guanya anella per no perdre’s sobre tecla clara');
  const beige = kb.querySelectorAll('circle').map(c => c.attrs.fill);
  ok(beige.indexOf('#CFA24A') !== -1 && beige.indexOf('#DCC9A6') === -1,
    'l’accent passa a ocre, llegible sobre blanc');

  // la lletra, al mateix popup i en una segona entrada
  app.querySelectorAll('.look-btn')[0].dispatch('click');
  let s2 = document.body.querySelectorAll('.sheet')[0];
  s2.querySelectorAll('.opt').find(o => o.textContent === 'Fraunces').dispatch('click');
  ok(document.documentElement.getAttribute('data-font') === 'fraunces',
    'la lletra canvia i es tanca');
  ok(document.body.querySelectorAll('.sheet').length === 0, 'sense quedar-se obert');
  ok(window.localStorage.getItem('ac.font') === 'fraunces', 'i es recorda');

  app.querySelectorAll('.look-btn')[0].dispatch('click');
  s2 = document.body.querySelectorAll('.sheet')[0];
  s2.querySelectorAll('.opt').find(o => o.textContent === 'Outfit').dispatch('click');
  ok(document.documentElement.getAttribute('data-font') === null, 'i torna a Outfit');

  app.querySelectorAll('.look-btn')[0].dispatch('click');
  s2 = document.body.querySelectorAll('.sheet')[0];
  s2.querySelectorAll('.opt').find(o => o.textContent === 'fosc').dispatch('click');
  ok(document.documentElement.getAttribute('data-theme') === null, 'que torna al negre');

  // la veu de so es tria i es recorda
  ok(typeof window.Sound.setVoice === 'function' && window.Sound.voice() === 'pad',
    'la veu per defecte és el coixí');
  app.querySelectorAll('.look-btn')[0].dispatch('click');
  s2 = document.body.querySelectorAll('.sheet')[0];
  s2.querySelectorAll('.opt').find(o => o.textContent === 'elèctric').dispatch('click');
  ok(window.Sound.voice() === 'ep', 'l\u2019elèctric pren el relleu');
  ok(window.localStorage.getItem('ac.voice') === 'ep', 'i es recorda');
  ok(document.body.querySelectorAll('.sheet').length === 0, 'triant es tanca, com sempre');
  window.Sound.setVoice('pad');
});

guard('l’slider d’entrar l’acord', () => {
  state.rootPc = 0; state.quality = 'maj'; state.ins = 'piano'; state.posP = 0;
  repaint();
  const panel = app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === 'piano');
  const track = panel.querySelectorAll('.arp-track')[0];
  ok(!!track, 'l’slider hi és, sota els teclats');
  const total = Number(track.attrs['aria-valuemax']);
  ok(total >= 4, 'una fracció per nota de l’acord: ' + total);
  ok(track.querySelectorAll('.arp-tick').length === 0, 'sense tics: continu i dissimulat');

  // arrossegar fins a mig camí: sonen les primeres, la resta en fantasma
  const mid = Math.round(total / 2);
  track.dispatch('pointerdown', { clientX: 260 * (mid + 0.4) / total, pointerId: 1 });
  ok(track.attrs['aria-valuenow'] === String(mid), 'a mig camí: ' + track.attrs['aria-valuenow']);
  ok(/%/.test(track.querySelectorAll('.arp-fill')[0].style.width),
    'la barra segueix el dit, contínua: ' + track.querySelectorAll('.arp-fill')[0].style.width);
  let hollow = panel.querySelectorAll('circle').filter(c => c.attrs.fill === 'none');
  ok(hollow.length > 0, 'les que falten esperen en fantasma: ' + hollow.length);

  // fins al final: totes dins; deixar anar no apaga res
  track.dispatch('pointermove', { clientX: 260, pointerId: 1 });
  track.dispatch('pointerup', { pointerId: 1 });
  ok(track.attrs['aria-valuenow'] === String(total), 'al final hi són totes');
  hollow = panel.querySelectorAll('circle').filter(c => c.attrs.fill === 'none');
  ok(hollow.length === 0, 'cap fantasma: l’acord sencer sona i es queda');

  // enrere fins a zero: tot torna al repòs
  track.dispatch('pointerdown', { clientX: 260, pointerId: 2 });
  track.dispatch('pointermove', { clientX: 0, pointerId: 2 });
  track.dispatch('pointerup', { pointerId: 2 });
  ok(track.attrs['aria-valuenow'] === '0', 'enrere les treu en ordre invers');
  ok(panel.querySelectorAll('circle').filter(c => c.attrs.fill === 'none').length === 0,
    'i les marques tornen a ser les de sempre');

  // canviar de pla atura el que sonés
  track.dispatch('pointerdown', { clientX: 260, pointerId: 3 });
  track.dispatch('pointerup', { pointerId: 3 });
  window.Practice.goTo('metronome');
  window.Practice.goTo('piano');
  ok(panel.querySelectorAll('.arp-track')[0].attrs['aria-valuenow'] === '0',
    'canviar de pla ho fa callar tot');
});

guard('les marques fantasma del piano', () => {
  const svg = window.Piano.render({
    from: 60, keys: 8, labels: 'none', footLabels: 'none', playable: false,
    midiMarks: [
      { midi: 60, label: '1', role: 'root', ghost: true },
      { midi: 64, label: '3', role: 'chord' }
    ]
  });
  const g60 = svg.querySelectorAll('g').find(g => g.attrs['data-midi'] === '60');
  const g64 = svg.querySelectorAll('g').find(g => g.attrs['data-midi'] === '64');
  ok(!g60.attrs.transform, 'la fantasma no s’enfonsa');
  ok(g64.attrs.transform === 'translate(0 2.5)', 'la sòlida sí');
  const ring = g60.children.find(c => c.tagName === 'circle');
  ok(!!ring && ring.attrs.fill === 'none' && ring.attrs.stroke === '#DCC9A6',
    'la bombolla fantasma és un anell buit del color del rol');
  ok(!g60.children.some(c => c.tagName === 'text'), 'i sense número, que encara no toca');
});

guard('el pianet vesteix', () => {
  app.querySelectorAll('.piano-btn')[0].dispatch('click');
  const wrap = document.body.querySelectorAll('.fp-wrap')[0];
  const svg = wrap.querySelectorAll('svg')[0];
  ok(!svg.children.some(c => c.tagName === 'rect' && c.attrs.fill === '#B08B3C'),
    'sense feltre: només tecles');
  const g = svg.querySelectorAll('g').find(x => x.attrs['data-midi'] === '48');
  ok(g.children.some(c => c.tagName === 'rect' && c.attrs.fill === 'rgba(0,0,0,.14)'),
    'cada blanca té el seu front');
  wrap.querySelectorAll('.fp-close')[0].dispatch('click');
});

guard('el pianet posa nom al que sona', () => {
  app.querySelectorAll('.piano-btn')[0].dispatch('click');
  const wrap = document.body.querySelectorAll('.fp-wrap')[0];
  const svg = wrap.querySelectorAll('svg')[0];
  const nameEl = wrap.querySelectorAll('.fp-name')[0];
  ok(!!nameEl && nameEl.textContent === '', 'el rètol comença buit');

  const latch = (midi, pid) => {
    const refs = svg.keyRefs[String(midi)];
    svg.dispatch('pointerdown', { target: refs.rect, clientX: 100, clientY: 100, pointerId: pid });
    svg.dispatch('pointermove', { clientX: 100, clientY: 145, pointerId: pid });
    svg.dispatch('pointerup', { pointerId: pid });
  };
  latch(48, 21); latch(52, 22);
  ok(nameEl.textContent === '', 'amb dues notes encara no diu res');
  latch(55, 23);
  ok(nameEl.textContent === 'C', 'C E G fixades: això és un C');
  latch(58, 24);
  ok(nameEl.textContent === 'C7', 'amb la sèptima, C7: ' + nameEl.textContent);

  // treure el baix: el que queda és un acord amb baix nou
  const refs48 = svg.keyRefs['48'];
  svg.dispatch('pointerdown', { target: refs48.rect, clientX: 100, clientY: 100, pointerId: 25 });
  svg.dispatch('pointermove', { clientX: 100, clientY: 55, pointerId: 25 });
  svg.dispatch('pointerup', { pointerId: 25 });
  ok(nameEl.textContent !== 'C7', 'sense el do, ja no és C7: ' + nameEl.textContent);
  wrap.querySelectorAll('.fp-close')[0].dispatch('click');
});

guard('la pràctica: una pantalla amb tres jocs', () => {
  const btn = app.querySelectorAll('.train-btn')[0];
  ok(!!btn, 'l’anell de pràctica és a dalt a la dreta');
  btn.dispatch('click');
  const wrap = document.body.querySelectorAll('.pr-wrap')[0];
  ok(!!wrap, 's’obre la seva pantalla');
  ok(wrap.querySelectorAll('.pr-panel').length === 3, 'amb tres jocs per lliscar');

  const intro = wrap.querySelectorAll('.pr-intro')[0];
  ok(intro.children[0].textContent === 'Construeix l’acord',
    'el títol del joc surt en entrar: ' + intro.children[0].textContent);
  ok(intro.classList.contains('hide'), 'i s’esvaeix sol');

  // joc 1: només valen les tecles que sonen
  const p1 = wrap.querySelectorAll('.pr-panel')[0];
  const g1 = p1._debug;
  g1.force(0, 'maj');
  ok(g1.state().total === 3, 'un C major són tres tecles concretes');
  g1.tap(48);
  ok(g1.state().found === 1 && g1.refs(48).rect.attrs.fill === '#DCC9A6',
    'el do que sona compta i es marca');
  g1.tap(60);
  ok(g1.state().found === 1, 'el mateix do una octava amunt NO val');
  ok(g1.refs(60).rect.attrs.fill === g1.refs(60).baseFill, 'i no es queda marcat');
  ok(/1 \/ 3/.test(texts(p1, '.tool-hint')[0]), 'el comptador acompanya');
  g1.tap(52);
  g1.tap(55);
  ok(g1.state().lastSolved === 'C', 'endevinat: era un C');

  // inversions: la fonamental ve marcada i el xifrat porta el baix
  g1.force(0, 'maj', 1);
  ok(g1.state().midis.join(',') === '52,55,60', 'C/E: mi, sol i el do a dalt');
  ok(g1.state().found === 1 && g1.refs(60).rect.attrs.fill === '#DCC9A6',
    'la fonamental ja ve marcada de sèrie');
  g1.tap(52);
  g1.tap(55);
  ok(g1.state().lastSolved === 'C/E', 'i el xifrat diu el baix: ' + g1.state().lastSolved);
  ok(g1.state().done, 'res no passa sol: la ronda es queda resolta');
  const arrow = p1.querySelectorAll('.pr-btn').find(b => b.textContent === '→');
  ok(arrow.classList.contains('on'), 'la fletxa s’encén en acabar');
  arrow.dispatch('click');
  ok(!g1.state().done && !arrow.classList.contains('on'),
    'i és la fletxa qui passa al següent');

  // l’ortografia del baix segueix la tonalitat: Eb/Bb, mai D#/A#
  g1.force(3, 'maj', 2);
  g1.tap(58); g1.tap(63); g1.tap(67);
  ok(g1.state().lastSolved === 'Eb/Bb',
    'el baix s’escriu com toca: ' + g1.state().lastSolved);

  // el teclat s’ancora a l’acord: un dom9 de Si arriba fins al 73
  g1.force(11, 'dom9');
  ok(!!g1.refs(73), 'la finestra es mou perquè totes les notes hi càpiguen');
  g1.reveal();
  ok(g1.state ? true : true, 'la resposta no peta');

  // els quatre botons del joc 1, muts: orella, selecció, resposta, següent
  const row = p1.querySelectorAll('.pr-row')[0];
  ok(row.children.length === 4
    && row.querySelectorAll('.pr-ear').length === 1
    && row.querySelectorAll('.pr-sel').length === 1,
    'orella que es buida, tres tecletes, ? i fletxa');

  // joc 2: la nota misteriosa des de la referència
  const g2 = wrap.querySelectorAll('.pr-panel')[1]._debug;
  g2.force(48, 4);
  ok(g2.state().target === 52, 'referència 48 + 3a major = 52');
  g2.tap(50);
  ok(!g2.state().done, 'fallar no resol');
  g2.tap(48);
  ok(!g2.state().done, 'tocar la referència no penalitza');
  g2.tap(52);
  ok(g2.state().lastSolved === '3a major', 'trobada: era una 3a major');

  // joc 3: pinta el grau (canta’l abans)
  const p3 = wrap.querySelectorAll('.pr-panel')[2];
  const g3 = p3._debug;
  g3.force(50, 3);
  ok(texts(p3, '.pr-name')[0] === '3a menor', 'el grau es demana pel nom');
  ok(/cantar/.test(texts(p3, '.tool-hint')[0]), 'i primer, prova de cantar-la');
  g3.tap(53);
  ok(g3.state().lastSolved === '3a menor', 'pintada al seu lloc');

  wrap.querySelectorAll('.pr-close')[0].dispatch('click');
  ok(document.body.querySelectorAll('.pr-wrap').length === 0, 'la creu tanca la pràctica');
});

guard('el rètol d’estrena: fins al primer canvi', () => {
  window.localStorage.removeItem('ac.coached');
  window.Practice.goTo('guitar');
  repaint();
  ok(texts(app, '.coach').length === 1 && /canviar/.test(texts(app, '.coach')[0]),
    'la primera vegada, la pista hi és: ' + texts(app, '.coach')[0]);

  app.querySelectorAll('.tok-root')[0].dispatch('click');
  ok(window.localStorage.getItem('ac.coached') === '1', 'al primer canvi queda après');
  document.body.querySelectorAll('.sheet-backdrop')[0].dispatch('click');
  repaint();
  ok(texts(app, '.coach').length === 0, 'i la pista no torna mai més');
});

guard('les tecles marcades semblen polsades', () => {
  const kb = app.querySelectorAll('.kb')[0];
  const svg = kb.querySelectorAll('svg')[0];
  const keys = svg.querySelectorAll('g').filter(g => g.attrs['data-midi'] !== undefined);
  const sunk = keys.filter(g => g.attrs.transform === 'translate(0 2.5)');
  ok(sunk.length > 0 && sunk.length < keys.length,
    'les marcades baixen un pèl i la resta no: ' + sunk.length + '/' + keys.length);
});

guard('la roda: el nom de dalt no parpelleja i aquí baix no hi ha blur', () => {
  const activePanel = app.querySelectorAll('.panel').find(p => p.attrs['data-ins'] === state.ins);
  const items = activePanel.querySelectorAll('.wh-item');
  ok(items.length > 1, 'hi ha més d’una inversió per provar: ' + items.length);
  ok(items[0].classList.contains('on') && !items[1].classList.contains('on'),
    'la del mig es llegeix neta i les altres no');
  ok(items[1].style.filter === undefined, 'cap blur a la roda');
  ok(/rotate/.test(items[1].style.transform) && Number(items[1].style.opacity) < 1,
    'els veïns s’inclinen com una brúixola i s’apaguen: ' + items[1].style.transform);
  // la roda compta amb el coixí interior: la peça 0 no és el límit físic
  const strip = activePanel.querySelectorAll('.wheel')[0];
  ok(strip.scrollLeft === 46, 'la peça triada seu 46px endins del límit: ' + strip.scrollLeft);

  items[1].dispatch('click');
  ok(activePanel.querySelectorAll('.wh-item')[1].getAttribute('aria-selected') === 'true',
    'tocar-ne una la porta al centre');
  const wheelKids = activePanel.querySelectorAll('.wheel')[0].children;
  ok(!wheelKids.some(k => k.classList.contains('fx-in') || k.classList.contains('fx-out')),
    'la roda no fa l’animació de blur');
  const topKids = app.querySelectorAll('.pinned-inner')[0].children;
  const blurredTop = topKids.filter(k =>
    k.classList.contains('fx-in') || k.classList.contains('fx-out')).length;
  ok(topKids.length > 0 && blurredTop === 0,
    'el nom de l’acord queda quiet: ' + blurredTop + ' fills amb fx');
  ok(activePanel.querySelectorAll('.fx-in').length > 0,
    'els diagrames sí que fan la transició');
});

guard('mastil ajagut', () => {
  const shape = Shapes.forChord(5, 'maj')[0];   // F amb celleta
  const hor = Fret.chordBox(shape, { horizontal: true, rootPc: 5 });
  const w = Number(hor.getAttribute('width'));
  const hgt = Number(String(hor.getAttribute('viewBox')).split(' ')[3]);
  ok(w > hgt, 'el diagrama ajagut es mes ample que alt: ' + w + 'x' + hgt);
  const bars = hor.querySelectorAll('rect').filter(r =>
    r.attrs.fill === '#F2EFE9' && Number(r.attrs.height) > Number(r.attrs.width));
  ok(bars.length >= 1, 'la celleta ajaguda es vertical');
  const es = hor.querySelectorAll('text').map(t => t.textContent).filter(t => t === 'E');
  ok(es.length === 2, 'rotula les cordes E');
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
  // sin sonido, los diagramas ya no son interactivos: quedan los mandos
  ok(nodes.length >= 6, 'hay controles suficientes (' + nodes.length + ')');
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
