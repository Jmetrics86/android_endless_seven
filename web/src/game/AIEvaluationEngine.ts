/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameController } from './GameController';
import { CardEntity } from '../entities/CardEntity';
import { SealEntity } from '../entities/SealEntity';
import { Alignment, Phase } from '../types';
import { effectivePower, isChampionOnSeal } from './EnemyEasyAI';

/**
 * Returns a score representing the player's advantage.
 * Positive = Player is winning
 * Negative = Enemy is winning
 */
export function evaluateBoardState(game: GameController): number {
  if (!game || !game.state) return 0;
  
  let score = 0;

  // Evaluate Seals
  for (let i = 0; i < 7; i++) {
    const seal = game.seals[i];
    const pCard = game.playerBattlefield[i];
    const eCard = game.enemyBattlefield[i];

    // Seal alignment advantage
    if (seal.alignment === game.state.playerAlignment) score += 20;
    else if (seal.alignment !== Alignment.NEUTRAL) score -= 20;

    // Champion ascension advantage
    if (seal.champion) {
      if (seal.champion.data.isEnemy) score -= 50;
      else score += 50;
    }

    // Lane control advantage: strictly check faceUp state for power & champion identity
    let pPower = 0;
    let ePower = 0;
    
    if (pCard) {
      if (pCard.data.faceUp) {
        pPower = effectivePower(pCard);
        if (pCard.data.isChampion) pPower += 10;
      } else {
        // Face-down card represents unrevealed presence (+5 pts)
        pPower = 5;
      }
    }
    
    if (eCard) {
      if (eCard.data.faceUp) {
        ePower = effectivePower(eCard);
        if (eCard.data.isChampion) ePower += 10;
      } else {
        // Face-down card represents unrevealed presence (+5 pts)
        ePower = 5;
      }
    }
    
    if (!seal.champion) {
      score += (pPower - ePower) * 1.5;
    }
  }

  // Evaluate Hand/Limbo/Queues (resource advantages)
  score += game.playerHand.length * 3;
  score -= (game.enemyPrepRemainder?.length ?? 0) * 3;
  score += (game.state.playerAbilityQueue?.length ?? 0) * 4;
  score -= (game.state.enemyAbilityQueue?.length ?? 0) * 4;

  return Math.round(score * 10) / 10;
}

/**
 * Returns a strategic recommendation based on the current phase and board state.
 */
export function getStrategicRecommendation(game: GameController): string {
  if (!game || !game.state) return "Awaiting state...";

  const phase = game.state.currentPhase;
  if (phase === Phase.GAME_OVER) {
    return game.state.gameOverResult === 'player' ? "Victory achieved! Well played." : "Defeat. Learn from the opponent's strategy.";
  }

  // 1. Determine Game Stage
  const claimedSeals = game.seals.filter(s => s.alignment !== Alignment.NEUTRAL).length;
  let stageLabel = "Early Game";
  if (claimedSeals >= 3 && claimedSeals <= 4) stageLabel = "Mid Game";
  if (claimedSeals >= 5) stageLabel = "Late Game";

  // 2. Win Condition Proximity
  let winConditionAlert = "";
  const playerSeals = game.seals.filter(s => s.alignment === game.state.playerAlignment).length;
  const enemySeals = game.seals.filter(s => s.alignment !== game.state.playerAlignment && s.alignment !== Alignment.NEUTRAL).length;
  
  if (playerSeals === 3) {
    winConditionAlert = " You are 1 seal away from a majority victory! Focus all resources on securing the final seal.";
  } else if (enemySeals === 3) {
    winConditionAlert = " Critical! The enemy is 1 seal away from a majority victory. Defend remaining seals at all costs!";
  }

  // Check Graveborn (Nix Win Condition)
  const allCards = [...game.playerBattlefield, ...game.seals.map(s => s.champion)].filter(c => c && c.data.isEnemy === false) as CardEntity[];
  const graveborn = allCards.filter(c => c.data.type === 'Graveborn');
  const hasChampion = game.seals.some(s => s.champion && s.champion.data.isEnemy === false);
  
  if (graveborn.length >= 3) {
    if (graveborn.length >= 4 && hasChampion) {
       winConditionAlert = " The End is here! You have 4 Graveborn and a Champion. Trigger Nix's win condition!";
    } else {
       winConditionAlert = ` The abyss hungers. You have ${graveborn.length} Graveborn in play.`;
    }
  }

  // Check Dawn (Oathbringers)
  const isLightDeck = game.state.playerAlignment === Alignment.LIGHT;
  if (isLightDeck) {
     const lightAvatars = allCards.filter(c => c.data.faction === 'Avatars of light');
     if (lightAvatars.length >= 3) {
       winConditionAlert = " Dawn's Arrival is near. Establish 4 Light Avatars and a Champion to secure an instant victory.";
     }
  }

  // 3. Ability Store
  let abilityStoreMsg = "";
  const storedAbilities = game.state.playerAbilityQueue?.length || 0;
  if (storedAbilities > 0) {
    abilityStoreMsg = ` You have ${storedAbilities} stored ability${storedAbilities > 1 ? 'ies' : ''} in your drawer. Look for opportunities to use them to swing combat math.`;
  }

  // 4. Phase Specific Tactics
  let phaseMsg = "";
  if (phase === Phase.PREP) {
    const hand = game.playerHand;
    if (hand.length === 0) {
      phaseMsg = "No cards in hand. End your preparation phase.";
    } else {
      const bestCard = [...hand].sort((a, b) => b.data.power - a.data.power)[0];
      let targetSeal = -1;
      for (let i = 0; i < 7; i++) {
        if (game.seals[i].champion) continue;
        if (!game.playerBattlefield[i]) {
          targetSeal = i;
          break;
        }
      }
      if (targetSeal !== -1) {
        if (claimedSeals < 3) {
           phaseMsg = `Play '${bestCard.data.name}' on Seal ${targetSeal + 1} to establish board presence.`;
        } else {
           phaseMsg = `Contest Seal ${targetSeal + 1} with '${bestCard.data.name}' to secure lane control.`;
        }
      } else {
        phaseMsg = `Your frontline is full. Consider swapping a weaker card for '${bestCard.data.name}'.`;
      }
    }
  } else if (phase === Phase.COUNTER_ALLOCATION) {
    if (game.state.powerPool > 0) phaseMsg = "Distribute Power markers to your Champions or key combatants.";
    else if (game.state.weaknessPool > 0) phaseMsg = "Place Weakness markers on the strongest enemy threats.";
    else phaseMsg = "Confirm your counter allocation.";
  } else if (phase === Phase.ABILITY_TARGETING || phase === Phase.SEAL_TARGETING || phase === Phase.DELTA_BUFF_TARGETING) {
    phaseMsg = "Select a target for your active ability carefully to maximize value.";
  } else if (phase === Phase.RESOLUTION) {
    if (game.state.combatInterstitial) {
      const step = game.state.combatInterstitial.step;
      if (step === 'ability' && storedAbilities > 0) {
         phaseMsg = "Now is the perfect time to activate a stored ability to turn the tide!";
      } else {
         phaseMsg = "Combat is resolving. Review the outcome before the next round.";
      }
    } else {
      phaseMsg = "Observe the resolution sequence.";
    }
  }

  // Combine
  let recommendation = `${stageLabel}. ${phaseMsg}${winConditionAlert}${abilityStoreMsg}`;
  
  return recommendation.trim();
}
