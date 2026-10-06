import { TAU } from '../config';
import { shade } from '../util/color';
import { at, clamp } from '../util/math';
import { EXTRA } from './config';
import type { Expr, FaceConfig } from './config';
import { HAIR_COLORS, SKIN_TONES } from './palette';

/**
 * Vector cartoon faces. Everything is drawn in "head space": x in [-66, 66], y in [-91, 91],
 * origin at the centre of the head. Callers translate/scale/rotate the context first.
 */
type Ctx = CanvasRenderingContext2D;

const OUT = '#1a0a0a';

interface Shape {
  /** Bezier control values: top, mid, width at the widest point, jaw, chin. */
  t: number;
  m: number;
  w: number;
  j: number;
  c: number;
}
const SHAPES: readonly Shape[] = [
  { t: 62, m: 70, w: 66, j: 63, c: 38 }, // egg
  { t: 66, m: 72, w: 70, j: 72, c: 56 }, // square jaw
  { t: 68, m: 78, w: 76, j: 68, c: 46 }, // round
  { t: 54, m: 62, w: 58, j: 56, c: 32 }, // long
];

const pathCache: Path2D[] = [];
export function headPath(shape: number): Path2D {
  const i = ((shape % SHAPES.length) + SHAPES.length) % SHAPES.length;
  let p = pathCache[i];
  if (!p) {
    const s = at(SHAPES, i);
    p = new Path2D();
    p.moveTo(0, -91);
    p.bezierCurveTo(s.t, -91, s.m, -35, s.w, 12);
    p.bezierCurveTo(s.j, 62, s.c, 91, 0, 91);
    p.bezierCurveTo(-s.c, 91, -s.j, 62, -s.w, 12);
    p.bezierCurveTo(-s.m, -35, -s.t, -91, 0, -91);
    p.closePath();
    pathCache[i] = p;
  }
  return p;
}

export interface FaceOpts {
  expr?: Expr;
  /** Game time in seconds (drives blinking and small idle motion). */
  t?: number;
  /** 0 (fresh) .. 1 (battered): shows black eyes, bruises and a plaster. */
  damage?: number;
  /** Overlay flash strength 0..1 (hit flash), clipped to the head. */
  flash?: number;
  flashColor?: string;
}

function ell(c: Ctx, x: number, y: number, rx: number, ry: number): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
}

/** Fill the current path and outline it. */
function blob(c: Ctx, fill: string, lw = 4): void {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  c.stroke();
}

/* ---------------- eyes ---------------- */
interface EyeDef {
  rx: number;
  ry: number;
  p: number;
  lid?: number;
  angry?: boolean;
  googly?: boolean;
}
const EYES: readonly EyeDef[] = [
  { rx: 11, ry: 13, p: 5.5 },
  { rx: 13, ry: 17, p: 8 },
  { rx: 6.5, ry: 6.5, p: 4 },
  { rx: 12, ry: 11, p: 5.5, lid: 0.5 },
  { rx: 12, ry: 10, p: 5.5, angry: true },
  { rx: 14, ry: 14, p: 3, googly: true },
];
const EYE_X = 26;
const EYE_Y = -12;

type EyeState = 'open' | 'narrow' | 'closed' | 'happy' | 'squeeze' | 'spiral' | 'x';

function eyeStateFor(expr: Expr, blink: boolean): EyeState {
  switch (expr) {
    case 'wind':
    case 'taunt':
      return 'narrow';
    case 'hit':
      return 'squeeze';
    case 'stunned':
      return 'spiral';
    case 'ko':
      return 'x';
    case 'win':
      return 'happy';
    default:
      return blink ? 'closed' : 'open';
  }
}

function spiral(c: Ctx, cx: number, cy: number, r: number, t: number, dir: number): void {
  c.beginPath();
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = dir * (k * Math.PI * 5 + t * 8);
    const x = cx + Math.cos(a) * r * k;
    const y = cy + Math.sin(a) * r * k;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.stroke();
}

