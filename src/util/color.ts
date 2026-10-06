import { clamp } from './math';

/** Darken (amt < 0) or lighten (amt > 0) a #rrggbb colour. Returns an rgb() string. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number): number =>
    Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
