/**
 * Easy-difficulty enemy heuristics: deterministic, rule-following choices that favor
 * sensible threats and protection without deep lookahead.
 */

import { CardEntity } from '../entities/CardEntity';
import { SealEntity } from '../entities/SealEntity';
import { Alignment } from '../types';

export function effectivePower(c: CardEntity): number {
  return c.data.power + c.data.powerMarkers - c.data.weaknessMarkers;
}

export function isChampionOnSeal(card: CardEntity, seals: SealEntity[]): boolean {
  return seals.some((s) => s.champion === card);
}

/** Higher = better target for harmful effects (from `source`'s perspective). */
export function harmTargetScore(source: CardEntity, target: CardEntity, seals: SealEntity[]): number {
  if (source.data.isEnemy === target.data.isEnemy) return -1e9;
  let s = effectivePower(target) * 12;
  if (target.data.isChampion) s += 55;
  if (isChampionOnSeal(target, seals)) s += 35;
  return s;
}

/** Higher = better ally to receive Power markers. */
export function allyPowerBuffScore(card: CardEntity, seals: SealEntity[]): number {
  let s = effectivePower(card) * 8;
  if (card.data.isChampion) s += 25;
  if (isChampionOnSeal(card, seals)) s += 45;
  return s;
}

/** Higher = better enemy to receive Weakness markers. */
export function enemyWeaknessScore(card: CardEntity, seals: SealEntity[]): number {
  let s = effectivePower(card) * 10;
  if (card.data.isChampion) s += 40;
  if (isChampionOnSeal(card, seals)) s += 30;
  return s;
}

