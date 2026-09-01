/* ============================================================
   config.js - carga y valida data/chords.json, el archivo donde
   viven los acordes, sus formas de guitarra y las reglas de piano.
   Editable en GitHub sin tocar código: este módulo lo comprueba
   antes de aplicarlo y avisa con un mensaje claro si algo no cuadra.
   ============================================================ */
(function (global) {
  'use strict';

  function fail(where, message) {
    throw new Error('data/chords.json · ' + where + ': ' + message);
  }

  function checkShape(where, frets, fingers, allowNull) {
    if (!Array.isArray(frets) || frets.length !== 6) {
      fail(where, 'frets debe tener 6 valores (de la 6ª cuerda a la 1ª)');
    }
    frets.forEach(function (f) {
      var muted = allowNull ? f === null : f === -1;
      if (!muted && (typeof f !== 'number' || f < (allowNull ? -6 : 0) || f > 15)) {
        fail(where, 'traste fuera de rango: ' + f);
      }
    });
    if (!Array.isArray(fingers) || fingers.length !== 6) {
      fail(where, 'fingers debe tener 6 valores');
    }
    fingers.forEach(function (f) {
      if (typeof f !== 'number' || f < 0 || f > 4) {
        fail(where, 'dedo fuera de rango: ' + f + ' (0 = sin dedo, 1-4)');
      }
    });
  }

  function validate(data) {
    if (!data || !Array.isArray(data.types) || !data.types.length) {
      fail('types', 'no hay lista de acordes');
    }
    if (!Array.isArray(data.spelling) || data.spelling.length !== 12) {
      fail('spelling', 'deben ser exactamente 12 nombres de nota');
    }
    if (!data.piano || !data.piano.fingers || !data.piano.leftHand || !data.piano.rightHand) {
      fail('piano', 'faltan las reglas de piano (fingers, leftHand, rightHand)');
    }

    if (data.rootTiers) {
      var flat = [];
      data.rootTiers.forEach(function (tier) { flat = flat.concat(tier); });
      if (flat.length !== 12) { fail('rootTiers', 'deben cubrir exactamente las 12 notas'); }
      var pcs = {};
      flat.forEach(function (name) {
        var pc = Theory.nameToPc(name);
        if (pc === null) { fail('rootTiers', 'nota ilegible: ' + name); }
        if (pcs[pc]) { fail('rootTiers', 'nota repetida: ' + name); }
        pcs[pc] = true;
      });
    }

    var seenIds = {}, seenSuffix = {};
    data.types.forEach(function (t) {
      var where = 'types/' + (t.id || '¿sin id?');
      if (!t.id) { fail(where, 'falta id'); }
      if (seenIds[t.id]) { fail(where, 'id repetido'); }
      seenIds[t.id] = true;
      if (t.suffix === undefined || t.label === undefined || t.name === undefined) {
        fail(where, 'faltan suffix, label o name');
      }
      if (seenSuffix[t.suffix]) { fail(where, 'suffix repetido: "' + t.suffix + '"'); }
      seenSuffix[t.suffix] = true;
      if (t.tier !== undefined && [1, 2, 3].indexOf(t.tier) === -1) {
        fail(where, 'tier debe ser 1, 2 o 3');
      }
      if (!Array.isArray(t.intervals) || !t.intervals.length) { fail(where, 'faltan intervals'); }
      if (t.intervals[0] !== 0) { fail(where, 'el primer intervalo debe ser 0 (la fundamental)'); }
      if (!Array.isArray(t.degrees) || t.degrees.length !== t.intervals.length) {
        fail(where, 'degrees debe tener el mismo largo que intervals');
      }
      var last = -1;
      t.intervals.forEach(function (i) {
        if (typeof i !== 'number' || i < 0 || i > 23) { fail(where, 'intervalo fuera de rango: ' + i); }
        if (i <= last) { fail(where, 'los intervalos deben ir en orden ascendente'); }
        last = i;
      });

      var g = t.guitar || {};
      (g.open || []).forEach(function (s, i) {
        var w = where + '/open[' + i + ']';
        if (Theory.nameToPc(s.root) === null) { fail(w, 'root ilegible: ' + s.root); }
        checkShape(w, s.frets, s.fingers, false);
      });
      (g.movable || []).forEach(function (m, i) {
        var w = where + '/movable[' + i + ']';
        if (typeof m.rootString !== 'number' || m.rootString < 1 || m.rootString > 6) {
          fail(w, 'rootString debe ser 1-6 (6 = la cuerda gruesa)');
        }
        checkShape(w, m.rel, m.fingers, true);
        if (m.rel[6 - m.rootString] !== 0) {
          fail(w, 'la cuerda de la fundamental (rootString) debe llevar rel 0');
        }
      });
    });
    return data;
  }

  /** Vuelca el archivo sobre Theory y Shapes. */
  function apply(data) {
    var chords = {};
    data.types.forEach(function (t) {
      chords[t.id] = {
        suffix: t.suffix,
        name: t.name,
        steps: t.intervals.slice(),
        degrees: t.degrees.slice()
      };
    });
    Theory.setChordTypes(chords);

    var open = [], movable = [];
    data.types.forEach(function (t) {
      var g = t.guitar || {};
      (g.open || []).forEach(function (s) {
        open.push({
          root: s.root, q: t.id, name: s.name || (s.root + t.suffix),
          frets: s.frets.slice(), fingers: s.fingers.slice()
        });
      });
      (g.movable || []).forEach(function (m) {
        movable.push({
          q: t.id, label: m.label || 'posició',
          rootString: 6 - m.rootString,    /* 6..1 humano -> índice 0..5 */
          rootRel: 0,
          rel: m.rel.slice(), fingers: m.fingers.slice(),
          minBase: m.minBase === undefined ? 1 : m.minBase
        });
      });
    });
    Shapes.setData(open, movable);

    global.ChordData = data;
    return data;
  }

  function load(url) {
    if (typeof global.fetch !== 'function') {
      return Promise.reject(new Error('Este navegador no soporta fetch.'));
    }
    return global.fetch(url, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) { throw new Error('No se pudo leer ' + url + ' (HTTP ' + res.status + ')'); }
        return res.json();
      })
      .then(function (data) { return apply(validate(data)); });
  }

  global.Config = { load: load, validate: validate, apply: apply };
})(window);
