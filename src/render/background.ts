import { H, TAU, W } from '../config';
import { mulberry32 } from '../util/math';

/**
 * Pre-render the arena once at the current device scale, so it stays sharp on high-DPI screens
 * and costs a single drawImage per frame.
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
  sky.addColorStop(0, '#04061a');
  sky.addColorStop(0.55, '#131a4a');
  sky.addColorStop(1, '#1b2260');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // crowd
  for (let row = 0; row < 5; row++) {
    const y0 = 34 + row * 28;
    for (let x = -12; x < W + 20; x += 16 + row * 2) {
      const rr = 7 + row * 0.9;
      const jx = x + r() * 8;
      const jy = y0 + r() * 6;
      g.fillStyle = `hsl(${Math.floor(r() * 360)},28%,${10 + row * 2.5}%)`;
      g.beginPath();
      g.arc(jx, jy, rr, 0, TAU);
      g.fill();
      g.fillRect(jx - rr * 1.1, jy + rr * 0.6, rr * 2.2, 26);
    }
  }
  // camera flashes in the crowd
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    g.fillRect(r() * W, 20 + r() * 130, 2, 2);
  }
  const haze = g.createLinearGradient(0, 0, 0, 200);
  haze.addColorStop(0, 'rgba(0,0,10,.55)');
  haze.addColorStop(1, 'rgba(0,0,10,0)');
  g.fillStyle = haze;
  g.fillRect(0, 0, W, 200);

  const spot = g.createRadialGradient(W / 2, 230, 10, W / 2, 230, 360);
  spot.addColorStop(0, 'rgba(255,238,190,.38)');
  spot.addColorStop(1, 'rgba(255,238,190,0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, W, H);

  // canvas floor
  g.fillStyle = '#26307a';
  g.beginPath();
  g.moveTo(120, 318);
  g.lineTo(520, 318);
  g.lineTo(W + 60, H);
  g.lineTo(-60, H);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)';
  g.lineWidth = 2;
  for (let i = -4; i <= 4; i++) {
    g.beginPath();
    g.moveTo(W / 2 + i * 50, 318);
    g.lineTo(W / 2 + i * 150, H);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const y = 318 + Math.pow(i / 3.2, 1.7) * 162 + 10;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }

  // ropes
  const cols = ['#e63946', '#f1f1f1', '#3a86ff'];
  g.lineCap = 'round';
  cols.forEach((col, i) => {
    const y = 186 + i * 40;
    const rope = (): void => {
      g.strokeStyle = 'rgba(0,0,0,.5)';
      g.lineWidth = 9;
      g.stroke();
      g.strokeStyle = col;
      g.lineWidth = 6;
      g.stroke();
    };
    g.beginPath();
    g.moveTo(76, y);
    g.lineTo(W - 76, y);
    rope();
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd < 0 ? 76 : W - 76, y);
      g.lineTo(sd < 0 ? -20 : W + 20, y + 70);
      rope();
    }
  });
  for (const px of [76, W - 76]) {
    g.fillStyle = '#303a7a';
    g.fillRect(px - 9, 150, 18, 170);
    g.fillStyle = '#e63946';
    g.fillRect(px - 11, 170, 22, 14);
  }
  return b;
}
