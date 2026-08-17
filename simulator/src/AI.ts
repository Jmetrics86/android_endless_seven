/**
 * Headless AI Decision Engine
 * Evaluates decisions deterministically and strategically for both Player and Enemy sides.
 * 
 * Updated for variant-2026-08-13 mechanics:
 * - Step-specific power bonuses (flipStepBonusPower, battleStepBonusPower)
 * - Dynamic faction power bonuses
 * - Ward marker awareness on seal targeting
 * - cannotBattleWhilePowerIs1 awareness
 * - destroyAttackerEndOfRound mutual destruction trade awareness
 */

import { HeadlessCard, HeadlessSeal, effectivePower, Alignment, CardData } from './types.js';

/**
 * Compute expected effective power for a card in combat context.
 * Accounts for battleStepBonusPower and dynamicFactionPowerBonus scaling.
 */
export function expectedBattlePower(card: HeadlessCard, allAlliesInPlay: HeadlessCard[] = [], isChampioning = false): number {
  let p = effectivePower(card, 'battle', isChampioning);
  // Add dynamic faction bonus estimate if card has it
  if (card.data.dynamicFactionPowerBonus) {
    const { faction, bonusPerCard, excludeSelf } = card.data.dynamicFactionPowerBonus;
    const count = allAlliesInPlay.filter(c => c.data.faction === faction && (excludeSelf ? c !== card : true)).length;
    p += bonusPerCard * count;
  }
  return p;
}

/**
 * Compute expected effective power for a card during Flip resolution.
 * Accounts for flipStepBonusPower.
 */
export function expectedFlipPower(card: HeadlessCard): number {
  return effectivePower(card, 'flip');
}

/**
 * Check if a card effectively cannot battle (either always or conditionally at PV 1).
 */
export function cannotBattle(card: HeadlessCard): boolean {
  if (card.data.cannotBattleOrBeBattled) return true;
  if (card.data.cannotBattleWhilePowerIs1 && effectivePower(card) === 1) return true;
  return false;
}

export function harmTargetScore(source: HeadlessCard, target: HeadlessCard, seals: HeadlessSeal[]): number {
  if (source.isEnemy === target.isEnemy) return -1e9;
  let s = effectivePower(target) * 12;
  if (target.data.isChampion) s += 55;
  if (seals.some(seal => seal.champion === target)) s += 35;
  // Penalize targeting cards with destroyAttackerEndOfRound (mutual destruction trade is worse)
  if (target.data.destroyAttackerEndOfRound) s -= 20;
  // Bonus for targeting cards with dynamicFactionPowerBonus (removes scaling threat)
  if (target.data.dynamicFactionPowerBonus) s += 15;
  return s;
}

export function allyPowerBuffScore(card: HeadlessCard, seals: HeadlessSeal[]): number {
  let s = effectivePower(card) * 8;
  if (card.data.isChampion) s += 25;
  if (seals.some(seal => seal.champion === card)) s += 45;
  // Prefer buffing cards with faction scaling (amplifies value)
  if (card.data.dynamicFactionPowerBonus) s += 12;
  return s;
}

export function enemyWeaknessScore(card: HeadlessCard, seals: HeadlessSeal[]): number {
  let s = effectivePower(card) * 10;
  if (card.data.isChampion) s += 40;
  if (seals.some(seal => seal.champion === card)) s += 30;
  // Bonus for weakening cards with dynamicFactionPowerBonus
  if (card.data.dynamicFactionPowerBonus) s += 10;
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
    // Skip warded seals - the effect will be absorbed/wasted
    if (s.hasWard) return -1000;
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
  const scored = validSeals.map(s => ({ seal: s, score: score(s) })).filter(x => x.score > -500);
  if (scored.length === 0) {
    // All seals are warded, pick least bad option
    return validSeals.reduce((a, b) => (Math.abs(a.index - 3) <= Math.abs(b.index - 3) ? a : b));
  }
  return scored.reduce((a, b) => (a.score >= b.score ? a : b)).seal;
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

/**
 * Pick best vacant seal for Ward placement (Anakim the Wise variant).
 * Prioritize seals that are strategically valuable and currently unprotected.
 */
export function pickWardSealIndex(seals: HeadlessSeal[], myAlign: Alignment): number {
  let bestIdx = -1;
  let best = -Infinity;
  for (const s of seals) {
    if (s.champion || s.hasWard) continue; // Skip championed or already warded seals
    let sc = 0;
    // Prefer warding seals we already control (protect them from being flipped)
    if (s.alignment === myAlign) sc += 100;
    // Then neutral seals (prevent enemy from claiming)
    else if (s.alignment === Alignment.NEUTRAL) sc += 60;
    // Enemy seals are low priority to ward (we want to flip those, not protect them)
    else sc += 10;
    // Center seals are more strategically valuable
    sc += 5 - Math.abs(s.index - 3);
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
