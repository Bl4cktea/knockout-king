import { sfx } from '../audio';
import { CHAMP } from '../fighters/champ';
import type { FighterData } from '../fighters/types';
import { parts } from './fx';
import { BUFFER_WINDOW, G, O, P, buffer } from './state';

/** Reset everything and start a fresh bout against `fighter`. */
export function newFight(fighter: FighterData = CHAMP): void {
  Object.assign(P, {
    hp: 100,
    dodge: 0,
    dodgeT: 0,
    dodgeCd: 0,
    stun: 0,
    punch: null,
    punchCd: 0,
    stars: 0,
    x: 0,
    flash: 0,
    fall: 0,
  });
  Object.assign(O, {
    f: fighter,
    hp: fighter.maxHp,
    maxhp: fighter.maxHp,
    downs: 0,
    st: 'idle',
    timer: 1.8,
    combo: 0,
    strikeDone: false,
    result: '',
    flash: 0,
    hitT: 0,
    knock: 0,
    downY: 0,
    downT: 0,
    count: 0,
    lastTaunt: false,
    lastAtk: '',
  });
  parts.length = 0;
  clearBuffer();
  G.scene = 'intro';
  G.introT = 0;
  G.fightShown = false;
  G.freeze = 0;
  G.banner = { text: 'ROUND 1', t: 0, dur: 1.0, size: 34, color: '#ffffff' };
  sfx.count();
}

export function clearBuffer(): void {
  buffer.a = null;
  buffer.t = 0;
}

export function bufferAction(a: NonNullable<typeof buffer.a>): void {
  buffer.a = a;
  buffer.t = BUFFER_WINDOW;
}
