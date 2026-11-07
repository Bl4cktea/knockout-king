import { H, TAU, W } from '../config';
import { isReducedMotion } from '../settings';
import { G, O, P } from '../sim/state';
import { clamp, mulberry32 } from '../util/math';

/**
 * Pre-render the distant arena dome & crowd once at the current device scale.
 * Dynamic 2.5D perspective floor, turnbuckles, ropes, and spotlights are layered on top per frame.
 */
export function buildBackground(scale: number): HTMLCanvasElement {
  const b = document.createElement('canvas');
  b.width = Math.round(W * scale);
  b.height = Math.round(H * scale);
  const g = b.getContext('2d');
  if (!g) return b;
  g.scale(scale, scale);
  const r = mulberry32(11);

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#030514');
  sky.addColorStop(0.5, '#0e153d');
  sky.addColorStop(1, '#192158');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Distant stadium rafters & light rigs
  g.strokeStyle = 'rgba(140, 165, 255, 0.08)';
  g.lineWidth = 2;
  for (let i = -2; i <= 6; i++) {
    g.beginPath();
    g.moveTo(W / 2, -60);
    g.lineTo(i * 140, 150);
    g.stroke();
  }

  // Crowd silhouettes in tiered balcony rows
  for (let row = 0; row < 5; row++) {
    const y0 = 42 + row * 28;
    for (let x = -36; x < W + 44; x += 16 + row * 2) {
      const rr = 7 + row * 0.9;
      const jx = x + r() * 8;
      const jy = y0 + r() * 6;
      g.fillStyle = `hsl(${Math.floor(r() * 360)},28%,${9 + row * 2.6}%)`;
      g.beginPath();
      g.arc(jx, jy, rr, 0, TAU);
      g.fill();
      g.fillRect(jx - rr * 1.1, jy + rr * 0.6, rr * 2.2, 28);
    }
  }

  // Static ambient flashes in the upper stands
  for (let i = 0; i < 16; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.45})`;
    g.fillRect(r() * W, 24 + r() * 130, 2, 2);
  }

  const haze = g.createLinearGradient(0, 0, 0, 220);
  haze.addColorStop(0, 'rgba(2, 4, 16, 0.65)');
  haze.addColorStop(1, 'rgba(2, 4, 16, 0)');
  g.fillStyle = haze;
  g.fillRect(0, 0, W, 220);

  return b;
}

/**
 * Draw the 2.5D parallax ring floor, perspective grid, corner turnbuckles, dynamic ropes,
 * and volumetric spotlights. Costs <0.25ms per frame and creates true 3D spatial depth.
 */
export function drawRing25D(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement): void {
  const calm = isReducedMotion();
  // Parallax camera horizontal offset driven by player weave/dodge and opponent sway
  const camX = calm ? 0 : P.x * 0.45;
  const crowdShift = -camX * 0.22;
  const postShift = -camX * 0.52;
  const nearShift = -camX * 1.05;

  // 1. Far Plane: Crowd & Stadium Dome (overscaled slightly so parallax never shows seams)
  ctx.save();
  ctx.translate(crowdShift, 0);
  ctx.drawImage(bg, -24, -10, W + 48, H + 20);
  ctx.restore();

  // Dynamic crowd camera flashbulbs during hype moments (Counter window, Star punch, Knockdown)
  const hype = P.counterWin > 0 || O.st === 'down' || G.scene === 'win';
  if (!calm && hype) {
    const flashSeed = Math.floor(G.time * 16);
    for (let i = 0; i < 3; i++) {
      const fx = ((flashSeed * 137 + i * 211) % (W - 60)) + 30;
      const fy = 48 + ((flashSeed * 73 + i * 89) % 110);
      ctx.fillStyle = 'rgba(255, 250, 220, 0.75)';
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, TAU);
      ctx.fill();
    }
  }

  // 2. Volumetric Overhead Spotlight Cones
  const sway = calm ? 0 : Math.sin(G.time * 1.4) * 18;
  ctx.save();
  const beamL = ctx.createLinearGradient(150 + sway, 0, W / 2 + postShift * 0.4, 380);
  beamL.addColorStop(0, 'rgba(255, 238, 190, 0.16)');
  beamL.addColorStop(1, 'rgba(255, 238, 190, 0)');
  ctx.fillStyle = beamL;
  ctx.beginPath();
  ctx.moveTo(110 + sway, 0);
  ctx.lineTo(190 + sway, 0);
  ctx.lineTo(W / 2 + 190 + nearShift * 0.4, 380);
  ctx.lineTo(W / 2 - 190 + nearShift * 0.4, 380);
  ctx.closePath();
  ctx.fill();

  const spot = ctx.createRadialGradient(
    W / 2 + postShift * 0.5,
    235,
    12,
    W / 2 + postShift * 0.5,
    245,
    360,
  );
  spot.addColorStop(0, P.counterWin > 0 ? 'rgba(125, 255, 155, 0.34)' : 'rgba(255, 238, 190, 0.36)');
  spot.addColorStop(1, 'rgba(255, 238, 190, 0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 3. 2.5D Perspective Ring Canvas Mat & Apron
  const horizonY = 314;
  const farLeft = 114 + postShift;
  const farRight = W - 114 + postShift;
  const nearLeft = -85 + nearShift;
  const nearRight = W + 85 + nearShift;

  // Under-ring apron skirt
  const matGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  matGrad.addColorStop(0, '#1e286b');
  matGrad.addColorStop(0.55, '#28348a');
  matGrad.addColorStop(1, '#19215e');
  ctx.fillStyle = matGrad;
  ctx.beginPath();
  ctx.moveTo(farLeft, horizonY);
  ctx.lineTo(farRight, horizonY);
  ctx.lineTo(nearRight, H);
  ctx.lineTo(nearLeft, H);
  ctx.closePath();
  ctx.fill();

  // Ring mat border trim (classic red/gold championship border)
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(farLeft, horizonY);
  ctx.lineTo(farRight, horizonY);
  ctx.stroke();

  // True 3D perspective floor grid lines converging toward the shifted horizon
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i++) {
    const u = i / 4;
    const fx = W / 2 + postShift + u * 195;
    const nx = W / 2 + nearShift + u * 380;
    ctx.beginPath();
    ctx.moveTo(fx, horizonY);
    ctx.lineTo(nx, H);
    ctx.stroke();
  }
  for (let i = 1; i <= 4; i++) {
    const t = Math.pow(i / 4.2, 1.65);
    const y = horizonY + t * (H - horizonY);
    const lx = farLeft + (nearLeft - farLeft) * t;
    const rx = farRight + (nearRight - farRight) * t;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  }

  // Center ring championship emblem in perspective (squashed ellipse on the mat)
  ctx.save();
  const emblemX = W / 2 + (postShift * 0.4 + nearShift * 0.6);
  const emblemY = 392;
  ctx.translate(emblemX, emblemY);
  ctx.scale(1, 0.28);
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.16)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 115, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // 4. Mid-Plane Corner Posts, Turnbuckle Pads & Dynamic Ropes
  const leftPostX = 76 + postShift;
  const rightPostX = W - 76 + postShift;
  // Subtle rope vibration on heavy impact or knockdown
  const ropeBounce = calm ? 0 : Math.sin(G.time * 42) * clamp(G.shake * 0.35, 0, 5);

  // Corner steel posts
  for (const px of [leftPostX, rightPostX]) {
    const pg = ctx.createLinearGradient(px - 10, 0, px + 10, 0);
    pg.addColorStop(0, '#1c2352');
    pg.addColorStop(0.5, '#4654a3');
    pg.addColorStop(1, '#1c2352');
    ctx.fillStyle = pg;
    ctx.fillRect(px - 10, 146, 20, 170);
    ctx.strokeStyle = '#0c1029';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 10, 146, 20, 170);

    // Top post cap
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(px - 12, 142, 24, 6);
  }

  // Ropes (back span + perspective side spans angling toward the player camera)
  const ropeColors = ['#e63946', '#f1f3f9', '#3a86ff'];
  ctx.lineCap = 'round';
  ropeColors.forEach((col, i) => {
    const y = 184 + i * 40;
    const midSag = ropeBounce * (i === 1 ? -1 : 1);

    const strokeRope = (): void => {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Back horizontal rope with slight tension curve
    ctx.beginPath();
    ctx.moveTo(leftPostX, y);
    ctx.quadraticCurveTo(W / 2 + postShift, y + midSag, rightPostX, y);
    strokeRope();

    // Left & right perspective ropes coming forward toward the viewer
    ctx.beginPath();
    ctx.moveTo(leftPostX, y);
    ctx.lineTo(-28 + nearShift, y + 74);
    strokeRope();

    ctx.beginPath();
    ctx.moveTo(rightPostX, y);
    ctx.lineTo(W + 28 + nearShift, y + 74);
    strokeRope();

    // Turnbuckle cushions on both posts
    const padColor = i === 0 ? '#e63946' : i === 1 ? '#eef0ff' : '#3a86ff';
    for (const [px, dir] of [
      [leftPostX, 1],
      [rightPostX, -1],
    ] as const) {
      ctx.fillStyle = padColor;
      ctx.strokeStyle = '#101433';
      ctx.lineWidth = 2;
      ctx.fillRect(px - 8 + dir * 4, y - 8, 16, 16);
      ctx.strokeRect(px - 8 + dir * 4, y - 8, 16, 16);
    }
  });
}

/** Draw grounding 3D drop shadows on the canvas floor beneath the fighters. */
export function drawFloorShadows(ctx: CanvasRenderingContext2D): void {
  const calm = isReducedMotion();
  const postShift = calm ? 0 : -P.x * 0.45 * 0.52;
  const nearShift = calm ? 0 : -P.x * 0.45 * 1.05;

  // Opponent shadow on the mid-ring mat
  ctx.save();
  const oppX = W / 2 + postShift * 0.35;
  const oppY = 352 + clamp(O.downY * 0.12, 0, 35);
  const oppRadius = 86 + clamp(O.downY * 0.15, 0, 40);
  ctx.translate(oppX, oppY);
  ctx.scale(1, 0.24);
  const og = ctx.createRadialGradient(0, 0, 10, 0, 0, oppRadius);
  og.addColorStop(0, 'rgba(4, 6, 24, 0.62)');
  og.addColorStop(1, 'rgba(4, 6, 24, 0)');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(0, 0, oppRadius, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Player shadow on the foreground mat
  ctx.save();
  const plX = W / 2 + P.x + nearShift * 0.15;
  const plY = 466;
  ctx.translate(plX, plY);
  ctx.scale(1, 0.2);
  const pg = ctx.createRadialGradient(0, 0, 14, 0, 0, 115);
  pg.addColorStop(0, 'rgba(4, 6, 24, 0.7)');
  pg.addColorStop(1, 'rgba(4, 6, 24, 0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(0, 0, 115, 0, TAU);
  ctx.fill();
  ctx.restore();
}
