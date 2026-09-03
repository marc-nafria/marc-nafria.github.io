/* ============================================================
   tuner.js - microphone tuner (autocorrelation pitch detection)
   plus reference tones. Works for guitar and for piano/chromatic.
   Needs HTTPS (GitHub Pages is HTTPS) and mic permission.
   ============================================================ */
(function (global) {
  'use strict';

  var BUF_SIZE = 2048;
  var DETECT_MS = 80;
  var IN_TUNE_CENTS = 5;

  var stream = null;
  var analyser = null;
  var source = null;
  var buffer = null;
  var rafId = null;
  var lastDetect = 0;
  var history = [];
  var a4 = 440;
  var mode = 'guitar';

  function h(tag, attrs, kids) { return UI.h(tag, attrs, kids); }

  /* ---- pitch detection ------------------------------------------------ */
  function autoCorrelate(buf, sampleRate) {
    var size = buf.length;
    var rms = 0;
    var i, j;
    for (i = 0; i < size; i++) { rms += buf[i] * buf[i]; }
    rms = Math.sqrt(rms / size);
    if (rms < 0.012) { return { freq: -1, rms: rms }; }

    // Trim quiet edges so the correlation is not dominated by silence.
    var thres = 0.2;
    var start = 0, end = size - 1;
    for (i = 0; i < size / 2; i++) {
      if (Math.abs(buf[i]) < thres) { start = i; break; }
    }
    for (i = 1; i < size / 2; i++) {
      if (Math.abs(buf[size - i]) < thres) { end = size - i; break; }
    }
    var trimmed = buf.slice(start, end);
    var n = trimmed.length;
    if (n < 256) { return { freq: -1, rms: rms }; }

    // Only lags inside the useful musical range (about 55 Hz .. 1200 Hz).
    var minLag = Math.max(2, Math.floor(sampleRate / 1200));
    var maxLag = Math.min(n - 1, Math.floor(sampleRate / 55));

    var c = new Float32Array(maxLag + 1);
    for (i = minLag; i <= maxLag; i++) {
      var sum = 0;
      for (j = 0; j < n - i; j++) { sum += trimmed[j] * trimmed[j + i]; }
      c[i] = sum;
    }

    // Skip the first descending slope, then take the highest peak.
    var d = minLag;
    while (d < maxLag && c[d] > c[d + 1]) { d++; }
    var maxVal = -1, maxPos = -1;
    for (i = d; i <= maxLag; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0) { return { freq: -1, rms: rms }; }

    // Parabolic interpolation around the peak for sub-sample accuracy.
    var t0 = maxPos;
    if (maxPos > minLag && maxPos < maxLag) {
      var x1 = c[maxPos - 1], x2 = c[maxPos], x3 = c[maxPos + 1];
      var a = (x1 + x3 - 2 * x2) / 2;
      var b = (x3 - x1) / 2;
      if (a !== 0) { t0 = maxPos - b / (2 * a); }
    }
    return { freq: sampleRate / t0, rms: rms };
  }

  function median(values) {
    var s = values.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }

  /* ---- view ----------------------------------------------------------- */
  function render(host) {
    host.innerHTML = '';

    var noteEl = h('div', { class: 'tuner-note', html: '--' });
    var freqEl = h('div', { class: 'tuner-freq', text: 'Pulsa "Activar micrófono" y toca una cuerda' });
    var needle = h('i', { class: 'needle', style: 'left:50%' });
    var centsEl = h('div', { class: 'tuner-cents', text: '' });
    var levelEl = h('i', {});

    var gauge = h('div', { class: 'tuner-gauge' }, [
      h('div', { class: 'track' }),
      h('div', { class: 'center' }),
      needle
    ]);

    var card = h('div', { class: 'card' }, [
      h('div', { class: 'tuner-display' }, [noteEl, freqEl]),
      gauge,
      centsEl,
      h('div', { class: 'tuner-meter' }, [levelEl])
    ]);
    host.appendChild(card);

    var statusEl = h('p', {
      class: 'note', style: 'margin-top:0',
      html: 'El audio no sale de tu dispositivo: el análisis ocurre entero en el navegador.'
    });

    var micBtn = h('button', { class: 'btn primary', type: 'button', text: 'Activar micrófono' });
    var modeSeg = h('div', { class: 'seg', style: 'margin-bottom:12px' });
    [['guitar', 'Guitarra'], ['chromatic', 'Cromático / piano']].forEach(function (m) {
      modeSeg.appendChild(h('button', {
        type: 'button', text: m[1], class: 'is-red',
        'aria-selected': mode === m[0] ? 'true' : 'false',
        onclick: function () {
          mode = m[0];
          render(host);
        }
      }));
    });

    var strings = h('div', { class: 'tuner-strings' });
    var stringCells = [];
    Theory.GUITAR_STANDARD.slice().reverse().forEach(function (st) {
      var cell = h('div', { class: 'tstring', role: 'button', tabindex: '0' }, [
        h('b', { text: st.label.replace(/^\d+ª\s*/, '') }),
        h('span', { text: Theory.midiToFreq(st.midi, a4).toFixed(1) + ' Hz' })
      ]);
      cell.addEventListener('click', function () {
        Sound.ready();
        Sound.tone(Theory.midiToFreq(st.midi, a4), 2.4);
        UI.toast('Referencia: ' + Theory.midiToName(st.midi));
      });
      cell.midi = st.midi;
      stringCells.push(cell);
      strings.appendChild(cell);
    });

    var a4Input = h('input', {
      type: 'range', min: '432', max: '446', step: '1', value: String(a4)
    });
    var a4Label = h('div', { class: 'tempo-marks' }, [
      h('span', { text: '432' }),
      h('span', { id: 'a4v', text: 'A4 = ' + a4 + ' Hz' }),
      h('span', { text: '446' })
    ]);
    a4Input.addEventListener('input', function () {
      a4 = parseInt(a4Input.value, 10);
      a4Label.children[1].textContent = 'A4 = ' + a4 + ' Hz';
      stringCells.forEach(function (c) {
        c.children[1].textContent = Theory.midiToFreq(c.midi, a4).toFixed(1) + ' Hz';
      });
    });

    host.appendChild(h('div', { class: 'card' }, [
      modeSeg,
      h('div', { class: 'btn-row' }, [micBtn]),
      statusEl,
      mode === 'guitar' ? h('div', {}, [
        h('div', { class: 'field', style: 'margin:14px 0 0' }, [
          h('label', { text: 'Tonos de referencia (afinación estándar)' }), strings
        ])
      ]) : h('p', {
        class: 'note',
        html: 'Modo cromático: detecta cualquier nota entre <span class="mono">A1</span> y <span class="mono">C7</span>. Útil para el piano, el ukelele o cualquier instrumento.'
      }),
      h('div', { class: 'field', style: 'margin:16px 0 0' }, [
        h('label', { text: 'Calibración' }), a4Input, a4Label
      ])
    ]));

    function setStatus(msg, isError) {
      statusEl.innerHTML = msg;
      statusEl.style.color = isError ? '#FF6B6B' : '';
    }

    function paintReading(freq) {
      if (freq <= 0) {
        noteEl.innerHTML = '--';
        centsEl.textContent = '';
        needle.style.left = '50%';
        needle.classList.remove('in-tune');
        return;
      }
      var midiFloat = Theory.freqToMidi(freq, a4);
      var midi = Math.round(midiFloat);
      var cents = Math.round((midiFloat - midi) * 100);
      var name = Theory.pcName(midi, { flats: false });
      var octave = Math.floor(midi / 12) - 1;

      noteEl.innerHTML = name + '<small>' + octave + '</small>';
      freqEl.textContent = freq.toFixed(1) + ' Hz  ·  objetivo ' + Theory.midiToFreq(midi, a4).toFixed(1) + ' Hz';
      centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' cents  ' +
        (Math.abs(cents) <= IN_TUNE_CENTS ? '· afinado' : cents < 0 ? '· tensa un poco' : '· destensa un poco');

      var clamped = Math.max(-50, Math.min(50, cents));
      needle.style.left = (50 + clamped * 0.9) + '%';
      if (Math.abs(cents) <= IN_TUNE_CENTS) { needle.classList.add('in-tune'); }
      else { needle.classList.remove('in-tune'); }

      stringCells.forEach(function (c) {
        if (Theory.mod12(c.midi) === Theory.mod12(midi)) { c.classList.add('active'); }
        else { c.classList.remove('active'); }
      });
    }

    function loop(ts) {
      rafId = global.requestAnimationFrame(loop);
      if (!analyser) { return; }
      if (ts - lastDetect < DETECT_MS) { return; }
      lastDetect = ts;

      analyser.getFloatTimeDomainData(buffer);
      var result = autoCorrelate(buffer, Sound.ctx.sampleRate);
      levelEl.style.width = Math.min(100, result.rms * 700) + '%';

      if (result.freq > 0) {
        history.push(result.freq);
        if (history.length > 5) { history.shift(); }
        paintReading(median(history));
      } else {
        history = [];
        paintReading(-1);
      }
    }

    function stop() {
      if (rafId) { global.cancelAnimationFrame(rafId); rafId = null; }
      if (source) { try { source.disconnect(); } catch (e) { /* noop */ } source = null; }
      if (stream) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
      }
      analyser = null;
      history = [];
      micBtn.textContent = 'Activar micrófono';
      micBtn.classList.add('primary');
      paintReading(-1);
      levelEl.style.width = '0%';
    }

    function start() {
      var ctx = Sound.ready();
      if (!ctx) {
        setStatus('Tu navegador no soporta Web Audio.', true);
        return;
      }
      if (!global.navigator.mediaDevices || !global.navigator.mediaDevices.getUserMedia) {
        setStatus('Este navegador no da acceso al micrófono. Prueba Chrome, Safari o Firefox actualizados, y recuerda que hace falta <strong>HTTPS</strong>.', true);
        return;
      }
      micBtn.textContent = 'Pidiendo permiso…';
      global.navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, autoGainControl: false,
          noiseSuppression: false, channelCount: 1
        }
      }).then(function (s) {
        stream = s;
        source = ctx.createMediaStreamSource(s);
        analyser = ctx.createAnalyser();
        analyser.fftSize = BUF_SIZE;
        buffer = new Float32Array(analyser.fftSize);
        source.connect(analyser);          // analyser only: no feedback to speakers
        micBtn.textContent = 'Detener micrófono';
        micBtn.classList.remove('primary');
        setStatus('Escuchando. Toca una nota clara y deja que suene.');
        lastDetect = 0;
        rafId = global.requestAnimationFrame(loop);
      }).catch(function (err) {
        micBtn.textContent = 'Activar micrófono';
        setStatus('No se pudo acceder al micrófono (' + (err && err.name ? err.name : 'error') +
          '). Revisa los permisos del navegador.', true);
      });
    }

    micBtn.addEventListener('click', function () {
      if (stream) { stop(); } else { start(); }
    });

    UI.onLeave(stop);
  }

  global.Tuner = { render: render };
})(window);
