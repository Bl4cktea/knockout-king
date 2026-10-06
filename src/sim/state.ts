import { PLAYER_LOOK, cloneLook } from '../fighters/boxer';
import { CHAMP } from '../fighters/champ';
import type { Atk, FighterData, Look } from '../fighters/types';

export type Scene = 'title' | 'intro' | 'fight' | 'win' | 'lose';
export type Action = 'dl' | 'dr' | 'blk' | 'pl' | 'pr' | 'star' | 'start';
export type Hand = -1 | 1;
export type OppMode =
  'idle' | 'taunt' | 'tele' | 'strike' | 'recover' | 'stunned' | 'down' | 'getup';

export interface Banner {
  text: string;
  t: number;
  dur: number;
  size: number;
  color: string;
}

export const G = {
  scene: 'title' as Scene,
  time: 0,
  wait: 0,
  shake: 0,
  freeze: 0,
  banner: null as Banner | null,
  introT: 0,
  fightShown: false,
  paused: false,
};

export interface Player {
  hp: number;
  dodge: -1 | 0 | 1;
  dodgeT: number;
  dodgeCd: number;
  stun: number;
  punch: { hand: Hand; t: number; big: boolean } | null;
  punchCd: number;
  stars: number;
  x: number;
  flash: number;
  fall: number;
}

export interface Opp {
  f: FighterData;
  hp: number;
  maxhp: number;
  downs: number;
  st: OppMode;
  timer: number;
  atk: Atk;
  teleDur: number;
  combo: number;
  strikeDone: boolean;
  result: 'hit' | 'block' | 'dodge' | '';
  flash: number;
  hitT: number;
  knock: number;
  recoverHits: number;
  downY: number;
  downT: number;
  count: number;
  lastTaunt: boolean;
  lastAtk: Atk | '';
}

export const P: Player = {
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
};

export const O: Opp = {
  f: CHAMP,
  hp: 100,
  maxhp: 100,
  downs: 0,
  st: 'idle',
  timer: 1,
  atk: 'L',
  teleDur: 0.6,
  combo: 0,
  strikeDone: false,
  result: '',
  flash: 0,
  hitT: 0,
  knock: 0,
  recoverHits: 0,
  downY: 0,
  downT: 0,
  count: 0,
  lastTaunt: false,
  lastAtk: '',
};

/** Opponent glove and head poses (smoothed toward targets every step). */
export const OG = {
  L: { x: -56, y: 84, s: 1, glow: 0 },
  R: { x: 56, y: 84, s: 1, glow: 0 },
};
export const OH = { ox: 0, oy: 0, rot: 0 };

/** Block is a held state, driven by the input layer. */
export const held = { blk: false };

/** One buffered action, so a press just before a cooldown ends still counts. */
export const buffer: { a: Action | null; t: number } = { a: null, t: 0 };
export const BUFFER_WINDOW = 0.1;

/** Current looks. Cloned so shuffling faces never mutates the defaults. */
export const looks: { player: Look; opp: Look } = {
  player: cloneLook(PLAYER_LOOK),
  opp: cloneLook(CHAMP.look),
};
