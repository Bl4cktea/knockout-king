import { H, W } from '../config';
import { drawFace } from '../face/draw';
import { bodyTone } from '../face/palette';
import { isReducedMotion } from '../settings';
import { isBlocking } from '../sim/geometry';
import { G, OH, P, looks } from '../sim/state';
import { shade } from '../util/color';
import { clamp, lerp } from '../util/math';
import { playerExpr } from './expr';
import { glove } from './gfx';

type Ctx = CanvasRenderingContext2D;

interface GlovePose {
  x: number;
  y: number;
  s: number;
  glow: number;
}

/** The player is drawn from behind, at the bottom of the screen. */
export function drawPlayer(ctx: Ctx): void {
  const look = looks.player;
  const tone = bodyTone(look.face.skin);
  const calm = isReducedMotion();
  const x = W / 2 + P.x;
  const fall = P.fall;
  const fy = fall * 170;
  const hurt = P.flash > 0;
  // Flicker when hurt, except for people who asked for less motion: then it is a steady dim.
  const flick = hurt && (calm ? true : Math.floor(G.time * 28) % 2 === 0);

  ctx.save();
  ctx.translate(x, H + fy);
  ctx.rotate((P.x / 80) * 0.05 + fall * 0.35);
  ctx.globalAlpha = flick ? (calm ? 0.6 : 0.4) : 0.88;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1a0a0a';

  const edge = shade(tone.base, -0.15);
  const g = ctx.createLinearGradient(-100, 0, 100, 0);
  g.addColorStop(0, edge);
  g.addColorStop(0.5, tone.base);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-96, 0);
  ctx.lineTo(-102, -34);
  ctx.quadraticCurveTo(-98, -66, -54, -72);
  ctx.lineTo(54, -72);
  ctx.quadraticCurveTo(98, -66, 102, -34);
  ctx.lineTo(96, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.strokeStyle = '#1a0a0a';
  ctx.fillStyle = look.trunks;
  ctx.fillRect(-98, -26, 196, 60);
  ctx.strokeRect(-98, -26, 196, 60);
  ctx.fillStyle = look.trim;
  ctx.fillRect(-98, -26, 196, 9);
  ctx.strokeRect(-98, -26, 196, 9);

  // head, drawn large so the face is clearly visible
  ctx.save();
  ctx.translate(0, -100);
  ctx.scale(0.54, 0.54);
  ctx.globalAlpha = 1;
  drawFace(ctx, look.face, {
    expr: playerExpr(),
    t: G.time,
    damage: 1 - P.hp / 100,
    flash: flick ? 0.4 : 0,
    flashColor: '#ff2828',
  });
  ctx.restore();
  ctx.restore();

  // gloves
  let Lg: GlovePose;
  let Rg: GlovePose;
  if (isBlocking()) {
    Lg = { x: x - 30, y: H - 112, s: 1.4, glow: 0 };
    Rg = { x: x + 30, y: H - 112, s: 1.4, glow: 0 };
  } else {
    const bob = Math.sin(G.time * 5) * 3;
    Lg = { x: x - 72, y: H - 70 + bob, s: 1.2, glow: 0 };
    Rg = { x: x + 72, y: H - 70 - bob, s: 1.2, glow: 0 };
  }
  if (P.punch) {
    const p = P.punch;
    const e = Math.sin(Math.PI * clamp(p.t / 0.26, 0, 1)) * 0.92;
    const gl = p.hand < 0 ? Lg : Rg;
    gl.x = lerp(gl.x, W / 2 + OH.ox + p.hand * 26, e);
    gl.y = lerp(gl.y, 215, e);
    gl.s = lerp(gl.s, p.big ? 1.5 : 0.85, e);
    if (p.big) gl.glow = e;
  }
  const [g1, g2] = look.gloves;
  glove(ctx, Lg.x, Lg.y + fy, Lg.s, g1, g2, Lg.glow, -1, 1);
  glove(ctx, Rg.x, Rg.y + fy, Rg.s, g1, g2, Rg.glow, 1, 1);
}
