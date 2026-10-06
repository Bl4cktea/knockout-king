import { EXTRA } from '../face/config';
import type { FighterData } from './types';

/** The original opponent, with the exact timings from the first version of the game. */
export const CHAMP: FighterData = {
  id: 'champ',
  name: 'THE CHAMP',
  maxHp: 100,
  look: {
    face: {
      skin: 4,
      head: 1,
      eyes: 4,
      brows: 4,
      nose: 2,
      mouth: 3,
      hair: 8,
      hairColor: 0,
      facial: 1,
      extras: EXTRA.scar | EXTRA.goldTooth,
    },
    trunks: '#d62839',
    trim: '#ffd166',
    gloves: ['#ff6a6a', '#a80f1f'],
  },
  tune: {
    idle: [1.5, 2.1],
    idleAggr: [0.8, 1.0],
    tele: 0.68,
    teleAggr: 0.2,
    teleFast: 0.46,
    teleFastAggr: 0.1,
    combo: [0.12, 0.45],
    repeat: 0.6,
    taunt: 0.25,
    dmg: { L: 12, R: 12, S: 8 },
    chip: 3,
    strike: 0.28,
    recoverDodge: [1.15, 0.3],
    recoverBlock: 0.35,
    stunTime: 2.3,
    getupHp: 0.42,
    count: [5, 3],
    aggro: [0.55, 0.4],
  },
};
