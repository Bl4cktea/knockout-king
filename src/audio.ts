import { settings } from './settings';

// All sounds are synthesised with Web Audio. Everything is a safe no-op until the browser
// allows audio (first user gesture) and in headless tests, where there is no AudioContext.
let AC: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export function ac(): AudioContext | null {
  if (!AC) {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) AC = new Ctor();
    } catch {
      /* audio unavailable */
    }
  }
  if (AC && AC.state === 'suspended') void AC.resume();
  return AC;
}

function tone(
  f: number,
  d: number,
  type?: OscillatorType,
  v?: number,
  slide?: number,
  delay?: number,
): void {
  if (settings.muted || !AC) return;
  const t = AC.currentTime + (delay ?? 0);
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type ?? 'square';
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v ?? 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(AC.destination);
  o.start(t);
  o.stop(t + d + 0.03);
}

function noise(d: number, v?: number, hp?: number, delay?: number): void {
  if (settings.muted || !AC) return;
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = AC.currentTime + (delay ?? 0);
  const s = AC.createBufferSource();
  const f = AC.createBiquadFilter();
  const g = AC.createGain();
  s.buffer = noiseBuf;
  f.type = 'highpass';
  f.frequency.value = hp ?? 500;
  g.gain.setValueAtTime(v ?? 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f);
  f.connect(g);
  g.connect(AC.destination);
  s.start(t);
  s.stop(t + d + 0.03);
}

export const sfx = {
  punch(): void {
    noise(0.09, 0.2, 400);
    tone(150, 0.12, 'sine', 0.2, -90);
  },
  heavy(): void {
    noise(0.22, 0.35, 150);
    tone(100, 0.3, 'sine', 0.35, -60);
    tone(60, 0.35, 'triangle', 0.3, -20);
  },
  block(): void {
    tone(1000, 0.06, 'square', 0.05);
    tone(1500, 0.05, 'square', 0.04, 0, 0.05);
  },
  whiff(): void {
    noise(0.14, 0.07, 1800);
  },
  hurt(): void {
    noise(0.18, 0.3, 200);
    tone(130, 0.3, 'sawtooth', 0.12, -90);
  },
  tele(): void {
    tone(520, 0.07, 'square', 0.035);
    tone(780, 0.07, 'square', 0.035, 0, 0.07);
  },
  star(): void {
    [600, 800, 1000, 1300].forEach((f, i) => tone(f, 0.1, 'square', 0.05, 0, i * 0.06));
  },
  bell(): void {
    tone(1250, 1, 'sine', 0.12);
    tone(1900, 0.8, 'sine', 0.06);
  },
  count(): void {
    tone(320, 0.12, 'square', 0.05);
  },
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.05, 0, i * 0.14));
  },
  lose(): void {
    [330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.06, 0, i * 0.2));
  },
};
