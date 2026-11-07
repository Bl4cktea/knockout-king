import { W } from '../config';
import { sfx } from '../audio';
import { ROSTER } from '../fighters/champ';
import type { Atk } from '../fighters/types';
import { computeGrade, recordVictory } from '../settings';
import { chance, pickOne, rand } from '../util/random';
import { hurtPlayer } from './combat';
import { addText } from './fx';
import { isBlocking } from './geometry';
import { G, O, P } from './state';

/** The generic opponent brain. Every number comes from `O.f.tune`. */
const tune = () => O.f.tune;

/** 0 (fresh) .. 1 (hurt and knocked down): scales how fast and mean the opponent gets. */
export const aggr = (): number =>
  Math.min(1, (1 - O.hp / O.maxhp) * tune().aggro[0] + O.downs * tune().aggro[1]);

function startIdle(custom?: number): void {
  O.st = 'idle';
  const a = aggr();
  const t = tune();
  O.timer = custom ?? rand(t.idle[0] - t.idleAggr[0] * a, t.idle[1] - t.idleAggr[1] * a);
}

function pickAtk(exclude: Atk | ''): Atk {
  return pickOne((['L', 'R', 'S'] as const).filter((t) => t !== exclude));
}

function startTele(type: Atk, fast: boolean): void {
  O.st = 'tele';
  O.atk = type;
  O.lastAtk = type;
  O.strikeDone = false;
  const a = aggr();
  const t = tune();
  O.teleDur = fast ? t.teleFast - t.teleFastAggr * a : t.tele - t.teleAggr * a;
  O.timer = O.teleDur;
  sfx.tele();
}

function startAttack(): void {
  const a = aggr();
  const t = tune();
  O.combo = chance(t.combo[0] + t.combo[1] * a) ? 1 : 0;
  startTele(pickAtk(chance(t.repeat) ? O.lastAtk : ''), false);
}

function resolveStrike(): void {
  O.strikeDone = true;
  const t = O.atk;
  const dodging = P.dodgeT > 0;
  let res: 'hit' | 'block' | 'dodge' = 'hit';
  if (t === 'L' && dodging && P.dodge === 1) res = 'dodge';
  else if (t === 'R' && dodging && P.dodge === -1) res = 'dodge';
  else if (t === 'S' && dodging) res = 'dodge';
  else if (isBlocking()) res = 'block';
  O.result = res;
  const tn = tune();
  if (res === 'hit') hurtPlayer(tn.dmg[t], false);
  else if (res === 'block') {
    sfx.block();
    addText('BLOCK', W / 2, 330, '#8fd0ff', 14);
    if (t !== 'S') hurtPlayer(tn.chip, true);
  } else {
    sfx.whiff();
    P.score += 50;
    if (P.winded) {
      P.winded = false;
      P.windedT = 0;
      P.hearts = Math.min(P.maxHearts, P.hearts + 5);
      addText('STAMINA UP!', W / 2 + P.x, 340, '#7dff9b', 15);
    } else {
      P.hearts = Math.min(P.maxHearts, P.hearts + 1);
      addText('DODGE!', W / 2 + P.x, 340, '#7dff9b', 16);
    }
  }
}

function endStrike(): void {
  if (O.combo > 0) {
    O.combo--;
    startTele(pickAtk(O.atk), true);
    return;
  }
  const a = aggr();
  const t = tune();
  if (O.result === 'dodge') {
    O.st = 'recover';
    O.timer = t.recoverDodge[0] - t.recoverDodge[1] * a;
    O.recoverHits = 0;
  } else if (O.result === 'block') {
    O.st = 'recover';
    O.timer = t.recoverBlock;
    O.recoverHits = 1;
  } else startIdle(0.7);
}

function downStep(dt: number): void {
  O.downT += dt;
  const c = Math.floor(O.downT / 0.8);
  if (c > O.count) {
    O.count = c;
    sfx.count();
  }
  const t = tune();
  const need = O.downs >= 2 ? t.count[1] : t.count[0];
  if (O.count >= need) {
    if (O.downs >= 2) {
      G.scene = 'win';
      G.winT = 0;
      G.wait = 1.6;
      const grade = computeGrade(G.boutTime, P.downs, P.maxCombo, O.f.sRankTime ?? 55);
      G.lastGrade = grade;
      const timeBonus = Math.max(0, Math.round((90 - G.boutTime) * 40));
      P.score += timeBonus + P.hp * 15;
      const idx = ROSTER.findIndex((f) => f.id === O.f.id);
      G.newRecord = recordVictory(O.f.id, idx >= 0 ? idx : 3, P.score, G.boutTime, grade);
      G.banner = { text: 'K.O.!', t: 0, dur: 1.5, size: 56, color: '#ff4d4d' };
      sfx.win();
      sfx.trophy();
    } else {
      O.st = 'getup';
      O.timer = 1.0;
      O.hp = O.maxhp * t.getupHp;
    }
  }
}

export function aiStep(dt: number): void {
  if (G.playerDown) return;
  O.timer -= dt;
  switch (O.st) {
    case 'idle':
      if (O.timer <= 0) {
        if (!O.lastTaunt && chance(tune().taunt)) {
          O.st = 'taunt';
          O.timer = 0.9;
          O.lastTaunt = true;
        } else {
          O.lastTaunt = false;
          startAttack();
        }
      }
      break;
    case 'taunt':
      if (O.timer <= 0) startIdle(0.5);
      break;
    case 'tele':
      if (O.timer <= 0) {
        O.st = 'strike';
        O.timer = tune().strike;
        O.strikeDone = false;
        sfx.whiff();
      }
      break;
    case 'strike':
      if (!O.strikeDone && O.timer <= tune().strike * 0.5) resolveStrike();
      if (G.scene !== 'fight' || G.playerDown) return;
      if (O.timer <= 0) endStrike();
      break;
    case 'recover':
      if (O.timer <= 0) startIdle();
      break;
    case 'stunned':
      if (O.timer <= 0) startIdle(0.6);
      break;
    case 'down':
      downStep(dt);
      break;
    case 'getup':
      if (O.timer <= 0) startIdle(1.0);
      break;
  }
}
