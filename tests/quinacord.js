/* Quinacord: el nucli del puzle diari, provat en fred. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let checks = 0;
const fails = [];
function ok(cond, msg) {
  checks += 1;
  if (!cond) { fails.push(msg); }
}

const root = path.join(__dirname, '..');
const w = { window: null, console };
w.window = w;
vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'theory.js'), 'utf8'), w);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'quina.js'), 'utf8'), w);

const Q = w.Quina;
ok(!!Q, 'el nucli s’exporta encara que no hi hagi pàgina');

/* el dia u és el dia de l’estrena */
const launch = Q.LAUNCH.split('-');
const d0 = new Date(+launch[0], +launch[1] - 1, +launch[2]);
ok(Q.dayIndex(d0) === 1, 'el dia de l’estrena és el número 1');
const d7 = new Date(+launch[0], +launch[1] - 1, +launch[2] + 7);
ok(Q.dayIndex(d7) === 8, 'set dies després toca el número 8');

/* determinista: el mateix dia, el mateix puzle per a tothom */
['3', '4', '5', '7'].forEach((m) => {
  const a = Q.puzzleFor(40, m);
  const b = Q.puzzleFor(40, m);
  ok(JSON.stringify(a.pcs) === JSON.stringify(b.pcs) && a.name === b.name,
    'el puzle del dia 40 en mode ' + m + ' és sempre el mateix');
  ok(a.pcs.length === Number(m), 'el mode ' + m + ' té ' + m + ' notes diferents: ' + a.pcs.length);
  ok(a.pcs.indexOf(((a.rootPc % 12) + 12) % 12) !== -1, 'la fonamental és dins del conjunt');
  const c = Q.puzzleFor(41, m);
  ok(JSON.stringify(a.pcs) !== JSON.stringify(c.pcs) || a.name !== c.name,
    'el dia següent el puzle canvia (mode ' + m + ')');
});

/* els tres modes no comparteixen puzle el mateix dia */
const p3 = Q.puzzleFor(9, '3');
// el mode del dia: determinista i variat
{
  const m1 = Q.dailyMode(3), m2 = Q.dailyMode(3);
  ok(m1 === m2, 'el mode del dia és determinista: ' + m1);
  const seen = new Set();
  for (let d = 1; d <= 30; d++) { seen.add(Q.dailyMode(d)); }
  ok(seen.size === 3, 'en un mes hi surten els tres modes: ' + [...seen].join(','));
  ok([...seen].every(m => Q.MODES[m]), 'i tots són modes de debò');
}

const p5 = Q.puzzleFor(9, '5');
ok(p3.name !== p5.name, 'cada mode té el seu acord del dia');

/* una temporada sencera, sana: mai una nota repetida, sempre amb nom */
let clean = true;
for (let day = 1; day <= 120; day++) {
  ['3', '4', '5', '7'].forEach((m) => {
    const p = Q.puzzleFor(day, m);
    if (p.pcs.length !== Number(m) || !p.name || p.midis.length !== p.type.steps.length) {
      clean = false;
    }
  });
}
ok(clean, '120 dies × 3 modes: tots els puzles ben formats');

/* els noms respecten l’armadura: cap D# on toca Eb */
let ebFound = '';
for (let day = 1; day <= 400 && !ebFound; day++) {
  const p = Q.puzzleFor(day, '3');
  if (p.rootPc === 3 && p.type.id === 'maj') { ebFound = p.name; }
}
ok(!ebFound || ebFound.indexOf('Eb') === 0,
  'un acord d’Eb s’escriu amb bemoll: ' + (ebFound || '(cap en 400 dies)'));

/* el tauler de 15 blanques sempre engoleix el voicing sencer */
let fits = true;
for (let day = 1; day <= 400; day++) {
  ['3', '4', '5', '7'].forEach((m) => {
    const p = Q.puzzleFor(day, m);
    const span = Math.max(...p.midis) - Math.min(...p.midis);
    if (span > 23) { fits = false; }
  });
}
ok(fits, 'cap voicing no s’escapa d’una finestra de dues octaves');

if (fails.length) {
  console.log('FALLOS (' + fails.length + '):');
  fails.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
console.log('OK · ' + checks + ' comprovacions del Quinacord');
