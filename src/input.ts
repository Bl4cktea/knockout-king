import { ac } from './audio';
import { HoldTracker } from './input-tracker';
import { press } from './sim/combat';
import { G, held } from './sim/state';
import type { Action } from './sim/state';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'dl',
  a: 'dl',
  ArrowRight: 'dr',
  d: 'dr',
  ArrowDown: 'blk',
  s: 'blk',
  z: 'pl',
  j: 'pl',
  x: 'pr',
  k: 'pr',
  ' ': 'star',
  ArrowUp: 'star',
  w: 'star',
  Enter: 'start',
};

const tracker = new HoldTracker();
const syncHeld = (): void => {
  held.blk = tracker.isHeld('blk');
};

const canPause = (): boolean => G.scene === 'intro' || G.scene === 'fight';

/** Pause or resume. Releases every held input so nothing is stuck when play resumes. */
export function setPaused(p: boolean): void {
  if (p && !canPause()) return;
  if (G.paused === p) return;
  G.paused = p;
  tracker.clear();
  syncHeld();
}
export const togglePause = (): void => setPaused(!G.paused);

const isFormField = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
const isButton = (t: EventTarget | null): boolean => t instanceof HTMLButtonElement;

const normKey = (e: KeyboardEvent): string => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

export function initInput(canvas: HTMLCanvasElement, pad: HTMLElement): void {
  addEventListener('keydown', (e) => {
    if (isFormField(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = normKey(e);
    if (key === 'Escape' || key === 'p') {
      e.preventDefault();
      if (!e.repeat) togglePause();
      return;
    }
    // Let a focused button keep its own Space/Enter behaviour (keyboard accessibility).
    if (isButton(e.target) && (key === ' ' || key === 'Enter')) return;
    const a = KEYS[key];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    if (G.paused) return;
    ac();
    if (a === 'blk') {
      tracker.press('k:' + key, 'blk');
      syncHeld();
    }
    press(a);
  });

  addEventListener('keyup', (e) => {
    tracker.release('k:' + normKey(e));
    syncHeld();
  });

  // Losing focus or hiding the tab pauses a live bout and releases everything.
  const away = (): void => {
    tracker.clear();
    syncHeld();
    setPaused(true);
  };
  addEventListener('blur', away);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) away();
  });

  canvas.addEventListener('pointerdown', () => {
    ac();
    if (G.paused) setPaused(false);
    else if (G.scene === 'title' || G.scene === 'win' || G.scene === 'lose') press('start');
  });

  pad.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    const a = b.dataset.a as Action;
    const src = 'p:' + a;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture is optional */
      }
      if (G.paused) return;
      ac();
      b.classList.add('on');
      if (a === 'blk') {
        tracker.press(src, 'blk');
        syncHeld();
      }
      press(a);
    });
    const up = (): void => {
      b.classList.remove('on');
      tracker.release(src);
      syncHeld();
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
      b.addEventListener(ev, up),
    );
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
