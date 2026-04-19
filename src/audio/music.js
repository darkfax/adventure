/**
 * music.js — Web Audio API chiptune engine
 *
 * No external files. Pure oscillators scheduled ahead of time so the
 * browser never misses a beat despite setTimeout jitter.
 *
 * API:
 *   playTrack(name)  — start (or switch to) a named track, loops forever
 *   stopMusic()      — silence immediately
 */

// ── Note table (Hz) ───────────────────────────────────────────────────────────

const N = {
  D2:73.42,  E2:82.41,  F2:87.31,  G2:98.00,  A2:110.00, Bb2:116.54, B2:123.47,
  C3:130.81, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61, G3:196.00,
  Ab3:207.65,A3:220.00, Bb3:233.08, B3:246.94,
  C4:261.63, Db4:277.18,D4:293.66, Eb4:311.13,E4:329.63, F4:349.23,
  Gb4:369.99,G4:392.00, Ab4:415.30,A4:440.00, Bb4:466.16,B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25,E5:659.25, F5:698.46, G5:784.00,
  Ab5:830.61,A5:880.00, Bb5:932.33,B5:987.77,
  _: 0,
};

// ── Track definitions ─────────────────────────────────────────────────────────
// Each voice: { seq: [[noteKey, beats], …], wave, vol }
// beats are quarter-notes. The scheduler turns them into seconds via bpm.

