import { EXTRA } from '../face/config';
import type { Look } from './types';

/** The player's boxer. */
export const PLAYER_LOOK: Look = {
  face: {
    skin: 2,
    head: 2,
    eyes: 1,
    brows: 1,
    nose: 0,
    mouth: 3,
    hair: 3,
    hairColor: 6,
    facial: 0,
    extras: EXTRA.headband,
  },
  trunks: '#2f6fed',
  trim: '#ffffff',
  gloves: ['#8dbdff', '#1c3fb0'],
};

export const TRUNK_COLORS: readonly string[] = [
  '#d62839',
  '#2f6fed',
  '#1fa855',
  '#f08a24',
  '#7a3fd1',
  '#e83e8c',
  '#14b8c4',
  '#2b2b33',
];

export function cloneLook(l: Look): Look {
  return { ...l, face: { ...l.face }, gloves: [l.gloves[0], l.gloves[1]] };
}
