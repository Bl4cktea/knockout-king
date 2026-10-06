import { ac } from './audio';
import { randomFace } from './face/config';
import { TRUNK_COLORS } from './fighters/boxer';
import { togglePause } from './input';
import { cleanName, isReducedMotion, saveSettings, settings } from './settings';
import { G, looks } from './sim/state';
import { pickOne } from './util/random';

const el = <T extends HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing #${id}`);
  return e as T;
};

/** Wire up the panel under the canvas. Returns a cheap per-frame sync for button state. */
export function initUI(): () => void {
  const nm = el<HTMLInputElement>('nm');
  const shuffle = el<HTMLButtonElement>('shuffle');
  const swap = el<HTMLButtonElement>('swapf');
  const pause = el<HTMLButtonElement>('pause');
  const mute = el<HTMLButtonElement>('mute');
  const rm = el<HTMLInputElement>('rm');

  nm.value = settings.name;
  nm.addEventListener('input', () => {
    settings.name = cleanName(nm.value);
    saveSettings();
  });

  shuffle.addEventListener('click', () => {
    looks.opp.face = randomFace();
    looks.player.face = randomFace();
    looks.opp.trunks = pickOne(TRUNK_COLORS);
    looks.player.trunks = pickOne(TRUNK_COLORS.filter((c) => c !== looks.opp.trunks));
  });

  swap.addEventListener('click', () => {
    const mine = looks.player.face;
    looks.player.face = looks.opp.face;
    looks.opp.face = mine;
  });

  pause.addEventListener('click', togglePause);

  const showMute = (): void => {
    mute.textContent = 'Sound: ' + (settings.muted ? 'off' : 'on');
  };
  showMute();
  mute.addEventListener('click', () => {
    settings.muted = !settings.muted;
    saveSettings();
    showMute();
    ac();
  });

  rm.checked = isReducedMotion();
  rm.addEventListener('change', () => {
    settings.reduceMotion = rm.checked;
    saveSettings();
  });

  // After a mouse click, hand focus back to the page so Space/Enter keep working as game keys.
  for (const b of [shuffle, swap, pause, mute]) {
    b.addEventListener('click', (e) => {
      if (e.detail > 0) b.blur();
    });
  }

  // Once a bout has started, collapse the panel; "Learn more" brings everything back.
  const panel = el<HTMLElement>('panel');
  const learn = el<HTMLButtonElement>('learn');
  learn.addEventListener('click', (e) => {
    const open = panel.toggleAttribute('data-expanded');
    learn.setAttribute('aria-expanded', String(open));
    learn.textContent = open ? 'Show less' : 'Learn more';
    if (e.detail > 0) learn.blur();
  });

  let lastLabel = '';
  let lastDisabled = false;
  return () => {
    if (!panel.hasAttribute('data-compact') && G.scene !== 'title')
      panel.setAttribute('data-compact', '');
    const label = G.paused ? 'Resume' : 'Pause';
    const disabled = !G.paused && G.scene !== 'intro' && G.scene !== 'fight';
    if (label !== lastLabel) pause.textContent = lastLabel = label;
    if (disabled !== lastDisabled) pause.disabled = lastDisabled = disabled;
  };
}
