import { W } from '../config';
import { drawFace } from '../face/draw';
import { bodyTone } from '../face/palette';
import { isReducedMotion } from '../settings';
import { G, O, OG, OH, looks } from '../sim/state';
import { shade } from '../util/color';
import { clamp } from '../util/math';
import { oppExpr } from './expr';
import { bigText, drawStar, glove } from './gfx';

type Ctx = CanvasRenderingContext2D;

/** Anatomical 2-segment muscular arm (deltoid shoulder + bicep + forearm). */
function arm(
  ctx: Ctx,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  sign: number,
  skinLight: string,
  skinDark: string,
): void {
  const ex = (sx + gx) * 0.5 + sign * 42;
  const ey = (sy + gy) * 0.5 + 26;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Deltoid shoulder cap
  const dGrad = ctx.createRadialGradient(sx - sign * 6, sy - 8, 4, sx, sy, 28);
  dGrad.addColorStop(0, shade(skinLight, 0.12));
  dGrad.addColorStop(0.65, skinLight);
  dGrad.addColorStop(1, skinDark);
  ctx.fillStyle = dGrad;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Outer outline for bicep -> forearm
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(ex, ey, gx, gy);
  ctx.stroke();

  // Shaded muscular arm fill
  const aGrad = ctx.createLinearGradient(sx - sign * 20, sy, gx + sign * 20, gy);
  aGrad.addColorStop(0, skinDark);
  aGrad.addColorStop(0.45, skinLight);
  aGrad.addColorStop(1, skinDark);
  ctx.strokeStyle = aGrad;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(ex, ey, gx, gy);
  ctx.stroke();

  // Bicep highlight ridge
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(sx + sign * 4, sy + 4);
  ctx.quadraticCurveTo(ex, ey - 4, (ex + gx) * 0.5, (ey + gy) * 0.5);
  ctx.stroke();
  ctx.restore();
}

export function drawOpponent(ctx: Ctx): void {
  const look = looks.opp;
  const tone = bodyTone(look.face.skin);
  const calm = isReducedMotion();
  const breath = calm ? 0 : Math.sin(G.time * 3.6) * 2.5;

  ctx.save();
  const dr = clamp(O.downY / 330, 0, 1);
  ctx.translate(W / 2 + OH.ox * 0.4, 172 + O.downY);
  ctx.rotate(dr * 0.35);
  ctx.lineJoin = 'round';

  // Sculpted trapezius & neck with cast chin shadow
  const neckGrad = ctx.createLinearGradient(-48, 70, 48, 130);
  neckGrad.addColorStop(0, tone.dark);
  neckGrad.addColorStop(0.5, tone.base);
  neckGrad.addColorStop(1, tone.dark);
  ctx.fillStyle = neckGrad;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-28, 66);
  ctx.lineTo(28, 66);
  ctx.lineTo(68, 128);
  ctx.lineTo(-68, 128);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Under-chin shadow
  ctx.fillStyle = 'rgba(10, 6, 20, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 86, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2.5D Sculpted Torso (V-taper lats + chest + abs)
  const tg = ctx.createRadialGradient(0, 155 + breath, 16, 0, 195, 135);
  tg.addColorStop(0, shade(tone.light, 0.12));
  tg.addColorStop(0.58, tone.light);
  tg.addColorStop(1, tone.dark);
  ctx.fillStyle = tg;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-110, 146 + breath * 0.5);
  ctx.quadraticCurveTo(0, 90 + breath, 110, 146 + breath * 0.5);
  ctx.lineTo(84, 320);
  ctx.lineTo(-84, 320);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Volumetric Pectoral Shading & Highlights
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.beginPath();
    ctx.ellipse(s * 42, 152 + breath, 30, 18, s * -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chest & Abdominal muscle definition lines
  ctx.strokeStyle = 'rgba(20, 8, 12, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 126 + breath);
  ctx.lineTo(0, 248);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-40, 164 + breath, 38, 0.22, Math.PI - 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(40, 164 + breath, 38, 0.22, Math.PI - 0.22);
  ctx.stroke();

  // 6-pack abdominal creases
  for (const ay of [198, 220, 242]) {
    ctx.beginPath();
    ctx.moveTo(-26, ay + breath * 0.4);
    ctx.quadraticCurveTo(0, ay - 4 + breath * 0.4, 26, ay + breath * 0.4);
    ctx.stroke();
  }

  // Satin Boxing Trunks with 3D folds & Championship Belt
  const trunkGrad = ctx.createLinearGradient(-110, 260, 110, 260);
  trunkGrad.addColorStop(0, shade(look.trunks, -0.25));
  trunkGrad.addColorStop(0.3, look.trunks);
  trunkGrad.addColorStop(0.5, shade(look.trunks, 0.18));
  trunkGrad.addColorStop(0.7, look.trunks);
  trunkGrad.addColorStop(1, shade(look.trunks, -0.25));
  ctx.fillStyle = trunkGrad;
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

  // Side satin stripes on trunks
  ctx.fillStyle = look.trim;
  ctx.fillRect(-98, 274, 10, 140);
  ctx.fillRect(88, 274, 10, 140);

  // Waistband & Championship Gold Medallion
  ctx.fillStyle = look.trim;
  ctx.fillRect(-90, 252, 180, 22);
  ctx.strokeRect(-90, 252, 180, 22);

  ctx.fillStyle = O.f.id === 'champ' ? '#ffd23f' : shade(look.trim, -0.15);
  ctx.beginPath();
  ctx.ellipse(0, 263, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (O.f.id === 'champ') {
    drawStar(ctx, 0, 263, 7, '#d62839');
  }

  // Sculpted 2-segment arms
  arm(ctx, -102, 144 + breath * 0.5, OG.L.x, OG.L.y, -1, tone.light, tone.dark);
  arm(ctx, 102, 144 + breath * 0.5, OG.R.x, OG.R.y, 1, tone.light, tone.dark);

  // Head (squashes on impact)
  ctx.save();
  ctx.translate(OH.ox * 0.6, OH.oy);
  const sq = O.hitT > 0 ? 1 + 0.06 * (O.hitT / 0.22) : 1;
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

  // 2.5D Leather Gloves
  const [g1, g2] = look.gloves;
  glove(ctx, OG.L.x, OG.L.y, OG.L.s, g1, g2, OG.L.glow, -1, -1);
  glove(ctx, OG.R.x, OG.R.y, OG.R.s, g1, g2, OG.R.glow, 1, -1);

  // Telegraph marker + directional wind-up arc
  if (O.st === 'tele') {
    const pulse = calm ? 1 : 1 + 0.2 * Math.sin(G.time * 30);
    const mx = O.atk === 'L' ? -185 : O.atk === 'R' ? 185 : 112;
    const my = O.atk === 'S' ? -30 : 60;
    const perfectReady = O.timer <= 0.22;
    bigText(ctx, '!', mx, my, Math.round(44 * pulse), perfectReady ? '#7dff9b' : '#ffd23f');
  }
  ctx.restore();
}
