import { isValidFace } from './face/config';
import type { FaceConfig } from './face/config';
import { TRUNK_COLORS } from './fighters/boxer';
import { GABBY } from './fighters/champ';
import type { FighterData } from './fighters/types';
import { cleanName } from './settings';

export interface Challenger {
  name: string;
  face: FaceConfig;
  trunks: string;
}

const VERSION = 1;
const MAX_LEN = 400;

/** Compact, versioned, URL-safe: [v, name, 9 face parts, extras, trunk index] as base64url JSON. */
export function encodeChallenger(c: Challenger): string {
  const f = c.face;
  const arr = [
    VERSION,
    c.name,
    f.skin,
    f.head,
    f.eyes,
    f.brows,
    f.nose,
    f.mouth,
    f.hair,
    f.hairColor,
    f.facial,
    f.extras,
    TRUNK_COLORS.indexOf(c.trunks),
  ];
  const bytes = new TextEncoder().encode(JSON.stringify(arr));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Links come from strangers: validate everything, return null on anything odd. */
export function decodeChallenger(s: string): Challenger | null {
  if (!s || s.length > MAX_LEN) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    const a: unknown = JSON.parse(json);
    if (!Array.isArray(a) || a.length !== 13 || a[0] !== VERSION || typeof a[1] !== 'string') {
      return null;
    }
    const face: FaceConfig = {
      skin: a[2],
      head: a[3],
      eyes: a[4],
      brows: a[5],
      nose: a[6],
      mouth: a[7],
      hair: a[8],
      hairColor: a[9],
      facial: a[10],
      extras: a[11],
    };
    const trunks = Number.isInteger(a[12]) ? TRUNK_COLORS[a[12]] : undefined;
    if (!isValidFace(face) || !trunks) return null;
    return { name: cleanName(a[1], 'CHALLENGER'), face, trunks };
  } catch {
    return null;
  }
}

/** A shared boxer fights with the rookie's tuning, so a link is never an unfair fight. */
export function challengerFighter(c: Challenger): FighterData {
  return {
    ...GABBY,
    id: 'challenger',
    name: c.name,
    title: 'Custom Challenger',
    quote: `${c.name} challenges you!`,
    look: { ...GABBY.look, face: { ...c.face }, trunks: c.trunks },
  };
}
