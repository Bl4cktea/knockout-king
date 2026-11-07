import { beforeEach, describe, expect, it } from 'vitest';
import { STEP } from '../src/config';
import { CHAMP, GABBY, ROSTER } from '../src/fighters/champ';
import { computeGrade, formatBoutTime } from '../src/settings';
import { hurtPlayer, press } from '../src/sim/combat';
import { newFight, selectFighter } from '../src/sim/flow';
import { G, O, OG, OH, P, buffer, held } from '../src/sim/state';
import { step } from '../src/sim/step';
import { mulberry32 } from '../src/util/math';
import { setRandom } from '../src/util/random';

const OPP_STATES = ['idle', 'taunt', 'tele', 'strike', 'recover', 'stunned', 'down', 'getup'];

function start(seed: number): void {
  setRandom(mulberry32(seed));
  G.scene = 'title';
  G.wait = 0;
  G.paused = false;
  G.shake = 0;
  G.freeze = 0;
  G.time = 0;
  G.banner = null;
  held.blk = false;
  selectFighter(CHAMP);
  newFight(CHAMP);
}

/** Advance `seconds` of simulated time. */
function run(seconds: number): void {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) step(STEP);
}

function toFight(): void {
  run(2);
  expect(G.scene).toBe('fight');
}

function assertSane(): void {
  for (const v of [
    P.hp,
    P.x,
    P.stars,
    P.stun,
    P.hearts,
    P.score,
    O.hp,
    O.timer,
    O.downY,
    G.time,
    OH.ox,
    OH.rot,
  ]) {
    expect(Number.isFinite(v)).toBe(true);
  }
  for (const g of [OG.L, OG.R]) {
    expect(Number.isFinite(g.x + g.y + g.s + g.glow)).toBe(true);
  }
  expect(P.hp).toBeGreaterThanOrEqual(0);
  expect(P.hp).toBeLessThanOrEqual(100);
  expect(P.stars).toBeGreaterThanOrEqual(0);
  expect(P.stars).toBeLessThanOrEqual(3);
  expect(P.hearts).toBeGreaterThanOrEqual(0);
  expect(P.hearts).toBeLessThanOrEqual(P.maxHearts);
  expect(O.downs).toBeLessThanOrEqual(2);
  expect(OPP_STATES).toContain(O.st);
}

type Bot = (t: number) => void;

/** Plays one full bout. Returns how it ended and how long it took. */
function playBout(seed: number, makeBot: () => Bot, maxSeconds = 600) {
  start(seed);
  const bot = makeBot();
  let steps = 0;
  const limit = Math.round(maxSeconds / STEP);
  while (G.scene !== 'win' && G.scene !== 'lose' && steps < limit) {
    bot(steps * STEP);
    step(STEP);
    if (steps % 120 === 0) assertSane();
    steps++;
  }
  assertSane();
  return { scene: G.scene, seconds: steps * STEP, downs: O.downs, hp: P.hp };
}

const idleBot: Bot = () => {};
const turtleBot: Bot = () => {
  held.blk = true;
};
const makeMasher = (): Bot => {
  const r = mulberry32(99);
  let next = 0;
  return (t) => {
    if (t < next) return;
    next = t + 0.12;
    press((['pl', 'pr', 'dl', 'dr', 'star'] as const)[Math.floor(r() * 5)] as 'pl');
  };
};
/** Reads the wind-up, dodges away from it, and punches every opening. */
const makeSmart = (): Bot => {
  let armed = true; // dodge once per wind-up, in its last moments
  let flip = false;
  return () => {
    if (G.scene !== 'fight') return;
    if (O.st !== 'tele') armed = true;
    if (O.st === 'tele' && armed && O.timer <= 0.18) {
      armed = false;
      press(O.atk === 'L' ? 'dr' : 'dl');
    } else if (O.st === 'taunt' || O.st === 'recover' || O.st === 'stunned') {
      flip = !flip;
      press(flip ? 'pl' : 'pr');
    } else if (P.stars > 0 && O.st === 'idle') {
      press('star');
    }
  };
};

describe('simulation soak', () => {
  beforeEach(() => setRandom(mulberry32(1)));

  it('a passive player always loses, and the bout ends', () => {
    for (const seed of [1, 2, 3]) {
      const r = playBout(seed, () => idleBot);
      expect(r.scene).toBe('lose');
      expect(r.seconds).toBeLessThan(120);
    }
  });

  it('a pure turtle (block only) cannot stall the bout forever', () => {
    const r = playBout(7, () => turtleBot);
    expect(r.scene).toBe('lose');
  });

  it('button mashing stays stable and terminates', () => {
    for (const seed of [11, 12, 13, 14]) {
      const r = playBout(seed, makeMasher);
      expect(['win', 'lose']).toContain(r.scene);
    }
  });

  it('a player who reads the telegraphs can win', () => {
    const results = [21, 22, 23, 24, 25, 26].map((s) => playBout(s, makeSmart));
    for (const r of results) expect(['win', 'lose']).toContain(r.scene);
    expect(results.filter((r) => r.scene === 'win').length).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic for a given seed', () => {
    const a = playBout(5, makeMasher);
    const b = playBout(5, makeMasher);
    expect(b).toEqual(a);
  });
});

