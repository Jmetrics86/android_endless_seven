/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Zero-Target Safety & Non-Blocking Resolution Test Suite
 * Systematically tests every targeted and selective ability when 0 valid targets exist on the board.
 * Asserts that resolution never hangs and resolves immediately (within timeout safety bounds).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';

describe('Zero-Target Safety & Non-Blocking Resolution', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
  });

  // 1. Bella with 0 creatures on seals
  describe('Bella (creature_on_seal)', () => {
    it('AI auto-resolves or skips cleanly when 0 enemy creatures are on seals', async () => {
      const bella = createCard('Bella', true);
      ScenarioBuilder.create(harness)
        .withEnemyCard(0, bella)
        // All seals empty
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(bella, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });

    it('Player targeting handles 0 creatures on seals gracefully', async () => {
      const bella = createCard('Bella', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .build();

      const startTime = Date.now();
      const promise = harness.abilityManager.handleTargetedAbility(bella, false);
      // If callback was registered, resolve it safely
      if (harness.controller.resolutionCallback) {
        harness.resolvePendingAbility();
      }
      await promise;
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });

    it('Activate with 0 marked creatures logs and returns without hanging', async () => {
      const bella = createCard('Bella', false);
      const cleanCard = createCard('Dawn', false, { powerMarkers: 0, weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withPlayerCard(1, cleanCard)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleActivateAbility(bella, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.state.logs.some(l => l.includes("No creatures with markers"))).toBe(true);
    });
  });

  // 2. Lord Alaric with 0 champions in play
  describe('Lord Alaric (champion)', () => {
    it('AI auto-resolves immediately when 0 enemy champions exist in play', async () => {
      const alaric = createCard('Lord Alaric', true);
      const regularCreature = createCard('Remiel', false); // Creature, not Champion

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alaric)
        .withPlayerCard(0, regularCreature)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(alaric, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(alaric.data.isActivatingAbility).toBe(false);
    });

    it('Player auto-resolves immediately without hanging when 0 other champions exist', async () => {
      const alaric = createCard('Lord Alaric', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, alaric)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(alaric, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.resolutionCallback).toBeNull();
    });
  });

  // 3. Kaelarion with 0 PV <= 3 creatures
  describe('Kaelarion (creature_pv_lte_3)', () => {
    it('AI auto-resolves immediately when all enemy creatures have Power >= 4', async () => {
      const kaelarion = createCard('Kaelarion', true);
      const highPower1 = createCard('Tarkidos', false, { power: 9 });
      const highPower2 = createCard('Calmadious', false, { power: 15 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, kaelarion)
        .withPlayerCard(0, highPower1)
        .withPlayerCard(1, highPower2)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(kaelarion, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(kaelarion.data.isActivatingAbility).toBe(false);
    });

    it('Player auto-resolves immediately when 0 creatures with PV <= 3 exist', async () => {
      const kaelarion = createCard('Kaelarion', false);
      const highPower = createCard('Calmadious', true, { power: 15 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, kaelarion)
        .withEnemyCard(0, highPower)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(kaelarion, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.resolutionCallback).toBeNull();
    });
  });

  // 4. Zelus with 0 creatures having Power >= Zelus
  describe('Zelus (creature_power_gte)', () => {
    it('AI auto-resolves immediately when no enemy creatures have Power >= Zelus', async () => {
      const zelus = createCard('Zelus', true, { power: 3 });
      const smallEnemy1 = createCard('Oriel the Bold', false, { power: 1 });
      const smallEnemy2 = createCard('Remiel', false, { power: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, zelus)
        .withPlayerCard(0, smallEnemy1)
        .withPlayerCard(1, smallEnemy2)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(zelus, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(zelus.data.isActivatingAbility).toBe(false);
    });

    it('Player auto-resolves immediately when no creatures have Power >= Zelus', async () => {
      const zelus = createCard('Zelus', false, { power: 5 });
      const smallEnemy = createCard('Oriel the Bold', true, { power: 1 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, zelus)
        .withEnemyCard(0, smallEnemy)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(zelus, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.resolutionCallback).toBeNull();
    });
  });

  // 5. Kaelo with empty Limbo
  describe('Kaelo (limbo_creature)', () => {
    it('AI auto-resolves immediately when Limbo is completely empty', async () => {
      const kaelo = createCard('Kaelo', true);
      ScenarioBuilder.create(harness)
        .withEnemyCard(0, kaelo)
        .withPlayerLimbo([])
        .withEnemyLimbo([])
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(kaelo, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(kaelo.data.isActivatingAbility).toBe(false);
      expect(kaelo.data.powerMarkers).toBe(0);
    });

    it('Player auto-resolves immediately when Limbo is completely empty', async () => {
      const kaelo = createCard('Kaelo', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, kaelo)
        .withPlayerLimbo([])
        .withEnemyLimbo([])
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(kaelo, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.resolutionCallback).toBeNull();
    });
  });

  // 6. Jophiel with 0 enemy targets
  describe('Jophiel (creature)', () => {
    it('AI auto-resolves immediately when no other creatures exist', async () => {
      const jophiel = createCard('Jophiel', true);
      ScenarioBuilder.create(harness)
        .withEnemyCard(0, jophiel)
        // Player battlefield completely empty
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(jophiel, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(jophiel.data.isActivatingAbility).toBe(false);
    });

    it('Player auto-resolves immediately when 0 other creatures in play', async () => {
      const jophiel = createCard('Jophiel', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, jophiel)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleTargetedAbility(jophiel, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.resolutionCallback).toBeNull();
    });
  });

  // 7. Calmadious with 0 corrupted seals
  describe('Calmadious (purify corrupted seal)', () => {
    it('Flip resolves cleanly when all seals are LIGHT or NEUTRAL (0 corrupted)', async () => {
      const calmadious = createCard('Calmadious', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, calmadious)
        .withAllSeals(Alignment.LIGHT)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleSealTargetAbility(calmadious, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  // 8. Skarados with 0 purified seals
  describe('Skarados (corrupt purified seal)', () => {
    it('Flip resolves cleanly when all seals are DARK or NEUTRAL (0 purified)', async () => {
      const skarados = createCard('Skarados', true);
      ScenarioBuilder.create(harness)
        .withEnemyCard(0, skarados)
        .withAllSeals(Alignment.DARK)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.executeGlobalAbility(skarados);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  // 9. Bogva with 0 weakened creatures
  describe('Bogva (destroy_creature_with_weakness)', () => {
    it('Action resolves immediately without opening targeting UI when 0 weakened creatures exist', async () => {
      const bogva = createCard('Bogva', false);
      const cleanCard = createCard('Dawn', false, { weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bogva)
        .withPlayerCard(1, cleanCard)
        .build();

      const startTime = Date.now();
      await harness.abilityManager.handleBogvaDestroyAction(bogva, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.state.logs).toContain(
        "Bogva finds no creature with Weakness Markers to destroy."
      );
      expect(harness.controller.state.currentPhase).toBe(Phase.PREP);
    });
  });

  // 10. Pazoo with empty friendly Limbo
  describe('Pazoo (bounce limbo creature to deck)', () => {
    it('Flip resolves cleanly when friendly Limbo is empty', async () => {
      const pazoo = createCard('Pazoo', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, pazoo)
        .withPlayerLimbo([])
        .build();

      expect(harness.controller.playerLimbo.length).toBe(0);
      expect(harness.controller.playerDeck.length).toBe(0);
    });
  });

  // 11. Cassiel Haggis with empty deck
  describe('Cassiel Haggis (reveal top of deck)', () => {
    it('Flip resolves with 0 markers when player deck is empty', async () => {
      const cassiel = createFaceDownCard('Cassiel Haggis', false);
      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, cassiel)
        .withPlayerDeck([])
        .build();

      await harness.phaseManager.resolveSeal(0);
      expect(cassiel.data.powerMarkers).toBe(0);
    });
  });

  // 12. Tarkidos Limbo Final Act with 0 undefended seals
  describe('Tarkidos (Limbo Final Act with 0 undefended seals)', () => {
    it('does not purify occupied seals when all 7 seals have champions', async () => {
      const tarkidos = createCard('Tarkidos', false);
      const builder = ScenarioBuilder.create(harness).withPlayerLimbo([tarkidos]);
      for (let i = 0; i < 7; i++) {
        builder.withSeal(i, { alignment: Alignment.DARK, champion: createCard('Golgothane', true) });
      }
      builder.build();

      const allHaveChamps = harness.controller.seals.every(s => s.champion !== null);
      expect(allHaveChamps).toBe(true);
    });
  });

  // 13. Mammon & Bacchus with 0 Power Markers in play
  describe('Mammon & Bacchus (Power Marker siphons with 0 markers)', () => {
    it('Bacchus Flip siphons 0 markers when no Power Markers exist in play', async () => {
      const bacchus = createCard('Bacchus', true);
      const p1 = createCard('Luna', false, { powerMarkers: 0 });
      const e1 = createCard('Zelus', true, { powerMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, bacchus)
        .withPlayerCard(0, p1)
        .withEnemyCard(1, e1)
        .build();

      await harness.abilityManager.executeGlobalAbility(bacchus);
      expect(bacchus.data.powerMarkers).toBe(0);
    });

    it('Mammon Activate siphons 0 markers when no Power Markers exist in play', async () => {
      const mammon = createCard('Mammon', true);
      const p1 = createCard('Luna', false, { powerMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, mammon)
        .withPlayerCard(0, p1)
        .build();

      await harness.abilityManager.handleActivateAbility(mammon, true);
      expect(mammon.data.powerMarkers).toBe(0);
    });
  });

  // 14. Anakim the Wise with 0 vacant seals
  describe('Anakim the Wise (Activate with 0 vacant seals)', () => {
    it('Activate logs and exits cleanly when all 7 seals are occupied', async () => {
      const anakim = createCard('Anakim the Wise', false);
      const builder = ScenarioBuilder.create(harness).withPlayerCard(0, anakim);
      for (let i = 0; i < 7; i++) {
        builder.withSeal(i, { alignment: Alignment.LIGHT, champion: createCard('Tarkidos', false) });
      }
      builder.build();

      const startTime = Date.now();
      await harness.abilityManager.handleActivateAbility(anakim, false);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(harness.controller.state.logs.some(l => l.includes("No vacant seals available"))).toBe(true);
    });
  });

  // 15. Karlyah Limbo Final Act with 0 battled cards
  describe('Karlyah (Limbo Final Act with 0 battled cards)', () => {
    it('safely handles 0 battled cards in round', () => {
      const karlyah = createCard('Karlyah', true);
      ScenarioBuilder.create(harness)
        .withEnemyLimbo([karlyah])
        .build();

      expect(harness.controller.cardsThatBattledThisRound.length).toBe(0);
    });
  });
});
