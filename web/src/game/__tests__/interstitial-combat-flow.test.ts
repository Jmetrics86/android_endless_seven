/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interstitial Combat Flow & Lifecycle Resolution Test Suite
 * Validates state transitions through Step 0 (Haste) -> Step A (Flip) -> Step B (Abilities) -> Step C (Combat) -> Step D (Siege/Ascension/Claim).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';

describe('Interstitial Combat Flow & Full Resolution Lifecycle', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
  });

  // 1. Single Seal Full Lifecycle Progression
  describe('Single Seal Lifecycle: Flip -> Ability -> Combat -> Claim', () => {
    it('executes full sequence on a contested seal with face-down cards', async () => {
      // Player: Tarkidos (base 9, Champion)
      // Enemy: Zelus (base 3)
      const tarkidos = createFaceDownCard('Tarkidos', false);
      const zelus = createFaceDownCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, tarkidos)
        .withEnemyFaceDownCard(0, zelus)
        .withSeal(0, { alignment: Alignment.NEUTRAL, champion: null })
        .build();

      expect(tarkidos.data.faceUp).toBe(false);
      expect(zelus.data.faceUp).toBe(false);

      // Trigger resolution for Seal 0
      await harness.phaseManager.resolveSeal(0);

      // 1. Both cards flipped
      expect(tarkidos.data.faceUp).toBe(true);
      expect(zelus.data.faceUp).toBe(true);

      // 2. Combat: Tarkidos (9) defeated Zelus (3)
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.enemyGraveyard).toContain(zelus);

      // 3. Tarkidos ascended to champion Seal 0 and claimed it as LIGHT
      expect(harness.controller.seals[0].champion).toBe(tarkidos);
      expect(harness.controller.seals[0].alignment).toBe(Alignment.LIGHT);
    });

    it('cleanly resolves an empty seal lane with no cards', async () => {
      ScenarioBuilder.create(harness)
        .withSeal(3, { alignment: Alignment.NEUTRAL, champion: null })
        .build();

      await harness.phaseManager.resolveSeal(3);

      expect(harness.controller.seals[3].alignment).toBe(Alignment.NEUTRAL);
      expect(harness.controller.seals[3].champion).toBeNull();
    });
  });

  // 2. Step 0: Haste Combat Prior to Flip Abilities
  describe('Step 0: Haste Strike', () => {
    it('Haste creature battles immediately before Step A/B', async () => {
      // Noble the Great (Haste, PV 9) vs face-down Golgothane (PV 9)
      const noble = createFaceDownCard('Noble the Great', false);
      const enemyGolgothane = createFaceDownCard('Golgothane', true);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, noble)
        .withEnemyFaceDownCard(0, enemyGolgothane)
        .withSeal(0, { alignment: Alignment.NEUTRAL, champion: null })
        .build();

      // Resolve seal 0
      await harness.phaseManager.resolveSeal(0);

      // Haste triggered reveal and immediate combat
      expect(noble.data.faceUp).toBe(true);
      expect(enemyGolgothane.data.faceUp).toBe(true);
    });
  });

  // 3. Multi-Seal Full Board Sequential Resolution
  describe('Full Board 7-Seal Resolution Loop', () => {
    it('sequentially resolves all 7 seals without hanging or state desync', async () => {
      const builder = ScenarioBuilder.create(harness);

      // Lane 0: Tarkidos (9) vs Zelus (3) -> Player wins, ascends
      builder.withPlayerFaceDownCard(0, 'Tarkidos');
      builder.withEnemyFaceDownCard(0, 'Zelus');
      builder.withSeal(0, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 1: Empty lane -> Skips cleanly
      builder.withSeal(1, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 2: Luna (2) vs Golgothane (9) -> Enemy wins, ascends
      builder.withPlayerFaceDownCard(2, 'Luna');
      builder.withEnemyFaceDownCard(2, 'Golgothane');
      builder.withSeal(2, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 3: Grelyn Zilkos (9) vs empty -> Siege, claims seal
      builder.withPlayerFaceDownCard(3, 'Grelyn Zilkos');
      builder.withSeal(3, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 4: Empty vs Umbarax (9) -> Enemy siege, claims seal
      builder.withEnemyFaceDownCard(4, 'Umbarax');
      builder.withSeal(4, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 5: Noble the Great (Haste 9) vs Valerius (Haste 2) -> Haste combat
      builder.withPlayerFaceDownCard(5, 'Noble the Great');
      builder.withEnemyFaceDownCard(5, 'Valerius Nightshade');
      builder.withSeal(5, { alignment: Alignment.NEUTRAL, champion: null });

      // Lane 6: Calmadious (15) vs Skarados (15) -> God duel
      builder.withPlayerFaceDownCard(6, 'Calmadious');
      builder.withEnemyFaceDownCard(6, 'Skarados');
      builder.withSeal(6, { alignment: Alignment.NEUTRAL, champion: null });

      builder.build();

      // Auto-resolve any interactive prompts (such as Noble the Great post-combat) during autonomous loop
      let pendingCb: any = null;
      Object.defineProperty(harness.controller, 'resolutionCallback', {
        get: () => pendingCb,
        set: (cb) => {
          pendingCb = cb;
          if (cb) {
            queueMicrotask(() => {
              if (pendingCb) {
                const fn = pendingCb;
                pendingCb = null;
                fn();
              }
            });
          }
        },
        configurable: true
      });

      // Resolve all 7 seals in order
      for (let i = 0; i < 7; i++) {
        await harness.phaseManager.resolveSeal(i);
      }

      // Assert outcomes
      expect(harness.controller.seals[0].alignment).toBe(Alignment.LIGHT);
      expect(harness.controller.seals[1].alignment).toBe(Alignment.NEUTRAL);
      expect(harness.controller.seals[2].alignment).toBe(Alignment.DARK);
      expect(harness.controller.seals[3].alignment).toBe(Alignment.LIGHT);
      expect(harness.controller.seals[4].alignment).toBe(Alignment.DARK);
    });
  });

  // 4. Processing State Lifecycle
  describe('Processing State Lifecycle', () => {
    it('isProcessing state toggles cleanly during resolution', async () => {
      const tarkidos = createCard('Tarkidos', false);
      const enemy = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, tarkidos)
        .withEnemyCard(0, enemy)
        .build();

      expect(harness.controller.isProcessing).toBe(false);
      await harness.controller.resolveSeal(0);
      expect(harness.controller.isProcessing).toBe(false);
    });
  });

  // 5. Undefended Seal Siege & Non-Champion Lane Survival
  describe('Undefended Seal Siege', () => {
    it('creature on undefended seal performs siege and claims influence', async () => {
      const grelyn = createCard('Grelyn Zilkos', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, grelyn)
        .withSeal(0, { alignment: Alignment.DARK, champion: null })
        .build();

      await harness.controller.handleSiege(0, grelyn, true);

      expect(harness.controller.seals[0].alignment).toBe(Alignment.LIGHT);
    });
  });
});