const TRACKS = {

  // Title screen — A minor, mysterious, medium slow
  title: {
    bpm: 100,
    voices: [
      {
        wave: 'square', vol: 0.10,
        seq: [
          ['A4',2],['C5',1],['B4',1],
          ['A4',2],['G4',2],
          ['E4',1.5],['F4',0.5],['G4',2],
          ['A4',4],
          ['C5',1],['D5',1],['E5',2],
          ['D5',2],['C5',2],
          ['B4',1],['A4',1],['G4',1],['E4',1],
          ['A4',4],
        ],
      },
      {
        wave: 'triangle', vol: 0.07,
        seq: [
          ['A3',4],
          ['A3',2],['C4',2],
          ['G3',2],['E3',2],
          ['A3',4],
          ['F3',4],
          ['C4',2],['E4',2],
          ['D4',2],['E4',2],
          ['A3',4],
        ],
      },
      // Subtle high-hat pulse
      {
        wave: 'square', vol: 0.025,
        seq: [
          ['A5',0.5],['_',0.5],['A5',0.5],['_',0.5],
          ['A5',0.5],['_',0.5],['A5',0.5],['_',0.5],
        ],
      },
    ],
  },

  // Appartamento / Strada — ambient, slow, slightly eerie
  ambient: {
    bpm: 78,
    voices: [
      {
        wave: 'square', vol: 0.09,
        seq: [
          ['A4',2],['_',1],['G4',1],
          ['E4',2],['D4',2],
          ['C4',1.5],['E4',0.5],['G4',2],
          ['A4',4],
          ['E4',1],['G4',1],['A4',2],
          ['C5',2],['B4',2],
          ['A4',1],['G4',1],['E4',2],
          ['A4',4],
        ],
      },
      {
        wave: 'triangle', vol: 0.065,
        seq: [
          ['A3',4],
          ['E3',4],
          ['C3',4],
          ['A3',4],
          ['E3',4],
          ['F3',4],
          ['E3',2],['D3',2],
          ['A3',4],
        ],
      },
    ],
  },

  // Piazza — C major, town square, somewhat upbeat
  town: {
    bpm: 128,
    voices: [
      {
        wave: 'square', vol: 0.10,
        seq: [
          ['E5',1],['G5',1],['A5',2],
          ['G5',1],['E5',1],['D5',2],
          ['C5',1],['E5',1],['G5',2],
          ['E5',2],['D5',1],['C5',1],
          ['A5',1],['G5',0.5],['A5',0.5],['E5',2],
          ['D5',1],['E5',1],['D5',1],['C5',1],
          ['B4',1],['C5',1],['D5',2],
          ['C5',4],
        ],
      },
      {
        wave: 'triangle', vol: 0.07,
        seq: [
          ['C4',2],['G4',2],
          ['F4',4],
          ['C4',4],
          ['G3',4],
          ['A3',4],
          ['F3',4],
          ['G3',4],
          ['C4',4],
        ],
      },
      // Rhythm pulse on beats
      {
        wave: 'square', vol: 0.03,
        seq: [
          ['G5',0.25],['_',0.75],['G5',0.25],['_',0.75],
          ['G5',0.25],['_',0.75],['G5',0.25],['_',0.75],
        ],
      },
    ],
  },

  // Pizzeria — A minor, quirky and slightly off, sawtooth for texture
  pizzeria: {
    bpm: 148,
    voices: [
      {
        wave: 'sawtooth', vol: 0.07,
        seq: [
          ['A4',0.5],['C5',0.5],['E5',0.5],['A5',0.5],['E5',0.5],['C5',0.5],['A4',0.5],['_',0.5],
          ['G4',0.5],['Bb4',0.5],['D5',0.5],['F5',0.5],['D5',0.5],['Bb4',0.5],['G4',0.5],['_',0.5],
          ['F4',0.5],['A4',0.5],['C5',0.5],['E5',0.5],['C5',0.5],['A4',0.5],['F4',0.5],['_',0.5],
          ['E4',0.5],['A4',0.5],['C5',0.5],['E5',0.5],['A4',1],['_',1],
          ['A4',0.5],['B4',0.5],['C5',0.5],['B4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],
          ['F4',1],['C5',1],['A4',2],
          ['G4',0.5],['A4',0.5],['Bb4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],['D4',0.5],
          ['A4',4],
        ],
      },
      {
        wave: 'triangle', vol: 0.08,
        seq: [
          ['A3',2],['E4',2],
          ['G3',2],['D4',2],
          ['F3',2],['C4',2],
          ['E3',2],['A3',2],
          ['A3',2],['E4',2],
          ['F3',2],['C4',2],
          ['G3',2],['D4',2],
          ['A3',4],
        ],
      },
    ],
  },

  // Retrobottega / Tetto — D minor, tense fast arpeggios
  danger: {
    bpm: 168,
    voices: [
      {
        wave: 'square', vol: 0.09,
        seq: [
          // Dm arpeggio up
          ['D4',0.5],['F4',0.5],['A4',0.5],['C5',0.5],['A4',0.5],['F4',0.5],['D4',0.5],['_',0.5],
          // Bbm descent
          ['Bb3',0.5],['D4',0.5],['F4',0.5],['Ab4',0.5],['F4',0.5],['D4',0.5],['Bb3',0.5],['_',0.5],
          // Am arpeggio
          ['A3',0.5],['C4',0.5],['E4',0.5],['G4',0.5],['E4',0.5],['C4',0.5],['A3',0.5],['_',0.5],
          // Resolution attempt, fails
          ['Db4',0.5],['F4',0.5],['Ab4',0.5],['C5',0.5],['D5',0.5],['_',0.5],['D5',0.5],['_',0.5],
          // Tension climb
          ['D4',0.5],['E4',0.5],['F4',0.5],['G4',0.5],['A4',0.5],['Bb4',0.5],['C5',0.5],['D5',0.5],
          // Drop back
          ['C5',0.5],['Bb4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],['D4',0.5],['_',0.5],
          // Stab chords
          ['D4',0.25],['F4',0.25],['A4',0.25],['_',0.25],['D4',0.25],['F4',0.25],['A4',0.25],['_',0.25],
          ['D4',0.25],['F4',0.25],['A4',0.25],['C5',0.25],['_',1],['_',0.5],
        ],
      },
      {
        wave: 'triangle', vol: 0.09,
        seq: [
          ['D3',2],['A3',2],
          ['Bb2',2],['F3',2],
          ['A2',2],['E3',2],
          ['Db3',2],['Ab3',2],
          ['D3',1],['E3',1],['F3',1],['G3',1],
          ['A2',2],['D3',2],
          ['D3',0.5],['_',0.5],['D3',0.5],['_',0.5],['D3',0.5],['_',0.5],['D3',0.5],['_',0.5],
          ['D3',4],
        ],
      },
      // High staccato pulse for urgency
      {
        wave: 'square', vol: 0.03,
        seq: [
          ['D5',0.25],['_',0.25],['D5',0.25],['_',0.25],
          ['D5',0.25],['_',0.25],['D5',0.25],['_',0.25],
        ],
      },
    ],
  },

};

// ── Engine internals ──────────────────────────────────────────────────────────

let _ctx  = null;
let _gain = null;
let _timer  = null;
let _voices = null;

const AHEAD = 0.13;  // schedule this many seconds ahead
const TICK  = 55;    // scheduler poll interval (ms)

function _getCtx() {
  if (_ctx) return _ctx;
  _ctx  = new AudioContext();
  _gain = _ctx.createGain();
  _gain.gain.value = 0.36;
  _gain.connect(_ctx.destination);
  return _ctx;
}

function _playNote(freq, t, dur, wave, vol) {
  if (!freq) return;
  const ctx = _getCtx();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(vol, t + 0.008);
  env.gain.setValueAtTime(vol * 0.75, t + dur * 0.65);
  env.gain.linearRampToValueAtTime(0, t + dur * 0.95);
  osc.connect(env);
  env.connect(_gain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function _tick() {
  if (!_voices) return;
  const ctx = _getCtx();
  const horizon = ctx.currentTime + AHEAD;
  _voices.forEach(v => {
    while (v.t < horizon) {
      const [key, beats] = v.seq[v.i % v.seq.length];
      const dur = beats * v.beat;
      _playNote(N[key], v.t, dur * 0.88, v.wave, v.vol);
      v.t += dur;
      v.i++;
    }
  });
  _timer = setTimeout(_tick, TICK);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function playTrack(name) {
  if (_timer) { clearTimeout(_timer); _timer = null; }

  const track = TRACKS[name];
  if (!track) return;

  const ctx  = _getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const beat = 60 / track.bpm;
  const now  = ctx.currentTime + 0.05;

  _voices = track.voices.map(v => ({
    seq:  v.seq,
    wave: v.wave,
    vol:  v.vol,
    beat,
    t: now,
    i: 0,
  }));

  _tick();
}

export function stopMusic() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  _voices = null;
  // Fade master gain to silence instead of a hard cut
  if (_gain) {
    _gain.gain.setValueAtTime(_gain.gain.value, _getCtx().currentTime);
    _gain.gain.linearRampToValueAtTime(0, _getCtx().currentTime + 0.4);
    setTimeout(() => {
      if (_gain) _gain.gain.value = 0.36;
    }, 500);
  }
}
