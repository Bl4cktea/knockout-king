import { W } from '../config';
import { sfx } from '../audio';
import { pickOne } from '../util/random';
import { addText, burst } from './fx';
import { bufferAction, clearBuffer, newFight } from './flow';
import { faceXY } from './geometry';
import { G, O, P } from './state';
import type { Action, Hand } from './state';

const isDown = (): boolean => O.st === 'down';

/** 'cooldown' means the action was refused only because of a cooldown, so it may be buffered. */
export type ActResult = 'done' | 'cooldown';

/* ---------------- damage ---------------- */
export function hurtPlayer(d: number, chip: boolean): void {
  P.hp -= d;
  P.stun = chip ? 0.12 : 0.55;
  P.flash = chip ? 0.15 : 0.45;
  G.shake = Math.max(G.shake, chip ? 3 : 12);
  sfx.hurt();
  clearBuffer();
  if (!chip) P.stars = Math.max(0, P.stars - 1);
  addText(chip ? '-' + d : 'OUCH! -' + d, W / 2 + P.x, 330, '#ff6b6b', chip ? 12 : 15);
  if (P.hp <= 0) {
    P.hp = 0;
    G.scene = 'lose';
    G.wait = 1.6;
    O.st = 'taunt';
    O.timer = 99;
    P.punch = null;
    G.banner = { text: "YOU'RE DOWN!", t: 0, dur: 2.2, size: 30, color: '#ff4d4d' };
    sfx.lose();
  }
}

export function startDown(): void {
  O.hp = 0;
  O.downs++;
  O.st = 'down';
  O.downT = 0;
  O.count = 0;
  O.combo = 0;
  G.banner = { text: 'KNOCKDOWN!', t: 0, dur: 1.4, size: 30, color: '#ffd23f' };
  sfx.heavy();
  G.shake = 18;
  if (O.downs === 1) P.stars = Math.min(3, P.stars + 1);
}

function hitOpp(dmg: number, hand: number, big: boolean): void {
  O.hp -= dmg;
  O.flash = 0.14;
  O.hitT = 0.22;
  O.knock = (hand || 1) * (big ? 30 : 12);
  const [fx, fy] = faceXY();
  burst(fx + hand * 20, fy + 20, big ? 10 : 5, '#ffd23f');
  addText(
    big ? 'KAPOW!' : pickOne(['POW', 'BAM', 'WHAP']),
    fx + (hand || 1) * 55,
    fy - 40,
    '#fff',
    big ? 24 : 14,
  );
  if (big) sfx.heavy();
  else sfx.punch();
  G.shake = Math.max(G.shake, big ? 14 : 4);
  G.freeze = big ? 0.09 : 0.03;
  if (O.hp <= 0) startDown();
}

/* ---------------- player actions ---------------- */
export function dodge(d: -1 | 1): ActResult {
  if (P.dodgeCd > 0) return 'cooldown';
  P.dodge = d;
  P.dodgeT = 0.36;
  P.dodgeCd = 0.46;
  return 'done';
}

export function punch(hand: Hand): ActResult {
  if (P.punchCd > 0) return 'cooldown';
  P.punchCd = 0.3;
  P.punch = { hand, t: 0, big: false };
  if (O.st === 'down' || O.st === 'getup') {
    sfx.whiff();
    return 'done';
  }
  const [fx, fy] = faceXY();
  let dmg = 0;
  let star = false;
  let blocked = false;
  switch (O.st) {
    case 'tele':
      dmg = 2;
      break;
    case 'taunt':
      dmg = 6;
      star = true;
      break;
    case 'recover':
      dmg = 7;
      if (O.recoverHits === 0) star = true;
      O.recoverHits++;
      O.timer -= 0.12;
      break;
    case 'stunned':
      dmg = 9;
      break;
    default:
      blocked = true;
  }
  if (blocked) {
    sfx.block();
    addText('GUARD', fx + hand * 55, fy + 20, '#cfd6ff', 12);
    burst(fx + hand * 30, fy + 40, 3, '#ffffff');
    P.punchCd = 0.45;
    return 'done';
  }
  hitOpp(dmg, hand, false);
  // A blow that causes a knockdown earns no star (hitOpp may have just put him down).
  if (star && P.stars < 3 && !isDown()) {
    P.stars++;
    sfx.star();
    addText('STAR!', fx, fy - 80, '#ffd23f', 16);
  }
  return 'done';
}

export function starPunch(): ActResult {
  if (P.stars <= 0) return 'done';
  if (P.punchCd > 0) return 'cooldown';
  if (O.st === 'down' || O.st === 'getup') return 'done';
  P.stars--;
  P.punchCd = 0.6;
  P.punch = { hand: 1, t: 0, big: true };
  O.st = 'stunned';
  O.timer = O.f.tune.stunTime;
  O.combo = 0;
  hitOpp(20, 1, true);
  return 'done';
}

/** Run one fight action right now. */
export function perform(a: Action): ActResult {
  switch (a) {
    case 'dl':
      return dodge(-1);
    case 'dr':
      return dodge(1);
    case 'pl':
      return punch(-1);
    case 'pr':
      return punch(1);
    case 'star':
      return starPunch();
    default:
      return 'done';
  }
}

/**
 * Handle a press. Block is a held state tracked by the input layer, so a block press only
 * matters for starting a bout from the title / result screens.
 */
export function press(a: Action): void {
  if (G.paused) return;
  if (a === 'blk' && G.scene === 'fight') return;
  if (G.scene === 'title' || G.scene === 'win' || G.scene === 'lose') {
    if (G.wait <= 0) newFight();
    return;
  }
  if (G.scene !== 'fight') return;
  if (P.stun > 0) return;
  if (perform(a) === 'cooldown') bufferAction(a);
}
