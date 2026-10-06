import { damp } from '../util/math';
import { G, P } from './state';

export function updatePlayer(dt: number): void {
  P.dodgeT = Math.max(0, P.dodgeT - dt);
  P.dodgeCd = Math.max(0, P.dodgeCd - dt);
  P.stun = Math.max(0, P.stun - dt);
  P.punchCd = Math.max(0, P.punchCd - dt);
  P.flash = Math.max(0, P.flash - dt);
  if (P.dodgeT <= 0) P.dodge = 0;
  P.x += (P.dodge * 80 - P.x) * damp(18, dt);
  if (P.punch) {
    P.punch.t += dt;
    if (P.punch.t > 0.26) P.punch = null;
  }
  if (G.scene === 'lose') P.fall = Math.min(1, P.fall + dt * 1.2);
}
