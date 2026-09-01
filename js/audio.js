/* ============================================================
   audio.js - tiny Web Audio synth (piano-ish and guitar-ish),
   metronome clicks and reference tones. No samples, no network.
   The AudioContext is created on the first user gesture (iOS).
   ============================================================ */
(function (global) {
  'use strict';

  var Ctor = global.AudioContext || global.webkitAudioContext;
  var ctx = null;
  var master = null;
  var comp = null;
  var currentInstrument = 'piano';
  var sequenceTimers = [];

  function available() { return !!Ctor; }

  /** Create/resume the context. Must be called from a user gesture. */
  function ready() {
    if (!Ctor) { return null; }
    if (!ctx) {
      ctx = new Ctor();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      // Silent blip: some mobile browsers need real output to unlock.
      var b = ctx.createBufferSource();
      b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      b.connect(ctx.destination);
      b.start(0);
    }
    if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    return ctx;
  }

  function setInstrument(name) {
    currentInstrument = name === 'guitar' ? 'guitar' : 'piano';
  }

  function getInstrument() { return currentInstrument; }

  function osc(type, freq, detune) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (detune) { o.detune.value = detune; }
    return o;
  }

  function pianoVoice(freq, when, dur, level) {
    var out = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, when);
    lp.frequency.exponentialRampToValueAtTime(1400, when + dur * 0.9);

    var partials = [
      { type: 'triangle', mul: 1, gain: 1.0, det: 0 },
      { type: 'sine', mul: 2, gain: 0.32, det: 4 },
      { type: 'sine', mul: 3, gain: 0.12, det: -5 }
    ];
    partials.forEach(function (p) {
      var o = osc(p.type, freq * p.mul, p.det);
      var g = ctx.createGain();
      g.gain.value = p.gain;
      o.connect(g);
      g.connect(lp);
      o.start(when);
      o.stop(when + dur + 0.1);
    });

    var a = out.gain;
    a.setValueAtTime(0.0001, when);
    a.linearRampToValueAtTime(level, when + 0.006);
    a.exponentialRampToValueAtTime(level * 0.34, when + 0.14);
    a.exponentialRampToValueAtTime(0.0001, when + dur);
    lp.connect(out);
    out.connect(master);
  }

  function guitarVoice(freq, when, dur, level) {
    var out = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, when);
    lp.frequency.exponentialRampToValueAtTime(700, when + dur * 0.8);
    lp.Q.value = 0.8;

    var o1 = osc('sawtooth', freq, 0);
    var g1 = ctx.createGain();
    g1.gain.value = 0.45;
    o1.connect(g1); g1.connect(lp);

    var o2 = osc('triangle', freq, 6);
    var g2 = ctx.createGain();
    g2.gain.value = 0.55;
    o2.connect(g2); g2.connect(lp);

    [o1, o2].forEach(function (o) { o.start(when); o.stop(when + dur + 0.1); });

    var a = out.gain;
    a.setValueAtTime(0.0001, when);
    a.linearRampToValueAtTime(level, when + 0.004);
    a.exponentialRampToValueAtTime(level * 0.28, when + 0.18);
    a.exponentialRampToValueAtTime(0.0001, when + dur);
    lp.connect(out);
    out.connect(master);
  }

  /** Play a single MIDI note. opts: {dur, when, timbre, gain} */
  function note(midi, opts) {
    if (!ready()) { return; }
    var o = opts || {};
    var timbre = o.timbre || currentInstrument;
    var dur = o.dur || (timbre === 'guitar' ? 1.5 : 1.7);
    var when = o.when || ctx.currentTime + 0.01;
    var freq = global.Theory.midiToFreq(midi);
    // Keep high notes from dominating the mix.
    var level = (o.gain || 0.3) * (midi > 76 ? 0.75 : 1);
    if (timbre === 'guitar') { guitarVoice(freq, when, dur, level); }
    else { pianoVoice(freq, when, dur, level); }
  }

  /** Play notes together. opts: {strum, dur, timbre, gain} */
  function chord(midis, opts) {
    if (!ready()) { return; }
    var o = opts || {};
    var timbre = o.timbre || currentInstrument;
    var strum = o.strum === undefined ? (timbre === 'guitar' ? 0.035 : 0) : o.strum;
    var base = ctx.currentTime + 0.02;
    var gain = o.gain || (0.26 - Math.min(0.08, midis.length * 0.012));
    midis.forEach(function (m, i) {
      note(m, { when: base + i * strum, dur: o.dur, timbre: timbre, gain: gain });
    });
  }

  /** Play a melodic sequence of MIDI notes. Returns a stop function. */
  function sequence(midis, opts) {
    if (!ready()) { return function () {}; }
    var o = opts || {};
    var gap = o.interval || 0.34;
    var base = ctx.currentTime + 0.05;
    stopSequence();
    midis.forEach(function (m, i) {
      note(m, { when: base + i * gap, dur: o.dur || gap * 2.2, timbre: o.timbre, gain: o.gain || 0.3 });
      if (typeof o.onNote === 'function') {
        sequenceTimers.push(global.setTimeout(function () { o.onNote(m, i); }, i * gap * 1000));
      }
    });
    if (typeof o.onEnd === 'function') {
      sequenceTimers.push(global.setTimeout(o.onEnd, midis.length * gap * 1000));
    }
    return stopSequence;
  }

  function stopSequence() {
    sequenceTimers.forEach(global.clearTimeout);
    sequenceTimers = [];
  }

  /**
   * Metronome click. `kind` is 'accent' (beat 1), 'beat' or 'sub'.
   * Short, dry, and cheap enough to schedule ahead.
   */
  var CLICK = {
    accent: { freq: 1800, band: 2400, level: 0.5 },
    beat:   { freq: 1100, band: 1400, level: 0.3 },
    sub:    { freq: 900,  band: 1200, level: 0.13 }
  };

  function click(when, kind) {
    if (!ctx) { return; }
    var spec = CLICK[kind] || (kind === true ? CLICK.accent : CLICK.beat);
    var t = when === undefined ? ctx.currentTime : when;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = spec.band;
    bp.Q.value = 1.4;
    o.type = 'square';
    o.frequency.value = spec.freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(spec.level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    o.connect(bp); bp.connect(g); g.connect(master);
    o.start(t);
    o.stop(t + 0.08);
  }

  /** Steady reference tone for the tuner (returns a stop function). */
  function tone(freq, dur) {
    if (!ready()) { return function () {}; }
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    var t = ctx.currentTime;
    var end = t + (dur || 2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
    g.gain.setValueAtTime(0.22, end - 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(g); g.connect(master);
    o.start(t);
    o.stop(end + 0.02);
    return function () {
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        o.stop(ctx.currentTime + 0.07);
      } catch (e) { /* already stopped */ }
    };
  }

  global.Sound = {
    available: available,
    ready: ready,
    setInstrument: setInstrument,
    getInstrument: getInstrument,
    note: note,
    chord: chord,
    sequence: sequence,
    stopSequence: stopSequence,
    click: click,
    tone: tone,
    get ctx() { return ctx; }
  };
})(window);
