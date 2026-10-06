const KEY = 'kk:v1:settings';
export const DEFAULT_NAME = 'THE CHAMP';

export interface Settings {
  name: string;
  muted: boolean;
  /** null = follow the OS `prefers-reduced-motion` setting. */
  reduceMotion: boolean | null;
}

export const settings: Settings = { name: DEFAULT_NAME, muted: false, reduceMotion: null };

/** Names are drawn with canvas fillText only (never as HTML), but keep them tidy anyway. */
export function cleanName(raw: string): string {
  const printable = [...raw].filter((ch) => {
    const c = ch.charCodeAt(0);
    return c > 31 && c !== 127;
  });
  const s = printable.join('').trim().toUpperCase().slice(0, 12);
  return s || DEFAULT_NAME;
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d: unknown = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return;
    const o = d as Record<string, unknown>;
    if (typeof o.name === 'string') settings.name = cleanName(o.name);
    if (typeof o.muted === 'boolean') settings.muted = o.muted;
    if (typeof o.reduceMotion === 'boolean') settings.reduceMotion = o.reduceMotion;
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
