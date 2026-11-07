import { FONT, H, TAU, W } from '../config';
import { drawFace } from '../face/draw';
import type { Expr, FaceConfig } from '../face/config';
import { particleAlpha, parts } from '../sim/fx';
import { G, O, P, looks } from '../sim/state';
import { formatBoutTime, getRecord, isReducedMotion, settings } from '../settings';
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

function drawHeartIcon(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s, -s * 0.25, -s * 0.55, -s * 0.95, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.55, -s * 0.95, s, -s * 0.25, 0, s * 0.35);
  ctx.fill();
  ctx.restore();
}

/** Draw an animated 2.5D Golden Championship Trophy & 'TROPHY EARNED' badge on canvas. */
function drawTrophyBadge(
  ctx: Ctx,
  cx: number,
  cy: number,
  animT: number,
  grade: string,
  calm: boolean,
): void {
  const pop = clamp(animT / 0.45, 0, 1);
  // Elastic spring overshoot
  const scale =
    pop < 1
      ? 1 - Math.pow(2, -10 * pop) * Math.cos(pop * Math.PI * 2.5)
      : 1 + (calm ? 0 : Math.sin(animT * 4) * 0.03);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Rotating golden sunburst rays behind the trophy
  const rayRot = calm ? 0.2 : animT * 0.7;
  ctx.save();
  ctx.rotate(rayRot);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    const rg = ctx.createLinearGradient(0, 0, 0, -90);
    rg.addColorStop(0, 'rgba(255, 210, 63, 0.42)');
    rg.addColorStop(1, 'rgba(255, 210, 63, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -90);
    ctx.lineTo(12, -90);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Outer medallion halo
  const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 56);
  halo.addColorStop(0, 'rgba(255, 225, 110, 0.55)');
  halo.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, TAU);
  ctx.fill();

  // Trophy handles
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 21, -8, 12, s > 0 ? -Math.PI * 0.45 : Math.PI * 0.55, s > 0 ? Math.PI * 0.45 : -Math.PI * 0.55);
    ctx.stroke();
  }

  // Sculpted Trophy Cup bowl
  const cupGrad = ctx.createLinearGradient(-24, -28, 24, 16);
  cupGrad.addColorStop(0, '#fff3b0');
  cupGrad.addColorStop(0.45, '#ffd23f');
  cupGrad.addColorStop(1, '#c98a00');
  ctx.fillStyle = cupGrad;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, -26);
  ctx.lineTo(24, -26);
  ctx.quadraticCurveTo(22, 8, 0, 12);
  ctx.quadraticCurveTo(-22, 8, -24, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stem & Pedestal Base
  ctx.fillRect(-5, 11, 10, 11);
  ctx.strokeRect(-5, 11, 10, 11);
  ctx.fillStyle = '#3a2218';
  ctx.fillRect(-18, 21, 36, 9);
  ctx.strokeRect(-18, 21, 36, 9);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-12, 24, 24, 3);

  // Star or Grade emblem on the cup
  if (grade) {
    bigText(ctx, grade, 0, -9, 13, '#ffffff');
  } else {
    drawStar(ctx, 0, -9, 8, '#ffffff');
  }

  // Animated 'TROPHY EARNED' Ribbon Pill Banner below the cup
  ctx.fillStyle = '#d62839';
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-94, 32, 188, 22, 6);
  ctx.fill();
  ctx.stroke();

  drawStar(ctx, -78, 43, 6, '#ffd23f');
  drawStar(ctx, 78, 43, 6, '#ffd23f');
  bigText(ctx, 'TROPHY EARNED!', 0, 44, 9, '#ffd23f');

  ctx.restore();
}

