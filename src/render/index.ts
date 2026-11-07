import { H, W } from '../config';
import { isReducedMotion } from '../settings';
import { G, O, P } from '../sim/state';
import { clamp } from '../util/math';
import { rand } from '../util/random';
import { drawFloorShadows, drawRing25D } from './background';
import { drawBanner, drawHUD, drawOverlays, drawParticles, drawPause } from './hud';
import { drawOpponent } from './opponent';
import { drawPlayer } from './player';

let curZoom = 1;

/** Draw one frame. `scale` maps logical (640x480) coordinates onto the sharp backing store. */
export function render(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement, scale: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const calm = isReducedMotion();

  // Smooth 2.5D dynamic camera zoom & subtle weave tilt
  let targetZoom = 1;
  if (!calm && G.scene === 'fight') {
    if (P.punch?.big) targetZoom = 1.065;
    else if (P.counterWin > 0) targetZoom = 1.045;
    else if (O.st === 'down') targetZoom = 1.035;
  }
  curZoom += (targetZoom - curZoom) * 0.14;

  ctx.save();
  if (G.shake > 0) {
    const sh = G.shake * (calm ? 0.15 : 0.5);
    ctx.translate(rand(-sh, sh), rand(-sh, sh));
  }

  if (!calm && (Math.abs(curZoom - 1) > 0.001 || Math.abs(P.x) > 0.5)) {
    const tilt = clamp((-P.x / 80) * 0.012, -0.015, 0.015);
    ctx.translate(W / 2, H / 2);
    ctx.scale(curZoom, curZoom);
    ctx.rotate(tilt);
    ctx.translate(-W / 2, -H / 2);
  }

  drawRing25D(ctx, bg);
  drawFloorShadows(ctx);
  drawOpponent(ctx);
  drawPlayer(ctx);
  drawParticles(ctx);
  ctx.restore();

  if (P.counterWin > 0 && !calm) {
    // Subtle golden-emerald counter aura around the screen edge
    const g = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 390);
    g.addColorStop(0, 'rgba(125, 255, 155, 0)');
    g.addColorStop(1, 'rgba(125, 255, 155, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (P.flash > 0) {
    // Full-screen red flash, softened to a faint tint when reduced motion is on.
    ctx.fillStyle = 'rgba(255,0,0,' + (calm ? 0.07 : 0.28) * (P.flash / 0.45) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.scene !== 'title') drawHUD(ctx);
  drawBanner(ctx);
  drawOverlays(ctx);
  if (G.paused) drawPause(ctx);
}
