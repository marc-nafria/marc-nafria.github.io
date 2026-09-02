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
    if (prEl) { closePractice(); return; }
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
      if (stream) { Sound.session('playback'); }
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
      Sound.session('play-and-record');   /* iOS: obrir el microfon sense emmudir */
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
    var coach = null;
    try {
      if (!global.localStorage.getItem('ac.mncoach')) {
        coach = h('div', { class: 'coach', 'aria-hidden': 'true',
          text: 'pica al ritme per marcar el tempo' });
      }
    } catch (e) { /* mode privat */ }

    var el = h('div', { class: 'tool-inner', 'data-tool': 'metronome' }, [
      bpmEl, beatsEl, meterBtn, coach
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
      if (coach) {
        /* apres: el retol se'n va i no torna */
        if (coach.parentNode) { coach.parentNode.removeChild(coach); }
        coach = null;
        try { global.localStorage.setItem('ac.mncoach', '1'); } catch (e) { /* res */ }
      }
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
     RECONEIXER ACORDS: donades unes notes, el simbol. Es prova cada
     nota com a fonamental (primer el baix) contra el diccionari de
     Theory; si el baix no es la fonamental, s'escriu C/E.
     ================================================================ */
  function nameChord(midis) {
    if (!midis || midis.length < 3) { return ''; }
    var pcs = [];
    midis.forEach(function (m) {
      var pc = Theory.mod12(m);
      if (pcs.indexOf(pc) === -1) { pcs.push(pc); }
    });
    var bass = Theory.mod12(Math.min.apply(null, midis));
    var roots = [bass].concat(pcs.filter(function (x) { return x !== bass; }));
    var ids = Object.keys(Theory.CHORDS);
    for (var r = 0; r < roots.length; r++) {
      for (var i = 0; i < ids.length; i++) {
        var t = Theory.CHORDS[ids[i]];
        var tp = [];
        t.steps.forEach(function (st) {
          var pc = Theory.mod12(roots[r] + st);
          if (tp.indexOf(pc) === -1) { tp.push(pc); }
        });
        if (tp.length !== pcs.length) { continue; }
        var all = tp.every(function (pc) { return pcs.indexOf(pc) !== -1; });
        if (!all) { continue; }
        /* l'ortografia segueix la tonalitat trobada: Eb/Bb, no D#/A# */
        var fl = Theory.keyPrefersFlats ? Theory.keyPrefersFlats(roots[r], ids[i]) : false;
        var name = Theory.pcName(roots[r], { flats: fl }) + (t.suffix || '');
        return roots[r] === bass ? name : name + '/' + Theory.pcName(bass, { flats: fl });
      }
    }
    return '';
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

  var fpNameEl = null;

  function fpNamePaint() {
    if (!fpNameEl) { return; }
    var latched = Object.keys(fpVoices)
      .filter(function (m) { return fpVoices[m].latched; })
      .map(Number);
    fpNameEl.textContent = nameChord(latched);
  }

  function fpStopAll() {
    Object.keys(fpVoices).forEach(function (m) {
      fpVoices[m].voice.release();
      fpKeyPaint(fpVoices[m].refs, 'off');
      delete fpVoices[m];
    });
    fpNamePaint();
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
    (refs.key || refs.rect).setAttribute('transform', on ? 'translate(0 2)' : '');
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
          fpNamePaint();
          return;
        }
        var a = fpVoices[midi];
        if (!a) { return; }
        if (gesture.down > SWIPE) { a.latched = true; }   /* queda sonant */
        else { fpDrop(midi, refs); }
        fpNamePaint();
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

    fpNameEl = h('div', { class: 'fp-name', 'aria-live': 'polite' });
    var rotor = h('div', { class: 'fp-rotor' }, [
      h('div', { class: 'fp-bar' }, [
        fpNameEl,
        h('button', {
          class: 'fp-close', type: 'button', text: '\u2190', 'aria-label': 'Tornar',
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

  /* ================================================================
     PRACTICA D'OIDA: una pantalla propia amb tres jocs que es canvien
     lliscant. En entrar a un joc, el titol i la descripcio respiren un
     moment i s'esvaeixen. Sense punts: nomes orella.
     ================================================================ */
  var prEl = null;
  var prGames = [];
  var prActive = -1;
  var prIntroTimer = null;

  var PR_FROM = 48;        /* C3; dues octaves fins C5 */
  var PR_HEAR = 3200;      /* ms que dura l'escolta (i el buidat del cercle) */

  function prCols() {
    var light = false;
    try {
      light = document.documentElement.getAttribute('data-theme') === 'light';
    } catch (e) { /* sense arrel */ }
    return light
      ? { sel: '#CFA24A', ok: '#4F7A3C', bad: '#8A8377' }
      : { sel: '#DCC9A6', ok: '#93B478', bad: '#66605A' };
  }

  function prPaintKey(refs, color) {
    if (!refs) { return; }
    refs.rect.setAttribute('fill', color || refs.baseFill);
    if (refs.black) {
      refs.rect.setAttribute('stroke', color ? '#060605' : refs.baseStroke);
      refs.rect.setAttribute('stroke-width', color ? 2.4 : refs.baseStrokeW);
    }
    (refs.key || refs.rect).setAttribute('transform', color ? 'translate(0 2)' : '');
  }

  /* el teclat de practica: partit en dues octaves en vertical, sencer
     en apaisat. refsAll es reomple a cada pintada. */
  var PR_WHITE = [0, 2, 4, 5, 7, 9, 11];

  function prKb(kbHost, handlers, refsAll, startAt) {
    kbHost.innerHTML = '';
    Object.keys(refsAll).forEach(function (k) { delete refsAll[k]; });
    /* la finestra comenca a la blanca de sota de startAt (o C3) i fa
       quinze blanques; en vertical es parteix per la vuitena */
    var w0 = startAt === undefined ? PR_FROM : startAt;
    while (PR_WHITE.indexOf(Theory.mod12(w0)) === -1) { w0 -= 1; }
    var w7 = w0, n = 1, m = w0;
    while (n < 8) {
      m += 1;
      if (PR_WHITE.indexOf(Theory.mod12(m)) !== -1) { n += 1; w7 = m; }
    }
    var land = !!(global.matchMedia && global.matchMedia('(max-height: 480px)').matches);
    var rows = land ? [[w0, 15]] : [[w0, 8], [w7, 8]];
    rows.forEach(function (r) {
      var svg = Piano.render({
        from: r[0], keys: r[1], fluid: true,
        keyHandlers: handlers, labels: 'none', footLabels: 'octaves'
      });
      Object.keys(svg.keyRefs).forEach(function (m) { refsAll[m] = svg.keyRefs[m]; });
      kbHost.appendChild(svg);
    });
  }

  /* --- els botons, senzills: glifs i prou --- */
  function prGlyph(txt, label, onclick) {
    return h('button', {
      class: 'pr-btn', type: 'button', text: txt, 'aria-label': label, onclick: onclick
    });
  }

  /* l'orella: un cercle que es va buidant de beix mentre sona; cada toc
     el reomple, aixi que si el vas tocant no calla mai */
  function prEarBtn(label, onTap) {
    var fill = h('i', { class: 'pr-ear-fill' });
    var note = h('span', { class: 'pr-ear-note', text: '♪' });
    var btn = h('button', {
      class: 'pr-btn pr-ear', type: 'button', 'aria-label': label, onclick: onTap
    }, [fill, note]);
    btn._fill = fill;
    return btn;
  }

  function prDrain(btn, ms) {
    var f = btn && btn._fill;
    if (!f) { return; }
    f.style.transition = 'none';
    f.style.height = '100%';
    void (btn.offsetWidth);   /* reflow: que el 100% quedi pintat */
    f.style.transition = 'height ' + ms + 'ms linear';
    f.style.height = '0%';
  }

  var IVALS = ['un\u00edson', '2a menor', '2a major', '3a menor', '3a major',
    '4a justa', '4a augmentada', '5a justa', '6a menor', '6a major',
    '7a menor', '7a major', '8a'];

  function prNoteName(midi) {
    return Theory.pcName(midi) + (Math.floor(midi / 12) - 1);
  }

  /* un cor de veus amb un sol temporitzador: tocar l'orella allarga */
  function mkVoiceBox() {
    var voices = [], timer = null;
    return {
      start: function (midis) {
        this.stop();
        Sound.ready();
        midis.forEach(function (m) { voices.push(Sound.padOn(m)); });
      },
      hold: function (ms, box) {
        if (timer && global.clearTimeout) { global.clearTimeout(timer); }
        timer = global.setTimeout(function () { box.stop(); }, ms);
      },
      sounding: function () { return voices.length > 0; },
      stop: function () {
        voices.forEach(function (v) { v.release(); });
        voices = [];
      }
    };
  }

  /* ---------------- joc 1: construeix l'acord ---------------- */
  function gameBuild() {
    var round = null, refsAll = {}, lastPick = '';
    var box = mkVoiceBox();
    var api = {
      title: 'Construeix l\u2019acord',
      desc: 'Sona un acord, de vegades invertit. La fonamental ja la tens marcada: troba la resta.'
    };

    var nameEl = h('div', { class: 'pr-name' });
    var hintEl = h('div', { class: 'tool-hint' });
    var kbHost = h('div', { class: 'pr-kb' });

    function pool() {
      var types = (global.ChordData && global.ChordData.types) || [];
      var out = types.filter(function (t) { return (t.tier || 3) <= 2; })
        .map(function (t) { return t.id; })
        .filter(function (id) { return Theory.CHORDS[id]; });
      return out.length ? out : Object.keys(Theory.CHORDS);
    }

    /* inv = quantes notes de baix pugen una octava (0 = fonamental) */
    function voicing(rootPc, typeId, inv) {
      var steps = Theory.CHORDS[typeId].steps;
      return steps.map(function (st, i) {
        return PR_FROM + rootPc + st + (i < (inv || 0) ? 12 : 0);
      }).sort(function (a, b) { return a - b; });
    }

    function chordMidis() { return round.midis; }

    function hear() {
      if (!round) { return; }
      if (!box.sounding()) { box.start(chordMidis()); }
      box.hold(PR_HEAR, box);
      prDrain(earBtn, PR_HEAR);
    }

    function mySelection() {
      var sel = Object.keys(round ? round.found : {}).map(Number);
      if (!sel.length) { return; }
      Sound.ready();
      var vs = sel.map(function (m) { return Sound.padOn(m); });
      global.setTimeout(function () { vs.forEach(function (v) { v.release(); }); }, 1200);
    }

    function repaint() {
      var c = prCols();
      Object.keys(refsAll).forEach(function (m) {
        var on = round && round.found[m];
        prPaintKey(refsAll[m], on ? (round.done ? c.ok : c.sel) : null);
      });
    }

    function setRound(rootPc, typeId, inv) {
      inv = inv || 0;
      var rootMidi = PR_FROM + rootPc + (inv > 0 ? 12 : 0);
      round = {
        rootPc: rootPc, typeId: typeId, inv: inv,
        midis: voicing(rootPc, typeId, inv),
        rootMidi: rootMidi,
        found: {}, done: false
      };
      /* la fonamental sempre ve donada: marcada des del principi */
      round.found[rootMidi] = true;
      nameEl.textContent = '';
      nameEl.classList.remove('ok');
      hintEl.textContent = '';
      nextBtn.classList.remove('on');
      /* el teclat s'ancora a l'acord: sempre hi cap (i de pas, pista) */
      api.paintKb();
    }

    function finish(earned) {
      round.done = true;
      var t = Theory.CHORDS[round.typeId];
      var fl = Theory.keyPrefersFlats
        ? Theory.keyPrefersFlats(round.rootPc, round.typeId) : false;
      var name = Theory.pcName(round.rootPc, { flats: fl }) + (t.suffix || '');
      if (round.inv > 0) {
        name += '/' + Theory.pcName(Theory.mod12(round.midis[0]), { flats: fl });
      }
      api._lastSolved = name;
      nameEl.textContent = name;
      if (earned) { nameEl.classList.add('ok'); }
      hintEl.textContent = (t.name || '').toLowerCase();
      repaint();
      /* res no passa sol: pots tornar a escoltar-lo; la fletxa, encesa,
         espera que siguis tu qui digui prou */
      nextBtn.classList.add('on');
    }

    function reveal() {
      if (!round || round.done) { return; }
      /* la resposta: es completa la seleccio i es diu l'acord */
      round.midis.forEach(function (m) { round.found[m] = true; });
      finish(false);
    }

    function next() {
      var ids = pool(), id, root, key;
      do {
        id = ids[Math.floor(Math.random() * ids.length)];
        root = Math.floor(Math.random() * 12);
        key = id + ':' + root;
      } while (key === lastPick && ids.length > 1);
      lastPick = key;
      box.stop();
      var inv = Math.floor(Math.random() * Theory.CHORDS[id].steps.length);
      setRound(root, id, inv);
      hear();
    }

    function onKey(midi, refs) {
      if (!round) { return; }
      var v = Sound.padOn(midi);
      global.setTimeout(function () { v.release(); }, 700);
      if (round.done) { return; }
      var c = prCols();
      /* nomes val la tecla que sona de debo: una octavada no compta */
      if (round.midis.indexOf(midi) !== -1) {
        round.found[midi] = true;
        prPaintKey(refs, c.sel);
        var got = Object.keys(round.found).length;
        if (got === round.midis.length) { finish(true); }
        else { hintEl.textContent = got + ' / ' + round.midis.length + ' notes'; }
      } else {
        prPaintKey(refs, c.bad);
        global.setTimeout(function () {
          if (round && !round.found[midi]) { prPaintKey(refs, null); }
        }, 260);
      }
    }

    var handlers = { press: onKey, release: function () {}, move: null };
    var earBtn = prEarBtn('Torna-la a sentir', hear);
    var nextBtn = prGlyph('\u2192', 'Un acord nou', next);
    var selBtn = h('button', {
      class: 'pr-btn pr-sel', type: 'button',
      'aria-label': 'Escoltar la meva selecci\u00f3', onclick: mySelection
    }, [h('i'), h('i'), h('i')]);

    api.el = h('div', { class: 'pr-panel', 'data-game': 'build' }, [
      nameEl, hintEl, kbHost,
      h('div', { class: 'pr-row' }, [
        earBtn, selBtn,
        prGlyph('?', 'La resposta', reveal),
        nextBtn
      ])
    ]);
    api.paintKb = function () {
      var anchor = round ? Math.min.apply(null, round.midis) - 3 : undefined;
      prKb(kbHost, handlers, refsAll, anchor);
      repaint();
    };
    api.enter = function () { if (!round) { next(); } else { hear(); } };
    api.leave = function () { box.stop(); };
    api.debug = {
      force: function (rootPc, typeId, inv) { setRound(rootPc, typeId, inv); },
      tap: function (m) { onKey(m, refsAll[m]); },
      refs: function (m) { return refsAll[m]; },
      reveal: reveal,
      state: function () {
        return round ? {
          found: Object.keys(round.found).length,
          total: round.midis.length, done: round.done,
          rootMidi: round.rootMidi, midis: round.midis.slice(),
          lastSolved: api._lastSolved || ''
        } : null;
      }
    };
    api.el._debug = api.debug;
    return api;
  }

  /* ---------------- jocs 2 i 3: sobre una referencia ---------------- */
  function gameRef(mode) {
    /* mode 'find': sona una nota misteriosa i l'has de trobar.
       mode 'paint': et diuen el grau i l'has de pintar (canta'l abans). */
    var round = null, refsAll = {};
    var box = mkVoiceBox();
    var api = mode === 'find'
      ? { title: 'Quina nota sona?', desc: 'Primer la refer\u00e8ncia, despr\u00e9s la nota misteriosa: troba-la.' }
      : { title: 'Pinta el grau', desc: 'Des de la refer\u00e8ncia, pinta el grau demanat. Prova de cantar-lo abans.' };

    var nameEl = h('div', { class: 'pr-name' });
    var hintEl = h('div', { class: 'tool-hint' });
    var kbHost = h('div', { class: 'pr-kb' });

    function repaint() {
      var c = prCols();
      Object.keys(refsAll).forEach(function (m) {
        var midi = Number(m);
        var color = null;
        if (round && midi === round.ref) { color = c.sel; }
        if (round && round.done && midi === round.target) { color = c.ok; }
        prPaintKey(refsAll[m], color);
      });
    }

    function hear() {
      if (!round) { return; }
      Sound.ready();
      box.start([round.ref]);
      if (mode === 'find') {
        /* la referencia un moment, i despres la misteriosa */
        global.setTimeout(function () {
          box.stop();
          box.start([round.target]);
          box.hold(1600, box);
        }, 900);
        prDrain(earBtn, 2500);
      } else {
        box.hold(1400, box);
        prDrain(earBtn, 1400);
      }
    }

    function setRound(ref, iv) {
      round = { ref: ref, iv: iv, target: ref + iv, done: false };
      nameEl.classList.remove('ok');
      nextBtn.classList.remove('on');
      if (mode === 'paint') {
        nameEl.textContent = IVALS[iv];
        hintEl.textContent = 'prova de cantar-la abans de tocar-la';
      } else {
        nameEl.textContent = '';
        hintEl.textContent = 'la refer\u00e8ncia \u00e9s ' + prNoteName(ref);
      }
      repaint();
    }

    function finish(earned) {
      round.done = true;
      api._lastSolved = IVALS[round.iv];
      nameEl.textContent = IVALS[round.iv];
      if (earned) { nameEl.classList.add('ok'); }
      hintEl.textContent = 'era ' + prNoteName(round.target)
        + ' \u00b7 des de ' + prNoteName(round.ref);
      repaint();
      nextBtn.classList.add('on');
    }

    function reveal() {
      if (!round || round.done) { return; }
      finish(false);
    }

    function next() {
      box.stop();
      var ref = PR_FROM + Math.floor(Math.random() * 13);       /* C3..C4 */
      var iv = 1 + Math.floor(Math.random() * 12);              /* 2a m .. 8a */
      setRound(ref, iv);
      hear();
    }

    function onKey(midi, refs) {
      if (!round) { return; }
      var v = Sound.padOn(midi);
      global.setTimeout(function () { v.release(); }, 700);
      if (round.done || midi === round.ref) { return; }
      var c = prCols();
      if (midi === round.target) { finish(true); }
      else {
        prPaintKey(refs, c.bad);
        global.setTimeout(function () {
          if (round && midi !== round.ref) { prPaintKey(refs, null); }
        }, 260);
        repaint();
      }
    }

    var handlers = { press: onKey, release: function () {}, move: null };
    var earBtn = prEarBtn('Torna-la a sentir', hear);
    var nextBtn = prGlyph('\u2192', 'Una altra', next);

    api.el = h('div', { class: 'pr-panel', 'data-game': mode }, [
      nameEl, hintEl, kbHost,
      h('div', { class: 'pr-row' }, [
        earBtn,
        prGlyph('?', 'La resposta', reveal),
        nextBtn
      ])
    ]);
    api.paintKb = function () { prKb(kbHost, handlers, refsAll); repaint(); };
    api.enter = function () { if (!round) { next(); } else { hear(); } };
    api.leave = function () { box.stop(); };
    api.debug = {
      force: function (ref, iv) { setRound(ref, iv); },
      tap: function (m) { onKey(m, refsAll[m]); },
      refs: function (m) { return refsAll[m]; },
      state: function () {
        return round ? {
          ref: round.ref, target: round.target, done: round.done,
          lastSolved: api._lastSolved || ''
        } : null;
      }
    };
    api.el._debug = api.debug;
    return api;
  }

  /* ---------------- la pantalla de practica ---------------- */
  var prIntroEl = null;

  function prShowIntro(game) {
    if (!prIntroEl) { return; }
    prIntroEl.querySelectorAll ? null : null;
    prIntroEl.children[0].textContent = game.title;
    prIntroEl.children[1].textContent = game.desc;
    prIntroEl.classList.remove('hide');
    if (prIntroTimer && global.clearTimeout) { global.clearTimeout(prIntroTimer); }
    prIntroTimer = global.setTimeout(function () {
      prIntroEl.classList.add('hide');
    }, 2100);
  }

  function prActivate(idx) {
    if (idx === prActive || !prGames[idx]) { return; }
    if (prGames[prActive]) { prGames[prActive].leave(); }
    prActive = idx;
    var g = prGames[idx];
    g.paintKb();
    g.enter();
    prShowIntro(g);
  }

  function closePractice() {
    var node = prEl;
    prEl = null;
    prGames.forEach(function (g) { g.leave(); });
    prGames = [];
    prActive = -1;
    if (prPaintAll) { global.removeEventListener('resize', prPaintAll); prPaintAll = null; }
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

  var prPaintAll = null;

  function openPractice() {
    closePractice();
    prGames = [gameBuild(), gameRef('find'), gameRef('paint')];

    var deck = h('div', { class: 'pr-deck' });
    prGames.forEach(function (g) { deck.appendChild(g.el); });

    /* lliscar a la dreta canvia de joc; el titol respira i marxa */
    var raf = false;
    deck.addEventListener('scroll', function () {
      if (raf) { return; }
      raf = true;
      (global.requestAnimationFrame || global.setTimeout)(function () {
        raf = false;
        if (!deck.clientWidth) { return; }
        var idx = Math.round((deck.scrollLeft || 0) / deck.clientWidth);
        prActivate(Math.max(0, Math.min(prGames.length - 1, idx)));
      });
    });

    prIntroEl = h('div', { class: 'pr-intro' }, [
      h('b', {}), h('span', {})
    ]);

    prEl = h('div', {
      class: 'pr-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Pr\u00e0ctica d\u2019o\u00efda'
    }, [
      deck,
      prIntroEl,
      h('button', {
        class: 'fp-close pr-close', type: 'button', text: '\u2190',
        'aria-label': 'Tornar', onclick: closePractice
      })
    ]);
    document.body.appendChild(prEl);

    prPaintAll = function () {
      if (prGames[prActive]) { prGames[prActive].paintKb(); }
    };
    global.addEventListener('resize', prPaintAll);

    prActivate(0);
  }

  global.Tools = {
    tuner: tuner,
    metronome: metronome,
    openPractice: openPractice,
    closePractice: closePractice,
    openFreePiano: openFreePiano,
    closeOverlay: closeOverlay
  };
})(window);
