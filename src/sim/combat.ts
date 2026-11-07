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

function triggerPlayerLose(): void {
  P.hp = 0;
  G.playerDown = false;
  G.scene = 'lose';
  G.wait = 1.6;
  O.st = 'taunt';
  O.timer = 99;
  P.punch = null;
  G.banner = { text: "YOU'RE DOWN!", t: 0, dur: 2.2, size: 30, color: '#ff4d4d' };
  sfx.lose();
}

/* ---------------- damage ---------------- */
export function hurtPlayer(d: number, chip: boolean): void {
  P.hp -= d;
  P.stun = chip ? 0.12 : 0.55;
  P.flash = chip ? 0.15 : 0.45;
  G.shake = Math.max(G.shake, chip ? 3 : 12);
  sfx.hurt();
  clearBuffer();
  if (!chip) {
    P.stars = Math.max(0, P.stars - 1);
    P.combo = 0;
    P.counterWin = 0;
  }
  P.hearts = Math.max(0, P.hearts - 1);
  if (P.hearts === 0 && !P.winded && P.hp > 0) {
    P.winded = true;
    P.windedT = 1.6;
    sfx.winded();
  }
  addText(chip ? '-' + d : 'OUCH! -' + d, W / 2 + P.x, 330, '#ff6b6b', chip ? 12 : 15);
  if (P.hp <= 0) {
    P.hp = 0;
    P.punch = null;
    P.combo = 0;
    P.counterWin = 0;
    if (P.downs < 2) {
      P.downs++;
      P.downT = 0;
      P.count = 0;
      P.rally = 0;
      G.playerDown = true;
      O.st = 'taunt';
      O.timer = 99;
      G.banner = { text: 'DOWN! MASH TO RISE!', t: 0, dur: 1.2, size: 22, color: '#ff6b6b' };
    } else {
      triggerPlayerLose();
    }
  }
}

export function startDown(): void {
  O.hp = 0;
  O.downs++;
  O.st = 'down';
  O.downT = 0;
  O.count = 0;
  O.combo = 0;
  P.score += 1000 * O.downs;
  G.banner = { text: 'KNOCKDOWN!', t: 0, dur: 1.4, size: 30, color: '#ffd23f' };
  sfx.heavy();
  G.shake = 18;
  if (O.downs === 1) P.stars = Math.min(3, P.stars + 1);
}

function hitOpp(dmg: number, hand: number, big: boolean, counter = false): void {
  O.hp -= dmg;
  O.flash = 0.14;
  O.hitT = 0.22;
  O.knock = (hand || 1) * (big ? 30 : counter ? 20 : 12);
  const [fx, fy] = faceXY();
  burst(fx + hand * 20, fy + 20, big ? 10 : counter ? 8 : 5, counter ? '#7dff9b' : '#ffd23f');
  addText(
    big ? 'KAPOW!' : counter ? 'CRIT!' : pickOne(['POW', 'BAM', 'WHAP']),
    fx + (hand || 1) * 55,
    fy - 40,
    counter ? '#7dff9b' : '#fff',
    big ? 24 : counter ? 18 : 14,
  );
  if (big) sfx.heavy();
  else if (counter) sfx.counter();
  else sfx.punch();
  G.shake = Math.max(G.shake, big ? 14 : counter ? 8 : 4);
  G.freeze = big ? 0.09 : counter ? 0.05 : 0.03;
  if (O.hp <= 0) startDown();
}

/* ---------------- player actions ---------------- */
export function dodge(d: -1 | 1): ActResult {
  if (P.dodgeCd > 0) return 'cooldown';
  P.dodge = d;
  P.dodgeT = 0.36;
  P.dodgeCd = 0.46;

  // Check for Perfect Dodge in the final moments of an opponent's telegraph
  if (O.st === 'tele' && O.timer <= 0.22 && P.counterWin <= 0) {
    const validDir = O.atk === 'S' || (O.atk === 'L' && d === 1) || (O.atk === 'R' && d === -1);
    if (validDir) {
      P.counterWin = 1.4;
      P.winded = false;
      P.windedT = 0;
      P.hearts = Math.min(P.maxHearts, P.hearts + 2);
      P.score += 150 * Math.max(1, P.combo);
      G.freeze = Math.max(G.freeze, 0.04);
      sfx.perfect();
      addText('PERFECT!', W / 2 + d * 65, 308, '#ffd23f', 15);
    }
  }
  return 'done';
}

