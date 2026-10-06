import '@fontsource/press-start-2p/latin-400.css';
import './style.css';
import { FONT, H, STEP, W } from './config';
import { initInput, setPaused } from './input';
import { render } from './render';
import { buildBackground } from './render/background';
import { loadSettings } from './settings';
import { press } from './sim/combat';
import { step } from './sim/step';
import { G, O, P, looks } from './sim/state';
import { initUI } from './ui';

loadSettings();

const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is not available');

const sync = initUI();
initInput(cv, document.getElementById('pad') as HTMLElement);

try {
  void document.fonts.load('10px ' + FONT);
} catch {
  /* the fallback font is used until the pixel font is ready */
}

// Keep the backing store matched to the on-screen size and device pixel ratio.
let scale = 1;
let bg: HTMLCanvasElement | null = null;
let needFit = true;
function fit(): void {
  needFit = false;
  // Sharp on high-DPI screens, but capped so fill cost stays reasonable on phones.
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const px = Math.max(1, Math.min(1280, Math.round(cv.getBoundingClientRect().width * dpr)));
  if (px === cv.width && bg) return;
  cv.width = px;
  cv.height = Math.round((px * H) / W);
  scale = px / W;
  bg = buildBackground(scale);
}
new ResizeObserver(() => (needFit = true)).observe(cv);
addEventListener('resize', () => (needFit = true));

// Fixed-timestep simulation: identical behaviour on 60, 120 or 144 Hz screens.
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!G.paused) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 30) {
      step(STEP);
      acc -= STEP;
      n++;
    }
    if (n === 30) acc = 0;
  }
  if (needFit) fit();
  if (bg) render(ctx as CanvasRenderingContext2D, bg, scale);
  sync();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for poking at the game from the dev console; stripped from production builds.
if (import.meta.env.DEV) {
  Object.assign(window, { __kk: { G, P, O, looks, press, setPaused, step } });
}
