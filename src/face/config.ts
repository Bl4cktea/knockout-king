import { random } from '../util/random';

/** A cartoon face is a handful of part indices. Small enough to fit in a share link. */
export interface FaceConfig {
  skin: number;
  head: number;
  eyes: number;
  brows: number;
  nose: number;
  mouth: number;
  hair: number;
  hairColor: number;
  facial: number;
  /** Bitmask of EXTRA flags. */
  extras: number;
}

export type Expr = 'idle' | 'wind' | 'hit' | 'stunned' | 'ko' | 'taunt' | 'win';

export const EXTRA = { scar: 1, headband: 2, eyepatch: 4, shades: 8, goldTooth: 16 } as const;
const EXTRA_ALL = 31;

/** How many choices each part has. The editor and randomiser both read this. */
export const FACE_COUNTS = {
  skin: 8,
  head: 4,
  eyes: 6,
  brows: 5,
  nose: 5,
  mouth: 6,
  hair: 10,
  hairColor: 8,
  facial: 5,
} as const;

export function randomFace(rng: () => number = random): FaceConfig {
  const n = (k: number): number => Math.floor(rng() * k);
  let extras = 0;
  for (const bit of Object.values(EXTRA)) if (rng() < 0.18) extras |= bit;
  if (extras & EXTRA.eyepatch && extras & EXTRA.shades) extras &= ~EXTRA.eyepatch;
  return {
    skin: n(FACE_COUNTS.skin),
    head: n(FACE_COUNTS.head),
    eyes: n(FACE_COUNTS.eyes),
    brows: n(FACE_COUNTS.brows),
    nose: n(FACE_COUNTS.nose),
    mouth: n(FACE_COUNTS.mouth),
    hair: n(FACE_COUNTS.hair),
    hairColor: n(FACE_COUNTS.hairColor),
    facial: n(FACE_COUNTS.facial),
    extras,
  };
}

export function isValidFace(f: FaceConfig): boolean {
  const inRange = (v: number, n: number): boolean => Number.isInteger(v) && v >= 0 && v < n;
  return (
    inRange(f.skin, FACE_COUNTS.skin) &&
    inRange(f.head, FACE_COUNTS.head) &&
    inRange(f.eyes, FACE_COUNTS.eyes) &&
    inRange(f.brows, FACE_COUNTS.brows) &&
    inRange(f.nose, FACE_COUNTS.nose) &&
    inRange(f.mouth, FACE_COUNTS.mouth) &&
    inRange(f.hair, FACE_COUNTS.hair) &&
    inRange(f.hairColor, FACE_COUNTS.hairColor) &&
    inRange(f.facial, FACE_COUNTS.facial) &&
    Number.isInteger(f.extras) &&
    f.extras >= 0 &&
    f.extras <= EXTRA_ALL
  );
}