export function punch(hand: Hand): ActResult {
  if (P.punchCd > 0) return 'cooldown';
  if (P.winded) {
    P.punchCd = 0.25;
    sfx.whiff();
    addText('WINDED! DODGE!', W / 2 + P.x, 318, '#ff7eb6', 12);
    return 'done';
  }
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
    P.combo = 0;
    P.hearts = Math.max(0, P.hearts - 2);
    if (P.hearts === 0 && !P.winded) {
      P.winded = true;
      P.windedT = 1.6;
      sfx.winded();
      addText('EXHAUSTED!', W / 2 + P.x, 305, '#ff7eb6', 14);
    } else {
      addText('GUARD', fx + hand * 55, fy + 20, '#cfd6ff', 12);
    }
    burst(fx + hand * 30, fy + 40, 3, '#ffffff');
    P.punchCd = 0.45;
    return 'done';
  }

  P.combo++;
  if (P.combo > P.maxCombo) P.maxCombo = P.combo;

  const isCounter = P.counterWin > 0;
  if (isCounter) {
    P.counterWin = 0;
    dmg = Math.round(dmg * 1.5);
    star = true;
    P.score += 300 * P.combo;
    addText('COUNTER! x' + P.combo, fx, fy - 66, '#7dff9b', 15);
  } else {
    P.score += dmg * 25 * P.combo;
  }

  hitOpp(dmg, hand, false, isCounter);
  // A blow that causes a knockdown earns no star (hitOpp may have just put him down).
  if (star && P.stars < 3 && !isDown()) {
    P.stars++;
    sfx.star();
    addText('STAR!', fx, fy - 86, '#ffd23f', 16);
  }
  return 'done';
}

export function starPunch(): ActResult {
  if (P.stars <= 0) return 'done';
  if (P.punchCd > 0) return 'cooldown';
  if (P.winded) {
    P.punchCd = 0.25;
    sfx.whiff();
    addText('WINDED! DODGE!', W / 2 + P.x, 318, '#ff7eb6', 12);
    return 'done';
  }
  if (O.st === 'down' || O.st === 'getup') return 'done';
  P.stars--;
  P.punchCd = 0.6;
  P.punch = { hand: 1, t: 0, big: true };
  P.combo++;
  if (P.combo > P.maxCombo) P.maxCombo = P.combo;
  P.score += 500 * P.combo;
  P.counterWin = 0;
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

/** Rally button-mash handler while the player is knocked down on the canvas. */
function mashRally(): void {
  const boost = P.downs <= 1 ? 0.17 : 0.12;
  P.rally = Math.min(1, P.rally + boost);
  sfx.rally();
  if (P.rally >= 1) {
    G.playerDown = false;
    P.hp = P.downs <= 1 ? 50 : 35;
    P.hearts = P.maxHearts;
    P.winded = false;
    P.windedT = 0;
    P.fall = 0;
    P.stun = 0;
    O.st = 'idle';
    O.timer = 1.0;
    G.banner = { text: 'SECOND WIND!', t: 0, dur: 1.1, size: 28, color: '#7dff9b' };
    sfx.getup();
  }
}

/**
 * Handle a press. Block is a held state tracked by the input layer, so a block press only
 * matters for starting a bout from the title / result screens.
 */
export function press(a: Action): void {
  if (G.paused) return;
  if (G.scene === 'fight' && G.playerDown) {
    if (a !== 'blk') mashRally();
    return;
  }
  if (a === 'blk' && G.scene === 'fight') return;
  if (G.scene === 'title' || G.scene === 'win' || G.scene === 'lose') {
    if (G.wait <= 0) newFight();
    return;
  }
  if (G.scene !== 'fight') return;
  if (P.stun > 0) return;
  if (perform(a) === 'cooldown') bufferAction(a);
}
