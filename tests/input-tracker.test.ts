import { describe, expect, it } from 'vitest';
import { HoldTracker } from '../src/input-tracker';
import { cleanName, DEFAULT_NAME } from '../src/settings';

describe('HoldTracker', () => {
  it('holds while any source is down', () => {
    const h = new HoldTracker();
    h.press('k:s', 'blk');
    h.press('k:ArrowDown', 'blk');
    expect(h.isHeld('blk')).toBe(true);
    h.release('k:s');
    expect(h.isHeld('blk')).toBe(true); // the other key is still down
    h.release('k:ArrowDown');
    expect(h.isHeld('blk')).toBe(false);
  });

  it('separates different actions', () => {
    const h = new HoldTracker();
    h.press('p:blk', 'blk');
    expect(h.isHeld('pl')).toBe(false);
  });

  it('clear() releases everything (focus loss, pause)', () => {
    const h = new HoldTracker();
    h.press('k:s', 'blk');
    h.press('p:blk', 'blk');
    h.clear();
    expect(h.isHeld('blk')).toBe(false);
  });

  it('ignores releasing something that was never pressed', () => {
    const h = new HoldTracker();
    h.release('k:nothing');
    expect(h.isHeld('blk')).toBe(false);
  });
});

describe('cleanName', () => {
  it('upper-cases, trims and caps at 12 characters', () => {
    expect(cleanName('  dave  ')).toBe('DAVE');
    expect(cleanName('abcdefghijklmnop')).toBe('ABCDEFGHIJKL');
  });

  it('strips control characters', () => {
    expect(cleanName('a\u0000b\u001fc\u007f')).toBe('ABC');
  });

  it('falls back to the default when empty', () => {
    expect(cleanName('')).toBe(DEFAULT_NAME);
    expect(cleanName('   ')).toBe(DEFAULT_NAME);
    expect(cleanName('\u0001\u0002')).toBe(DEFAULT_NAME);
  });

  it('keeps markup as inert text (it is only ever drawn on a canvas)', () => {
    expect(cleanName('<img src=x>')).toBe('<IMG SRC=X>');
  });
});
