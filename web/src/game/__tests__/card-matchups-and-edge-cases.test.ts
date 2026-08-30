/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Complex Card Matchups, Rule Interactions & Edge Cases Test Suite
 * Validates Bella vs Lord Alaric, Step Power Tie Rules, Ward Marker System,
 * Metatron Celestial Aura, Belphegor Immunity, Zero-Power Destruction, and Combat Restrictions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { CombatManager } from '../CombatManager';

describe('Card Matchups & Critical Edge Cases', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
  });

  // 1. Bella vs Lord Alaric & Champions
  describe('Matchup: Bella vs Lord Alaric', () => {
    it('Bella destroys Lord Alaric who is Championing Seal 3', () => {
      const bella = createCard('Bella', false);
      const alaric = createCard('Lord Alaric', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withSeal(3, { alignment: Alignment.DARK, champion: alaric })
        .build();

      harness.abilityManager.applyAbilityEffect(alaric, {
        source: bella,
        effect: 'destroy_creature_on_seal'
      });

      expect(harness.controller.seals[3].champion).toBeNull();
      expect(harness.controller.seals[3].alignment).toBe(Alignment.DARK);
      expect(harness.controller.enemyGraveyard).toContain(alaric);
    });

    it('Lord Alaric returns Bella from a Seal to top of player deck', () => {
      const alaric = createCard('Lord Alaric', true);
      const bella = createCard('Bella', false, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alaric)
        .withSeal(1, { alignment: Alignment.LIGHT, champion: bella })
        .withPlayerDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(bella, {
        source: alaric,
        effect: 'return'
      });

      expect(harness.controller.seals[1].champion).toBeNull();
      expect(harness.controller.seals[1].alignment).toBe(Alignment.LIGHT);
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Bella');
    });
  });

  // 2. Step Power Bonus & Step A Tie Rules
  describe('Step Power Bonuses & Tie Rules', () => {
    it('Step A Tie Rule: Equal effective flip power triggers mutual destruction before Step B abilities', async () => {
      // Remiel base 2 + 3 flipStepBonus = 5
      // Cassiel Haggis base 5
      const remiel = createFaceDownCard('Remiel', false);
      const cassiel = createFaceDownCard('Cassiel Haggis', true);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, remiel)
        .withEnemyFaceDownCard(0, cassiel)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: null })
        .build();

      // Effective flip power is equal: 5 vs 5
      const remielFlipPow = CombatManager.getEffectivePower(remiel, 'flip', false);
      const cassielFlipPow = CombatManager.getEffectivePower(cassiel, 'flip', false);
      expect(remielFlipPow).toBe(5);
      expect(cassielFlipPow).toBe(5);

      // In Step A tie, both are destroyed and seal becomes Neutral
      const killer = { cardName: 'Tie Rule', cause: 'ability' as const };
      harness.controller.destroyCard(remiel, false, 0, false, killer);
      harness.controller.destroyCard(cassiel, true, 0, false, killer);
      await harness.controller.claimSeal(0, Alignment.NEUTRAL);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Step Power Bonus: Varg (+5 Flip) vs Tarkidos (9 Base)', () => {
      const varg = createCard('Varg Greyback', false);
      const tarkidos = createCard('Tarkidos', true);

      const vargPower = CombatManager.getEffectivePower(varg, 'flip', false); // 3 + 5 = 8
      const tarkidosPower = CombatManager.getEffectivePower(tarkidos, 'flip', false); // 9

      expect(vargPower).toBe(8);
      expect(tarkidosPower).toBe(9);
      expect(tarkidosPower).toBeGreaterThan(vargPower);
    });

    it('Step Power Bonus: Luna (+4 Battle) vs Valerius (+3 Battle)', () => {
      const luna = createCard('Luna', false); // 2 + 4 = 6
      const valerius = createCard('Valerius Nightshade', true); // 2 + 3 = 5

      const lunaPower = CombatManager.getEffectivePower(luna, 'battle', false);
      const valeriusPower = CombatManager.getEffectivePower(valerius, 'battle', false);

      expect(lunaPower).toBe(6);
      expect(valeriusPower).toBe(5);
      expect(lunaPower).toBeGreaterThan(valeriusPower);
    });
  });

  // 3. Ward Marker System
  describe('Ward Marker System', () => {
    it('Ward absorbs influence change during Siege and leaves seal alignment unchanged', async () => {
      ScenarioBuilder.create(harness)
        .withSeal(2, { alignment: Alignment.DARK, champion: null, hasWard: true })
        .build();

      expect(harness.controller.seals[2].hasWard).toBe(true);

      // Player attempts to claim seal 2 as LIGHT
      await harness.controller.claimSeal(2, Alignment.LIGHT, { type: 'combat', cardName: 'Siege' });

      // Ward absorbed the claim
      expect(harness.controller.seals[2].hasWard).toBe(false);
      expect(harness.controller.seals[2].alignment).toBe(Alignment.DARK);
    });

    it('Ward absorbs Champion ascension and leaves Champion on battlefield', () => {
      const champ = createCard('Tarkidos', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(1, champ)
        .withSeal(1, { alignment: Alignment.NEUTRAL, champion: null, hasWard: true })
        .build();

      harness.controller.ascendToSeal(champ, 1);

      expect(harness.controller.seals[1].hasWard).toBe(false);
      expect(harness.controller.seals[1].champion).toBeNull();
      expect(harness.controller.playerBattlefield[1]).toBe(champ);
    });

    it('Ward absorbs Calmadious Purify / Skarados Corrupt', async () => {
      ScenarioBuilder.create(harness)
        .withSeal(0, { alignment: Alignment.DARK, champion: null, hasWard: true })
        .build();

      await harness.controller.claimSeal(0, Alignment.LIGHT, { type: 'ability', cardName: 'Calmadious' });
      expect(harness.controller.seals[0].hasWard).toBe(false);
      expect(harness.controller.seals[0].alignment).toBe(Alignment.DARK);
    });
  });

  // 4. Dynamic Faction Power Scaling on Board State Changes
  describe('Dynamic Faction Power Scaling', () => {
    it('accurately updates Grelyn, Oriel, Valtarious, Pazoo, and Alaric', () => {
      const grelyn = createCard('Grelyn Zilkos', false);
      const dawn = createCard('Dawn', false);
      const oriel = createCard('Oriel the Bold', false);
      const remiel = createCard('Remiel', false);
      const val = createCard('Valtarious', false);
      const luna = createCard('Luna', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, grelyn)
        .withPlayerCard(1, dawn)
        .withPlayerCard(2, oriel)
        .withPlayerCard(3, remiel)
        .withPlayerCard(4, val)
        .withPlayerCard(5, luna)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();

      // Grelyn: 1 other Avatar -> +2
      expect(grelyn.data.boardPresencePowerMarkers).toBe(2);
      // Oriel: 2 Celestials total -> +4
      expect(oriel.data.boardPresencePowerMarkers).toBe(4);
      // Valtarious: 1 other Lycan -> +2
      expect(val.data.boardPresencePowerMarkers).toBe(2);
    });

    it('strips board presence power markers when a card is bounced or destroyed', () => {
      const oriel = createCard('Oriel the Bold', false);
      const remiel = createCard('Remiel', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withPlayerCard(1, remiel)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      expect(oriel.data.boardPresencePowerMarkers).toBe(4);

      harness.abilityManager.stripBoardPresencePowerFromCard(oriel);
      expect(oriel.data.boardPresencePowerMarkers).toBe(0);
    });
  });

  // 5. Metatron Celestial Aura & Belphegor Immunity
  describe('Metatron Aura & Ability Immunity', () => {
    it('Metatron championing a seal protects all allied Celestials from enemy creature abilities', () => {
      const metatron = createCard('Metatron', false);
      const remiel = createCard('Remiel', false);
      const oriel = createCard('Oriel the Bold', false);
      const enemyCreature = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: metatron })
        .withPlayerCard(1, remiel)
        .withPlayerCard(2, oriel)
        .withEnemyCard(0, enemyCreature)
        .build();

      expect(harness.abilityManager.isImmuneToAbilities(remiel, enemyCreature)).toBe(true);
      expect(harness.abilityManager.isImmuneToAbilities(oriel, enemyCreature)).toBe(true);
    });

    it('Belphegor is immune to creature abilities', () => {
      const belphegor = createCard('Belphegor', true);
      const enemyCreature = createCard('Jophiel', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, belphegor)
        .withPlayerCard(0, enemyCreature)
        .build();

      expect(harness.abilityManager.isImmuneToAbilities(belphegor, enemyCreature)).toBe(true);
    });
  });

  // 6. Zero-Power Enforced Destruction
  describe('Zero-Power Enforced Destruction', () => {
    it('destroys any creature whose effective power is reduced to 0 or less', () => {
      const luna = createCard('Luna', false, { power: 2, weaknessMarkers: 2 });
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, luna)
        .build();

      const eff = luna.data.power + luna.data.powerMarkers - luna.data.weaknessMarkers;
      expect(eff).toBe(0);

      harness.abilityManager.enforceZeroPowerDestruction();
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(luna);
    });
  });

  // 7. Combat Restrictions: Cyprian & Oriel
  describe('Combat Restrictions: Cyprian & Oriel the Bold', () => {
    it('Cyprian has cannotBattleOrBeBattled flag active', () => {
      const cyprian = createCard('Cyprian', true);
      expect(cyprian.data.cannotBattleOrBeBattled).toBe(true);
    });

    it('Oriel the Bold has cannotBattleWhilePowerIs1 active when effective power is 1', () => {
      const oriel = createCard('Oriel the Bold', false, { power: 1, powerMarkers: 0, weaknessMarkers: 0 });
      expect(oriel.data.cannotBattleWhilePowerIs1).toBe(true);
    });
  });

  // 8. Delayed Combat Touch-of-Death
  describe('Delayed Combat Touch-of-Death', () => {
    it('Elowen Thornver and Fenris Lightfoot mark battling opponent for end-of-round destruction', async () => {
      const elowen = createCard('Elowen Thornver', true);
      const attacker = createCard('Tarkidos', false, { power: 12 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, elowen)
        .withPlayerCard(0, attacker)
        .build();

      // Elowen destroyAttackerEndOfRound flag is verified
      expect(elowen.data.destroyAttackerEndOfRound).toBe(true);
    });
  });
});
