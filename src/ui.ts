import { ac, sfx } from './audio';
import { EXTRA, FACE_COUNTS, randomFace } from './face/config';
import type { FaceConfig } from './face/config';
import { drawFace } from './face/draw';
import { bodyTone } from './face/palette';
import { TRUNK_COLORS } from './fighters/boxer';
import { ROSTER, getFighterById } from './fighters/champ';
import { setPaused, togglePause } from './input';
import {
  cleanName,
  formatBoutTime,
  getRecord,
  isReducedMotion,
  saveSettings,
  settings,
} from './settings';
import { challengerFighter, decodeChallenger, encodeChallenger } from './share';
import { newFight, selectFighter } from './sim/flow';
import { G, P, looks } from './sim/state';
import { pickOne } from './util/random';

const el = <T extends HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing #${id}`);
  return e as T;
};

const GEAR_PRESETS = [
  0,
  EXTRA.headband,
  EXTRA.shades,
  EXTRA.scar,
  EXTRA.goldTooth,
  EXTRA.eyepatch,
  EXTRA.scar | EXTRA.goldTooth,
  EXTRA.headband | EXTRA.shades,
];

/** Render a crisp mini avatar canvas of a fighter's procedural face. */
function renderMiniPortrait(
  cv: HTMLCanvasElement,
  face: FaceConfig,
  defeated: boolean,
  size = 48,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = size * dpr;
  cv.height = size * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = bodyTone(face.skin).dark;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2 - 3);
  const s = (size / 48) * 0.36;
  ctx.scale(s, s);
  drawFace(ctx, face, {
    expr: defeated ? 'stunned' : 'taunt',
    t: 1.2,
    damage: defeated ? 0.45 : 0,
  });
  ctx.restore();
}

