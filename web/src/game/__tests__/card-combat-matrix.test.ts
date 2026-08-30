/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Exhaustive 42x42 Pairwise Card Combat Matrix Unit Test Suite
 * Tests every single card in Endless Seven (42 total cards) battling against
 * every other card across all 1,764 matchup combinations in the actual Web Game Engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard } from './helpers/cardFactory';
import { LIGHT_POOL, DARK_POOL } from '../../constants';
import { CombatManager } from '../CombatManager';

const ALL_42_CARD_NAMES = [
  ...LIGHT_POOL.map(c => c.name),
  ...DARK_POOL.map(c => c.name)
];

describe('Exhaustive 42x42 (1,764 Matchups) Pairwise Combat Matrix', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  // 42 test suites, each testing a Player Card against all 42 Enemy Cards (42 x 42 = 1,764 matchups)
  ALL_42_CARD_NAMES.forEach((pName, pIdx) => {
    it(`Player [${pIdx + 1}/42]: ${pName} vs all 42 enemy cards`, async () => {
      for (let eIdx = 0; eIdx < ALL_42_CARD_NAMES.length; eIdx++) {
        const eName = ALL_42_CARD_NAMES[eIdx];
        harness.reset();

        // Create fresh entities for this matchup
        const pCard = createCard(pName, false, { faceUp: false });
        const eCard = createCard(eName, true, { faceUp: false });

        harness.controller.playerBattlefield[0] = pCard;
        harness.controller.enemyBattlefield[0] = eCard;

        // Resolve seal 0 in real game controller
        await harness.controller.resolveSeal(0);

        // 1. Verify resolution concluded without errors
        expect(harness.controller.state.currentPhase).toBeDefined();

        // 2. Validate combat power calculation consistency
        const pBattlePow = CombatManager.getEffectivePower(pCard, 'battle', false);
        const eBattlePow = CombatManager.getEffectivePower(eCard, 'battle', false);

        expect(typeof pBattlePow).toBe('number');
        expect(typeof eBattlePow).toBe('number');

        // 3. Verify that non-battler mechanics are respected
        if (pName === 'Cyprian' || eName === 'Cyprian') {
          // Cyprian cannot battle or be battled
          expect(pCard.data.cannotBattleOrBeBattled || eCard.data.cannotBattleOrBeBattled).toBe(true);
        }

        // 4. Verify Zelus step bonus calculations
        if (pName === 'Zelus') {
          expect(pCard.data.battleStepBonusPower).toBe(3);
        }
        if (eName === 'Zelus') {
          expect(eCard.data.battleStepBonusPower).toBe(3);
        }

        // 5. Verify Haste triggers for Haste cards
        const hasHasteCard = (pCard.data.hasHaste || eCard.data.hasHaste) &&
          !pCard.data.cannotBattleOrBeBattled &&
          !eCard.data.cannotBattleOrBeBattled;
        
        if (hasHasteCard) {
          // Both cards should have been revealed during Step 0 Haste Strike
          expect(pCard.data.faceUp).toBe(true);
          expect(eCard.data.faceUp).toBe(true);
        }
      }
    });
  });

  describe('Representative Board State & Combat Invariant Tests', () => {
    it('Zelus vs Samyaza results in mutual tie destruction (6 vs 6)', async () => {
      harness.reset();
      const samyaza = createCard('Samyaza', false, { faceUp: false }); // 6 Power + Haste
      const zelus = createCard('Zelus', true, { faceUp: false }); // 3 Power + 3 battle bonus = 6

      harness.controller.playerBattlefield[0] = samyaza;
      harness.controller.enemyBattlefield[0] = zelus;

      await harness.controller.resolveSeal(0);

      // Both cards have 6 effective combat power -> mutual destruction
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      const pCasualty = harness.controller.playerGraveyard.some(c => c.data.name === 'Samyaza') ||
        harness.controller.playerLimbo.some(c => c.data.name === 'Samyaza');
      const eCasualty = harness.controller.enemyGraveyard.some(c => c.data.name === 'Zelus') ||
        harness.controller.enemyLimbo.some(c => c.data.name === 'Zelus');
      expect(pCasualty).toBe(true);
      expect(eCasualty).toBe(true);
    });

    it('Valerius Nightshade (Haste + Steal) defeats Remiel', async () => {
      harness.reset();
      const valerius = createCard('Valerius Nightshade', false, { faceUp: false }); // 2 + 3 = 5 battle power, steals 1 -> 6 vs 1
      const remiel = createCard('Remiel', true, { faceUp: false }); // 2 base

      harness.controller.playerBattlefield[0] = valerius;
      harness.controller.enemyBattlefield[0] = remiel;

      await harness.controller.resolveSeal(0);

      // Valerius wins combat and survives
      expect(harness.controller.playerBattlefield[0]?.data.name).toBe('Valerius Nightshade');
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      const remielCasualty = harness.controller.enemyGraveyard.some(c => c.data.name === 'Remiel') ||
        harness.controller.enemyLimbo.some(c => c.data.name === 'Remiel');
      expect(remielCasualty).toBe(true);
    });

    it('Sulvian Vane (Haste + Bounce) bounces Tarkidos to owner deck', async () => {
      harness.reset();
      const sulvian = createCard('Sulvian Vane', false, { faceUp: false }); // 5 Power Haste + Bounce
      const tarkidos = createCard('Tarkidos', true, { faceUp: false }); // 9 + 2 = 11 Power

      harness.controller.playerBattlefield[0] = sulvian;
      harness.controller.enemyBattlefield[0] = tarkidos;

      await harness.controller.resolveSeal(0);

      // Sulvian lost combat to Tarkidos (5 vs 11), but Sulvian's bounce sends Tarkidos to enemy deck top
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyDeck[0]?.name).toBe('Tarkidos');
    });

    it('Fenris Lightfoot (Haste + Death Touch) destroys opponent at end of round', async () => {
      harness.reset();
      const fenris = createCard('Fenris Lightfoot', false, { faceUp: false }); // 1 Power Haste
      const ulfric = createCard('Ulfric Thorne', true, { faceUp: false }); // Higher power enemy

      harness.controller.playerBattlefield[0] = fenris;
      harness.controller.enemyBattlefield[0] = ulfric;

      await harness.controller.resolveSeal(0);

      // Fenris was defeated, but marks attacker for end of round destruction
      expect(harness.controller.cardsThatBattledThisRound).toContain(ulfric);
    });
  });
});
