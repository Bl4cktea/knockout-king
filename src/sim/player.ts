import { sfx } from '../audio';
import { damp } from '../util/math';
import { G, O, P } from './state';

export function updatePlayer(dt: number): void {
  P.dodgeT = Math.max(0, P.dodgeT - dt);
  P.dodgeCd = Math.max(0, P.dodgeCd - dt);
  P.stun = Math.max(0, P.stun - dt);
  P.punchCd = Math.max(0, P.punchCd - dt);
  P.flash = Math.max(0, P.flash - dt);
  P.counterWin = Math.max(0, P.counterWin - dt);

  if (P.winded && !G.playerDown && G.scene === 'fight') {
    P.windedT = Math.max(0, P.windedT - dt);
    if (P.windedT <= 0) {
      P.winded = false;
      P.hearts = Math.max(4, P.hearts);
    }
  }

  if (P.dodgeT <= 0) P.dodge = 0;
  P.x += (P.dodge * 80 - P.x) * damp(18, dt);
  if (P.punch) {
    P.punch.t += dt;
    if (P.punch.t > 0.26) P.punch = null;
  }

  if (G.playerDown && G.scene === 'fight') {
    P.downT += dt;
    const targetFall = Math.max(0.25, 0.9 - P.rally * 0.65);
    P.fall += (targetFall - P.fall) * damp(10, dt);
    const c = Math.floor(P.downT / 0.6);
    if (c > P.count) {
      P.count = c;
      sfx.count();
    }
    if (P.count >= 10) {
      G.playerDown = false;
      G.scene = 'lose';
      G.wait = 1.6;
      O.st = 'taunt';
      O.timer = 99;
      G.banner = { text: "K.O.! YOU'RE OUT!", t: 0, dur: 2.2, size: 28, color: '#ff4d4d' };
      sfx.lose();
    }
  } else if (G.scene === 'lose') {
    P.fall = Math.min(1, P.fall + dt * 1.2);
  } else {
    P.fall = Math.max(0, P.fall - dt * 3);
  }
}
