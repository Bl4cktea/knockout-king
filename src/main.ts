import './style.css';
import { mulberry32 } from './util/math';

// Phase 0 placeholder: an arena title card proving the build + deploy pipeline.
// The real game is ported in Phase 1.

const W = 640;
const H = 480;
const FONT = '"Press Start 2P","Courier New",monospace';

const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;

// Render at device resolution so text stays crisp on phones.
const dpr = Math.min(window.devicePixelRatio || 1, 3);
cv.width = W * dpr;
cv.height = H * dpr;

function drawArena(): void {
  const r = mulberry32(11);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#04061a');
  gr.addColorStop(0.55, '#131a4a');
  gr.addColorStop(1, '#1b2260');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);

  // crowd silhouettes
  for (let row = 0; row < 5; row++) {
    const y0 = 34 + row * 28;
    for (let x = -12; x < W + 20; x += 16 + row * 2) {
      const rr = 7 + row * 0.9;
      const jx = x + r() * 8;
      const jy = y0 + r() * 6;
      ctx.fillStyle = `hsl(${Math.floor(r() * 360)},28%,${10 + row * 2.5}%)`;
      ctx.beginPath();
      ctx.arc(jx, jy, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(jx - rr * 1.1, jy + rr * 0.6, rr * 2.2, 26);
    }
  }

  const sp = ctx.createRadialGradient(W / 2, 230, 10, W / 2, 230, 360);
  sp.addColorStop(0, 'rgba(255,238,190,.38)');
  sp.addColorStop(1, 'rgba(255,238,190,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, W, H);

  // canvas floor
  ctx.fillStyle = '#26307a';
  ctx.beginPath();
  ctx.moveTo(120, 318);
  ctx.lineTo(520, 318);
  ctx.lineTo(W + 60, H);
  ctx.lineTo(-60, H);
  ctx.closePath();
  ctx.fill();

  // ropes
  const cols = ['#e63946', '#f1f1f1', '#3a86ff'];
  ctx.lineCap = 'round';
  cols.forEach((c, i) => {
    const y = 186 + i * 40;
    ctx.beginPath();
    ctx.moveTo(76, y);
    ctx.lineTo(W - 76, y);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = c;
    ctx.lineWidth = 6;
    ctx.stroke();
  });
  for (const px of [76, W - 76]) {
    ctx.fillStyle = '#303a7a';
    ctx.fillRect(px - 9, 150, 18, 170);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(px - 11, 170, 22, 14);
  }
}

function bigText(txt: string, x: number, y: number, size: number, color: string): void {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size / 5);
  ctx.strokeStyle = '#000';
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
}

function frame(now: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawArena();
  bigText('KNOCKOUT KING', W / 2, 250, 30, '#ffd23f');
  if (Math.floor(now / 500) % 2 === 0) bigText('COMING SOON', W / 2, 300, 14, '#ffffff');
  requestAnimationFrame(frame);
}

document.fonts.load(`16px "Press Start 2P"`).finally(() => requestAnimationFrame(frame));