function drawEye(c: Ctx, kind: number, side: number, st: EyeState, tone: string, t: number): void {
  const e = at(EYES, kind);
  const cx = side * EYE_X;
  const cy = EYE_Y;
  const rx = e.rx;
  const ry = st === 'narrow' ? e.ry * 0.5 : e.ry;
  c.lineWidth = 3;
  c.strokeStyle = OUT;
  if (st === 'closed' || st === 'happy') {
    const bend = st === 'closed' ? rx * 0.8 : -rx * 0.9;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - rx, cy + (st === 'happy' ? 3 : 0));
    c.quadraticCurveTo(cx, cy + bend, cx + rx, cy + (st === 'happy' ? 3 : 0));
    c.stroke();
    return;
  }
  if (st === 'squeeze') {
    const h = rx * 0.75;
    const outer = cx + side * rx;
    const tip = cx - side * rx * 0.7;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(outer, cy - h);
    c.lineTo(tip, cy);
    c.lineTo(outer, cy + h);
    c.stroke();
    return;
  }
  if (st === 'x') {
    const r = rx * 0.75;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - r, cy - r);
    c.lineTo(cx + r, cy + r);
    c.moveTo(cx + r, cy - r);
    c.lineTo(cx - r, cy + r);
    c.stroke();
    return;
  }
  if (st === 'spiral') {
    ell(c, cx, cy, rx * 1.05, rx * 1.05);
    c.fillStyle = '#fff';
    c.fill();
    c.stroke();
    c.lineWidth = 2;
    spiral(c, cx, cy, rx * 0.95, t, side);
    return;
  }

  // open / narrow
  c.save();
  ell(c, cx, cy, rx, ry);
  c.fillStyle = '#fff';
  c.fill();
  c.clip();
  const wob = e.googly ? Math.sin(t * 9 + side) * 5 : 0;
  const px = cx + Math.sin(t * 0.8) * 1.5 + wob;
  const py = cy + (e.googly ? Math.cos(t * 7 + side) * 4 : 1);
  const pr = e.p * (st === 'narrow' ? 0.9 : 1);
  c.fillStyle = OUT;
  c.beginPath();
  c.arc(px, py, pr, 0, TAU);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.3, 0, TAU);
  c.fill();
  c.fillStyle = tone;
  c.strokeStyle = OUT;
  if (e.lid) {
    c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 * e.lid + 2);
    c.beginPath();
    c.moveTo(cx - rx - 2, cy - ry + ry * 2 * e.lid);
    c.lineTo(cx + rx + 2, cy - ry + ry * 2 * e.lid);
    c.stroke();
  }
  if (e.angry || st === 'narrow') {
    const xo = cx + side * (rx + 2);
    const xi = cx - side * (rx + 2);
    c.beginPath();
    c.moveTo(xo, cy - ry - 2);
    c.lineTo(xi, cy - ry * 0.1);
    c.lineTo(xi, cy - ry - 2);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(xo, cy - ry - 2);
    c.lineTo(xi, cy - ry * 0.1);
    c.stroke();
  }
  c.restore();
  ell(c, cx, cy, rx, ry);
  c.lineWidth = 3;
  c.stroke();
}

/* ---------------- brows ---------------- */
interface BrowMood {
  tilt: number;
  liftL: number;
  liftR: number;
}
function browMood(expr: Expr): BrowMood {
  switch (expr) {
    case 'wind':
      return { tilt: 0.8, liftL: 0, liftR: 0 };
    case 'hit':
      return { tilt: -0.5, liftL: 3, liftR: 3 };
    case 'stunned':
      return { tilt: -0.6, liftL: 2, liftR: 2 };
    case 'ko':
      return { tilt: -0.7, liftL: 2, liftR: 2 };
    case 'taunt':
      return { tilt: 0.15, liftL: 7, liftR: 0 };
    case 'win':
      return { tilt: -0.2, liftL: 3, liftR: 3 };
    default:
      return { tilt: 0, liftL: 0, liftR: 0 };
  }
}

function drawBrow(
  c: Ctx,
  kind: number,
  side: number,
  tilt: number,
  lift: number,
  eyeKind: number,
  col: string,
): void {
  const by = EYE_Y - at(EYES, eyeKind).ry - 10 - lift;
  const ox = side * 40;
  const ix = kind === 2 ? side * 1 : side * 10;
  const oy = by - tilt * 5;
  const iy = by + tilt * 14;
  c.strokeStyle = col;
  c.lineCap = 'round';
  switch (kind) {
    case 1:
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(ox, oy);
      c.quadraticCurveTo((ox + ix) / 2, Math.min(oy, iy) - 9, ix, iy);
      c.stroke();
      break;
    case 3:
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ix, iy);
      c.stroke();
      break;
    case 4:
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ix, iy);
      c.stroke();
      c.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        const x = ox + (ix - ox) * k;
        const y = oy + (iy - oy) * k;
        c.beginPath();
        c.moveTo(x, y - 4);
        c.lineTo(x + side * -3, y - 9);
        c.stroke();
      }
      break;
    default:
      c.lineWidth = kind === 2 ? 9 : 8;
      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ix, iy);
      c.stroke();
  }
}

