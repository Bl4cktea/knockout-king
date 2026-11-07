import { describe, expect, it } from 'vitest';
import { randomFace } from '../src/face/config';
import { TRUNK_COLORS } from '../src/fighters/boxer';
import { challengerFighter, decodeChallenger, encodeChallenger } from '../src/share';
import { mulberry32 } from '../src/util/math';

const b64 = (o: unknown): string =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('share links', () => {
  it('round-trips random boxers, including non-ASCII names', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const c = {
        name: i % 2 ? 'DÅVE ✓' : 'DAVE',
        face: randomFace(rng),
        trunks: TRUNK_COLORS[i % TRUNK_COLORS.length] as string,
      };
      expect(decodeChallenger(encodeChallenger(c))).toEqual(c);
    }
  });

  it('stays short enough for a link', () => {
    const c = {
      name: 'MMMMMMMMMMMM',
      face: randomFace(mulberry32(1)),
      trunks: TRUNK_COLORS[0] as string,
    };
    expect(encodeChallenger(c).length).toBeLessThan(120);
  });

  it('rejects garbage, wrong versions, bad parts and oversized input', () => {
    const ok = [1, 'A', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(decodeChallenger(b64(ok))).not.toBeNull();
    for (const bad of [
      [2, ...ok.slice(1)],
      [...ok.slice(0, 2), 99, ...ok.slice(3)],
      [...ok.slice(0, 12), 99],
      [...ok.slice(0, 12), 'length'],
      [1, 5, ...ok.slice(2)],
      ok.slice(0, 12),
    ]) {
      expect(decodeChallenger(b64(bad))).toBeNull();
    }
    expect(decodeChallenger('')).toBeNull();
    expect(decodeChallenger('!!!not base64!!!')).toBeNull();
    expect(decodeChallenger('A'.repeat(500))).toBeNull();
  });

  it('trims the name to 12 characters and builds a fighter outside the roster', () => {
    const c = decodeChallenger(b64([1, '  averyverylongname  ', ...Array(11).fill(0)]));
    expect(c?.name).toBe('AVERYVERYLON');
    const f = challengerFighter(c as NonNullable<typeof c>);
    expect(f.id).toBe('challenger');
    expect(f.name).toBe('AVERYVERYLON');
  });
});
