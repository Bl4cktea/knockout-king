import { H, W } from '../config';
import { isReducedMotion } from '../settings';
import { G, P } from '../sim/state';
import { rand } from '../util/random';
import { drawBanner, drawHUD, drawOverlays, drawParticles, drawPause } from './hud';
import { drawOpponent } from './opponent';
import { drawPlayer } from './player';

/** Draw one frame. `scale` maps logical (640x480) coordinates onto the sharp backing store. */
export function render(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement, scale: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const calm = isReducedMotion();
  ctx.save();
  if (G.shake > 0) {
    const sh = G.shake * (calm ? 0.15 : 0.5);
    ctx.translate(rand(-sh, sh), rand(-sh, sh));
  }
  ctx.drawImage(bg, 0, 0, W, H);
  drawOpponent(ctx);
  drawPlayer(ctx);
  drawParticles(ctx);
  ctx.restore();
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