/* ---------------- nose ---------------- */
function drawNose(c: Ctx, kind: number, tone: string): void {
  const dark = shade(tone, -0.12);
  c.lineWidth = 3;
  c.strokeStyle = OUT;
  switch (kind) {
    case 1:
      c.beginPath();
      c.moveTo(2, -2);
      c.lineTo(-5, 16);
      c.lineTo(7, 17);
      c.stroke();
      break;
    case 2:
      ell(c, 0, 14, 12, 11);
      blob(c, dark, 3);
      break;
    case 3:
      c.beginPath();
      c.moveTo(0, -4);
      c.quadraticCurveTo(-12, 12, -9, 19);
      c.quadraticCurveTo(0, 22, 9, 19);
      c.stroke();
      break;
    case 4:
      c.beginPath();
      c.moveTo(-2, -2);
      c.lineTo(-3, 14);
      c.stroke();
      ell(c, -7, 18, 4, 3);
      c.fillStyle = OUT;
      c.fill();
      ell(c, 7, 18, 4, 3);
      c.fill();
      break;
    default:
      ell(c, 0, 16, 8, 6);
      blob(c, dark, 3);
  }
}

/* ---------------- mouth ---------------- */
type MouthState =
  'smile' | 'flat' | 'smirk' | 'grin' | 'pout' | 'buck' | 'grit' | 'o' | 'open' | 'tongue';
const MOUTHS: readonly MouthState[] = ['smile', 'flat', 'smirk', 'grin', 'pout', 'buck'];
const MOUTH_Y = 46;
const MOUTH_DARK = '#4a0f1a';
const GOLD = '#ffd23f';

function mouthStateFor(kind: number, expr: Expr): MouthState {
  switch (expr) {
    case 'wind':
      return 'grit';
    case 'hit':
      return 'o';
    case 'stunned':
      return 'open';
    case 'ko':
    case 'taunt':
      return 'tongue';
    case 'win':
      return 'grin';
    default:
      return at(MOUTHS, kind);
  }
}

function grinPath(c: Ctx): void {
  c.beginPath();
  c.moveTo(-24, 38);
  c.quadraticCurveTo(0, 44, 24, 38);
  c.quadraticCurveTo(20, 66, 0, 66);
  c.quadraticCurveTo(-20, 66, -24, 38);
  c.closePath();
}

function drawMouth(c: Ctx, st: MouthState, gold: boolean): void {
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 4;
  const tooth = (x: number, y: number, w: number, h: number): void => {
    c.fillStyle = GOLD;
    c.fillRect(x, y, w, h);
    c.lineWidth = 2;
    c.strokeRect(x, y, w, h);
  };
  switch (st) {
    case 'smile':
      c.beginPath();
      c.moveTo(-18, 40);
      c.quadraticCurveTo(0, 60, 18, 40);
      c.stroke();
      break;
    case 'flat':
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-16, MOUTH_Y);
      c.lineTo(16, MOUTH_Y);
      c.stroke();
      break;
    case 'smirk':
      c.beginPath();
      c.moveTo(-16, 48);
      c.quadraticCurveTo(4, 50, 20, 38);
      c.stroke();
      break;
    case 'grin':
    case 'tongue': {
      c.save();
      grinPath(c);
      c.fillStyle = MOUTH_DARK;
      c.fill();
      c.clip();
      c.fillStyle = '#fff';
      c.fillRect(-26, 36, 52, 12);
      if (st === 'tongue') {
        ell(c, 6, 66, 10, 12);
        c.fillStyle = '#ff6b8b';
        c.fill();
      }
      c.restore();
      grinPath(c);
      c.lineWidth = 4;
      c.stroke();
      if (gold) tooth(8, 41, 7, 9);
      break;
    }
    case 'pout':
      ell(c, 0, 48, 7, 5);
      blob(c, '#7a1f2b', 3);
      break;
    case 'buck':
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-16, MOUTH_Y);
      c.lineTo(16, MOUTH_Y);
      c.stroke();
      c.lineWidth = 2;
      c.fillStyle = '#fff';
      c.fillRect(-8, MOUTH_Y + 2, 8, 13);
      c.strokeRect(-8, MOUTH_Y + 2, 8, 13);
      if (gold) tooth(0, MOUTH_Y + 2, 8, 13);
      else {
        c.fillRect(0, MOUTH_Y + 2, 8, 13);
        c.strokeRect(0, MOUTH_Y + 2, 8, 13);
      }
      break;
    case 'grit': {
      c.fillStyle = '#fff';
      c.fillRect(-22, 38, 44, 20);
      c.lineWidth = 2;
      c.beginPath();
      for (let x = -14; x <= 14; x += 7) {
        c.moveTo(x, 38);
        c.lineTo(x, 58);
      }
      c.moveTo(-22, 48);
      c.lineTo(22, 48);
      c.stroke();
      c.lineWidth = 4;
      c.strokeRect(-22, 38, 44, 20);
      if (gold) tooth(7, 39, 7, 9);
      break;
    }
    case 'o':
      ell(c, 0, 52, 9, 12);
      blob(c, MOUTH_DARK, 3);
      ell(c, 0, 59, 5, 4);
      c.fillStyle = '#ff6b8b';
      c.fill();
      break;
    case 'open':
      ell(c, 0, 52, 14, 10);
      blob(c, MOUTH_DARK, 3);
      ell(c, 0, 58, 8, 4);
      c.fillStyle = '#ff6b8b';
      c.fill();
      break;
  }
}

