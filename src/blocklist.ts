/** Slurs only (ordinary trash talk is fine). Matched after normalising look-alike characters. */
const BLOCKED = [
  'nigg',
  'faggot',
  'fagot',
  'retard',
  'tranny',
  'chink',
  'kike',
  'wetback',
  'beaner',
  'gook',
];

const LOOKALIKE: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** shortcut: tiny English-only list, extend it (or add a proper filter) if abuse shows up. */
export function isBlocked(text: string): boolean {
  const flat = [...text.toLowerCase()]
    .map((c) => LOOKALIKE[c] ?? c)
    .filter((c) => c >= 'a' && c <= 'z')
    .join('')
    // collapse repeats so "niiigg" and "retaaard" can't slip through
    .replace(/(.)\1+/g, '$1');
  return BLOCKED.some((w) => flat.includes(w.replace(/(.)\1+/g, '$1')));
}
