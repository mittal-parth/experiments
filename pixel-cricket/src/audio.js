/** Tiny synthesized stumps, willow, and a crowd. No samples. */

let ctx = null;
let master = null;
let muted = false;

function ac() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.35;
}

export function unlockAudio() {
  ac();
}

function envGain(at, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.connect(master);
  const t = ctx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

function tone(freq, dur, type, peak, delay = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + delay);
  const g = envGain(delay, 0.01, dur * 0.4, dur * 0.6, peak);
  o.connect(g);
  o.start(a.currentTime + delay);
  o.stop(a.currentTime + delay + dur + 0.05);
}

function noise(dur, peak, freq, delay = 0) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.7;
  const g = envGain(delay, 0.005, dur * 0.25, dur * 0.7, peak);
  src.connect(filter);
  filter.connect(g);
  src.start(a.currentTime + delay);
}

export function sfx(name) {
  switch (name) {
    case "blip":
      tone(740, 0.07, "square", 0.08);
      break;
    case "bowl":
      noise(0.12, 0.12, 900);
      tone(220, 0.09, "sine", 0.06);
      break;
    case "hit":
      noise(0.09, 0.22, 1400);
      tone(180, 0.08, "triangle", 0.1);
      break;
    case "sweet":
      noise(0.08, 0.2, 1800);
      tone(520, 0.12, "square", 0.05);
      tone(780, 0.14, "square", 0.04, 0.05);
      break;
    case "miss":
      noise(0.06, 0.05, 600);
      break;
    case "stump":
      noise(0.14, 0.28, 400);
      tone(140, 0.16, "square", 0.08);
      tone(90, 0.2, "sine", 0.1, 0.04);
      break;
    case "four":
      noise(0.3, 0.08, 800);
      tone(523, 0.12, "square", 0.06);
      tone(659, 0.16, "square", 0.05, 0.08);
      break;
    case "six":
      noise(0.5, 0.16, 700);
      tone(392, 0.16, "square", 0.07);
      tone(523, 0.18, "square", 0.07, 0.1);
      tone(784, 0.28, "square", 0.06, 0.18);
      break;
    case "out":
      tone(196, 0.2, "sawtooth", 0.06);
      tone(155, 0.28, "square", 0.05, 0.08);
      noise(0.2, 0.1, 300);
      break;
    case "wide":
      tone(330, 0.1, "square", 0.05);
      tone(247, 0.14, "square", 0.04, 0.08);
      break;
    case "bounce":
      noise(0.05, 0.06, 500);
      break;
    case "cheer":
      noise(0.45, 0.1, 900);
      break;
    default: {
      const never = name;
      throw new Error(`Unknown sfx ${never}`);
    }
  }
}
