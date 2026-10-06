import { isReducedMotion } from '../settings';
import { clamp, damp } from '../util/math';
import { chance, randInt } from '../util/random';
import { aiStep } from './ai';
import { sweat } from './fx';
import { faceXY } from './geometry';
import { G, O, OG, OH } from './state';

interface Pose {
  x: number;
  y: number;
  s: number;
  glow: number;
}

/** Where the gloves and head want to be for the current AI state. */
function targets(): { L: Pose; R: Pose; H: { ox: number; oy: number; rot: number } } {
  const t = G.time;
  const b = Math.sin(t * 3.6) * 3;
  const calm = isReducedMotion();
  const L: Pose = { x: -56, y: 84 + b, s: 1, glow: 0 };
  const R: Pose = { x: 56, y: 84 + b, s: 1, glow: 0 };
  const H = { ox: Math.sin(t * 1.8) * 7, oy: b, rot: Math.sin(t * 1.8) * 0.035 };
  const st = O.st;
  if (st === 'taunt') {
    L.x = -140;
    L.y = 150;
    R.x = 140;
    R.y = 150;
    L.glow = R.glow = calm ? 0.8 : 0.5 + 0.5 * Math.sin(t * 20);
    H.rot = Math.sin(t * 9) * 0.07;
    H.oy = -6;
  } else if (st === 'tele') {
    const p = clamp(1 - O.timer / O.teleDur, 0, 1);
    const pulse = calm ? 1 : 0.6 + 0.4 * Math.sin(t * 35);
    if (O.atk === 'L') {
      L.x = -170;
      L.y = 140 - 40 * p;
      L.s = 1.1;
      L.glow = pulse;
      H.ox = -16 * p;
      H.rot = -0.08 * p;
    } else if (O.atk === 'R') {
      R.x = 170;
      R.y = 140 - 40 * p;
      R.s = 1.1;
      R.glow = pulse;
      H.ox = 16 * p;
      H.rot = 0.08 * p;
    } else {
      R.x = 96;
      R.y = 20 - 20 * p;
      R.s = 1.1;
      R.glow = pulse;
      L.x = -40;
      H.ox = 10 * p;
      H.rot = 0.06 * p;
    }
  } else if (st === 'strike') {
    if (O.atk === 'L') {
      L.x = -15;
      L.y = 175;
      L.s = 2.5;
      H.ox = 14;
      H.rot = 0.1;
    } else if (O.atk === 'R') {
      R.x = 15;
      R.y = 175;
      R.s = 2.5;
      H.ox = -14;
      H.rot = -0.1;
    } else {
      R.x = 0;
      R.y = 135;
      R.s = 2.8;
      H.oy = 14;
    }
  } else if (st === 'recover') {
    L.x = -125;
    L.y = 175;
    R.x = 125;
    R.y = 175;
    H.oy = 10 + b;
    H.rot = Math.sin(t * 5) * 0.05;
  } else if (st === 'stunned') {
    L.x = -115;
    L.y = 205;
    R.x = 115;
    R.y = 205;
    H.rot = Math.sin(t * 7) * 0.14;
    H.ox = Math.sin(t * 5) * 14;
    H.oy = 16;
  } else if (st === 'down' || st === 'getup') {
    L.x = -110;
    L.y = 205;
    R.x = 110;
    R.y = 205;
  }
  if (O.hitT > 0) {
    const f = O.hitT / 0.22;
    H.ox += O.knock * f;
    H.rot += O.knock * 0.012 * f;
    H.oy += 6 * f;
  }
  return { L, R, H };
}

export function updateOpp(dt: number): void {
  O.flash = Math.max(0, O.flash - dt);
  O.hitT = Math.max(0, O.hitT - dt);
  if (G.scene === 'fight') aiStep(dt);
  const T = targets();
  const k = O.st === 'strike' ? 40 : O.st === 'tele' ? 14 : 10;
  const f = damp(k, dt);
  const f2 = damp(22, dt);
  for (const s of ['L', 'R'] as const) {
    const g = OG[s];
    const tg = T[s];
    g.x += (tg.x - g.x) * f;
    g.y += (tg.y - g.y) * f;
    g.s += (tg.s - g.s) * f;
    g.glow += (tg.glow - g.glow) * f;
  }
  OH.ox += (T.H.ox - OH.ox) * f2;
  OH.oy += (T.H.oy - OH.oy) * f2;
  OH.rot += (T.H.rot - OH.rot) * f2;
  const ty = O.st === 'down' ? 330 : 0;
  O.downY += (ty - O.downY) * damp(O.st === 'down' ? 7 : 5, dt);
  if (G.scene === 'fight' && O.hp < O.maxhp * 0.6 && O.st !== 'down' && chance(dt * 4)) {
    const [fx, fy] = faceXY();
    sweat(fx + (randInt(2) ? 60 : -60), fy - 30, randInt(2) ? 1 : -1);
  }
}
