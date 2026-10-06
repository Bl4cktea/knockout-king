import { describe, expect, it } from 'vitest';
import { EXTRA, FACE_COUNTS, isValidFace, randomFace } from '../src/face/config';
import type { FaceConfig } from '../src/face/config';
import { HAIR_COLORS, SKIN_TONES, bodyTone } from '../src/face/palette';
import { PLAYER_LOOK } from '../src/fighters/boxer';
import { CHAMP } from '../src/fighters/champ';
import { mulberry32 } from '../src/util/math';

describe('cartoon faces', () => {
  it('ships valid default faces', () => {
    expect(isValidFace(CHAMP.look.face)).toBe(true);
    expect(isValidFace(PLAYER_LOOK.face)).toBe(true);
  });

  it('palettes match the advertised part counts', () => {
    expect(SKIN_TONES).toHaveLength(FACE_COUNTS.skin);
    expect(HAIR_COLORS).toHaveLength(FACE_COUNTS.hairColor);
  });

  it('random faces are always valid and never wear an eyepatch with shades', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const f = randomFace(rng);
      expect(isValidFace(f)).toBe(true);
      expect(f.extras & EXTRA.eyepatch && f.extras & EXTRA.shades).toBeFalsy();
    }
  });

  it('random faces are reproducible from a seed and actually vary', () => {
    const batch = (seed: number): FaceConfig[] => {
      const r = mulberry32(seed);
      return Array.from({ length: 20 }, () => randomFace(r));
    };
    const a = batch(7);
    expect(batch(7)).toEqual(a);
    expect(new Set(a.map((f) => JSON.stringify(f))).size).toBeGreaterThan(15);
  });

  it('rejects out-of-range or non-integer parts', () => {
    const ok = CHAMP.look.face;
    expect(isValidFace({ ...ok, hair: FACE_COUNTS.hair })).toBe(false);
    expect(isValidFace({ ...ok, eyes: -1 })).toBe(false);
    expect(isValidFace({ ...ok, nose: 1.5 })).toBe(false);
    expect(isValidFace({ ...ok, extras: 32 })).toBe(false);
    expect(isValidFace({ ...ok, skin: Number.NaN })).toBe(false);
  });

  it('body tones follow the face and get darker toward the shadow colour', () => {
    const t = bodyTone(4);
    expect(t.base).toBe(SKIN_TONES[4]);
    expect(t.dark).not.toBe(t.light);
  });
});