export function drawHUD(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(0,0,0,.68)';
  ctx.fillRect(0, 0, W, 56);
  ctx.font = '10px ' + FONT;
  ctx.textBaseline = 'middle';
  portrait(ctx, looks.player.face, playerExpr(), 30, 26, 19, P.flash > 0 ? P.flash * 4 : 0, 0);
  portrait(
    ctx,
    looks.opp.face,
    oppExpr(),
    W - 30,
    26,
    19,
    O.flash > 0 ? O.flash * 4 : 0,
    1 - O.hp / O.maxhp,
  );

  // Player Name & Score
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText('YOU', 58, 12);
  ctx.textAlign = 'right';
  ctx.font = '8px ' + FONT;
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(String(P.score).padStart(6, '0'), 249, 12);

  // Player Health Bar
  bar(ctx, 58, 21, 191, 12, P.hp / 100, P.winded ? '#ff7eb6' : '#38d17a', false);

  // Hearts Stamina & Combo/Counter row
  drawHeartIcon(ctx, 64, 44, 7, P.winded ? '#ff7eb6' : '#ff4d5e');
  ctx.textAlign = 'left';
  ctx.font = '8px ' + FONT;
  ctx.fillStyle = P.winded ? '#ff7eb6' : '#ffffff';
  ctx.fillText(P.winded ? 'WINDED!' : `${P.hearts}/${P.maxHearts}`, 74, 45);

  if (P.counterWin > 0) {
    ctx.fillStyle = '#7dff9b';
    ctx.fillText('COUNTER!', 148, 45);
  } else if (P.combo >= 2) {
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`x${P.combo} COMBO`, 154, 45);
  }

  // Opponent Name & HP Bar
  ctx.textAlign = 'right';
  ctx.font = '10px ' + FONT;
  ctx.fillStyle = '#ffb3b3';
  ctx.fillText(settings.name, W - 58, 12);
  bar(ctx, W - 58 - 191, 21, 191, 12, O.hp / O.maxhp, '#ff5a4d', true);

  // Bout Timer & Knockdowns under Opponent Bar
  ctx.font = '8px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfd6ff';
  ctx.fillText('TIME ' + formatBoutTime(G.boutTime), W - 58 - 191, 45);
  ctx.textAlign = 'right';
  ctx.fillStyle = O.downs > 0 ? '#ffd23f' : '#9aa3d6';
  ctx.fillText(`KD ${O.downs}/2`, W - 58, 45);

  // Center Stars
  for (let i = 0; i < 3; i++)
    drawStar(ctx, W / 2 - 28 + i * 28, 24, 10, i < P.stars ? '#ffd23f' : '#3a3f66');
  if (P.downs > 0) {
    ctx.textAlign = 'center';
    ctx.font = '7px ' + FONT;
    ctx.fillStyle = '#ff9999';
    ctx.fillText(`RALLIES ${2 - P.downs} LEFT`, W / 2, 45);
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
  const calm = isReducedMotion();
  if (G.scene === 'title') {
    const t = ctx.createLinearGradient(0, 0, 0, 135);
    t.addColorStop(0, 'rgba(0,0,10,.82)');
    t.addColorStop(1, 'rgba(0,0,10,0)');
    ctx.fillStyle = t;
    ctx.fillRect(0, 0, W, 135);
    const b = ctx.createLinearGradient(0, 355, 0, H);
    b.addColorStop(0, 'rgba(0,0,10,0)');
    b.addColorStop(1, 'rgba(0,0,10,.88)');
    ctx.fillStyle = b;
    ctx.fillRect(0, 355, W, 125);
    bigText(ctx, 'KNOCKOUT KING', W / 2, 32, 26, '#ffd23f');
    bigText(ctx, 'VS ' + settings.name, W / 2, 62, 13, '#ffffff');
    if (O.f.title) {
      bigText(ctx, O.f.title.toUpperCase(), W / 2, 84, 8, '#8fd0ff');
    }
    const rec = getRecord(O.f.id);
    if (rec.wins > 0) {
      const recordLine = `BEST GRADE: ${rec.bestGrade || '-'}  ·  FASTEST KO: ${formatBoutTime(rec.bestTime)}`;
      bigText(ctx, recordLine, W / 2, 402, 8, '#7dff9b');
    } else if (O.f.quote) {
      bigText(ctx, `"${O.f.quote.toUpperCase()}"`, W / 2, 402, 7, '#ffd23f');
    }
    if (blink()) bigText(ctx, 'PRESS ENTER OR TAP TO FIGHT', W / 2, 432, 13, '#ffffff');
    bigText(ctx, 'DODGE LATE FOR PERFECT COUNTER · WATCH YOUR HEARTS', W / 2, 458, 7, '#cfd6ff');
  } else if (G.scene === 'win' || G.scene === 'lose') {
    if (!G.banner) {
      const win = G.scene === 'win';
      // Celebrate with falling gold confetti sparkles on win
      if (win && !calm) {
        for (let i = 0; i < 18; i++) {
          const cx = ((i * 97 + Math.floor(G.winT * 45) * (i % 3 === 0 ? 1 : -1)) % W + W) % W;
          const cy = 60 + ((i * 53 + G.winT * (65 + (i % 4) * 18)) % (H - 80));
          const col = i % 3 === 0 ? '#ffd23f' : i % 3 === 1 ? '#7dff9b' : '#ff4d5e';
          drawStar(ctx, cx, cy, 5 + (i % 3) * 2, col);
        }
      }

      ctx.fillStyle = 'rgba(6, 9, 32, 0.84)';
      ctx.fillRect(92, 62, W - 184, 336);
      ctx.strokeStyle = win ? '#ffd23f' : '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.strokeRect(92, 62, W - 184, 336);

      if (win) {
        const badgeElapsed = Math.max(0, G.winT - 1.4);
        bigText(ctx, 'VICTORY!', W / 2, 90, 24, '#7dff9b');
        bigText(ctx, settings.name + ' DEFEATED', W / 2, 116, 9, '#cfd6ff');

        drawTrophyBadge(ctx, W / 2, 178, badgeElapsed, G.lastGrade || 'A', calm);

        if (G.newRecord) {
          bigText(ctx, 'NEW CIRCUIT RECORD!', W / 2, 260, 10, '#ffd23f');
        }
        bigText(ctx, `SCORE: ${P.score}`, W / 2, 288, 12, '#ffffff');
        bigText(
          ctx,
          `TIME: ${formatBoutTime(G.boutTime)}  ·  MAX COMBO: x${P.maxCombo}`,
          W / 2,
          314,
          8,
          '#8fd0ff',
        );
        const gradeColor =
          G.lastGrade === 'S' ? '#ffd23f' : G.lastGrade === 'A' ? '#7dff9b' : '#8fd0ff';
        bigText(ctx, `BOUT GRADE: ${G.lastGrade || 'A'}`, W / 2, 344, 14, gradeColor);
      } else {
        bigText(ctx, 'YOU LOSE', W / 2, 110, 28, '#ff6b6b');
        bigText(ctx, 'VS ' + settings.name, W / 2, 148, 10, '#cfd6ff');
        bigText(ctx, `SCORE: ${P.score}`, W / 2, 198, 12, '#ffffff');
        bigText(
          ctx,
          `TIME: ${formatBoutTime(G.boutTime)}  ·  MAX COMBO: x${P.maxCombo}`,
          W / 2,
          230,
          9,
          '#8fd0ff',
        );
        bigText(ctx, `KNOCKDOWNS SCORED: ${O.downs}/2`, W / 2, 274, 10, '#ffb3b3');
      }

      if (G.wait <= 0 && blink())
        bigText(
          ctx,
          'ENTER OR TAP: ' + (win ? 'REMATCH / NEXT RIVAL' : 'TRY AGAIN'),
          W / 2,
          442,
          11,
          '#ffffff',
        );
    }
  } else if (G.scene === 'fight' && O.st === 'down' && O.count >= 1) {
    bigText(ctx, String(O.count), W / 2, H / 2 - 10, 70, '#ffffff');
  } else if (G.scene === 'fight' && G.playerDown) {
    ctx.fillStyle = 'rgba(10, 4, 24, 0.55)';
    ctx.fillRect(0, 56, W, H - 56);
    if (P.count >= 1) {
      bigText(ctx, String(P.count), W / 2, H / 2 - 40, 64, '#ff6b6b');
    }
    bigText(ctx, 'MASH PUNCH OR DODGE TO RISE!', W / 2, H / 2 + 34, 12, '#ffd23f');
    bar(ctx, W / 2 - 130, H / 2 + 56, 260, 18, P.rally, '#7dff9b', false);
  }
}

export function drawPause(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(4,6,26,.72)';
  ctx.fillRect(0, 0, W, H);
  bigText(ctx, 'PAUSED', W / 2, H / 2 - 20, 34, '#ffd23f');
  bigText(ctx, 'PRESS P OR ESC, OR TAP, TO RESUME', W / 2, H / 2 + 36, 10, '#ffffff');
}
