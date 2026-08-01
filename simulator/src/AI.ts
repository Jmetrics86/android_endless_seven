/**
 * Headless AI Decision Engine
 * Evaluates decisions deterministically and strategically for both Player and Enemy sides.
 */

import { HeadlessCard, HeadlessSeal, effectivePower, Alignment } from './types.js';

export function harmTargetScore(source: HeadlessCard, target: HeadlessCard, seals: HeadlessSeal[]): number {
  if (source.isEnemy === target.isEnemy) return -1e9;
  let s = effectivePower(target) * 12;
  if (target.data.isChampion) s += 55;
  if (seals.some(seal => seal.champion === target)) s += 35;
  return s;
}

export function allyPowerBuffScore(card: HeadlessCard, seals: HeadlessSeal[]): number {
  let s = effectivePower(card) * 8;
  if (card.data.isChampion) s += 25;
  if (seals.some(seal => seal.champion === card)) s += 45;
  return s;
}

export function enemyWeaknessScore(card: HeadlessCard, seals: HeadlessSeal[]): number {
  let s = effectivePower(card) * 10;
  if (card.data.isChampion) s += 40;
  if (seals.some(seal => seal.champion === card)) s += 30;
  return s;
}

export function pickBestHarmTarget(
  source: HeadlessCard,
  candidates: HeadlessCard[],
  seals: HeadlessSeal[]
): HeadlessCard | null {
  let best: HeadlessCard | null = null;
  let bestS = -Infinity;
  for (const t of candidates) {
    const sc = harmTargetScore(source, t, seals);
    if (sc > bestS) {
      bestS = sc;
      best = t;
    }
  }
  return best;
}

export function pickBestAllyPowerTarget(candidates: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  let best: HeadlessCard | null = null;
  let bestS = -Infinity;
  for (const t of candidates) {
    const sc = allyPowerBuffScore(t, seals);
    if (sc > bestS) {
      bestS = sc;
      best = t;
    }
  }
  return best;
}

export function pickBestEnemyWeaknessTarget(candidates: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  let best: HeadlessCard | null = null;
  let bestS = -Infinity;
  for (const t of candidates) {
    const sc = enemyWeaknessScore(t, seals);
    if (sc > bestS) {
      bestS = sc;
      best = t;
    }
  }
  return best;
}

export function pickChampionForLordAlaric(source: HeadlessCard, champions: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  const foes = champions.filter((c) => c.isEnemy !== source.isEnemy);
  if (foes.length > 0) return pickBestHarmTarget(source, foes, seals);
  return null;
}

export function pickLimboForKaelo(cards: HeadlessCard[]): HeadlessCard | null {
  if (cards.length === 0) return null;
  return cards.reduce((a, b) => (a.data.power >= b.data.power ? a : b));
}

export function pickBogvaDestroyTarget(source: HeadlessCard, validTargets: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  const foes = validTargets.filter((t) => t.isEnemy !== source.isEnemy);
  if (foes.length === 0) return null;
  return pickBestHarmTarget(source, foes, seals);
}

export function pickNobleTheGreatFollowUp(winner: HeadlessCard, board: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  const foes = board.filter((c) => c.isEnemy !== winner.isEnemy);
  if (foes.length === 0) return null;
  return pickBestHarmTarget(winner, foes, seals);
}

export function pickBellaTarget(source: HeadlessCard, withMarkers: HeadlessCard[], seals: HeadlessSeal[]): HeadlessCard | null {
  const alliesWithWeakness = withMarkers.filter(c => c.isEnemy === source.isEnemy && c.weaknessMarkers > 0);
  if (alliesWithWeakness.length > 0) {
    return alliesWithWeakness.reduce((a, b) => (allyPowerBuffScore(a, seals) >= allyPowerBuffScore(b, seals) ? a : b));
  }
  const foesWithPower = withMarkers.filter(c => c.isEnemy !== source.isEnemy && c.powerMarkers > 0);
  if (foesWithPower.length > 0) {
    return foesWithPower.reduce((a, b) => (harmTargetScore(source, a, seals) >= harmTargetScore(source, b, seals) ? a : b));
  }
  return null;
}

export function pickSealForAbility(
  validSeals: HeadlessSeal[],
  effect: Alignment,
  myAlign: Alignment,
  oppAlign: Alignment
): HeadlessSeal | null {
  if (validSeals.length === 0) return null;
  const score = (s: HeadlessSeal) => {
    let sc = 0;
    if (effect === oppAlign) {
      if (s.alignment === oppAlign) sc += 100;
      else if (s.alignment === Alignment.NEUTRAL) sc += 60;
      else sc += 10;
    } else {
      if (s.alignment === myAlign) sc += 100;
      else if (s.alignment === Alignment.NEUTRAL) sc += 60;
      else sc += 10;
    }
    sc += 5 - Math.abs(s.index - 3);
    return sc;
  };
  return validSeals.reduce((a, b) => (score(a) >= score(b) ? a : b));
}

export function pickAnakimSealIndex(seals: HeadlessSeal[], myAlign: Alignment): number {
  let bestIdx = 0;
  let best = -Infinity;
  for (const s of seals) {
    let sc = 0;
    if (s.alignment !== myAlign) sc += 80;
    if (s.alignment === Alignment.NEUTRAL) sc += 40;
    if (s.champion && s.champion.isEnemy !== (myAlign === Alignment.DARK)) sc += 25;
    sc += 4 - Math.abs(s.index - 3);
    if (sc > best) {
      best = sc;
      bestIdx = s.index;
    }
  }
  return bestIdx;
}

export function pickPazooLimboCard(limbo: HeadlessCard[]): HeadlessCard | null {
  if (limbo.length === 0) return null;
  return limbo.reduce((a, b) => {
    const pa = a.data.power + (a.data.isChampion ? 3 : 0);
    const pb = b.data.power + (b.data.isChampion ? 3 : 0);
    return pa >= pb ? a : b;
  });
}

export function pickNixCreatureType(typesInPlay: string[], allInPlay: HeadlessCard[], sourceIsEnemy: boolean): string {
  if (typesInPlay.length === 0) return '';
  const isCreatureFaction = (t: string) => ['Vampyre', 'Lycan', 'Celestial', 'Daemon'].includes(t);
  const victimsOfType = (chosenType: string) =>
    allInPlay.filter((c) =>
      isCreatureFaction(chosenType)
        ? c.data.type === 'Creature' && c.data.faction === chosenType
        : c.data.type === chosenType
    );
  let bestType = typesInPlay[0];
  let bestScore = -1;
  for (const t of typesInPlay) {
    const victims = victimsOfType(t);
    const oppVictims = victims.filter((c) => c.isEnemy !== sourceIsEnemy);
    const prefer = oppVictims.length > 0 ? oppVictims : victims;
    const score = prefer.length * 10 + prefer.filter(c => c.data.isChampion).length * 20;
    if (score > bestScore) {
      bestScore = score;
      bestType = t;
    }
  }
  return bestType;
}

export function vacantSlotPriorityForReinforce(
  slotIdx: number,
  oppBattlefield: (HeadlessCard | null)[]
): number {
  let sc = 10 - Math.abs(slotIdx - 3);
  if (oppBattlefield[slotIdx] !== null) sc += 50;
  return sc;
}