/* ---------------- facial hair ---------------- */
function drawBeardBack(c: Ctx, hp: Path2D, kind: number, col: string, tone: string): void {
  if (kind === 3) {
    c.save();
    c.clip(hp);
    c.beginPath();
    c.moveTo(-72, 4);
    c.quadraticCurveTo(-50, 40, -24, 36);
    c.lineTo(24, 36);
    c.quadraticCurveTo(50, 40, 72, 4);
    c.lineTo(72, 100);
    c.lineTo(-72, 100);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    ell(c, 0, MOUTH_Y, 21, 10);
    c.fillStyle = shade(tone, -0.05);
    c.fill();
    c.restore();
  } else if (kind === 2) {
    c.save();
    c.clip(hp);
    ell(c, 0, 70, 15, 18);
    c.fillStyle = col;
    c.fill();
    c.restore();
  } else if (kind === 4) {
    ell(c, 0, 63, 6, 6);
    c.fillStyle = col;
    c.fill();
  }
}

function drawMustache(c: Ctx, kind: number, col: string): void {
  if (kind !== 1) return;
  c.beginPath();
  c.moveTo(0, 33);
  c.quadraticCurveTo(-14, 28, -26, 40);
  c.quadraticCurveTo(-14, 38, 0, 38);
  c.quadraticCurveTo(14, 38, 26, 40);
  c.quadraticCurveTo(14, 28, 0, 33);
  c.closePath();
  blob(c, col, 2.5);
}

/* ---------------- hair ---------------- */
/** Hair that sits behind the head (afro, long hair). */
function hairBack(c: Ctx, style: number, col: string): void {
  if (style === 5) {
    ell(c, 0, -56, 90, 78);
    blob(c, col, 4);
  } else if (style === 6) {
    c.beginPath();
    c.ellipse(0, -36, 78, 76, 0, 0, TAU);
    c.moveTo(-78, -36);
    c.lineTo(-78, 60);
    c.quadraticCurveTo(-76, 96, -52, 98);
    c.lineTo(52, 98);
    c.quadraticCurveTo(76, 96, 78, 60);
    c.lineTo(78, -36);
    blob(c, col, 4);
  }
}

/** Fill the area above a curved hairline, clipped to the head. */
function cap(c: Ctx, hp: Path2D, col: string, yL: number, yM: number, yR: number): void {
  const cy = 2 * yM - (yL + yR) / 2;
  c.save();
  c.clip(hp);
  c.beginPath();
  c.moveTo(-80, -130);
  c.lineTo(80, -130);
  c.lineTo(80, yR);
  c.quadraticCurveTo(0, cy, -80, yL);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.beginPath();
  c.moveTo(-80, yL);
  c.quadraticCurveTo(0, cy, 80, yR);
  c.lineWidth = 4;
  c.strokeStyle = OUT;
  c.stroke();
  c.restore();
}

