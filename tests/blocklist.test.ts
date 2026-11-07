import { describe, expect, it } from 'vitest';
import { isBlocked } from '../src/blocklist';
import { cleanName } from '../src/settings';

describe('name blocklist', () => {
  it('blocks slurs including look-alikes, spacing and repeats', () => {
    for (const bad of ['retard', 'R3T4RD', 'r e t a r d', 'retaaard', 'x_f4gg0t_x', 'N1GG']) {
      expect(isBlocked(bad)).toBe(true);
    }
  });

  it('lets ordinary names and trash-talk handles through', () => {
    for (const ok of ['DAVE', 'GLASS GABBY', 'IRON IVAN', 'KNOCKOUT', 'PAKISTAN', 'SPICE', 'ASS']) {
      expect(isBlocked(ok)).toBe(false);
    }
  });

  it('cleanName falls back when a name is blocked', () => {
    expect(cleanName('retard', 'CHALLENGER')).toBe('CHALLENGER');
    expect(cleanName('dave', 'CHALLENGER')).toBe('DAVE');
  });
});
