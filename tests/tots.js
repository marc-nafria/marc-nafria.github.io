/* Corre totes les suites d'una tacada: `node tests/tots.js` */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const suites = ['theory-shapes.js', 'practice-ui.js', 'quinacord.js'];
let ko = 0;

suites.forEach((s) => {
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8' });
    process.stdout.write(out.trim().split('\n').pop() + '\n');
  } catch (e) {
    ko += 1;
    process.stdout.write('KO ' + s + '\n' + (e.stdout || '') + (e.stderr || ''));
  }
});

process.exit(ko ? 1 : 0);
