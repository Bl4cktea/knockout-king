import { sfx } from '../audio';
import { perform } from './combat';
import { clearBuffer } from './flow';
import { updateParts } from './fx';
import { updateOpp } from './opponent';
import { updatePlayer } from './player';
import { G, P, buffer } from './state';

/** A press that landed just before a cooldown ended still counts (see BUFFER_WINDOW). */
function processBuffer(dt: number): void {
  if (!buffer.a) return;
  buffer.t -= dt;
  if (buffer.t <= 0 || P.stun > 0 || G.scene !== 'fight') {
    clearBuffer();
    return;
  }
  if (perform(buffer.a) === 'done') clearBuffer();
}

/** Advance the whole simulation by one fixed step. */
export function step(dt: number): void {
  G.time += dt;
  G.wait = Math.max(0, G.wait - dt);
  if (G.banner) {
    G.banner.t += dt;
    if (G.banner.t >= G.banner.dur) G.banner = null;
  }
  updateParts(dt);
  if (G.freeze > 0) {
    G.freeze -= dt;
    return;
  }
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.scene === 'intro') {
    G.introT += dt;
    if (G.introT > 1.0 && !G.fightShown) {
      G.fightShown = true;
      G.banner = { text: 'FIGHT!', t: 0, dur: 0.8, size: 44, color: '#ffd23f' };
      sfx.bell();
    }
    if (G.introT > 1.8) G.scene = 'fight';
  }
  updatePlayer(dt);
  processBuffer(dt);
  updateOpp(dt);
}