function hairFront(c: Ctx, hp: Path2D, style: number, col: string): void {
  switch (style) {
    case 1: // buzz cut
      cap(c, hp, col, -26, -66, -26);
      break;
    case 2: // short crop with a quiff
      c.beginPath();
      c.ellipse(10, -92, 38, 15, 0, 0, TAU);
      blob(c, col, 4);
      cap(c, hp, col, -30, -52, -40);
      break;
    case 3: // spikes
      for (let i = -2; i <= 2; i++) {
        const base = -80 + Math.abs(i) * 8;
        c.beginPath();
        c.moveTo(i * 26 - 15, base);
        c.lineTo(i * 30, -130 + Math.abs(i) * 12);
        c.lineTo(i * 26 + 15, base);
        c.closePath();
        blob(c, col, 4);
      }
      cap(c, hp, col, -34, -62, -34);
      break;
    case 4: // mohawk
      c.beginPath();
      c.moveTo(-17, -66);
      c.lineTo(-14, -112);
      c.lineTo(-7, -96);
      c.lineTo(-2, -128);
      c.lineTo(5, -98);
      c.lineTo(12, -120);
      c.lineTo(17, -66);
      c.closePath();
      blob(c, col, 4);
      break;
    case 5: // afro
      cap(c, hp, col, -40, -66, -40);
      break;
    case 6: // long hair
      cap(c, hp, col, -36, -62, -36);
      break;
    case 7: // bun
      c.beginPath();
      c.arc(0, -108, 21, 0, TAU);
      blob(c, col, 4);
      cap(c, hp, col, -26, -66, -26);
      break;
    case 8: // flat top
      c.beginPath();
      c.moveTo(-60, -66);
      c.lineTo(-56, -124);
      c.lineTo(56, -124);
      c.lineTo(60, -66);
      c.closePath();
      blob(c, col, 4);
      cap(c, hp, col, -34, -68, -34);
      break;
    case 9: // curls
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.arc(i * 20, -84 + i * i * 2.2, 17, 0, TAU);
        blob(c, col, 4);
      }
      cap(c, hp, col, -34, -62, -34);
      break;
    default: // bald: just a shine
      c.beginPath();
      c.moveTo(-26, -76);
      c.quadraticCurveTo(-12, -86, 4, -84);
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(255,255,255,.55)';
      c.stroke();
  }
}

