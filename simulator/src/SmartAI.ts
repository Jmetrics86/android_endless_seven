/**
 * Smart AI Engine for Endless Seven (Lookahead & Synergy Optimizer)
 */

import { HeadlessCard, HeadlessSeal, effectivePower, Alignment } from './types.js';
import {
  harmTargetScore,
  allyPowerBuffScore,
  enemyWeaknessScore,
  pickBestHarmTarget,
  pickBestAllyPowerTarget,
  pickBestEnemyWeaknessTarget,
  pickChampionForLordAlaric,
  pickLimboForKaelo,
  pickBogvaDestroyTarget,
  pickNobleTheGreatFollowUp,
  pickBellaTarget,
  pickSealForAbility,
  pickAnakimSealIndex,
  pickPazooLimboCard,
  pickNixCreatureType
} from './AI.js';

export class SmartAI {
  /**
   * Evaluates hand placement for Prep phase by scoring lane matchups and tribal synergies.
   */
  public static selectPrepPlacements(
    hand: HeadlessCard[],
    battlefield: (HeadlessCard | null)[],
    oppBattlefield: (HeadlessCard | null)[],
    seals: HeadlessSeal[],
    isEnemy: boolean
  ): { card: HeadlessCard; slotIdx: number }[] {
    const availableHand = [...hand];
    const vacantSlots = battlefield.map((v, i) => (v === null ? i : -1)).filter(i => i !== -1);
    const placements: { card: HeadlessCard; slotIdx: number }[] = [];

    if (vacantSlots.length === 0 || availableHand.length === 0) return placements;

    // Score all (card, slot) combinations
    while (vacantSlots.length > 0 && availableHand.length > 0) {
      let bestChoice: { cardIdx: number; slotIdxIdx: number; score: number } | null = null;
      let highestScore = -Infinity;

      for (let cIdx = 0; cIdx < availableHand.length; cIdx++) {
        const card = availableHand[cIdx];

        for (let sIdxIdx = 0; sIdxIdx < vacantSlots.length; sIdxIdx++) {
          const slot = vacantSlots[sIdxIdx];
          const oppCard = oppBattlefield[slot];
          const seal = seals[slot];

          let score = card.data.power * 5;

          // Champion bonus for uncontested or strategic seal
          if (card.data.isChampion) {
            score += 40;
            if (!seal.champion) score += 30;
          }

          // Haste bonus against enemy units
          if (card.data.hasHaste && oppCard) {
            score += 35;
          }

          // Lane matchup evaluation
          if (oppCard) {
            const myPower = effectivePower(card);
            const oppPower = effectivePower(oppCard);
            if (myPower > oppPower) {
              score += 60 + (myPower - oppPower) * 5; // Winning the lane!
            } else if (myPower === oppPower) {
              score += 20;
            } else {
              score -= 15; // Losing the lane
            }
          } else {
            // Uncontested slot position value (center slots 2,3,4 are prized)
            score += 25 - Math.abs(slot - 3) * 3;
          }

          // Tribal synergy scoring
          const faction = card.data.faction;
          const sameFactionInHand = availableHand.filter(c => c.data.faction === faction).length;
          score += sameFactionInHand * 8;

          if (score > highestScore) {
            highestScore = score;
            bestChoice = { cardIdx: cIdx, slotIdxIdx: sIdxIdx, score };
          }
        }
      }

      if (bestChoice) {
        const [card] = availableHand.splice(bestChoice.cardIdx, 1);
        const [slotIdx] = vacantSlots.splice(bestChoice.slotIdxIdx, 1);
        placements.push({ card, slotIdx });
      } else {
        break;
      }
    }

    return placements;
  }
}
