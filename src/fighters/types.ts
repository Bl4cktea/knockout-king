import type { FaceConfig } from '../face/config';

export type Atk = 'L' | 'R' | 'S';

/** What a fighter looks like. Faces are editable at runtime, so this is cloned into state. */
export interface Look {
  face: FaceConfig;
  trunks: string;
  trim: string;
  gloves: readonly [string, string];
}

/** Every number the opponent AI uses. New opponents are just new data. */
export interface Tuning {
  /** Idle pause before the next move: [min, max], each shortened by aggression * idleAggr. */
  idle: readonly [number, number];
  idleAggr: readonly [number, number];
  /** Wind-up (telegraph) seconds, normal and combo follow-ups, each shortened by aggression. */
  tele: number;
  teleAggr: number;
  teleFast: number;
  teleFastAggr: number;
  /** Combo chance = base + aggression * scale. */
  combo: readonly [number, number];
  /** Chance to repeat the previous attack. */
  repeat: number;
  /** Chance to taunt (a free opening for the player) instead of attacking. */
  taunt: number;
  dmg: Record<Atk, number>;
  /** Chip damage through a block (hooks and jabs only). */
  chip: number;
  /** Seconds a strike lasts. */
  strike: number;
  /** Recovery after a dodged strike: base - aggression * scale. */
  recoverDodge: readonly [number, number];
  recoverBlock: number;
  /** Seconds stunned by a star punch. */
  stunTime: number;
  /** Fraction of max HP restored on the first get-up. */
  getupHp: number;
  /** Referee count needed: [first knockdown, second knockdown]. */
  count: readonly [number, number];
  /** Aggression = lostHpFraction * [0] + knockdowns * [1], capped at 1. */
  aggro: readonly [number, number];
}

export interface FighterData {
  id: string;
  name: string;
  maxHp: number;
  look: Look;
  tune: Tuning;
}
