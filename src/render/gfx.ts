import { FONT, TAU } from '../config';

type Ctx = CanvasRenderingContext2D;

export function bigText(
  ctx: Ctx,
  txt: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size / 5);
  ctx.strokeStyle = '#000';
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
}

function starPath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawStar(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  starPath(ctx, x, y, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A boxing glove. `flip` mirrors the thumb, `cuff` > 0 puts the cuff below instead of above. */
export function glove(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  c1: string,
  c2: string,
  glow: number,
  flip: number,
  cuff: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (glow > 0.02) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 72);
    g.addColorStop(0, 'rgba(255,230,80,' + 0.85 * glow + ')');
    g.addColorStop(1, 'rgba(255,230,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, TAU);
    ctx.fill();
  }
  const gr = ctx.createRadialGradient(-10, -12, 4, 0, 0, 36);
  gr.addColorStop(0, c1);
  gr.addColorStop(1, c2);
  ctx.fillStyle = gr;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 28, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.scale(flip, 1);
  ctx.beginPath();
  ctx.ellipse(-19, 6, 10, 14, 0.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#f4f4f4';
  const cy = cuff > 0 ? 22 : -32;
  ctx.fillRect(-20, cy, 40, 10);
  ctx.strokeRect(-20, cy, 40, 10);
  ctx.restore();
}
