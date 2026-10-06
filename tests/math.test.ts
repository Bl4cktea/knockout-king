import { describe, expect, it } from 'vitest';
import { clamp, damp, lerp, mulberry32 } from '../src/util/math';

describe('math utils', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('lerps between endpoints', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('damp is frame-rate independent', () => {
    // two half-steps should land on the same value as one full step
    let a = 0;
    a += (1 - a) * damp(10, 1 / 60);
    let b = 0;
    b += (1 - b) * damp(10, 1 / 120);
    b += (1 - b) * damp(10, 1 / 120);
    expect(b).toBeCloseTo(a, 10);
  });

  it('seeded PRNG is deterministic and in [0, 1)', () => {
    const r1 = mulberry32(11);
    const r2 = mulberry32(11);
    for (let i = 0; i < 100; i++) {
      const v = r1();
      expect(v).toBe(r2());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
