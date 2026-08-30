/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Challenger 2 (Round 2) Empirical Verification Suite
 * Exhaustively stress-tests:
 * 1. Bella vs Lord Alaric as Champion on Seal (Bella destroys Alaric)
 * 2. Noble the Great post-combat destruction of secondary enemy
 * 3. Lycandor Flip placing -3 Weakness Markers on each enemy creature
 * 4. Step A Tie Rule vs Step C Combat Step bonuses
 * 5. Anakim Ward Marker placement on vacant seals and absorption of influence/ascension
 * 6. Oriel the Bold combat restriction when power is 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { CombatManager } from '../CombatManager';

describe('Challenger 2 (Round 2) — Empirical Verification Suite', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
  });

  // =========================================================================
  // 1. BELLA VS LORD ALARIC AS CHAMPION ON SEAL
  // =========================================================================
  describe('Mechanic 1: Bella vs Lord Alaric (Champion on Seal)', () => {
    it('Bella (destroy_creature_on_seal) correctly identifies enemy Lord Alaric championing a seal as a valid target', () => {
      const bella = createCard('Bella', false);
      const alaric = createCard('Lord Alaric', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withSeal(3, { alignment: Alignment.DARK, champion: alaric })
        .build();

      const targets = harness.abilityManager.getValidAbilityTargets(bella, 'destroy_creature_on_seal', 'creature_on_seal');
      expect(targets).toContain(alaric);
      expect(targets).not.toContain(bella);
    });

    it('Bella destroys Lord Alaric who is Champion on Seal 3 and moves him to enemy graveyard', () => {
      const bella = createCard('Bella', false);
      const alaric = createCard('Lord Alaric', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withSeal(3, { alignment: Alignment.DARK, champion: alaric })
        .build();

      harness.abilityManager.applyAbilityEffect(alaric, {
        source: bella,
        effect: 'destroy_creature_on_seal',
        targetType: 'creature_on_seal'
      });

      expect(harness.controller.seals[3].champion).toBeNull();
      expect(harness.controller.seals[3].alignment).toBe(Alignment.DARK);
      expect(harness.controller.enemyGraveyard).toContain(alaric);
    });

    it('Lord Alaric Flip returns championing Bella from Seal to player deck', () => {
      const alaric = createCard('Lord Alaric', true);
      const bella = createCard('Bella', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alaric)
        .withSeal(1, { alignment: Alignment.LIGHT, champion: bella })
        .withPlayerDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(bella, {
        source: alaric,
        effect: 'return',
        targetType: 'champion'
      });

      expect(harness.controller.seals[1].champion).toBeNull();
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Bella');
    });

    it('Bella auto-resolves cleanly when 0 creatures exist on any seals', async () => {
      const bella = createCard('Bella', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .build();

      await expect(harness.abilityManager.handleTargetedAbility(bella, false)).resolves.not.toThrow();
      expect(harness.controller.state.currentPhase).toBe(Phase.PREP);
    });
  });

  // =========================================================================
  // 2. NOBLE THE GREAT POST-COMBAT DESTRUCTION OF SECONDARY ENEMY
  // =========================================================================
  describe('Mechanic 2: Noble the Great Post-Combat Destruction', () => {
    it('AI Noble the Great post-combat destroys secondary enemy creature with no markers', async () => {
      const noble = createCard('Noble the Great', true);
      const secondaryEnemy = createCard('Mammon', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, noble)
        .withPlayerCard(2, secondaryEnemy)
        .build();

      await harness.abilityManager.handlePostCombat(noble);

      expect(harness.controller.playerBattlefield[2]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(secondaryEnemy);
    });

    it('AI Noble the Great post-combat strips 1 Power Marker from secondary enemy if it has markers', async () => {
      const noble = createCard('Noble the Great', true);
      const secondaryEnemy = createCard('Mammon', false, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, noble)
        .withPlayerCard(2, secondaryEnemy)
        .build();

      await harness.abilityManager.handlePostCombat(noble);

      expect(secondaryEnemy.data.powerMarkers).toBe(1);
      expect(harness.controller.playerBattlefield[2]).toBe(secondaryEnemy);
      expect(harness.controller.playerGraveyard).not.toContain(secondaryEnemy);
    });

    it('Player Noble the Great enters ABILITY_TARGETING and destroys chosen secondary enemy upon selection', async () => {
      const noble = createCard('Noble the Great', false);
      const enemy1 = createCard('Zelus', true);
      const enemy2 = createCard('Skarados', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, noble)
        .withEnemyCard(1, enemy1)
        .withEnemyCard(2, enemy2)
        .build();

      const postCombatPromise = harness.abilityManager.handlePostCombat(noble);

      expect(harness.controller.state.currentPhase).toBe(Phase.ABILITY_TARGETING);
      expect(harness.controller.state.instructionText).toContain('Noble');

      // Human selects enemy2
      harness.selectPendingTarget(enemy2);
      await postCombatPromise;

      expect(harness.controller.enemyBattlefield[2]).toBeNull();
      expect(harness.controller.enemyGraveyard).toContain(enemy2);
      expect(harness.controller.enemyBattlefield[1]).toBe(enemy1);
    });

    it('AI Noble the Great handles post-combat gracefully when no other creatures exist on board', async () => {
      const noble = createCard('Noble the Great', true);
      ScenarioBuilder.create(harness).withEnemyCard(0, noble).build();

      await expect(harness.abilityManager.handlePostCombat(noble)).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // 3. LYCANDOR FLIP PLACING -3 WEAKNESS MARKERS ON EACH ENEMY CREATURE
  // =========================================================================
  describe('Mechanic 3: Lycandor Flip -3 Weakness Markers', () => {
    it('places exactly 3 Weakness Markers on all enemy creatures across battlefield and seals', async () => {
      const lycandor = createFaceDownCard('Lycandor', true);
      const pBattle1 = createCard('Tarkidos', false, { weaknessMarkers: 0 });
      const pBattle2 = createCard('Dawn', false, { weaknessMarkers: 1 });
      const pChamp = createCard('Bella', false, { weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, lycandor)
        .withPlayerCard(1, pBattle1)
        .withPlayerCard(2, pBattle2)
        .withSeal(4, { alignment: Alignment.LIGHT, champion: pChamp })
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(pBattle1.data.weaknessMarkers).toBe(3);
      expect(pBattle2.data.weaknessMarkers).toBe(4); // 1 + 3 = 4
      expect(pChamp.data.weaknessMarkers).toBe(3);
    });

    it('resolves cleanly when 0 enemy creatures exist in play', async () => {
      const lycandor = createFaceDownCard('Lycandor', true);
      ScenarioBuilder.create(harness).withEnemyFaceDownCard(0, lycandor).build();

      await expect(harness.phaseManager.resolveSeal(0)).resolves.not.toThrow();
    });

    it('stacks weakness markers linearly across multiple Lycandor flips (3 -> 6)', async () => {
      const lycandor1 = createFaceDownCard('Lycandor', true);
      const lycandor2 = createFaceDownCard('Lycandor', true);
      const target = createCard('Cassiel Haggis', false, { weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, lycandor1)
        .withEnemyFaceDownCard(1, lycandor2)
        .withPlayerCard(2, target)
        .build();

      await harness.phaseManager.resolveSeal(0);
      expect(target.data.weaknessMarkers).toBe(3);

      await harness.phaseManager.resolveSeal(1);
      expect(target.data.weaknessMarkers).toBe(6);
    });
  });

  // =========================================================================
  // 4. STEP A TIE RULE VS STEP C COMBAT STEP BONUSES
  // =========================================================================
  describe('Mechanic 4: Step A Tie Rule vs Step C Combat Step Bonuses', () => {
    it('Step A Tie: equal effective flip power causes immediate mutual destruction before Step B abilities', async () => {
      // Remiel base 2 + 3 flip = 5
      // Cassiel base 5 + 0 flip = 5
      const remiel = createFaceDownCard('Remiel', false);
      const cassiel = createFaceDownCard('Cassiel Haggis', true);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, remiel)
        .withEnemyFaceDownCard(0, cassiel)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: null })
        .build();

      await harness.phaseManager.resolveSeal(0);

      // Both destroyed in Step A
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(remiel);
      expect(harness.controller.enemyGraveyard).toContain(cassiel);
      // Seal becomes Neutral
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Step C Combat: Battle step bonuses apply during combat step (Luna +4 vs Elowen +2)', async () => {
      const luna = createCard('Luna', false); // Base 2 + 4 battle = 6
      const elowen = createCard('Elowen Thornver', true); // Base 3 + 2 battle = 5

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, luna)
        .withEnemyCard(0, elowen)
        .build();

      const lunaPower = CombatManager.getEffectivePower(luna, 'battle', false);
      const elowenPower = CombatManager.getEffectivePower(elowen, 'battle', false);

      expect(lunaPower).toBe(6);
      expect(elowenPower).toBe(5);

      await harness.phaseManager.resolveSeal(0);

      // Luna defeats Elowen
      expect(harness.controller.playerBattlefield[0]).toBe(luna);
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.enemyGraveyard).toContain(elowen);
    });

    it('Tarkidos gains +2 battle bonus and +3 while championing a Seal (total 14 effective power)', () => {
      const tarkidos = createCard('Tarkidos', false); // Base 9

      const regularCombatPower = CombatManager.getEffectivePower(tarkidos, 'battle', false);
      expect(regularCombatPower).toBe(11); // 9 + 2

      const vsChampionPower = CombatManager.getEffectivePower(tarkidos, 'battle', true);
      expect(vsChampionPower).toBe(14); // 9 + 2 + 3
    });
  });

  // =========================================================================
  // 5. ANAKIM WARD MARKER PLACEMENT AND ABSORPTION OF INFLUENCE / ASCENSION
  // =========================================================================
  describe('Mechanic 5: Anakim Ward Marker Placement & Absorption', () => {
    it('Anakim the Wise (AI) activates to place a Ward Marker on a vacant seal', async () => {
      const anakim = createCard('Anakim the Wise', true);

      // Create scenario where only Seal 2 is vacant (others champion-occupied)
      const builder = ScenarioBuilder.create(harness).withEnemyCard(0, anakim);
      for (let i = 0; i < 7; i++) {
        if (i !== 2) {
          builder.withSeal(i, { alignment: Alignment.NEUTRAL, champion: createCard('Tarkidos', false) });
        } else {
          builder.withSeal(2, { alignment: Alignment.LIGHT, champion: null, hasWard: false });
        }
      }
      builder.build();

      await harness.abilityManager.handleActivateAbility(anakim, true);

      expect(harness.controller.seals[2].hasWard).toBe(true);
    });

    it('Ward absorbs influence change during claimSeal and resets hasWard to false', async () => {
      ScenarioBuilder.create(harness)
        .withSeal(1, { alignment: Alignment.DARK, champion: null, hasWard: true })
        .build();

      await harness.controller.claimSeal(1, Alignment.LIGHT, { type: 'combat', cardName: 'Siege' });

      expect(harness.controller.seals[1].hasWard).toBe(false);
      expect(harness.controller.seals[1].alignment).toBe(Alignment.DARK);
    });

    it('Ward absorbs Champion ascension and resets hasWard to false without placing Champion', () => {
      const champ = createCard('Bella', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(3, champ)
        .withSeal(3, { alignment: Alignment.NEUTRAL, champion: null, hasWard: true })
        .build();

      harness.controller.ascendToSeal(champ, 3);

      expect(harness.controller.seals[3].hasWard).toBe(false);
      expect(harness.controller.seals[3].champion).toBeNull();
      expect(harness.controller.playerBattlefield[3]).toBe(champ);
    });

    it('Anakim handles Activate when 0 vacant seals are available without hanging', async () => {
      const anakim = createCard('Anakim the Wise', false);
      const builder = ScenarioBuilder.create(harness).withPlayerCard(0, anakim);

      for (let i = 0; i < 7; i++) {
        builder.withSeal(i, { alignment: Alignment.NEUTRAL, champion: createCard('Tarkidos', false) });
      }
      builder.build();

      await expect(harness.abilityManager.handleActivateAbility(anakim, false)).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // 6. ORIEL THE BOLD COMBAT RESTRICTION WHEN POWER IS 1
  // =========================================================================
  describe('Mechanic 6: Oriel the Bold Combat Restriction (cannotBattleWhilePowerIs1)', () => {
    it('skips combat at seal when Oriel effective power is 1, leaving seal Neutral', async () => {
      // Base 1 + 2 (self Celestial faction bonus) - 2 weakness = 1 effective power
      const oriel = createCard('Oriel the Bold', false, { power: 1, powerMarkers: 0, weaknessMarkers: 2 });
      const enemy = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withEnemyCard(0, enemy)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: null })
        .build();

      await harness.phaseManager.resolveSeal(0);

      // Both cards survive combat because combat was skipped/stymied
      expect(harness.controller.playerBattlefield[0]).toBe(oriel);
      expect(harness.controller.enemyBattlefield[0]).toBe(enemy);
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('allows combat when Oriel effective power is boosted above 1', async () => {
      // Base 1 + 2 (self Celestial) + 1 power marker = 4 effective power
      const oriel = createCard('Oriel the Bold', false, { power: 1, powerMarkers: 1, weaknessMarkers: 0 });
      const enemy = createCard('Coal', true, { power: 2 }); // eff = 2

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withEnemyCard(0, enemy)
        .build();

      await harness.phaseManager.resolveSeal(0);

      // Oriel (eff 4) battles and defeats Coal (eff 2)
      expect(harness.controller.playerBattlefield[0]).toBe(oriel);
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.enemyGraveyard).toContain(enemy);
    });

    it('re-engages combat lock if Oriel effective power is reduced back to 1 via weakness markers', async () => {
      // Base 1 + 2 (Celestial) + 3 power markers - 5 weakness markers = 1 effective power
      const oriel = createCard('Oriel the Bold', false, { power: 1, powerMarkers: 3, weaknessMarkers: 5 });
      const enemy = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withEnemyCard(0, enemy)
        .build();

      await harness.phaseManager.resolveSeal(0);

      // Combat locked again
      expect(harness.controller.playerBattlefield[0]).toBe(oriel);
      expect(harness.controller.enemyBattlefield[0]).toBe(enemy);
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });
  });
});