/** Wire up the panel under the canvas. Returns a cheap per-frame sync for button state. */
export function initUI(): () => void {
  const nm = el<HTMLInputElement>('nm');
  const shuffle = el<HTMLButtonElement>('shuffle');
  const swap = el<HTMLButtonElement>('swapf');
  const pause = el<HTMLButtonElement>('pause');
  const mute = el<HTMLButtonElement>('mute');
  const rm = el<HTMLInputElement>('rm');
  const freeSpar = el<HTMLInputElement>('freespar');
  const nextRival = el<HTMLButtonElement>('next-rival');
  const circuitGrid = el<HTMLElement>('circuit-grid');
  const circuitSummary = el<HTMLElement>('circuit-summary');
  const custPreview = el<HTMLCanvasElement>('cust-preview');
  const custTargetBtn = el<HTMLButtonElement>('cust-target');
  const custTargetLabel = el<HTMLElement>('cust-target-label');

  // Victory celebration overlay elements
  const victoryOverlay = el<HTMLElement>('victory-overlay');
  const victoryRival = el<HTMLElement>('victory-rival');
  const victoryStats = el<HTMLElement>('victory-stats');
  const victoryNextBtn = el<HTMLButtonElement>('victory-next');
  const victoryRematchBtn = el<HTMLButtonElement>('victory-rematch');

  let editTarget: 'opp' | 'player' = 'opp';

  const pname = el<HTMLInputElement>('pname');
  const shareBtn = el<HTMLButtonElement>('share');
  const shareMsg = el<HTMLElement>('share-msg');
  const challengeOverlay = el<HTMLElement>('challenge-overlay');
  const challengeFace = el<HTMLCanvasElement>('challenge-face');
  const challengeSub = el<HTMLElement>('challenge-sub');

  // Restore the boxer the player built last time.
  if (settings.player) {
    looks.player.face = { ...settings.player.face };
    looks.player.trunks = settings.player.trunks;
  }
  pname.value = settings.playerName;
  const savePlayer = (): void => {
    settings.player = { face: { ...looks.player.face }, trunks: looks.player.trunks };
    saveSettings();
  };

  // Initialize active fighter from saved career settings
  const initialFighter = getFighterById(settings.selectedFighterId);
  selectFighter(initialFighter);
  nm.value = settings.name;

  // A shared link (#f=...) opens a "challenges you" screen for that boxer.
  const clearHash = (): void => history.replaceState(null, '', location.pathname + location.search);
  const challenger = decodeChallenger(new URLSearchParams(location.hash.slice(1)).get('f') ?? '');
  if (challenger) {
    const fighter = challengerFighter(challenger);
    selectFighter(fighter);
    nm.value = settings.name;
    challengeSub.textContent = `${challenger.name} CHALLENGES YOU!`;
    renderMiniPortrait(challengeFace, challenger.face, false, 96);
    challengeOverlay.hidden = false;
    el<HTMLButtonElement>('challenge-accept').addEventListener('click', () => {
      ac();
      challengeOverlay.hidden = true;
      clearHash();
      newFight(fighter);
    });
    el<HTMLButtonElement>('challenge-decline').addEventListener('click', () => {
      challengeOverlay.hidden = true;
      clearHash();
      selectFighter(initialFighter);
      nm.value = settings.name;
      renderCircuit();
    });
  } else if (location.hash.startsWith('#f=')) {
    clearHash(); // unreadable or tampered link: ignore it
  }

  const cards: HTMLButtonElement[] = [];

  const updateWardrobePreview = (): void => {
    const look = editTarget === 'opp' ? looks.opp : looks.player;
    renderMiniPortrait(custPreview, look.face, false, 52);
    custTargetBtn.textContent = editTarget === 'opp' ? 'Target: Rival' : 'Target: You';
    custTargetLabel.textContent =
      editTarget === 'opp' ? `Editing: ${settings.name}` : 'Editing: Your Boxer';
  };

  const renderCircuit = (): void => {
    let belts = 0;
    let sRanks = 0;
    for (const f of ROSTER) {
      const r = getRecord(f.id);
      if (r.wins > 0) belts++;
      if (r.bestGrade === 'S') sRanks++;
    }
    circuitSummary.textContent = `${belts}/4 Rivals Defeated · ${sRanks}/4 S-Rank Medals`;

    ROSTER.forEach((f, idx) => {
      let btn = cards[idx];
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fighter-card';
        btn.setAttribute('role', 'listitem');
        btn.addEventListener('click', (e) => {
          ac();
          setPaused(false);
          selectFighter(f);
          nm.value = settings.name;
          newFight(f);
          renderCircuit();
          if (e.detail > 0) btn?.blur();
        });
        cards[idx] = btn;
        circuitGrid.appendChild(btn);
      }

      const unlocked = settings.freeSpar || idx <= settings.unlockedIdx;
      const active = G.selectedFighter.id === f.id;
      const rec = getRecord(f.id);

      btn.disabled = !unlocked;
      btn.classList.toggle('active', active);

      const rankLabel = `0${idx + 1} · ${f.title?.split('·')[0]?.trim() ?? 'CONTENDER'}`;
      const gradeLabel = rec.bestGrade ? `GRADE ${rec.bestGrade}` : unlocked ? 'OPEN' : 'LOCKED';
      const timeLabel =
        rec.wins > 0
          ? `Best KO ${formatBoutTime(rec.bestTime)} · ${rec.wins}W`
          : `HP ${f.maxHp} · Target ${f.sRankTime ?? 55}s`;

      btn.innerHTML = `
        <canvas class="fighter-avatar" width="48" height="48" aria-hidden="true"></canvas>
        <div class="fighter-info">
          <div class="fighter-top">
            <span class="fighter-rank">${rankLabel}</span>
            <span class="fighter-grade">${gradeLabel}</span>
          </div>
          <div class="fighter-name">${f.name}</div>
          <div class="fighter-meta">${timeLabel}</div>
        </div>
      `;
      const avatarCv = btn.querySelector<HTMLCanvasElement>('.fighter-avatar');
      if (avatarCv) {
        const faceToDraw = active ? looks.opp.face : f.look.face;
        renderMiniPortrait(avatarCv, faceToDraw, rec.wins > 0);
      }
    });
    updateWardrobePreview();
  };

  custTargetBtn.addEventListener('click', (e) => {
    editTarget = editTarget === 'opp' ? 'player' : 'opp';
    updateWardrobePreview();
    if (e.detail > 0) custTargetBtn.blur();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-part]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      ac();
      sfx.rally();
      const part = btn.dataset.part;
      const look = editTarget === 'opp' ? looks.opp : looks.player;
      const fc = look.face;
      if (part === 'trunks') {
        const idx = TRUNK_COLORS.indexOf(look.trunks);
        look.trunks = TRUNK_COLORS[(idx + 1) % TRUNK_COLORS.length] ?? '#d62839';
      } else if (part === 'extras') {
        const curIdx = GEAR_PRESETS.indexOf(fc.extras);
        fc.extras = GEAR_PRESETS[(curIdx + 1) % GEAR_PRESETS.length] ?? 0;
      } else if (part && part in FACE_COUNTS) {
        const key = part as keyof typeof FACE_COUNTS;
        fc[key] = (fc[key] + 1) % FACE_COUNTS[key];
      }
      if (editTarget === 'player') savePlayer();
      renderCircuit();
      if (e.detail > 0) btn.blur();
    });
  });

  freeSpar.checked = settings.freeSpar;
  freeSpar.addEventListener('change', () => {
    settings.freeSpar = freeSpar.checked;
    saveSettings();
    renderCircuit();
  });

  const advanceOrFight = (): void => {
    ac();
    setPaused(false);
    const curIdx = ROSTER.findIndex((f) => f.id === G.selectedFighter.id);
    if (G.scene === 'win' && curIdx >= 0 && curIdx < ROSTER.length - 1) {
      const nextF = ROSTER[curIdx + 1];
      if (nextF && (settings.freeSpar || curIdx + 1 <= settings.unlockedIdx)) {
        selectFighter(nextF);
        nm.value = settings.name;
      }
    }
    newFight(G.selectedFighter);
    renderCircuit();
  };

  nextRival.addEventListener('click', (e) => {
    advanceOrFight();
    if (e.detail > 0) nextRival.blur();
  });

  victoryNextBtn.addEventListener('click', (e) => {
    advanceOrFight();
    if (e.detail > 0) victoryNextBtn.blur();
  });

  victoryRematchBtn.addEventListener('click', (e) => {
    ac();
    setPaused(false);
    newFight(G.selectedFighter);
    renderCircuit();
    if (e.detail > 0) victoryRematchBtn.blur();
  });

  nm.addEventListener('input', () => {
    settings.name = cleanName(nm.value);
    saveSettings();
    updateWardrobePreview();
  });

  shuffle.addEventListener('click', () => {
    looks.opp.face = randomFace();
    looks.player.face = randomFace();
    looks.opp.trunks = pickOne(TRUNK_COLORS);
    looks.player.trunks = pickOne(TRUNK_COLORS.filter((c) => c !== looks.opp.trunks));
    savePlayer();
    renderCircuit();
  });

  swap.addEventListener('click', () => {
    const mine = looks.player.face;
    looks.player.face = looks.opp.face;
    looks.opp.face = mine;
    savePlayer();
    renderCircuit();
  });

  pname.addEventListener('input', () => {
    settings.playerName = cleanName(pname.value, 'CHALLENGER');
    saveSettings();
  });

  shareBtn.addEventListener('click', () => {
    const code = encodeChallenger({
      name: settings.playerName,
      face: looks.player.face,
      trunks: looks.player.trunks,
    });
    const url = `${location.origin}${location.pathname}#f=${code}`;
    navigator.clipboard.writeText(url).then(
      () => (shareMsg.textContent = 'Link copied!'),
      () => {
        history.replaceState(null, '', url); // fallback: copy it from the address bar
        shareMsg.textContent = 'Copy the link from the address bar.';
      },
    );
  });

  pause.addEventListener('click', togglePause);

  const showMute = (): void => {
    mute.textContent = 'Sound: ' + (settings.muted ? 'off' : 'on');
  };
  showMute();
  mute.addEventListener('click', () => {
    settings.muted = !settings.muted;
    saveSettings();
    showMute();
    ac();
  });

  rm.checked = isReducedMotion();
  rm.addEventListener('change', () => {
    settings.reduceMotion = rm.checked;
    saveSettings();
  });

  // After a mouse click, hand focus back to the page so Space/Enter keep working as game keys.
  for (const b of [shuffle, swap, pause, mute, shareBtn]) {
    b.addEventListener('click', (e) => {
      if (e.detail > 0) b.blur();
    });
  }

  // Once a bout has started, collapse the panel; "Learn more" brings everything back.
  const panel = el<HTMLElement>('panel');
  const learn = el<HTMLButtonElement>('learn');
  learn.addEventListener('click', (e) => {
    const open = panel.toggleAttribute('data-expanded');
    learn.setAttribute('aria-expanded', String(open));
    learn.textContent = open ? 'Show less' : 'Learn more';
    if (e.detail > 0) learn.blur();
  });

  renderCircuit();

  let lastLabel = '';
  let lastDisabled = false;
  let lastScene = G.scene;
  let lastFighterId = G.selectedFighter.id;
  let lastWinShown = false;

  return () => {
    if (!panel.hasAttribute('data-compact') && G.scene !== 'title')
      panel.setAttribute('data-compact', '');
    const label = G.paused ? 'Resume' : 'Pause';
    const disabled = !G.paused && G.scene !== 'intro' && G.scene !== 'fight';
    if (label !== lastLabel) pause.textContent = lastLabel = label;
    if (disabled !== lastDisabled) pause.disabled = lastDisabled = disabled;

    // Show the interactive Victory Celebration Overlay once the K.O. banner clears on a win
    const showWinOverlay = G.scene === 'win' && !G.banner && !G.paused;
    if (showWinOverlay !== lastWinShown) {
      lastWinShown = showWinOverlay;
      victoryOverlay.hidden = !showWinOverlay;
      if (showWinOverlay) {
        const curIdx = ROSTER.findIndex((f) => f.id === G.selectedFighter.id);
        const isFinalChamp = curIdx === ROSTER.length - 1;
        victoryRival.textContent = `${settings.name} DEFEATED${G.newRecord ? ' · NEW RECORD!' : ''}`;
        victoryStats.textContent = `GRADE ${G.lastGrade || 'A'} · SCORE ${P.score} · TIME ${formatBoutTime(G.boutTime)} · MAX COMBO x${P.maxCombo}`;
        victoryNextBtn.textContent = isFinalChamp ? 'Defend World Title' : 'Challenge Next Rival';
      }
    }

    if (G.scene !== lastScene || G.selectedFighter.id !== lastFighterId) {
      lastScene = G.scene;
      lastFighterId = G.selectedFighter.id;
      const curIdx = ROSTER.findIndex((f) => f.id === G.selectedFighter.id);
      if (G.scene === 'win' && curIdx >= 0 && curIdx < ROSTER.length - 1) {
        nextRival.textContent = 'Challenge Next Rival';
      } else if (G.scene === 'fight' || G.scene === 'intro') {
        nextRival.textContent = 'Restart Bout';
      } else {
        nextRival.textContent = 'Fight Contender';
      }
      renderCircuit();
    }
  };
}
