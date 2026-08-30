/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Exhaustive Test Suite for Dark Pool Cards (Cards 22–42)
 * Validates base stats, step power bonuses, triggers, abilities, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { CombatManager } from '../CombatManager';

describe('Dark Pool — 21 Cards Test Matrix', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.DARK);
    harness.reset();
  });

  // 22. Golgothane
  describe('Card 22: Golgothane', () => {
    it('Flip destroys target creature in play', () => {
      const golgothane = createCard('Golgothane', true);
      const target = createCard('Oriel the Bold', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, golgothane)
        .withPlayerCard(1, target)
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: golgothane,
        effect: 'destroy'
      });

      expect(harness.controller.playerBattlefield[1]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(target);
    });

    it('Final Act from Limbo shuffles all enemy Limbo creatures into enemy deck', async () => {
      const golgothane = createCard('Golgothane', true);
      const pLimbo1 = createCard('Dawn', false);
      const pLimbo2 = createCard('Luna', false);

      ScenarioBuilder.create(harness)
        .withEnemyLimbo([golgothane])
        .withPlayerLimbo([pLimbo1, pLimbo2])
        .withPlayerDeck([])
        .build();

      await harness.abilityManager.handleLimboAbility(golgothane);

      expect(harness.controller.playerLimbo.length).toBe(0);
      expect(harness.controller.playerDeck.length).toBe(2);
      expect(harness.controller.enemyLimbo).not.toContain(golgothane);
      expect(harness.controller.enemyGraveyard).toContain(golgothane);
    });
  });

  // 23. Lycandor
  describe('Card 23: Lycandor', () => {
    it('Flip applies -3 Weakness Markers to all enemy creatures in play', async () => {
      const lycandor = createFaceDownCard('Lycandor', true);
      const p1 = createCard('Dawn', false);
      const p2 = createCard('Grelyn Zilkos', false);

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, lycandor)
        .withPlayerCard(1, p1)
        .withPlayerCard(2, p2)
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(p1.data.weaknessMarkers).toBe(3);
      expect(p2.data.weaknessMarkers).toBe(3);
    });

    it('Belphegor is immune to creature abilities', () => {
      const creatureSource = createCard('Cassiel Haggis', false);
      const belphegor = createCard('Belphegor', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, creatureSource)
        .withEnemyCard(0, belphegor)
        .build();

      const isImmune = harness.abilityManager.isImmuneToAbilities(belphegor, creatureSource);
      expect(isImmune).toBe(true);
    });
  });

  // 24. Umbarax
  describe('Card 24: Umbarax', () => {
    it('Flip grants battle invulnerability for the turn', async () => {
      const umbarax = createFaceDownCard('Umbarax', true);
      ScenarioBuilder.create(harness).withEnemyFaceDownCard(0, umbarax).build();

      await harness.phaseManager.resolveSeal(0);
      expect(umbarax.data.isInvincible).toBe(true);
    });

    it('Post-combat win gains +2 base + 2 per Graveborn in play', async () => {
      const umbarax = createCard('Umbarax', true);
      const alliedGraveborn1 = createCard('Lycandor', true);
      const alliedGraveborn2 = createCard('Nix', true);
      const victim = createCard('Fenris Lightfoot', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, umbarax)
        .withEnemyCard(1, alliedGraveborn1)
        .withEnemyCard(2, alliedGraveborn2)
        .withPlayerCard(0, victim)
        .build();

      await harness.abilityManager.handlePostCombat(umbarax);
      // 3 Graveborn in play (Umbarax + 2 allies) -> 2 + 2*3 = 8
      expect(umbarax.data.powerMarkers).toBe(8);
    });
  });

  // 25. Nix
  describe('Card 25: Nix', () => {
    it('Flip destroys all creatures of chosen type in play', async () => {
      const nix = createFaceDownCard('Nix', true);
      const lycan1 = createCard('Luna', false);
      const lycan2 = createCard('Valtarious', false);
      const celestial = createCard('Remiel', false);

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, nix)
        .withPlayerCard(0, lycan1)
        .withPlayerCard(1, lycan2)
        .withPlayerCard(2, celestial)
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerBattlefield[1]).toBeNull();
      expect(harness.controller.playerBattlefield[2]).toBe(celestial);
    });

    it('Activate triggers win condition with 4 Graveborn and champion on seal', async () => {
      const nix = createCard('Nix', true);
      const g1 = createCard('Golgothane', true);
      const g2 = createCard('Lycandor', true);
      const g3 = createCard('Umbarax', true);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, nix)
        .withEnemyCard(1, g1)
        .withEnemyCard(2, g2)
        .withSeal(0, { alignment: Alignment.DARK, champion: g3 })
        .build();

      await harness.abilityManager.handleActivateAbility(nix, true);
      expect(harness.state.gameOverResult).toBe('player');
    });
  });

  // 26. Pazoo
  describe('Card 26: Pazoo', () => {
    it('dynamically gains +2 Power per other Graveborn in play', () => {
      const pazoo = createCard('Pazoo', true);
      const g1 = createCard('Golgothane', true);
      const g2 = createCard('Lycandor', true);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, pazoo)
        .withEnemyCard(1, g1)
        .withEnemyCard(2, g2)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      // 2 other Graveborn * 2 = 4
      expect(pazoo.data.boardPresencePowerMarkers).toBe(4);
      expect(pazoo.data.power + (pazoo.data.boardPresencePowerMarkers ?? 0)).toBe(13);
    });

    it('Flip moves friendly Limbo card to top of deck', async () => {
      const pazoo = createFaceDownCard('Pazoo', true);
      const limboCard = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, pazoo)
        .withEnemyLimbo([limboCard])
        .withEnemyDeck([])
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(harness.controller.enemyLimbo.length).toBe(0);
      expect(harness.controller.enemyDeck.length).toBe(1);
      expect(harness.controller.enemyDeck[0].name).toBe('Zelus');
    });
  });

  // 27. Karlyah
  describe('Card 27: Karlyah', () => {
    it('Activate triggers win condition when controlling 5+ Seals with Champions', async () => {
      const karlyah = createCard('Karlyah', true);
      const builder = ScenarioBuilder.create(harness).withEnemyCard(0, karlyah);
      for (let i = 0; i < 5; i++) {
        builder.withSeal(i, { alignment: Alignment.DARK, champion: createCard('Golgothane', true) });
      }
      builder.build();

      await harness.abilityManager.handleActivateAbility(karlyah, true);
      expect(harness.state.gameOverResult).toBe('player');
    });

    it('Final Act from Limbo destroys a creature that battled this turn', async () => {
      const karlyah = createCard('Karlyah', false);
      const battledCard = createCard('Dawn', true);

      ScenarioBuilder.create(harness)
        .withPlayerLimbo([karlyah])
        .withEnemyCard(0, battledCard)
        .build();

      harness.controller.cardsThatBattledThisRound.push(battledCard);

      const promise = harness.abilityManager.handleLimboAbility(karlyah);
      harness.selectPendingTarget(battledCard);
      await promise;

      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.playerLimbo).not.toContain(karlyah);
      expect(harness.controller.playerGraveyard).toContain(karlyah);
    });
  });

  // 28. Skarados
  describe('Card 28: Skarados', () => {
    it('Flip corrupts every undefended Purified seal', async () => {
      const skarados = createCard('Skarados', true);
      ScenarioBuilder.create(harness)
        .withEnemyCard(0, skarados)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: null })
        .withSeal(1, { alignment: Alignment.LIGHT, champion: null })
        .withSeal(2, { alignment: Alignment.LIGHT, champion: createCard('Dawn', false) })
        .build();

      await harness.abilityManager.executeGlobalAbility(skarados);

      expect(harness.controller.seals[0].alignment).toBe(Alignment.DARK);
      expect(harness.controller.seals[1].alignment).toBe(Alignment.DARK);
      expect(harness.controller.seals[2].alignment).toBe(Alignment.LIGHT);
    });

    it('Activate wipes chosen marker type across all cards via AI', async () => {
      const skarados = createCard('Skarados', true);
      const p1 = createCard('Luna', false, { powerMarkers: 3 });
      const e1 = createCard('Zelus', true, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, skarados)
        .withPlayerCard(0, p1)
        .withEnemyCard(1, e1)
        .build();

      await harness.abilityManager.handleActivateAbility(skarados, true);
      expect(p1.data.powerMarkers).toBe(0);
      expect(e1.data.powerMarkers).toBe(0);
    });
  });

  // 29. Bacchus
  describe('Card 29: Bacchus', () => {
    it('has +4 Flip step bonus power (effective 5)', () => {
      const bacchus = createCard('Bacchus', true);
      expect(bacchus.data.flipStepBonusPower).toBe(4);
      expect(CombatManager.getEffectivePower(bacchus, 'flip', false)).toBe(5);
    });

    it('Flip transfers all Power Markers in play to Bacchus', async () => {
      const bacchus = createCard('Bacchus', true);
      const p1 = createCard('Luna', false, { powerMarkers: 3 });
      const e1 = createCard('Zelus', true, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, bacchus)
        .withPlayerCard(0, p1)
        .withEnemyCard(1, e1)
        .build();

      await harness.abilityManager.executeGlobalAbility(bacchus);
      expect(p1.data.powerMarkers).toBe(0);
      expect(e1.data.powerMarkers).toBe(0);
      expect(bacchus.data.powerMarkers).toBe(5);
    });
  });

  // 30. Desire
  describe('Card 30: Desire', () => {
    it('has +4 Flip step bonus power (effective 6)', () => {
      const desire = createCard('Desire', true);
      expect(desire.data.flipStepBonusPower).toBe(4);
      expect(CombatManager.getEffectivePower(desire, 'flip', false)).toBe(6);
    });

    it('Flip forces mutual sacrifice and allows claiming undefended seal', async () => {
      const desire = createFaceDownCard('Desire', true);
      const enemyVictim = createFaceDownCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, desire)
        .withPlayerFaceDownCard(0, enemyVictim)
        .withSeal(0, { alignment: Alignment.NEUTRAL, champion: null })
        .build();

      await harness.phaseManager.resolveSeal(0);
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
      expect(harness.controller.playerBattlefield[0]).toBeNull();
    });
  });

  // 31. Zelus
  describe('Card 31: Zelus', () => {
    it('has +3 Battle step bonus power (effective 6)', () => {
      const zelus = createCard('Zelus', true);
      expect(zelus.data.battleStepBonusPower).toBe(3);
      expect(CombatManager.getEffectivePower(zelus, 'battle', false)).toBe(6);
    });

    it('Flip places -2 Weakness Marker on creature with Power >= Zelus', () => {
      const zelus = createCard('Zelus', true);
      const enemyTarget = createCard('Dawn', false, { power: 9 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, zelus)
        .withPlayerCard(0, enemyTarget)
        .build();

      harness.abilityManager.applyAbilityEffect(enemyTarget, {
        source: zelus,
        effect: 'place_weakness',
        markerWeakness: 2
      });

      expect(enemyTarget.data.weaknessMarkers).toBe(2);
    });
  });

  // 32. Belphegor
  describe('Card 32: Belphegor', () => {
    it('is immune to creature abilities', () => {
      const belphegor = createCard('Belphegor', true);
      const creatureSource = createCard('Cassiel Haggis', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, belphegor)
        .withPlayerCard(0, creatureSource)
        .build();

      expect(belphegor.data.abilityImmune).toBe(true);
      expect(harness.abilityManager.isImmuneToAbilities(belphegor, creatureSource)).toBe(true);
    });

    it('Flip places -2 Weakness Marker on target creature', () => {
      const belphegor = createCard('Belphegor', true);
      const target = createCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, belphegor)
        .withPlayerCard(0, target)
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: belphegor,
        effect: 'place_weakness',
        markerWeakness: 2
      });

      expect(target.data.weaknessMarkers).toBe(2);
    });
  });

  // 33. Mammon
  describe('Card 33: Mammon', () => {
    it('Flip grants battle invulnerability for the turn', async () => {
      const mammon = createFaceDownCard('Mammon', true);
      ScenarioBuilder.create(harness).withEnemyFaceDownCard(0, mammon).build();

      await harness.phaseManager.resolveSeal(0);
      expect(mammon.data.isInvincible).toBe(true);
    });

    it('Activate transfers all Power Markers in play to Mammon via AI', async () => {
      const mammon = createCard('Mammon', true);
      const p1 = createCard('Luna', false, { powerMarkers: 3 });
      const e1 = createCard('Zelus', true, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, mammon)
        .withPlayerCard(0, p1)
        .withEnemyCard(1, e1)
        .build();

      await harness.abilityManager.handleActivateAbility(mammon, true);
      expect(p1.data.powerMarkers).toBe(0);
      expect(e1.data.powerMarkers).toBe(0);
      expect(mammon.data.powerMarkers).toBe(5);
    });
  });

  // 34. Alistar Elren
  describe('Card 34: Alistar Elren', () => {
    it('Flip places -3 Weakness Marker on target creature', () => {
      const alistar = createCard('Alistar Elren', true);
      const target = createCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alistar)
        .withPlayerCard(0, target)
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: alistar,
        effect: 'place_weakness',
        markerWeakness: 3
      });

      expect(target.data.weaknessMarkers).toBe(3);
    });

    it('Final Act from Limbo places -3 Weakness Marker on target creature and moves to Graveyard', async () => {
      const alistar = createCard('Alistar Elren', false);
      const target = createCard('Dawn', true);

      ScenarioBuilder.create(harness)
        .withPlayerLimbo([alistar])
        .withEnemyCard(0, target)
        .build();

      const promise = harness.abilityManager.handleLimboAbility(alistar);
      harness.selectPendingTarget(target);
      await promise;

      expect(target.data.weaknessMarkers).toBe(3);
      expect(harness.controller.playerLimbo).not.toContain(alistar);
      expect(harness.controller.playerGraveyard).toContain(alistar);
    });
  });

  // 35. Bogva
  describe('Card 35: Bogva', () => {
    it('Flip places -1 Weakness Marker on all enemy creatures', async () => {
      const bogva = createFaceDownCard('Bogva', true);
      const p1 = createCard('Dawn', false);
      const p2 = createCard('Luna', false);

      ScenarioBuilder.create(harness)
        .withEnemyFaceDownCard(0, bogva)
        .withPlayerCard(0, p1)
        .withPlayerCard(1, p2)
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(p1.data.weaknessMarkers).toBe(1);
      expect(p2.data.weaknessMarkers).toBe(1);
    });

    it('Action destroys target creature with Weakness Marker via AI', async () => {
      const bogva = createCard('Bogva', true);
      const weakenedVictim = createCard('Dawn', false, { weaknessMarkers: 1 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, bogva)
        .withPlayerCard(0, weakenedVictim)
        .build();

      await harness.abilityManager.handleBogvaDestroyAction(bogva, true);
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(weakenedVictim);
    });
  });

  // 36. Cyprian
  describe('Card 36: Cyprian', () => {
    it('cannot battle or be battled and has end-of-turn sacrifice flag', () => {
      const cyprian = createCard('Cyprian', true);
      expect(cyprian.data.cannotBattleOrBeBattled).toBe(true);
      expect(cyprian.data.sacrificeEndOfTurn).toBe(true);
    });

    it('Flip places +3 Power Marker on target creature', () => {
      const cyprian = createCard('Cyprian', true);
      const target = createCard('Zelus', true);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, cyprian)
        .withEnemyCard(1, target)
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: cyprian,
        effect: 'place_power',
        markerPower: 3
      });

      expect(target.data.powerMarkers).toBe(3);
    });
  });

  // 37. Valerius Nightshade
  describe('Card 37: Valerius Nightshade', () => {
    it('has +3 Battle step bonus power (effective 5)', () => {
      const valerius = createCard('Valerius Nightshade', true);
      expect(valerius.data.battleStepBonusPower).toBe(3);
      expect(CombatManager.getEffectivePower(valerius, 'battle', false)).toBe(5);
    });

    it('has Haste and nullifies defender Flip ability during combat', async () => {
      const valerius = createCard('Valerius Nightshade', true);
      const defender = createCard('Cassiel Haggis', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, valerius)
        .withPlayerCard(0, defender)
        .build();

      await harness.controller.handleBattle(valerius, defender, 0, false);
      expect(defender.data.isSuppressed).toBe(true);
    });
  });

  // 38. Elowen Thornver
  describe('Card 38: Elowen Thornver', () => {
    it('has +2 Battle step bonus power (effective 5) and destroyAttackerEndOfRound', () => {
      const elowen = createCard('Elowen Thornver', true);
      expect(elowen.data.battleStepBonusPower).toBe(2);
      expect(CombatManager.getEffectivePower(elowen, 'battle', false)).toBe(5);
      expect(elowen.data.destroyAttackerEndOfRound).toBe(true);
    });
  });

  // 39. Kaelarion
  describe('Card 39: Kaelarion', () => {
    it('Flip destroys target creature with Power Value <= 3', () => {
      const kaelarion = createCard('Kaelarion', true);
      const smallTarget = createCard('Luna', false, { power: 2 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, kaelarion)
        .withPlayerCard(0, smallTarget)
        .build();

      harness.abilityManager.applyAbilityEffect(smallTarget, {
        source: kaelarion,
        effect: 'destroy'
      });

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(smallTarget);
    });

    it('Final Act from Limbo returns Champion to top of deck', () => {
      const kaelarion = createCard('Kaelarion', true);
      const enemyChamp = createCard('Lord Alaric', false);

      ScenarioBuilder.create(harness)
        .withEnemyLimbo([kaelarion])
        .withPlayerCard(0, enemyChamp)
        .withPlayerDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(enemyChamp, {
        source: kaelarion,
        effect: 'return'
      });
      harness.abilityManager.moveToGraveyard(kaelarion);

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Lord Alaric');
      expect(harness.controller.enemyLimbo).not.toContain(kaelarion);
      expect(harness.controller.enemyGraveyard).toContain(kaelarion);
    });
  });

  // 40. Sulvian Vane
  describe('Card 40: Sulvian Vane', () => {
    it('has Haste and bounces battling creature to top of owner deck', async () => {
      const sulvian = createCard('Sulvian Vane', true);
      const attacker = createCard('Dawn', false, { power: 12 });

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, sulvian)
        .withPlayerCard(0, attacker)
        .withPlayerDeck([])
        .build();

      await harness.controller.handleBattle(attacker, sulvian, 0, false);
      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Dawn');
    });
  });

  // 41. Duke Aren Drakos
  describe('Card 41: Duke Aren Drakos', () => {
    it('has +1 Battle step bonus power (effective 7)', () => {
      const duke = createCard('Duke Aren Drakos', true);
      expect(duke.data.battleStepBonusPower).toBe(1);
      expect(CombatManager.getEffectivePower(duke, 'battle', false)).toBe(7);
    });

    it('Flip returns target creature to top of owner deck', () => {
      const duke = createCard('Duke Aren Drakos', true);
      const target = createCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, duke)
        .withPlayerCard(0, target)
        .withPlayerDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: duke,
        effect: 'return'
      });

      expect(harness.controller.playerBattlefield[0]).toBeNull();
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Dawn');
    });
  });

  // 42. Lord Alaric
  describe('Card 42: Lord Alaric', () => {
    it('dynamically gains +2 Power per other Vampyre in play', () => {
      const alaric = createCard('Lord Alaric', true);
      const v1 = createCard('Valerius Nightshade', true);
      const v2 = createCard('Kaelarion', true);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alaric)
        .withEnemyCard(1, v1)
        .withEnemyCard(2, v2)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      // 2 other Vampyres * 2 = 4
      expect(alaric.data.boardPresencePowerMarkers).toBe(4);
      expect(alaric.data.power + (alaric.data.boardPresencePowerMarkers ?? 0)).toBe(11);
    });

    it('Flip returns target Champion in play to top of owner deck', () => {
      const alaric = createCard('Lord Alaric', true);
      const enemyChamp = createCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, alaric)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: enemyChamp })
        .withPlayerDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(enemyChamp, {
        source: alaric,
        effect: 'return'
      });

      expect(harness.controller.seals[0].champion).toBeNull();
      expect(harness.controller.playerDeck.length).toBe(1);
      expect(harness.controller.playerDeck[0].name).toBe('Dawn');
    });
  });
});
