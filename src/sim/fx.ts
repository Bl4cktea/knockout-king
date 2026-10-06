import { clamp } from '../util/math';
import { rand } from '../util/random';

export interface Particle {
  k: 't' | 's' | 'd';
  text?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export const parts: Particle[] = [];

export function addText(text: string, x: number, y: number, color?: string, size?: number): void {
  parts.push({
    k: 't',
    text,
    x,
    y,
    vx: 0,
    vy: -50,
    life: 0.8,
    max: 0.8,
    color: color ?? '#fff',
    size: size ?? 16,
  });
}

export function burst(x: number, y: number, n: number, color?: string): void {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(80, 240);
    parts.push({
      k: 's',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 60,
      life: 0.55,
      max: 0.55,
      color: color ?? '#ffd23f',
      size: rand(6, 12),
    });
  }
}

export function sweat(x: number, y: number, dir: number): void {
  parts.push({
    k: 'd',
    x,
    y,
    vx: dir * rand(20, 70),
    vy: rand(-120, -40),
    life: 0.7,
    max: 0.7,
    color: '#9fd8ff',
    size: rand(8, 12),
  });
}

export function updateParts(dt: number): void {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (!p) continue;
    p.life -= dt;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.k !== 't') p.vy += 500 * dt;
  }
}

export const particleAlpha = (p: Particle): number => clamp((p.life / p.max) * 1.5, 0, 1);
