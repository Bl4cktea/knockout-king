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

/** The player is drawn from behind, at the bottom of the screen, with 2.5D back musculature. */
export function drawPlayer(ctx: Ctx): void {
  const look = looks.player;
  const tone = bodyTone(look.face.skin);
  const calm = isReducedMotion();
  const x = W / 2 + P.x;
  const fall = P.fall;
  const fy = fall * 170;
  const hurt = P.flash > 0;
  const winded = P.winded;
  const punchTwist = P.punch ? P.punch.hand * Math.sin(Math.PI * clamp(P.punch.t / 0.26, 0, 1)) * 10 : 0;
  // Flicker when hurt, except for people who asked for less motion: then it is a steady dim.
  const flick = hurt && (calm ? true : Math.floor(G.time * 28) % 2 === 0);

  ctx.save();
  ctx.translate(x + punchTwist * 0.4, H + fy);
  ctx.rotate((P.x / 80) * 0.05 + punchTwist * 0.004 + fall * 0.35);
  ctx.globalAlpha = flick ? (calm ? 0.6 : 0.4) : isBlocking() ? 0.78 : 0.9;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1a0a0a';

  const baseSkin = winded ? '#ff7eb6' : tone.base;
  const edge = shade(baseSkin, -0.2);
  const highlight = shade(baseSkin, 0.14);
  const g = ctx.createRadialGradient(0, -54, 12, 0, -25, 115);
  g.addColorStop(0, highlight);
  g.addColorStop(0.55, baseSkin);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;

  // Sculpted V-taper back and rounded deltoid shoulders
  ctx.beginPath();
  ctx.moveTo(-94, 0);
  ctx.lineTo(-108, -38);
  ctx.quadraticCurveTo(-104, -72, -58, -76);
  ctx.lineTo(58, -76);
  ctx.quadraticCurveTo(104, -72, 108, -38);
  ctx.lineTo(94, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shoulder blade & spine anatomical contours
  ctx.strokeStyle = 'rgba(0,0,0,.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.lineTo(0, -30);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 22, -62);
    ctx.quadraticCurveTo(s * 46, -54, s * 64, -36);
    ctx.stroke();
  }

  // Rim light along the top of the shoulders
  ctx.strokeStyle = P.counterWin > 0 ? 'rgba(125, 255, 155, 0.55)' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-88, -64);
  ctx.quadraticCurveTo(-55, -74, -26, -74);
  ctx.moveTo(26, -74);
  ctx.quadraticCurveTo(55, -74, 88, -64);
  ctx.stroke();

  // Satin Player Trunks & Trim
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 3.5;
  const trGrad = ctx.createLinearGradient(-98, 0, 98, 0);
  trGrad.addColorStop(0, shade(look.trunks, -0.22));
  trGrad.addColorStop(0.5, shade(look.trunks, 0.12));
  trGrad.addColorStop(1, shade(look.trunks, -0.22));
  ctx.fillStyle = trGrad;
  ctx.fillRect(-98, -26, 196, 60);
  ctx.strokeRect(-98, -26, 196, 60);
  ctx.fillStyle = look.trim;
  ctx.fillRect(-98, -26, 196, 10);
  ctx.strokeRect(-98, -26, 196, 10);

  // Head, drawn large so the face is clearly visible
  ctx.save();
  ctx.translate(punchTwist * 0.25, -102);
  ctx.scale(0.54, 0.54);
  ctx.globalAlpha = 1;
  drawFace(ctx, look.face, {
    expr: playerExpr(),
    t: G.time,
    damage: 1 - P.hp / 100,
    flash: flick ? 0.4 : winded ? 0.45 : 0,
    flashColor: winded ? '#ff66b2' : '#ff2828',
  });
  ctx.restore();
  ctx.restore();

  // Gloves & Punch Motion Arc
  const counterGlow = P.counterWin > 0 ? (calm ? 0.8 : 0.55 + 0.45 * Math.sin(G.time * 24)) : 0;
  let Lg: GlovePose;
  let Rg: GlovePose;
  if (isBlocking()) {
    Lg = { x: x - 30, y: H - 112, s: 1.4, glow: counterGlow };
    Rg = { x: x + 30, y: H - 112, s: 1.4, glow: counterGlow };
  } else {
    const bob = Math.sin(G.time * 5) * 3;
    const drop = winded ? 18 : 0;
    Lg = { x: x - 72, y: H - 70 + bob + drop, s: 1.2, glow: counterGlow };
    Rg = { x: x + 72, y: H - 70 - bob + drop, s: 1.2, glow: counterGlow };
  }
  if (P.punch) {
    const p = P.punch;
    const e = Math.sin(Math.PI * clamp(p.t / 0.26, 0, 1)) * 0.92;
    const gl = p.hand < 0 ? Lg : Rg;
    const startX = gl.x;
    const startY = gl.y;
    gl.x = lerp(gl.x, W / 2 + OH.ox + p.hand * 26, e);
    gl.y = lerp(gl.y, 215, e);
    gl.s = lerp(gl.s, p.big ? 1.5 : 0.85, e);
    if (p.big) gl.glow = e;

    // Speed trail arc behind the punching glove
    if (!calm && e > 0.2) {
      ctx.save();
      ctx.strokeStyle = p.big ? 'rgba(255, 210, 63, 0.45)' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = p.big ? 18 : 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY + fy);
      ctx.quadraticCurveTo(
        (startX + gl.x) * 0.5 + p.hand * 22,
        (startY + gl.y) * 0.5 + fy,
        gl.x,
        gl.y + fy,
      );
      ctx.stroke();
      ctx.restore();
    }
  }
  const [g1, g2] = winded ? ['#ff7eb6', '#b5179e'] : look.gloves;
  glove(ctx, Lg.x, Lg.y + fy, Lg.s, g1, g2, Lg.glow, -1, 1);
  glove(ctx, Rg.x, Rg.y + fy, Rg.s, g1, g2, Rg.glow, 1, 1);
}
