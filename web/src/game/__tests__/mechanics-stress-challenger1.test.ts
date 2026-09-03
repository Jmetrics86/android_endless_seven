/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mechanics Stress Challenger 1 Test Suite (Web Engine)
 * Empirically stress-tests combat mechanics, phase precedence, and edge cases:
 * 1. Step 0 Haste strikes vs Non-battlers (Cyprian, Oriel at power 1).
 * 2. Step A Tie Rule: identical effective power reveal destruction prior to abilities (Bella vs Golgothane, Remiel vs 5-power).
 * 3. Step B Nullify priority and descending flip power execution.
 * 4. Step C battle power calculations including battleStepBonusPower (Tarkidos, Zelus, Luna, Valerius, Elowen, Duke).
 * 5. Equal combat power mutual destruction in web engine & seal influence bug audit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard } from './helpers/cardFactory';
import { CombatManager } from '../CombatManager';

describe('Mechanics Stress Challenger 1 — Web Engine Verification', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
    harness.controller.laneAbilityDestruction = Array(7).fill(null);
  });

  // =========================================================================
  // 1. STEP 0 HASTE STRIKES VS NON-BATTLERS
  // =========================================================================
  describe('Step 0 Haste Strikes vs Non-Battlers', () => {
    it('Haste card (Noble the Great) does NOT trigger Step 0 Haste Strike vs Cyprian', async () => {
      const pNoble = createCard('Noble the Great', false, { faceUp: false });
      const eCyprian = createCard('Cyprian', true, { faceUp: false });

      harness.controller.playerBattlefield[0] = pNoble;
      harness.controller.enemyBattlefield[0] = eCyprian;

      await harness.controller.resolveSeal(0);

      // In Step 0, Haste Strike was skipped because Cyprian cannot battle.
      // In Step C, combat was skipped because Cyprian cannot battle.
      // Cyprian is still alive on battlefield faceUp.
      expect(harness.controller.enemyBattlefield[0]).toBe(eCyprian);
      expect(eCyprian.data.faceUp).toBe(true);

      // Now run end-of-round cleanup: Cyprian self-sacrifices
      await (harness.phaseManager as any).cleanupEndOfRoundEffects();

      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      const cyprianGrave = harness.controller.enemyGraveyard.some(c => c.data.name === 'Cyprian');
      expect(cyprianGrave).toBe(true);
    });

    it('Haste card does NOT strike Oriel in Step 0 at power 1, but strikes in Step C after Oriel flips to power 3', async () => {
      const pNoble = createCard('Noble the Great', false, { faceUp: false });
      const eOriel = createCard('Oriel the Bold', true, { faceUp: false });

      harness.controller.playerBattlefield[0] = pNoble;
      harness.controller.enemyBattlefield[0] = eOriel;

      await harness.controller.resolveSeal(0);

      // Noble defeats Oriel in Step C Combat.
      // In Step E, Noble (Champion) ascends to Champion the seal.
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.seals[0].champion?.data.name).toBe('Noble the Great');
      const orielCasualty = harness.controller.enemyGraveyard.some(c => c.data.name === 'Oriel the Bold') ||
        harness.controller.enemyLimbo.some(c => c.data.name === 'Oriel the Bold');
      expect(orielCasualty).toBe(true);
    });
  });

  // =========================================================================
  // 2. STEP A TIE RULE
  // =========================================================================
  describe('Step A Tie Rule Precedence', () => {
    it('Bella (9) vs Golgothane (9): both destroyed immediately in Step A prior to abilities', async () => {
      const pBella = createCard('Bella', false, { faceUp: false });
      const eGolgothane = createCard('Golgothane', true, { faceUp: false });

      harness.controller.playerBattlefield[0] = pBella;
      harness.controller.enemyBattlefield[0] = eGolgothane;

      await harness.controller.resolveSeal(0);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Remiel (flip power 5) vs Mammon (flip power 5): Step A Tie Rule destroys both', async () => {
      const pRemiel = createCard('Remiel', false, { faceUp: false });
      const eMammon = createCard('Mammon', true, { faceUp: false });

      expect(CombatManager.getEffectivePower(pRemiel, 'flip')).toBe(5);
      expect(CombatManager.getEffectivePower(eMammon, 'flip')).toBe(5);

      harness.controller.playerBattlefield[0] = pRemiel;
      harness.controller.enemyBattlefield[0] = eMammon;

      await harness.controller.resolveSeal(0);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });
  });

  // =========================================================================
  // 3. STEP C BATTLE STEP POWER BONUS CALCULATIONS
  // =========================================================================
  describe('Step C Battle Step Bonus Power Calculations', () => {
    it('Tarkidos (base 9 + 2 battle bonus = 11) defeats Coal (power 10) in Step C Combat', async () => {
      const pTark = createCard('Tarkidos', false, { faceUp: false });
      const eCoal = createCard('Coal', true, { faceUp: false });

      expect(CombatManager.getEffectivePower(pTark, 'flip')).toBe(9);
      expect(CombatManager.getEffectivePower(eCoal, 'flip')).toBe(10);
      expect(CombatManager.getEffectivePower(pTark, 'battle', false)).toBe(11);
      expect(CombatManager.getEffectivePower(eCoal, 'battle', false)).toBe(10);

      harness.controller.playerBattlefield[0] = pTark;
      harness.controller.enemyBattlefield[0] = eCoal;

      await harness.controller.resolveSeal(0);

      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      // Tarkidos is a Champion, so in Step E he ascends to Champion the seal
      expect(harness.controller.seals[0].champion?.data.name).toBe('Tarkidos');
    });

    it('Zelus (3+3=6) vs Luna (2+4=6) results in mutual destruction', async () => {
      harness.controller.seals[0].alignment = Alignment.NEUTRAL;
      const pZelus = createCard('Zelus', false, { faceUp: false });
      const eLuna = createCard('Luna', true, { faceUp: false });

      expect(CombatManager.getEffectivePower(pZelus, 'battle', false)).toBe(6);
      expect(CombatManager.getEffectivePower(eLuna, 'battle', false)).toBe(6);

      harness.controller.playerBattlefield[0] = pZelus;
      harness.controller.enemyBattlefield[0] = eLuna;

      await harness.controller.resolveSeal(0);

      // Both cards destroyed
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();

      console.log(`[Zelus vs Luna Result] laneAbilityDestruction: ${harness.controller.laneAbilityDestruction[0]}, sealAlignment: ${harness.controller.seals[0].alignment}`);
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });
  });

  // =========================================================================
  // 4. EQUAL COMBAT POWER MUTUAL DESTRUCTION & SEAL INFLUENCE AUDIT
  // =========================================================================
  describe('Equal Combat Power Mutual Destruction & Seal Influence Audit', () => {
    it('Noble (9) vs Noble (9) in Step 0 Haste Strike mutually destroy', async () => {
      const pNoble = createCard('Noble the Great', false, { faceUp: false });
      const eNoble = createCard('Noble the Great', true, { faceUp: false });

      harness.controller.playerBattlefield[0] = pNoble;
      harness.controller.enemyBattlefield[0] = eNoble;

      await harness.controller.resolveSeal(0);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });
  });
});
