import { isValidFace } from './face/config';
import type { FaceConfig } from './face/config';
import { TRUNK_COLORS } from './fighters/boxer';
import type { Grade } from './fighters/types';

const KEY = 'kk:v1:settings';
export const DEFAULT_NAME = 'THE CHAMP';

export interface FighterRecord {
  wins: number;
  bestScore: number;
  bestTime: number | null;
  bestGrade: Grade | '';
}

export type CareerMap = Record<string, FighterRecord>;

export interface Settings {
  name: string;
  /** Your boxer's name, used when sharing a challenge link. */
  playerName: string;
  /** Your edited boxer, so it survives a reload. null = defaults. */
  player: { face: FaceConfig; trunks: string } | null;
  muted: boolean;
  /** null = follow the OS `prefers-reduced-motion` setting. */
  reduceMotion: boolean | null;
  selectedFighterId: string;
  unlockedIdx: number;
  freeSpar: boolean;
  career: CareerMap;
}

const defaultRecord = (): FighterRecord => ({
  wins: 0,
  bestScore: 0,
  bestTime: null,
  bestGrade: '',
});

export const settings: Settings = {
  name: DEFAULT_NAME,
  playerName: 'CHALLENGER',
  player: null,
  muted: false,
  reduceMotion: null,
  selectedFighterId: 'gabby',
  unlockedIdx: 0,
  freeSpar: false,
  career: {
    gabby: defaultRecord(),
    leo: defaultRecord(),
    ivan: defaultRecord(),
    champ: defaultRecord(),
  },
};

const GRADE_RANK: Record<Grade | '', number> = { '': 0, C: 1, B: 2, A: 3, S: 4 };

/** Evaluate bout performance into an S / A / B / C grade. */
export function computeGrade(
  boutTime: number,
  playerDowns: number,
  maxCombo: number,
  sRankTarget = 55,
): Grade {
  if (playerDowns === 0 && boutTime <= sRankTarget && maxCombo >= 4) return 'S';
  if (playerDowns === 0 && (boutTime <= sRankTarget * 1.35 || maxCombo >= 3)) return 'A';
  if (playerDowns <= 1) return 'B';
  return 'C';
}

export function formatBoutTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--.-';
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s - Math.floor(s)) * 10);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
}

export function getRecord(fighterId: string): FighterRecord {
  if (!settings.career[fighterId]) {
    settings.career[fighterId] = defaultRecord();
  }
  return settings.career[fighterId];
}

/** Update career stats after a victorious bout. Returns true if a new best time or score was set. */
export function recordVictory(
  fighterId: string,
  fighterIndex: number,
  score: number,
  boutTime: number,
  grade: Grade,
): boolean {
  const rec = getRecord(fighterId);
  rec.wins++;
  let isNewRecord = false;
  if (score > rec.bestScore) {
    rec.bestScore = score;
    isNewRecord = true;
  }
  if (rec.bestTime === null || boutTime < rec.bestTime) {
    rec.bestTime = Math.round(boutTime * 10) / 10;
    isNewRecord = true;
  }
  if (GRADE_RANK[grade] > GRADE_RANK[rec.bestGrade]) {
    rec.bestGrade = grade;
  }
  if (fighterIndex >= settings.unlockedIdx && settings.unlockedIdx < 3) {
    settings.unlockedIdx = fighterIndex + 1;
  }
  saveSettings();
  return isNewRecord;
}

/** Names are drawn with canvas fillText only (never as HTML), but keep them tidy anyway. */
export function cleanName(raw: string, fallback = DEFAULT_NAME): string {
  const printable = [...raw].filter((ch) => {
    const c = ch.charCodeAt(0);
    return c > 31 && c !== 127;
  });
  const s = printable.join('').trim().toUpperCase().slice(0, 12);
  return s || fallback;
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d: unknown = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return;
    const o = d as Record<string, unknown>;
    if (typeof o.name === 'string') settings.name = cleanName(o.name);
    if (typeof o.playerName === 'string') {
      settings.playerName = cleanName(o.playerName, 'CHALLENGER');
    }
    const p = o.player as { face?: FaceConfig; trunks?: unknown } | null | undefined;
    if (p && p.face && isValidFace(p.face) && TRUNK_COLORS.includes(p.trunks as string)) {
      settings.player = { face: { ...p.face }, trunks: p.trunks as string };
    }
    if (typeof o.muted === 'boolean') settings.muted = o.muted;
    if (typeof o.reduceMotion === 'boolean') settings.reduceMotion = o.reduceMotion;
    if (typeof o.selectedFighterId === 'string') settings.selectedFighterId = o.selectedFighterId;
    if (typeof o.unlockedIdx === 'number' && o.unlockedIdx >= 0 && o.unlockedIdx <= 3) {
      settings.unlockedIdx = Math.floor(o.unlockedIdx);
    }
    if (typeof o.freeSpar === 'boolean') settings.freeSpar = o.freeSpar;
    if (typeof o.career === 'object' && o.career !== null) {
      const c = o.career as Record<string, unknown>;
      for (const id of ['gabby', 'leo', 'ivan', 'champ']) {
        const entry = c[id];
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          settings.career[id] = {
            wins: typeof e.wins === 'number' ? e.wins : 0,
            bestScore: typeof e.bestScore === 'number' ? e.bestScore : 0,
            bestTime: typeof e.bestTime === 'number' ? e.bestTime : null,
            bestGrade:
              e.bestGrade === 'S' ||
              e.bestGrade === 'A' ||
              e.bestGrade === 'B' ||
              e.bestGrade === 'C'
                ? e.bestGrade
                : '',
          };
        }
      }
    }
  } catch {
    /* storage unavailable or corrupt: keep defaults */
  }
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

export function isReducedMotion(): boolean {
  if (settings.reduceMotion !== null) return settings.reduceMotion;
  return (
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
