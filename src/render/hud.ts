import { FONT, H, TAU, W } from '../config';
import { drawFace } from '../face/draw';
import type { Expr, FaceConfig } from '../face/config';
import { particleAlpha, parts } from '../sim/fx';
import { G, O, P, looks } from '../sim/state';
import { isReducedMotion, settings } from '../settings';
import { bodyTone } from '../face/palette';
import { clamp } from '../util/math';
import { oppExpr, playerExpr } from './expr';
import { bigText, drawStar } from './gfx';

type Ctx = CanvasRenderingContext2D;

function portrait(
  ctx: Ctx,
  face: FaceConfig,
  expr: Expr,
  cx: number,
  cy: number,
  r: number,
  hurt: number,
  damage: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = bodyTone(face.skin).dark;
  ctx.fill();
  ctx.clip();
  const s = r / 60;
  ctx.translate(cx, cy - 8 * s);
  ctx.scale(s, s);
  drawFace(ctx, face, { expr, t: G.time, damage });
  ctx.restore();
  if (hurt > 0) {
    ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.5, hurt) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.stroke();
}

function bar(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: string,
  rtl: boolean,
): void {
  pct = clamp(pct, 0, 1);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#3a1620';
  ctx.fillRect(x, y, w, h);
  const fx = rtl ? x + w * (1 - pct) : x;
  ctx.fillStyle = pct < 0.25 ? '#ffb000' : color;
  ctx.fillRect(fx, y, w * pct, h);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(fx, y, w * pct, 4);
}

export function drawHUD(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, 0, W, 48);
  ctx.font = '10px ' + FONT;
  ctx.textBaseline = 'middle';
  portrait(ctx, looks.player.face, playerExpr(), 30, 24, 19, P.flash > 0 ? P.flash * 4 : 0, 0);
  portrait(
    ctx,
    looks.opp.face,
    oppExpr(),
    W - 30,
    24,
    19,
    O.flash > 0 ? O.flash * 4 : 0,
    1 - O.hp / O.maxhp,
  );
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText('YOU', 58, 13);
  bar(ctx, 58, 25, 191, 14, P.hp / 100, '#38d17a', false);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffb3b3';
  ctx.fillText(settings.name, W - 58, 13);
  bar(ctx, W - 58 - 191, 25, 191, 14, O.hp / O.maxhp, '#ff5a4d', true);
  for (let i = 0; i < 3; i++)
    drawStar(ctx, W / 2 - 28 + i * 28, 26, 10, i < P.stars ? '#ffd23f' : '#3a3f66');
  if (O.downs > 0) {
    ctx.textAlign = 'center';
    ctx.font = '8px ' + FONT;
    ctx.fillStyle = '#ffb3b3';
    ctx.fillText('KD ' + O.downs, W / 2, 6);
  }
}

export function drawParticles(ctx: Ctx): void {
  for (const p of parts) {
    ctx.globalAlpha = particleAlpha(p);
    if (p.k === 's') drawStar(ctx, p.x, p.y, p.size, p.color);
    else if (p.k === 'd') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, TAU);
      ctx.fill();
    } else bigText(ctx, p.text ?? '', p.x, p.y, p.size, p.color);
  }
  ctx.globalAlpha = 1;
}

export function drawBanner(ctx: Ctx): void {
  const b = G.banner;
  if (!b) return;
  const p = b.t / b.dur;
  const s = 1 + (isReducedMotion() ? 0.1 : 0.4) * Math.max(0, 1 - p * 6);
  ctx.save();
  ctx.translate(W / 2, H / 2 - 30);
  ctx.scale(s, s);
  ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
  bigText(ctx, b.text, 0, 0, b.size, b.color);
  ctx.restore();
}

/** Slow on/off prompt blink (twice a second), calm enough for everyone. */
const blink = (): boolean => Math.floor(G.time * 2) % 2 === 0;

export function drawOverlays(ctx: Ctx): void {
  if (G.scene === 'title') {
    const t = ctx.createLinearGradient(0, 0, 0, 120);
    t.addColorStop(0, 'rgba(0,0,10,.75)');
    t.addColorStop(1, 'rgba(0,0,10,0)');
    ctx.fillStyle = t;
    ctx.fillRect(0, 0, W, 120);
    const b = ctx.createLinearGradient(0, 380, 0, H);
    b.addColorStop(0, 'rgba(0,0,10,0)');
    b.addColorStop(1, 'rgba(0,0,10,.8)');
    ctx.fillStyle = b;
    ctx.fillRect(0, 380, W, 100);
    bigText(ctx, 'KNOCKOUT KING', W / 2, 36, 26, '#ffd23f');
    bigText(ctx, 'VS ' + settings.name, W / 2, 68, 12, '#ffffff');
    if (blink()) bigText(ctx, 'PRESS ENTER OR TAP TO FIGHT', W / 2, 430, 13, '#ffffff');
    bigText(ctx, 'PUNCH WHEN HIS GLOVES DROP', W / 2, 458, 8, '#cfd6ff');
  } else if (G.scene === 'win' || G.scene === 'lose') {
    if (!G.banner) {
      const win = G.scene === 'win';
      bigText(ctx, win ? 'YOU WIN!' : 'YOU LOSE', W / 2, 70, 28, win ? '#7dff9b' : '#ff6b6b');
      if (G.wait <= 0 && blink())
        bigText(ctx, 'ENTER OR TAP: ' + (win ? 'REMATCH' : 'TRY AGAIN'), W / 2, 440, 12, '#ffffff');
    }
  } else if (G.scene === 'fight' && O.st === 'down' && O.count >= 1) {
    bigText(ctx, String(O.count), W / 2, H / 2 - 10, 70, '#ffffff');
  }
}

export function drawPause(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(4,6,26,.72)';
  ctx.fillRect(0, 0, W, H);
  bigText(ctx, 'PAUSED', W / 2, H / 2 - 20, 34, '#ffd23f');
  bigText(ctx, 'PRESS P OR ESC, OR TAP, TO RESUME', W / 2, H / 2 + 36, 10, '#ffffff');
}