/* ---------------- the face ---------------- */
export function drawFace(c: Ctx, f: FaceConfig, o: FaceOpts = {}): void {
  const expr = o.expr ?? 'idle';
  const t = o.t ?? 0;
  const dmg = o.damage ?? 0;
  const tone = at(SKIN_TONES, f.skin);
  const hairCol = at(HAIR_COLORS, f.hairColor);
  const browCol = shade(hairCol, -0.35);
  const shape = at(SHAPES, f.head);
  const hp = headPath(f.head);
  const has = (bit: number): boolean => (f.extras & bit) !== 0;
  const blink = (t + f.eyes * 0.7) % 3.4 < 0.12;
  const eyeSt = eyeStateFor(expr, blink);

  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';

  hairBack(c, f.hair, hairCol);

  // ears
  for (const s of [-1, 1]) {
    ell(c, s * (shape.w + 3), 6, 12, 15);
    blob(c, tone, 4);
    ell(c, s * (shape.w + 4), 6, 5, 8);
    c.fillStyle = shade(tone, -0.18);
    c.fill();
  }

  // head
  c.fillStyle = tone;
  c.fill(hp);
  c.fillStyle = 'rgba(255,90,90,.16)';
  for (const s of [-1, 1]) {
    ell(c, s * 38, 22, 12, 8);
    c.fill();
  }

  // damage: black eyes and a bruised cheek
  if (dmg > 0.3) {
    const a1 = clamp((dmg - 0.3) / 0.3, 0, 1);
    const a2 = clamp((dmg - 0.6) / 0.3, 0, 1);
    c.save();
    c.clip(hp);
    ell(c, -EYE_X, -4, 18, 14);
    c.fillStyle = `rgba(70,30,110,${0.5 * a1})`;
    c.fill();
    if (a2 > 0) {
      ell(c, EYE_X, -4, 18, 14);
      c.fillStyle = `rgba(70,30,110,${0.5 * a2})`;
      c.fill();
      ell(c, 38, 30, 11, 8);
      c.fillStyle = `rgba(150,70,40,${0.4 * a2})`;
      c.fill();
    }
    c.restore();
  }

  drawBeardBack(c, hp, f.facial, hairCol, tone);
  drawNose(c, f.nose, tone);
  drawMouth(c, mouthStateFor(f.mouth, expr), has(EXTRA.goldTooth));
  drawMustache(c, f.facial, hairCol);

  // eyes (a patch replaces the left eye)
  for (const side of [-1, 1]) {
    if (side === -1 && has(EXTRA.eyepatch)) continue;
    drawEye(c, f.eyes, side, eyeSt, tone, t);
  }
  const mood = browMood(expr);
  drawBrow(c, f.brows, -1, mood.tilt, mood.liftL, f.eyes, browCol);
  drawBrow(c, f.brows, 1, mood.tilt, mood.liftR, f.eyes, browCol);

  if (has(EXTRA.eyepatch)) {
    c.lineWidth = 3;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(-64, -34);
    c.lineTo(-EYE_X, EYE_Y);
    c.lineTo(62, -40);
    c.stroke();
    ell(c, -EYE_X, EYE_Y, 16, 15);
    blob(c, '#14141c', 3);
  }
  if (has(EXTRA.shades)) {
    c.fillStyle = '#14141c';
    c.lineWidth = 3;
    c.strokeStyle = OUT;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.roundRect(s < 0 ? -46 : 8, -28, 38, 28, 8);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.moveTo(-8, -18);
    c.lineTo(8, -18);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-40, -22);
    c.lineTo(-30, -22);
    c.moveTo(14, -22);
    c.lineTo(24, -22);
    c.stroke();
    if (eyeSt === 'x' || eyeSt === 'spiral') {
      c.strokeStyle = '#fff';
      c.lineWidth = 3;
      for (const s of [-1, 1]) {
        const x = s * EYE_X;
        c.beginPath();
        c.moveTo(x - 7, -21);
        c.lineTo(x + 7, -7);
        c.moveTo(x + 7, -21);
        c.lineTo(x - 7, -7);
        c.stroke();
      }
    }
  }
  if (has(EXTRA.scar)) {
    c.strokeStyle = '#8c2f39';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-42, -40);
    c.lineTo(-14, 12);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    for (const k of [0.25, 0.5, 0.75]) {
      const x = -42 + 28 * k;
      const y = -40 + 52 * k;
      c.moveTo(x - 4, y - 2);
      c.lineTo(x + 4, y + 2);
    }
    c.stroke();
  }

  // outline
  c.lineWidth = 5;
  c.strokeStyle = OUT;
  c.stroke(hp);

  hairFront(c, hp, f.hair, hairCol);

  if (has(EXTRA.headband)) {
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(-70, -46);
    c.quadraticCurveTo(0, -70, 70, -46);
    c.lineWidth = 19;
    c.strokeStyle = OUT;
    c.stroke();
    c.lineWidth = 14;
    c.strokeStyle = '#d62839';
    c.stroke();
    c.lineCap = 'round';
    c.lineWidth = 6;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(68, -50);
    c.lineTo(90, -34);
    c.moveTo(68, -50);
    c.lineTo(88, -64);
    c.stroke();
    c.lineWidth = 3;
    c.strokeStyle = '#d62839';
    c.beginPath();
    c.moveTo(68, -50);
    c.lineTo(90, -34);
    c.moveTo(68, -50);
    c.lineTo(88, -64);
    c.stroke();
  }

  if (dmg > 0.8) {
    c.save();
    c.translate(22, -48);
    c.rotate(0.5);
    c.fillStyle = '#f3d9b1';
    c.fillRect(-16, -6, 32, 12);
    c.lineWidth = 2;
    c.strokeStyle = OUT;
    c.strokeRect(-16, -6, 32, 12);
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.moveTo(-4, -6);
    c.lineTo(-4, 6);
    c.moveTo(4, -6);
    c.lineTo(4, 6);
    c.stroke();
    c.restore();
  }

  if (o.flash && o.flash > 0) {
    c.save();
    c.clip(hp);
    c.globalAlpha = clamp(o.flash, 0, 1);
    c.fillStyle = o.flashColor ?? '#fff';
    c.fillRect(-90, -100, 180, 200);
    c.restore();
  }
  c.restore();
}
