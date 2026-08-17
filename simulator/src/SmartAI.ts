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

    const isMetatronOnSeal = seals.some(s => s.champion?.data.name === 'Metatron');
    const mySideCount = battlefield.filter(c => c !== null).length;
    const oppSideCount = oppBattlefield.filter(c => c !== null).length;
    const bothHaveLotsOfCards = mySideCount >= 2 && oppSideCount >= 2;

    // Score all (card, slot) combinations
    while (vacantSlots.length > 0 && availableHand.length > 0) {
      let bestChoice: { cardIdx: number; slotIdxIdx: number; score: number } | null = null;
      let highestScore = -Infinity;

      for (let cIdx = 0; cIdx < availableHand.length; cIdx++) {
        const card = availableHand[cIdx];
        const faction = card.data.faction;

        for (let sIdxIdx = 0; sIdxIdx < vacantSlots.length; sIdxIdx++) {
          const slot = vacantSlots[sIdxIdx];
          const oppCard = oppBattlefield[slot];
          const seal = seals[slot];

          let score = card.data.power * 5;

          // Champion bonus for uncontested or strategic seal
          if (card.data.isChampion) {
            score += 40;
            if (!seal.champion && !seal.hasWard) {
              score += 30;
            }
          }

          // Haste bonus against enemy units
          if (card.data.hasHaste && oppCard) {
            score += 35;
          }

          // Lane matchup evaluation
          const myPower = effectivePower(card, 'battle');
          
          if (oppCard) {
            const oppPower = effectivePower(oppCard, 'battle');
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

          // Dynamic faction power bonus estimation
          if (card.data.dynamicFactionPowerBonus) {
            const sameFactionOnBoardRaw = battlefield.filter(c => c && c.data.faction === faction).length;
            const sameFactionInHandForBonus = availableHand.filter(c => c.data.faction === faction).length - 1;
            const estimatedFactionBonus = sameFactionOnBoardRaw + sameFactionInHandForBonus;
            score += estimatedFactionBonus * 3;
          }

          // cannotBattleWhilePowerIs1
          if (card.data.cannotBattleWhilePowerIs1 && myPower === 1 && oppCard) {
            score -= 30;
          }

          // destroyAttackerEndOfRound
          if (card.data.destroyAttackerEndOfRound && oppCard) {
            score += 25;
          }

          // Metatron awareness
          if (faction === 'Celestial' && isMetatronOnSeal) {
            score += 15;
          }

          // Desire awareness
          if (card.data.name === 'Desire' && bothHaveLotsOfCards && oppCard) {
            score += 40;
          }

          // Tribal synergy scoring
          const sameFactionOnBoard = battlefield.filter(c => c && c.data.faction === faction).length + seals.filter(s => s.champion?.data.faction === faction).length;
          const sameFactionInHand = availableHand.filter(c => c.data.faction === faction).length;
          score += (sameFactionOnBoard * 12) + (sameFactionInHand * 6);

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
