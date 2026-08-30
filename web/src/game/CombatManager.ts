/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardEntity } from '../entities/CardEntity';

/**
 * Computes step-aware effective power for a card.
 * @param card The card entity (or mock card with data) to calculate power for.
 * @param step 'base' | 'flip' | 'battle'
 * @param isChampioningSeal Whether the card is currently championing a seal (for championBattleBonusPower)
 */
export function getCardEffectivePower(
  card: CardEntity | { data: any } | null | undefined,
  step: 'base' | 'flip' | 'battle' = 'base',
  isChampioningSeal = false
): number {
  let power = (card.data.power ?? 0) + (card.data.powerMarkers ?? 0) - (card.data.weaknessMarkers ?? 0);
  if (step === 'flip' && card.data.flipStepBonusPower) {
    power += card.data.flipStepBonusPower;
  }
  if (step === 'battle') {
    if (card.data.battleStepBonusPower) {
      power += card.data.battleStepBonusPower;
    }
    if (isChampioningSeal && card.data.championBattleBonusPower) {
      power += card.data.championBattleBonusPower;
    }
  }
  return power;
}

export class CombatManager {
  public static getEffectivePower = getCardEffectivePower;
}