export function pickBestHarmTarget(
  source: CardEntity,
  candidates: CardEntity[],
  seals: SealEntity[]
): CardEntity | null {
  let best: CardEntity | null = null;
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

export function pickBestAllyPowerTarget(candidates: CardEntity[], seals: SealEntity[]): CardEntity | null {
  let best: CardEntity | null = null;
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

export function pickBestEnemyWeaknessTarget(candidates: CardEntity[], seals: SealEntity[]): CardEntity | null {
  let best: CardEntity | null = null;
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

export function pickChampionForLordAlaric(source: CardEntity, champions: CardEntity[], seals: SealEntity[]): CardEntity | null {
  const foes = champions.filter((c) => c.data.isEnemy !== source.data.isEnemy);
  if (foes.length > 0) return pickBestHarmTarget(source, foes, seals);
  return null;
}

// Sentinel -> Kaelo
export function pickLimboForKaelo(cards: CardEntity[]): CardEntity | null {
  if (cards.length === 0) return null;
  return cards.reduce((a, b) => (a.data.power >= b.data.power ? a : b));
}

// Sloth -> Bogva (has the destroy weakness target action now)
export function pickBogvaDestroyTarget(source: CardEntity, validTargets: CardEntity[], seals: SealEntity[]): CardEntity | null {
  const foes = validTargets.filter((t) => t.data.isEnemy !== source.data.isEnemy);
  if (foes.length === 0) return null;
  return pickBestHarmTarget(source, foes, seals);
}

// Inevitable -> Noble The Great
export function pickNobleTheGreatFollowUp(winner: CardEntity, board: CardEntity[], seals: SealEntity[]): CardEntity | null {
  const foes = board.filter((c) => c.data.isEnemy !== winner.data.isEnemy);
  if (foes.length === 0) return null;
  return pickBestHarmTarget(winner, foes, seals);
}

// Allotter -> Bella
export function pickBellaTarget(source: CardEntity, withMarkers: CardEntity[], seals: SealEntity[]): CardEntity | null {
  const alliesWithWeakness = withMarkers.filter(c => c.data.isEnemy === source.data.isEnemy && c.data.weaknessMarkers > 0);
  if (alliesWithWeakness.length > 0) {
    return alliesWithWeakness.reduce((a, b) => (allyPowerBuffScore(a, seals) >= allyPowerBuffScore(b, seals) ? a : b));
  }
  const foesWithPower = withMarkers.filter(c => c.data.isEnemy !== source.data.isEnemy && c.data.powerMarkers > 0);
  if (foesWithPower.length > 0) {
    return foesWithPower.reduce((a, b) => (harmTargetScore(source, a, seals) >= harmTargetScore(source, b, seals) ? a : b));
  }
  return null;
}

export function pickSealForEnemySealAbility(
  validSeals: SealEntity[],
  effect: Alignment,
  pAlign: Alignment,
  eAlign: Alignment
): SealEntity | null {
  if (validSeals.length === 0) return null;
  const score = (s: SealEntity) => {
    let sc = 0;
    if (effect === Alignment.DARK) {
      if (s.alignment === pAlign) sc += 100;
      else if (s.alignment === Alignment.NEUTRAL) sc += 60;
      else sc += 10;
    } else if (effect === Alignment.LIGHT) {
      if (s.alignment === eAlign) sc += 100;
      else if (s.alignment === Alignment.NEUTRAL) sc += 60;
      else sc += 10;
    }
    sc += 5 - Math.abs(s.index - 3);
    return sc;
  };
  return validSeals.reduce((a, b) => (score(a) >= score(b) ? a : b));
}

// Nephilim -> Anakim The Wise
export function pickAnakimSealIndex(seals: SealEntity[], eAlign: Alignment): number {
  let bestIdx = 0;
  let best = -Infinity;
  for (const s of seals) {
    let sc = 0;
    if (s.alignment === eAlign) sc += 80;
    if (s.alignment === Alignment.NEUTRAL) sc += 40;
    if (s.champion?.data.isEnemy) sc += 25;
    sc += 4 - Math.abs(s.index - 3);
    if (sc > best) {
      best = sc;
      bestIdx = s.index;
    }
  }
  return bestIdx;
}

// Hades -> Pazoo
export function pickPazooLimboCard(limbo: CardEntity[]): CardEntity | null {
  if (limbo.length === 0) return null;
  return limbo.reduce((a, b) => {
    const pa = a.data.power + (a.data.isChampion ? 3 : 0);
    const pb = b.data.power + (b.data.isChampion ? 3 : 0);
    return pa >= pb ? a : b;
  });
}

export type NixTypePickerArgs = {
  typesInPlay: string[];
  allInPlay: CardEntity[];
  sourceIsEnemy: boolean;
};

// Death -> Nix
export function pickNixCreatureType(args: NixTypePickerArgs): string {
  const { typesInPlay, allInPlay, sourceIsEnemy } = args;
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
    const oppVictims = victims.filter((c) => c.data.isEnemy !== sourceIsEnemy);
    const prefer = oppVictims.length > 0 ? oppVictims : victims;
    const score =
      prefer.length * 45 +
      prefer.reduce((s, c) => s + effectivePower(c), 0) +
      prefer.filter((c) => c.data.isChampion).length * 40;
    if (score > bestScore) {
      bestScore = score;
      bestType = t;
    }
  }
  return bestType;
}

export function preferEnemyFirstWhenFlipPowerTied(
  pCard: CardEntity | null | undefined,
  eCard: CardEntity | null | undefined,
  pFlipping: boolean,
  eFlipping: boolean
): boolean {
  const pNull = !!pCard?.data.hasNullify;
  const eNull = !!eCard?.data.hasNullify;
  if (eFlipping && pNull && !eNull) return false;
  if (pFlipping && eNull && !pNull) return true;
  return false;
}

export function vacantSlotPriorityForReinforce(
  slotIdx: number,
  playerBattlefield: (CardEntity | null)[]
): number {
  const contested = playerBattlefield[slotIdx] != null ? 40 : 0;
  const center = 8 - Math.abs(slotIdx - 3) * 2;
  return contested + center;
}

// Fallen One -> Samyaza
const SAMYAZA_HIGH_THREAT_NAMES = new Set([
  'Nix',
  'Lycandor',
  'Calmadious',
  'Skarados',
  'Mammon',
  'Lord Alaric',
  'Noble The Great',
  'Belphegor',
  'Zelus',
  'Bogva',
]);

export function shouldEnemyUseSamyazaAgainst(source: CardEntity): boolean {
  if (source.data.hasNullify) return true;
  if (source.data.hasGlobalAbility) return true;
  if (source.data.needsAllocation && (source.data.markerPower ?? 0) + (source.data.markerWeakness ?? 0) >= 4) return true;
  if (SAMYAZA_HIGH_THREAT_NAMES.has(source.data.name)) return true;
  if (source.data.isChampion && source.data.power >= 7) return true;
  return false;
}

export function shouldEnemyUseLuna(
  sealIndex: number,
  newStatus: Alignment,
  seals: SealEntity[],
  pAlign: Alignment,
  eAlign: Alignment
): boolean {
  if (newStatus !== Alignment.LIGHT) return false;
  const seal = seals[sealIndex];
  const prev = seal.alignment;
  if (prev === pAlign) return false;
  const pCount = seals.filter((s) => s.alignment === pAlign).length;
  const wouldFlipToPlayer = newStatus === pAlign && prev !== pAlign;
  const pAfter = wouldFlipToPlayer ? pCount + 1 : pCount;
  if (prev === eAlign) return true;
  if (prev === Alignment.NEUTRAL && pAfter >= 4) return true;
  if (pAfter >= 5) return true;
  return false;
}

// Delta -> Varg Fur-back
export function pickVargBuffTarget(enemyAllies: CardEntity[], seals: SealEntity[]): CardEntity {
  let best = enemyAllies[0];
  let bestS = -Infinity;
  for (const c of enemyAllies) {
    const s = effectivePower(c) + (isChampionOnSeal(c, seals) ? 8 : 0) + (c.data.isChampion ? 4 : 0);
    if (s > bestS) {
      bestS = s;
      best = c;
    }
  }
  return best;
}

// Martyr -> Tarkidos
export function pickTarkidosNeutralSeal(seals: SealEntity[]): SealEntity | null {
  const valid = seals.filter((s) => !s.champion && s.alignment === Alignment.NEUTRAL);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (Math.abs(a.index - 3) <= Math.abs(b.index - 3) ? a : b));
}

function orielSealScore(s: SealEntity, targetAlign: Alignment, pAlign: Alignment, eAlign: Alignment): number {
  let sc = 0;
  if (s.alignment !== targetAlign) sc += 55;
  if (targetAlign === eAlign && s.alignment === pAlign) sc += 45;
  if (targetAlign === pAlign && s.alignment === eAlign) sc += 45;
  if (s.alignment === Alignment.NEUTRAL) sc += 22;
  sc += 5 - Math.abs(s.index - 3);
  return sc;
}

// Thrones -> Oriel The bold
export function pickOrielSeal(
  validSeals: SealEntity[],
  targetAlign: Alignment,
  pAlign: Alignment,
  eAlign: Alignment
): SealEntity | null {
  if (validSeals.length === 0) return null;
  return validSeals.reduce((a, b) =>
    orielSealScore(a, targetAlign, pAlign, eAlign) >= orielSealScore(b, targetAlign, pAlign, eAlign) ? a : b
  );
}

export function limboCardStrengthForBaronSwap(c: CardEntity): number {
  return c.data.power + (c.data.isChampion ? 12 : 0);
}

export function pickBestLimboCardForEnemyBaronSwap(limbo: CardEntity[]): CardEntity | null {
  if (limbo.length === 0) return null;
  return limbo.reduce((a, b) => (limboCardStrengthForBaronSwap(a) >= limboCardStrengthForBaronSwap(b) ? a : b));
}

export function baronSwapImprovesLane(baron: CardEntity, candidate: CardEntity): boolean {
  return limboCardStrengthForBaronSwap(candidate) > limboCardStrengthForBaronSwap(baron);
}

export function pickAvatarFinalActTarget(source: CardEntity, validTargets: CardEntity[], seals: SealEntity[]): CardEntity | null {
  const foes = validTargets.filter((c) => c.data.isEnemy !== source.data.isEnemy);
  if (foes.length === 0) return null;
  return pickBestHarmTarget(source, foes, seals);
}

// Keep old names mapping for back-compat
export const pickLimboForSentinel = pickLimboForKaelo;
export const pickSlothDestroyTarget = pickBogvaDestroyTarget;
export const pickInevitableFollowUp = pickNobleTheGreatFollowUp;
export const pickAllotterTarget = pickBellaTarget;
export const pickNephilimSealIndex = pickAnakimSealIndex;
export const pickHadesLimboCard = pickPazooLimboCard;
export const pickDeathCreatureType = pickNixCreatureType;
export const pickDeltaBuffTarget = pickVargBuffTarget;
export const pickMartyrNeutralSeal = pickTarkidosNeutralSeal;
export const pickThronesSeal = pickOrielSeal;
export const pickChampionForLord = pickChampionForLordAlaric;