describe('input buffer', () => {
  beforeEach(() => {
    start(3);
    toFight();
    O.st = 'idle';
    O.timer = 999; // keep the opponent quiet
  });

  it('runs a press made just before the cooldown ends', () => {
    press('dl');
    expect(P.dodge).toBe(-1);
    run(0.4); // dodge cooldown is 0.46s, so ~0.06s remains: inside the 0.1s window
    press('dr');
    expect(buffer.a).toBe('dr');
    run(0.12);
    expect(buffer.a).toBeNull();
    expect(P.dodge).toBe(1);
  });

  it('drops a press made too early', () => {
    press('dl');
    run(0.1);
    press('dr'); // ~0.36s of cooldown left: far outside the window
    expect(buffer.a).toBe('dr');
    run(0.15);
    expect(buffer.a).toBeNull();
    run(0.5);
    expect(P.dodge).not.toBe(1);
  });

  it('is discarded when the player gets hit', () => {
    press('dl');
    run(0.4);
    press('dr');
    expect(buffer.a).toBe('dr');
    O.st = 'strike';
    O.atk = 'L';
    O.strikeDone = false;
    O.timer = 0.01;
    P.dodgeT = 0;
    P.dodge = 0;
    run(0.05);
    expect(buffer.a).toBeNull();
  });
});

describe('input and flow rules', () => {
  it('starting a bout does not release a held block', () => {
    G.scene = 'title';
    G.wait = 0;
    G.paused = false;
    held.blk = true;
    press('blk');
    expect(G.scene).toBe('intro');
    expect(held.blk).toBe(true);
  });

  it('ignores presses while paused', () => {
    G.scene = 'title';
    G.wait = 0;
    G.paused = true;
    press('start');
    expect(G.scene).toBe('title');
    G.paused = false;
  });

  it('a new bout fully resets both fighters', () => {
    start(8);
    P.hp = 1;
    O.hp = 1;
    O.downs = 2;
    newFight();
    expect(P.hp).toBe(100);
    expect(O.hp).toBe(CHAMP.maxHp);
    expect(O.downs).toBe(0);
    expect(buffer.a).toBeNull();
  });
});

describe('new Championship Circuit & combat mechanics', () => {
  beforeEach(() => {
    start(10);
    toFight();
    O.st = 'idle';
    O.timer = 999;
  });

  it('activates Perfect Dodge and Counter-Punch Crit when dodging late in telegraph', () => {
    O.st = 'tele';
    O.atk = 'L';
    O.teleDur = 0.6;
    O.timer = 0.15;
    press('dr');
    expect(P.counterWin).toBeGreaterThan(0);

    // Opponent enters recovery; player lands a counter punch for 1.5x damage + star
    O.st = 'recover';
    O.recoverHits = 0;
    const hpBefore = O.hp;
    press('pl');
    expect(O.hp).toBe(hpBefore - 11); // round(7 * 1.5) = 11
    expect(P.counterWin).toBe(0);
    expect(P.stars).toBe(1);
    expect(P.combo).toBe(1);
  });

  it('drains Hearts on guarded punches and enters Winded state at 0 Hearts', () => {
    P.hearts = 2;
    O.st = 'idle';
    press('pl');
    expect(P.hearts).toBe(0);
    expect(P.winded).toBe(true);

    // While winded, punches whiff without damaging opponent
    run(0.5);
    O.st = 'taunt';
    const hpBefore = O.hp;
    press('pr');
    expect(O.hp).toBe(hpBefore);
  });

  it('allows button-mash Knockdown Rally to recover from 0 HP', () => {
    hurtPlayer(100, false);
    expect(G.playerDown).toBe(true);
    expect(P.downs).toBe(1);

    for (let i = 0; i < 6; i++) {
      press('pl');
    }
    expect(G.playerDown).toBe(false);
    expect(P.hp).toBe(50);
    expect(P.hearts).toBe(P.maxHearts);
  });

  it('evaluates S/A/B/C grades and formats bout times accurately', () => {
    expect(computeGrade(30, 0, 5, 35)).toBe('S');
    expect(computeGrade(42, 0, 3, 35)).toBe('A');
    expect(computeGrade(75, 1, 2, 35)).toBe('B');
    expect(computeGrade(95, 2, 1, 35)).toBe('C');
    expect(formatBoutTime(65.43)).toBe('1:05.4');
  });

  it('switches fighters cleanly across the 4-fighter Championship Circuit', () => {
    selectFighter(GABBY);
    newFight(GABBY);
    expect(O.f.id).toBe('gabby');
    expect(O.maxhp).toBe(80);
    expect(P.maxHearts).toBe(12);
  });
});

describe('fighter data', () => {
  it('keeps every telegraph readable (at least 0.3s) even at full aggression across the roster', () => {
    for (const fighter of ROSTER) {
      const t = fighter.tune;
      expect(t.tele - t.teleAggr).toBeGreaterThanOrEqual(0.3);
      expect(t.teleFast - t.teleFastAggr).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('has sane ranges for all 4 Championship Circuit fighters', () => {
    for (const fighter of ROSTER) {
      const t = fighter.tune;
      expect(t.idle[0] - t.idleAggr[0]).toBeGreaterThan(0.3);
      expect(t.combo[0] + t.combo[1]).toBeLessThanOrEqual(1);
      expect(t.getupHp).toBeGreaterThan(0);
      expect(t.getupHp).toBeLessThan(1);
    }
  });
});
