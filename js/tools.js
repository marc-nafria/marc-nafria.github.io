/* ============================================================
   tools.js - afinador i tempo com a plans del carrusel.
   L'ordre de la plataforma es: afinador | guitarra | piano | tempo.
   En lliscar cap a un extrem, les capes fixes es dissolen i l'eina
   omple la pantalla.

   · Afinador: microfon + autocorrelacio. S'engega en arribar al pla
     i s'atura en marxar. Si el navegador demana un gest explicit,
     apareix el boto d'activar.
   · Tempo: toca el numero per engegar/aturar, arrossega'l (o roda)
     per canviar. El compas s'obre en una capa de vidre, com els
     selectors d'acords. Segueix sonant encara que tornis a
     l'instrument: per aixo hi es.
   ============================================================ */
(function (global) {
  'use strict';

  var BUF_SIZE = 2048;
  var DETECT_MS = 80;
  var IN_TUNE_CENTS = 5;
  var TICKS = 25;                 /* regla de cents: +-48, un cada 4 */

  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD = 0.12;

  var overlayEl = null;

  /* ---------------- utilitats ---------------- */
  function h(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') { node.textContent = attrs[k]; }
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
        node.addEventListener(k.slice(2), attrs[k]);
      } else if (attrs[k] !== null && attrs[k] !== undefined) {
        node.setAttribute(k, attrs[k]);
      }
    });
    (kids || []).forEach(function (c) { if (c) { node.appendChild(c); } });
    return node;
  }

  function read(key, fallback) {
    try {
      var v = global.localStorage.getItem('ac.' + key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem('ac.' + key, value); } catch (e) { /* mode privat */ }
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------------- capa de vidre (per al selector de compas) ---------------- */
  function openOverlay(content) {
    closeOverlay();
    var panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, content);
    overlayEl = h('div', { class: 'sheet-wrap' }, [
      h('div', { class: 'sheet-backdrop', onclick: closeOverlay }),
      panel
    ]);
    document.body.appendChild(overlayEl);
  }

  function closeOverlay() {
    var node = overlayEl;
    overlayEl = null;
    if (!node) { return; }
    if (reducedMotion()) {
      if (node.parentNode) { node.parentNode.removeChild(node); }
      return;
    }
    node.classList.add('closing');
    global.setTimeout(function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    }, 190);
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') { return; }
    if (fpEl) { closeFreePiano(); return; }
    if (overlayEl) { closeOverlay(); }
  });

  /* ================================================================
     AFINADOR
     ================================================================ */
  function autoCorrelate(buf, sampleRate) {
    var size = buf.length;
    var rms = 0;
    var i, j;
    for (i = 0; i < size; i++) { rms += buf[i] * buf[i]; }
    rms = Math.sqrt(rms / size);
    if (rms < 0.012) { return -1; }

    var thres = 0.2;
    var start = 0, end = size - 1;
    for (i = 0; i < size / 2; i++) { if (Math.abs(buf[i]) < thres) { start = i; break; } }
    for (i = 1; i < size / 2; i++) { if (Math.abs(buf[size - i]) < thres) { end = size - i; break; } }
    var trimmed = buf.slice(start, end);
    var n = trimmed.length;
    if (n < 256) { return -1; }

    var minLag = Math.max(2, Math.floor(sampleRate / 1200));
    var maxLag = Math.min(n - 1, Math.floor(sampleRate / 55));
    var c = new Float32Array(maxLag + 1);
    for (i = minLag; i <= maxLag; i++) {
      var sum = 0;
      for (j = 0; j < n - i; j++) { sum += trimmed[j] * trimmed[j + i]; }
      c[i] = sum;
    }
    var d = minLag;
    while (d < maxLag && c[d] > c[d + 1]) { d++; }
    var maxVal = -1, maxPos = -1;
    for (i = d; i <= maxLag; i++) { if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; } }
    if (maxPos <= 0) { return -1; }
    var t0 = maxPos;
    if (maxPos > minLag && maxPos < maxLag) {
      var x1 = c[maxPos - 1], x2 = c[maxPos], x3 = c[maxPos + 1];
      var a = (x1 + x3 - 2 * x2) / 2;
      var b = (x3 - x1) / 2;
      if (a !== 0) { t0 = maxPos - b / (2 * a); }
    }
    return sampleRate / t0;
  }

  function tuner() {
    var stream = null, analyser = null, source = null, raf = null;
    var buffer = null, lastDetect = 0, history = [];

    var noteEl = h('div', { class: 'tuner-note', text: '—' });
    var ticksEl = h('div', { class: 'ticks', 'aria-hidden': 'true' });
    var ticks = [];
    for (var i = 0; i < TICKS; i++) {
      var t = h('i', { class: i === (TICKS - 1) / 2 ? 'mid' : '' });
      ticks.push(t);
      ticksEl.appendChild(t);
    }
    var centsEl = h('div', { class: 'tuner-cents', text: '' });
    var hintEl = h('div', { class: 'tool-hint', text: '' });
    var micBtn = h('button', {
      class: 'mic-btn', type: 'button', text: 'activar micròfon', hidden: 'hidden',
      onclick: function () { start(); }
    });

    function paint(freq) {
      ticks.forEach(function (t) { t.classList.remove('on'); });
      if (freq <= 0) {
        noteEl.textContent = '—';
        noteEl.classList.remove('good');
        centsEl.textContent = '';
        if (analyser) { hintEl.textContent = ''; }
        return;
      }
      var midiFloat = Theory.freqToMidi(freq);
      var midi = Math.round(midiFloat);
      var cents = Math.round((midiFloat - midi) * 100);
      var octave = Math.floor(midi / 12) - 1;

      noteEl.innerHTML = '';
      noteEl.appendChild(document.createTextNode(Theory.pcName(midi, { flats: false })));
      noteEl.appendChild(h('small', { text: String(octave) }));

      var good = Math.abs(cents) <= IN_TUNE_CENTS;
      noteEl.classList.toggle('good', good);
      var idx = Math.round((TICKS - 1) / 2 + Math.max(-48, Math.min(48, cents)) / 4);
      ticks[idx].classList.add('on');
      centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' cents · ' + freq.toFixed(1) + ' Hz';
      hintEl.textContent = good ? 'afinada' : (cents < 0 ? 'tensa una mica' : 'afluixa una mica');
    }

    function median(v) {
      var s = v.slice().sort(function (a, b) { return a - b; });
      return s[Math.floor(s.length / 2)];
    }

    function loop(ts) {
      raf = global.requestAnimationFrame(loop);
      if (!analyser || ts - lastDetect < DETECT_MS) { return; }
      lastDetect = ts;
      analyser.getFloatTimeDomainData(buffer);
      var freq = autoCorrelate(buffer, Sound.ctx.sampleRate);
      if (freq > 0) {
        history.push(freq);
        if (history.length > 5) { history.shift(); }
        paint(median(history));
      } else {
        history = [];
        paint(-1);
      }
    }

    function stop() {
      if (raf) { global.cancelAnimationFrame(raf); raf = null; }
      if (source) { try { source.disconnect(); } catch (e) { /* res */ } source = null; }
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      analyser = null;
      history = [];
      paint(-1);
    }

    /* iOS no deixa engegar l'audio ni el microfon sense un toc de
       l'usuari: en arribar al pla, es demana el toc; un cop donat el
       permis, les tornades ja engeguen soles. */
    var unlocked = false;

    function arm() {
      if (stream) { return; }
      if (unlocked) { start(); return; }
      hintEl.textContent = 'toca per activar el micròfon';
      micBtn.hidden = false;
    }

    function start() {
      if (stream) { return; }
      var ctx = Sound.ready();
      if (!ctx || !global.navigator.mediaDevices || !global.navigator.mediaDevices.getUserMedia) {
        hintEl.textContent = 'aquest navegador no dona accés al micròfon';
        return;
      }
      hintEl.textContent = 'demanant el micròfon…';
      micBtn.hidden = true;
      global.navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
      }).then(function (s) {
        stream = s;
        source = ctx.createMediaStreamSource(s);
        analyser = ctx.createAnalyser();
        analyser.fftSize = BUF_SIZE;
        buffer = new Float32Array(analyser.fftSize);
        source.connect(analyser);          /* nomes analisi: res no va a l'altaveu */
        unlocked = true;
        micBtn.hidden = true;
        hintEl.textContent = '';
        lastDetect = 0;
        raf = global.requestAnimationFrame(loop);
      }).catch(function () {
        hintEl.textContent = 'sense permís de micròfon';
        micBtn.hidden = false;
      });
    }

    var el = h('div', { class: 'tool-inner', 'data-tool': 'tuner' }, [
      noteEl, ticksEl, centsEl, hintEl, micBtn
    ]);
    /* qualsevol toc del pla val com a gest per obrir el microfon */
    el.addEventListener('pointerdown', function () { start(); });

    return {
      el: el,
      enter: function () { arm(); },
      leave: function () { stop(); }
    };
  }

  /* ================================================================
     TEMPO
     ================================================================ */
  var METERS = [
    { label: '3/4', beats: 3, accents: [0], tier: 1 },
    { label: '4/4', beats: 4, accents: [0], tier: 1 },
    { label: '2/4', beats: 2, accents: [0], tier: 2 },
    { label: '5/4', beats: 5, accents: [0, 3], tier: 2 },
    { label: '6/8', beats: 6, accents: [0, 3], tier: 2 }
  ];

  function meterByLabel(label) {
    for (var i = 0; i < METERS.length; i++) {
      if (METERS[i].label === label) { return METERS[i]; }
    }
    return METERS[1];
  }

  function metronome() {
    var legacy = read('beats', '4') === '3' ? '3/4' : '4/4';
    var meter = meterByLabel(read('meter', legacy));
    var bpm = Math.max(30, Math.min(240, parseInt(read('bpm', '80'), 10) || 80));
    var running = false;
    var timer = null, raf = null, tickIdx = 0, nextT = 0, queue = [];

    var bpmEl = h('button', {
      class: 'mn-bpm', type: 'button',
      'aria-label': 'Tempo: toca per engegar o parar, arrossega per canviar',
      text: String(bpm)
    });
    var beatsEl = h('div', { class: 'mn-beats', 'aria-hidden': 'true' });
    var meterBtn = h('button', {
      class: 'mn-meter', type: 'button', text: meter.label,
      'aria-haspopup': 'dialog', 'aria-label': 'Canviar el compàs',
      onclick: openMeterPicker
    });

    function paintBeats(active) {
      beatsEl.innerHTML = '';
      for (var i = 0; i < meter.beats; i++) {
        beatsEl.appendChild(h('i', {
          class: (meter.accents.indexOf(i) !== -1 ? 'one' : '') + (i === active ? ' on' : '')
        }));
      }
    }

    function setBpm(v) {
      bpm = Math.max(30, Math.min(240, Math.round(v)));
      bpmEl.textContent = String(bpm);
      write('bpm', String(bpm));
    }

    /* planificat sobre el rellotge d'audio: setInterval nomes omple cua */
    function schedule() {
      var ctx = Sound.ctx;
      if (!ctx) { return; }
      while (nextT < ctx.currentTime + SCHEDULE_AHEAD) {
        Sound.click(nextT, meter.accents.indexOf(tickIdx) !== -1 ? 'accent' : 'beat');
        queue.push({ t: nextT, b: tickIdx });
        nextT += 60 / bpm;
        tickIdx = (tickIdx + 1) % meter.beats;
      }
    }

    function animate() {
      raf = global.requestAnimationFrame(animate);
      var ctx = Sound.ctx;
      if (!ctx) { return; }
      while (queue.length && queue[0].t <= ctx.currentTime) {
        var ev = queue.shift();
        paintBeats(ev.b);
      }
    }

    function stop() {
      running = false;
      if (timer) { global.clearInterval(timer); timer = null; }
      if (raf) { global.cancelAnimationFrame(raf); raf = null; }
      queue = [];
      bpmEl.classList.remove('running');
      paintBeats(-1);
    }

    function start() {
      var ctx = Sound.ready();
      if (!ctx) { return; }
      running = true;
      tickIdx = 0;
      nextT = ctx.currentTime + 0.08;
      queue = [];
      timer = global.setInterval(schedule, LOOKAHEAD_MS);
      raf = global.requestAnimationFrame(animate);
      bpmEl.classList.add('running');
    }

    /* Un gest, dos usos: toc curt = engega/atura; arrossegament
       vertical = canvia el tempo (1 bpm cada 5 px). */
    var dragY = null, dragBpm = 0, dragged = false;
    bpmEl.addEventListener('pointerdown', function (ev) {
      dragY = ev.clientY;
      dragBpm = bpm;
      dragged = false;
      if (bpmEl.setPointerCapture && ev.pointerId !== undefined) {
        bpmEl.setPointerCapture(ev.pointerId);
      }
    });
    bpmEl.addEventListener('pointermove', function (ev) {
      if (dragY === null) { return; }
      var dy = dragY - ev.clientY;
      if (Math.abs(dy) > 6) { dragged = true; }
      if (dragged) { setBpm(dragBpm + dy / 5); }
    });
    bpmEl.addEventListener('pointerup', function () {
      if (dragY === null) { return; }
      dragY = null;
      if (!dragged) { running ? stop() : start(); }
    });
    bpmEl.addEventListener('pointercancel', function () { dragY = null; });

    /* el compas es tria com els acords: capa de vidre, populars en gran */
    function openMeterPicker() {
      var idx = 0;
      var kids = [];
      [1, 2].forEach(function (tier) {
        var group = METERS.filter(function (m) { return m.tier === tier; });
        if (!group.length) { return; }
        var grid = h('div', { class: 'opt-grid meters tier' + tier });
        group.forEach(function (m) {
          grid.appendChild(h('button', {
            class: 'opt', type: 'button',
            'aria-pressed': m.label === meter.label ? 'true' : 'false',
            style: '--i:' + (idx++),
            onclick: (function (chosen) {
              return function () {
                meter = chosen;
                write('meter', chosen.label);
                tickIdx = 0;
                meterBtn.textContent = chosen.label;
                paintBeats(-1);
                closeOverlay();
              };
            })(m)
          }, [h('span', { class: 'opt-big', text: m.label })]));
        });
        kids.push(grid);
      });
      openOverlay(kids);
    }

    /* roda a l'escriptori */
    var el = h('div', { class: 'tool-inner', 'data-tool': 'metronome' }, [
      bpmEl, beatsEl, meterBtn
    ]);
    el.addEventListener('wheel', function (ev) {
      if (ev.preventDefault) { ev.preventDefault(); }
      setBpm(bpm - (ev.deltaY > 0 ? 2 : -2));
    });

    /* Tap tempo sense cap peça nova: pica al ritme sobre l'espai buit
       del pla (fora del número i del compàs) i el tempo s'hi posa.
       El número fa un batec a cada toc. */
    var taps = [];
    el.addEventListener('pointerdown', function (ev) {
      if (ev.target && ev.target.closest &&
          ev.target.closest('.mn-bpm, .mn-meter')) { return; }
      var now = global.performance.now();
      taps = taps.filter(function (t) { return now - t < 2500; });
      taps.push(now);
      if (taps.length > 5) { taps.shift(); }

      bpmEl.classList.add('tapped');
      global.setTimeout(function () { bpmEl.classList.remove('tapped'); }, 200);

      if (taps.length >= 2) {
        var gaps = [];
        for (var i = 1; i < taps.length; i++) { gaps.push(taps[i] - taps[i - 1]); }
        var avg = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length;
        if (avg > 0) { setBpm(60000 / avg); }
      }
    });

    paintBeats(-1);

    return {
      el: el,
      enter: function () {},
      /* en marxar NO s'atura: el tempo es per practicar-hi a sobre */
      leave: function () {}
    };
  }

  /* ================================================================
     PIANET LLIURE: el mobil sencer es un piano (girat 90 graus si el
     tens en vertical). Quatre octaves amb scroll lateral; a cada Do,
     el seu indicador d'octava. El cos de la tecla polsa (i mante
     mentre toques); la pastilla de dalt deixa la nota fixada sonant
     amb un coixi suau. Lliscar la tecla cap avall la deixa fixada
     sonant; cap amunt la deixa anar. La creu discreta tanca.
     ================================================================ */
  var fpEl = null;
  var fpPaint = null;
  var fpVoices = {};

  function fpStopAll() {
    Object.keys(fpVoices).forEach(function (m) {
      fpVoices[m].voice.release();
      fpKeyPaint(fpVoices[m].refs, 'off');
      delete fpVoices[m];
    });
  }

  /* estats de tecla: 'off' (repos), 'held' (polsada: blanca i un pel
     enfonsada), 'latched' (fixada sonant: beix). Les negres alcades van
     amb vora negra, que si no es perden. */
  function fpKeyPaint(refs, state) {
    if (!refs) { return; }
    /* sonant (polsada o fixada): blanca i enfonsada */
    var on = state !== 'off';
    refs.rect.setAttribute('fill', on ? '#FFFFFF' : refs.baseFill);
    if (refs.black) {
      refs.rect.setAttribute('stroke', on ? '#060605' : refs.baseStroke);
      refs.rect.setAttribute('stroke-width', on ? 2.4 : refs.baseStrokeW);
    }
    refs.rect.setAttribute('transform', on ? 'translate(0 2)' : '');
  }

  function closeFreePiano() {
    var node = fpEl;
    fpEl = null;
    fpStopAll();
    if (fpPaint) { global.removeEventListener('resize', fpPaint); fpPaint = null; }
    if (!node) { return; }
    if (reducedMotion()) {
      if (node.parentNode) { node.parentNode.removeChild(node); }
      return;
    }
    node.classList.add('closing');
    global.setTimeout(function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    }, 190);
  }

  function openFreePiano() {
    closeFreePiano();
    var FROM = 36;                 /* C2 */
    var KEYS = 29;                 /* quatre octaves, C2..C6 */
    var VIEW_FOOT = 18;
    var MAX_KEY_PX = 62;           /* ample maxim de la blanca */
    var KEY_RATIO = 4.3;           /* llargada de la blanca vs l'ample */

    var SWIPE = 30;   /* px en l'eix de la tecla per fixar o deixar anar */
    var PAN = 12;     /* px en l'eix del teclat per passar a moure'l */
    /* un sol gest a la vegada: mentre mou el teclat no toca cap sustain,
       i el que passa amb la nota es decideix en aixecar el dit */
    var g = null;

    function fpDrop(midi, refs) {
      var a = fpVoices[midi];
      if (!a) { return; }
      a.voice.release();
      delete fpVoices[midi];
      fpKeyPaint(refs, 'off');
    }

    var handlers = {
      press: function (midi, refs) {
        var a = fpVoices[midi];
        g = { midi: midi, wasLatched: !!(a && a.latched), pan: false, down: 0, along: 0,
              startLeft: kbHost.scrollLeft || 0 };
        if (g.wasLatched) { return; }   /* ja sona: no la tornem a atacar */
        if (a) { a.voice.release(); }
        fpKeyPaint(refs, 'held');
        fpVoices[midi] = { voice: Sound.padOn(midi), latched: false, refs: refs };
      },
      move: function (midi, refs, dx, dy) {
        if (!g || g.midi !== midi) { return; }
        /* en vertical el teclat esta girat 90 graus: l'eix del teclat es
           la vertical de pantalla i l'eix de la tecla, l'horitzontal */
        var portrait = (global.innerHeight || 0) > (global.innerWidth || 1);
        g.along = portrait ? dy : dx;
        g.down = portrait ? -dx : dy;

        /* moure el teclat: des de qualsevol punt, tecles incloses. La
           nota que s'acabava d'encetar calla, pero cap fixada es toca. */
        if (!g.pan && Math.abs(g.along) > PAN && Math.abs(g.along) > Math.abs(g.down)) {
          g.pan = true;
          if (!g.wasLatched) { fpDrop(midi, refs); }
        }
        if (g.pan) {
          kbHost.scrollLeft = g.startLeft - g.along;
          fpPosPing();
        }
      },
      release: function (midi, refs) {
        var gesture = g;
        g = null;
        if (!gesture || gesture.pan) { return; }   /* nomes ha mogut el teclat */
        if (gesture.wasLatched) {
          /* una fixada es deixa anar amb un toc o lliscant-la cap amunt */
          if (gesture.down < -SWIPE || Math.abs(gesture.down) < SWIPE) {
            fpDrop(midi, refs);
          }
          return;
        }
        var a = fpVoices[midi];
        if (!a) { return; }
        if (gesture.down > SWIPE) { a.latched = true; }   /* queda sonant */
        else { fpDrop(midi, refs); }
      }
    };

    var kbHost = h('div', { class: 'fp-kb' });

    /* linia de posicio en beix: apareix mentre arrossegues el teclat i
       s'esvaeix sola, perque es vegi on ets de les quatre octaves */
    var posThumb = h('i');
    var pos = h('div', { class: 'fp-pos' }, [posThumb]);
    var posTimer = null;
    function fpPosPing() {
      var sw = kbHost.scrollWidth || 0;
      var vw = kbHost.clientWidth || 0;
      if (sw > vw && vw) {
        posThumb.style.width = (vw / sw * 100) + '%';
        posThumb.style.left = ((kbHost.scrollLeft || 0) / sw * 100) + '%';
      }
      pos.style.opacity = '1';
      if (posTimer && global.clearTimeout) { global.clearTimeout(posTimer); }
      posTimer = global.setTimeout(function () { pos.style.opacity = '0'; }, 700);
    }

    var rotor = h('div', { class: 'fp-rotor' }, [
      h('div', { class: 'fp-bar' }, [
        h('button', {
          class: 'fp-close', type: 'button', text: '\u00D7', 'aria-label': 'Tancar el piano',
          onclick: closeFreePiano
        })
      ]),
      kbHost,
      pos
    ]);

    function paint() {
      var W = global.innerWidth || 800;
      var H = global.innerHeight || 400;
      var portrait = H > W;
      var rw = portrait ? H : W;
      var rh = portrait ? W : H;

      rotor.style.width = rw + 'px';
      rotor.style.height = rh + 'px';
      rotor.style.transform = 'translate(-50%, -50%)' + (portrait ? ' rotate(90deg)' : '');

      /* proporcio bonica: la blanca fa ~4.3 vegades l'ample, i el
         teclat no cal que ompli tot el vertical (queda centrat) */
      var kbAvail = rh - 62;   /* l'alcada de la barra de la creu */
      var kbH = Math.round(34 * KEY_RATIO);
      var viewH = kbH + VIEW_FOOT + 2;
      var scale = Math.min(MAX_KEY_PX / 34, (kbAvail - 16) / viewH);

      var ratio = kbHost.scrollLeft && kbHost.scrollWidth
        ? kbHost.scrollLeft / kbHost.scrollWidth : 0;
      kbHost.innerHTML = '';
      var svg = Piano.render({
        from: FROM, keys: KEYS,
        keyHandlers: handlers,
        keyHeight: kbH, labels: 'none', footLabels: 'octaves'
      });
      svg.style.height = Math.round(viewH * scale) + 'px';
      kbHost.appendChild(svg);

      /* les fixades no es perden en girar: es tornen a pintar */
      Object.keys(fpVoices).forEach(function (m) {
        var refs = svg.keyRefs[m];
        if (refs) {
          fpVoices[m].refs = refs;
          fpKeyPaint(refs, 'latched');
        }
      });

      if (kbHost.scrollWidth) {
        kbHost.scrollLeft = ratio
          ? ratio * kbHost.scrollWidth
          : Math.round(34 * scale * 7) - 24;   /* comenca mirant C3 */
      }
    }

    /* despcalament manual: arrossegar per qualsevol lloc que NO sigui
       una tecla (la franja dels Do, l'aire de sobre o de sota). En
       vertical el rotor esta girat, aixi que l'eix del teclat es la
       vertical de pantalla. */
    kbHost.addEventListener('pointerdown', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('g[data-midi]')) { return; }
      var portrait = (global.innerHeight || 0) > (global.innerWidth || 1);
      var start = portrait ? ev.clientY : ev.clientX;
      var startLeft = kbHost.scrollLeft || 0;
      fpPosPing();
      function move(e) {
        var now = portrait ? e.clientY : e.clientX;
        kbHost.scrollLeft = startLeft - (now - start);
        fpPosPing();
      }
      function up() {
        kbHost.removeEventListener('pointermove', move);
        kbHost.removeEventListener('pointerup', up);
        kbHost.removeEventListener('pointercancel', up);
      }
      kbHost.addEventListener('pointermove', move);
      kbHost.addEventListener('pointerup', up);
      kbHost.addEventListener('pointercancel', up);
      if (kbHost.setPointerCapture && ev.pointerId !== undefined) {
        kbHost.setPointerCapture(ev.pointerId);
      }
    });

    fpEl = h('div', {
      class: 'fp-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Piano lliure'
    }, [rotor]);
    document.body.appendChild(fpEl);
    paint();
    fpPaint = paint;
    global.addEventListener('resize', fpPaint);
    Sound.ready();
  }

  global.Tools = {
    tuner: tuner,
    metronome: metronome,
    openFreePiano: openFreePiano,
    closeOverlay: closeOverlay
  };
})(window);
