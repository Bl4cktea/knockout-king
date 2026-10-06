import { shade } from '../util/color';
import { at } from '../util/math';

export const SKIN_TONES: readonly string[] = [
  '#ffe0bd',
  '#f1c27d',
  '#e0ac69',
  '#c68642',
  '#a8714c',
  '#8d5524',
  '#6b3f1d',
  '#4a2912',
];

export const HAIR_COLORS: readonly string[] = [
  '#1b1b1f',
  '#4a2c17',
  '#e0b252',
  '#b8431f',
  '#a8a8b0',
  '#f1f1f1',
  '#3a86ff',
  '#ff5fa2',
];

export interface BodyTone {
  base: string;
  light: string;
  dark: string;
}

/** Body colours follow the face so head and torso always match. */
export function bodyTone(skin: number): BodyTone {
  const base = at(SKIN_TONES, skin);
  return { base, light: shade(base, 0.1), dark: shade(base, -0.28) };
}
