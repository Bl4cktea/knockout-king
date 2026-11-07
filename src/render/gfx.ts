import { FONT, TAU } from '../config';
import { shade } from '../util/color';

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

/**
 * 2.5D sculpted leather boxing glove with specular knuckle highlight, contoured thumb,
 * and taped wrist cuff. `flip` mirrors the thumb, `cuff` > 0 puts the cuff below instead of above.
 */
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
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 74);
    g.addColorStop(0, 'rgba(255,230,80,' + 0.88 * glow + ')');
    g.addColorStop(0.55, 'rgba(255,180,40,' + 0.35 * glow + ')');
    g.addColorStop(1, 'rgba(255,230,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, TAU);
    ctx.fill();
  }

  const darkRim = shade(c2, -0.25);
  const gr = ctx.createRadialGradient(-10 * flip, -14, 3, 0, 2, 38);
  gr.addColorStop(0, shade(c1, 0.22));
  gr.addColorStop(0.45, c1);
  gr.addColorStop(0.85, c2);
  gr.addColorStop(1, darkRim);

  // Main padded leather dome
  ctx.fillStyle = gr;
  ctx.strokeStyle = '#140808';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 29, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Knuckle ridge crease & specular leather shine
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -2, 21, -Math.PI * 0.78, -Math.PI * 0.22);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-7 * flip, -13, 12, 5.5, -0.25 * flip, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Contoured thumb lobe
  ctx.save();
  ctx.scale(flip, 1);
  const tGr = ctx.createRadialGradient(-18, 2, 2, -19, 6, 16);
  tGr.addColorStop(0, c1);
  tGr.addColorStop(1, darkRim);
  ctx.fillStyle = tGr;
  ctx.beginPath();
  ctx.ellipse(-20, 6, 10.5, 14.5, 0.48, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Contoured wrist cuff with championship stripe & laces
  const cy = cuff > 0 ? 20 : -33;
  const cuffGrad = ctx.createLinearGradient(-22, cy, 22, cy);
  cuffGrad.addColorStop(0, '#cfd4e6');
  cuffGrad.addColorStop(0.5, '#ffffff');
  cuffGrad.addColorStop(1, '#b8c0d8');
  ctx.fillStyle = cuffGrad;
  ctx.beginPath();
  ctx.roundRect(-21, cy, 42, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Accent trim band on the cuff
  ctx.fillStyle = c2;
  ctx.fillRect(-19, cy + 4, 38, 4);
  ctx.restore();
}
