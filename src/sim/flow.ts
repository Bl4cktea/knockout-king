import { sfx } from '../audio';
import { cloneLook } from '../fighters/boxer';
import { ROSTER } from '../fighters/champ';
import type { FighterData } from '../fighters/types';
import { saveSettings, settings } from '../settings';
import { parts } from './fx';
import { BUFFER_WINDOW, G, O, P, buffer, looks } from './state';

/** Switch the active circuit opponent and update their visual look. */
export function selectFighter(fighter: FighterData): void {
  G.selectedFighter = fighter;
  O.f = fighter;
  O.hp = fighter.maxHp;
  O.maxhp = fighter.maxHp;
  looks.opp = cloneLook(fighter.look);
  settings.name = fighter.name;
  // Shared challengers are temporary: never remember them as the selected rival.
  if (ROSTER.some((f) => f.id === fighter.id)) {
    settings.selectedFighterId = fighter.id;
    saveSettings();
  }
}

/** Reset everything and start a fresh bout against `fighter`. */
export function newFight(fighter: FighterData = G.selectedFighter): void {
  G.selectedFighter = fighter;
  const maxHearts = fighter.hearts ?? 10;
  Object.assign(P, {
    hp: 100,
    dodge: 0,
    dodgeT: 0,
    dodgeCd: 0,
    stun: 0,
    punch: null,
    punchCd: 0,
    stars: 0,
    x: 0,
    flash: 0,
    fall: 0,
    hearts: maxHearts,
    maxHearts,
    winded: false,
    windedT: 0,
    counterWin: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    downs: 0,
    downT: 0,
    count: 0,
    rally: 0,
  });
  Object.assign(O, {
    f: fighter,
    hp: fighter.maxHp,
    maxhp: fighter.maxHp,
    downs: 0,
    st: 'idle',
    timer: 1.8,
    combo: 0,
    strikeDone: false,
    result: '',
    flash: 0,
    hitT: 0,
    knock: 0,
    recoverHits: 0,
    downY: 0,
    downT: 0,
    count: 0,
    lastTaunt: false,
    lastAtk: '',
  });
  parts.length = 0;
  clearBuffer();
  G.scene = 'intro';
  G.introT = 0;
  G.winT = 0;
  G.boutTime = 0;
  G.fightShown = false;
  G.freeze = 0;
  G.playerDown = false;
  G.lastGrade = '';
  G.newRecord = false;
  G.banner = { text: 'ROUND 1', t: 0, dur: 1.0, size: 34, color: '#ffffff' };
  sfx.count();
}

export function clearBuffer(): void {
  buffer.a = null;
  buffer.t = 0;
}

export function bufferAction(a: NonNullable<typeof buffer.a>): void {
  buffer.a = a;
  buffer.t = BUFFER_WINDOW;
}
