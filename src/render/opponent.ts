import { W } from '../config';
import { drawFace } from '../face/draw';
import { bodyTone } from '../face/palette';
import { isReducedMotion } from '../settings';
import { G, O, OG, OH, looks } from '../sim/state';
import { clamp } from '../util/math';
import { oppExpr } from './expr';
import { bigText, drawStar, glove } from './gfx';

type Ctx = CanvasRenderingContext2D;

function arm(
  ctx: Ctx,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  sign: number,
  skin: string,
): void {
  const cx = (sx + gx) / 2 + sign * 45;
  const cy = (sy + gy) / 2 + 25;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, gx, gy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, gx, gy);
  ctx.stroke();
}

export function drawOpponent(ctx: Ctx): void {
  const look = looks.opp;
  const tone = bodyTone(look.face.skin);
  const calm = isReducedMotion();
  ctx.save();
  const dr = clamp(O.downY / 330, 0, 1);
  ctx.translate(W / 2 + OH.ox * 0.4, 172 + O.downY);
  ctx.rotate(dr * 0.35);
  ctx.lineJoin = 'round';

  // neck + torso
  ctx.fillStyle = tone.dark;
  ctx.fillRect(-26, 70, 52, 70);
  const tg = ctx.createLinearGradient(-100, 0, 100, 0);
  tg.addColorStop(0, tone.dark);
  tg.addColorStop(0.5, tone.light);
  tg.addColorStop(1, tone.dark);
  ctx.fillStyle = tg;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-108, 150);
  ctx.quadraticCurveTo(0, 92, 108, 150);
  ctx.lineTo(84, 320);
  ctx.lineTo(-84, 320);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(0, 225);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-36, 168, 36, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(36, 168, 36, 0.25, Math.PI - 0.25);
  ctx.stroke();

  // trunks
  ctx.fillStyle = look.trunks;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-88, 262);
  ctx.lineTo(88, 262);
  ctx.lineTo(114, 430);
  ctx.lineTo(-114, 430);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = look.trim;
  ctx.fillRect(-90, 254, 180, 20);
  ctx.strokeRect(-90, 254, 180, 20);

  // arms
  arm(ctx, -100, 142, OG.L.x, OG.L.y, -1, tone.light);
  arm(ctx, 100, 142, OG.R.x, OG.R.y, 1, tone.light);

  // head (squashes on impact)
  ctx.save();
  ctx.translate(OH.ox * 0.6, OH.oy);
  const sq = O.hitT > 0 ? 1 + 0.05 * (O.hitT / 0.22) : 1;
  ctx.rotate(OH.rot);
  ctx.scale(sq, 2 - sq);
  drawFace(ctx, look.face, {
    expr: oppExpr(),
    t: G.time,
    damage: 1 - O.hp / O.maxhp,
    flash: clamp(O.flash * 5, 0, 0.7) * (calm ? 0.3 : 1),
  });
  ctx.restore();
  if (O.st === 'stunned') {
    ctx.save();
    ctx.translate(OH.ox * 0.6, OH.oy);
    for (let i = 0; i < 3; i++) {
      const a = G.time * 5 + i * 2.09;
      drawStar(ctx, Math.cos(a) * 72, -104 + Math.sin(a) * 14, 9, '#ffd23f');
    }
    ctx.restore();
  }

  // gloves
  const [g1, g2] = look.gloves;
  glove(ctx, OG.L.x, OG.L.y, OG.L.s, g1, g2, OG.L.glow, -1, -1);
  glove(ctx, OG.R.x, OG.R.y, OG.R.s, g1, g2, OG.R.glow, 1, -1);

  // telegraph marker
  if (O.st === 'tele') {
    const pulse = calm ? 1 : 1 + 0.2 * Math.sin(G.time * 30);
    const mx = O.atk === 'L' ? -185 : O.atk === 'R' ? 185 : 112;
    const my = O.atk === 'S' ? -30 : 60;
    bigText(ctx, '!', mx, my, Math.round(44 * pulse), '#ffd23f');
  }
  ctx.restore();
}
