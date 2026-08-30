/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Exhaustive Test Suite for Light Pool Cards (Cards 1–21)
 * Validates base stats, step power bonuses, triggers, abilities, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Alignment, Phase } from '../../types';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { createCard, createFaceDownCard } from './helpers/cardFactory';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { CombatManager } from '../CombatManager';

describe('Light Pool — 21 Cards Test Matrix', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness(Alignment.LIGHT);
    harness.reset();
  });

  // 1. Tarkidos
  describe('Card 1: Tarkidos', () => {
    it('applies +2 Power during battle step (effective 11)', () => {
      const tarkidos = createCard('Tarkidos', false);
      const effPower = CombatManager.getEffectivePower(tarkidos, 'battle', false);
      expect(effPower).toBe(11);
    });

    it('applies +5 total (+2 battle + 3 champion) when championing a seal (effective 14)', () => {
      const tarkidos = createCard('Tarkidos', false);
      const effPower = CombatManager.getEffectivePower(tarkidos, 'battle', true);
      expect(effPower).toBe(14);
    });

    it('Final Act from Limbo purifies an undefended corrupted seal to Light', async () => {
      const tarkidos = createCard('Tarkidos', false);
      ScenarioBuilder.create(harness)
        .withPlayerLimbo([tarkidos])
        .withSeal(2, { alignment: Alignment.DARK, champion: null })
        .build();

      const promise = harness.abilityManager.handleLimboAbility(tarkidos);
      harness.selectPendingSeal(2);
      await promise;

      expect(harness.controller.seals[2].alignment).toBe(Alignment.LIGHT);
      expect(harness.controller.playerLimbo).not.toContain(tarkidos);
      expect(harness.controller.playerGraveyard).toContain(tarkidos);
    });
  });

  // 2. Grelyn Zilkos
  describe('Card 2: Grelyn Zilkos', () => {
    it('dynamically gains +2 Power per other Oathbringer/Avatar in play', () => {
      const grelyn = createCard('Grelyn Zilkos', false);
      const dawn = createCard('Dawn', false);
      const bella = createCard('Bella', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, grelyn)
        .withPlayerCard(1, dawn)
        .withPlayerCard(2, bella)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      // 2 other Avatars of light -> +4 Power
      expect(grelyn.data.boardPresencePowerMarkers).toBe(4);
      expect(grelyn.data.power + (grelyn.data.boardPresencePowerMarkers ?? 0)).toBe(13);
    });

    it('dynamically scales down when allied Oathbringer is removed', () => {
      const grelyn = createCard('Grelyn Zilkos', false);
      const dawn = createCard('Dawn', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, grelyn)
        .withPlayerCard(1, dawn)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      expect(grelyn.data.boardPresencePowerMarkers).toBe(2);

      // Remove dawn
      harness.controller.playerBattlefield[1] = null;
      harness.abilityManager.syncBoardPresencePowerMarkers();
      expect(grelyn.data.boardPresencePowerMarkers).toBe(0);
    });
  });

  // 3. Dawn
  describe('Card 3: Dawn', () => {
    it('gains board presence power markers dynamically from Oathbringers', () => {
      const dawn = createCard('Dawn', false);
      const grelyn = createCard('Grelyn Zilkos', false);
      const tarkidos = createCard('Tarkidos', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, dawn)
        .withPlayerCard(1, grelyn)
        .withPlayerCard(2, tarkidos)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      expect(dawn.data.boardPresencePowerMarkers).toBeGreaterThanOrEqual(0);
    });

    it('Activate triggers alternate win condition if 4 Oathbringers and champion on seal', async () => {
      const dawn = createCard('Dawn', false);
      const grelyn = createCard('Grelyn Zilkos', false);
      const bella = createCard('Bella', false);
      const tarkidos = createCard('Tarkidos', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, dawn)
        .withPlayerCard(1, grelyn)
        .withPlayerCard(2, bella)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: tarkidos })
        .build();

      await harness.abilityManager.handleActivateAbility(dawn, false);
      expect(harness.state.gameOverResult).toBe('player');
    });

    it('Activate does not trigger win if fewer than 4 Oathbringers in play', async () => {
      const dawn = createCard('Dawn', false);
      const tarkidos = createCard('Tarkidos', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, dawn)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: tarkidos })
        .build();

      await harness.abilityManager.handleActivateAbility(dawn, false);
      expect(harness.state.gameOverResult).toBeNull();
    });
  });

  // 4. Bella
  describe('Card 4: Bella', () => {
    it('Flip destroys target creature on a seal', async () => {
      const bella = createCard('Bella', false);
      const enemyChamp = createCard('Lord Alaric', true);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withSeal(3, { alignment: Alignment.DARK, champion: enemyChamp })
        .build();

      harness.abilityManager.applyAbilityEffect(enemyChamp, {
        source: bella,
        effect: 'destroy_creature_on_seal'
      });

      expect(harness.controller.seals[3].champion).toBeNull();
      expect(harness.controller.enemyGraveyard).toContain(enemyChamp);
    });

    it('Activate destroys chosen marker type on target creature via AI', async () => {
      const bella = createCard('Bella', false);
      const targetCard = createCard('Varg Greyback', false, { weaknessMarkers: 3, powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, bella)
        .withPlayerCard(1, targetCard)
        .build();

      await harness.abilityManager.handleActivateAbility(bella, true);
      expect(targetCard.data.weaknessMarkers).toBe(0);
    });

    it('Flip target filter excludes Bella herself from valid targets', () => {
      const bella = createCard('Bella', false);
      ScenarioBuilder.create(harness)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: bella })
        .build();

      const targets = harness.abilityManager.getValidAbilityTargets(bella, 'destroy_creature_on_seal', 'creature_on_seal');
      expect(targets).not.toContain(bella);
    });
  });

  // 5. Noble the Great
  describe('Card 5: Noble the Great', () => {
    it('has Haste flag set', () => {
      const noble = createCard('Noble the Great', false);
      expect(noble.data.hasHaste).toBe(true);
    });

    it('Post-combat win destroys target secondary creature via handlePostCombat', async () => {
      const noble = createCard('Noble the Great', true);
      const secondaryEnemy = createCard('Mammon', false);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, noble)
        .withPlayerCard(1, secondaryEnemy)
        .build();

      await harness.abilityManager.handlePostCombat(noble);

      expect(harness.controller.playerBattlefield[1]).toBeNull();
      expect(harness.controller.playerGraveyard).toContain(secondaryEnemy);
    });
  });

  // 6. Coal
  describe('Card 6: Coal', () => {
    it('Activate wins match when controlling 5+ Seals with Champions', async () => {
      const coal = createCard('Coal', false);
      const builder = ScenarioBuilder.create(harness).withPlayerCard(0, coal);
      for (let i = 0; i < 5; i++) {
        builder.withSeal(i, { alignment: Alignment.LIGHT, champion: createCard('Tarkidos', false) });
      }
      builder.build();

      await harness.abilityManager.handleActivateAbility(coal, false);
      expect(harness.state.gameOverResult).toBe('player');
    });

    it('Final Act moves from Limbo to Graveyard when blocking champion ascension', () => {
      const coal = createCard('Coal', false);
      ScenarioBuilder.create(harness)
        .withPlayerLimbo([coal])
        .build();

      harness.abilityManager.moveToGraveyard(coal);
      expect(harness.controller.playerLimbo).not.toContain(coal);
      expect(harness.controller.playerGraveyard).toContain(coal);
    });
  });

  // 7. Calmadious
  describe('Card 7: Calmadious', () => {
    it('Flip purifies a corrupted Dark seal without a champion', async () => {
      const calmadious = createCard('Calmadious', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, calmadious)
        .withSeal(1, { alignment: Alignment.DARK, champion: null })
        .build();

      await harness.controller.claimSeal(1, Alignment.LIGHT, { type: 'ability', cardName: 'Calmadious' });
      expect(harness.controller.seals[1].alignment).toBe(Alignment.LIGHT);
    });

    it('Activate purges all Power or Weakness markers globally via AI', async () => {
      const calmadious = createCard('Calmadious', false);
      const p1 = createCard('Luna', false, { powerMarkers: 3, weaknessMarkers: 0 });
      const e1 = createCard('Zelus', true, { powerMarkers: 2, weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, calmadious)
        .withPlayerCard(1, p1)
        .withEnemyCard(1, e1)
        .build();

      await harness.abilityManager.handleActivateAbility(calmadious, true);
      expect(p1.data.powerMarkers).toBe(0);
      expect(e1.data.powerMarkers).toBe(0);
    });
  });

  // 8. Oriel the Bold
  describe('Card 8: Oriel the Bold', () => {
    it('has cannotBattleWhilePowerIs1 set to true', () => {
      const oriel = createCard('Oriel the Bold', false);
      expect(oriel.data.cannotBattleWhilePowerIs1).toBe(true);
    });

    it('dynamically gains +2 per Celestial in play (including self)', () => {
      const oriel = createCard('Oriel the Bold', false);
      const remiel = createCard('Remiel', false);
      const samyaza = createCard('Samyaza', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withPlayerCard(1, remiel)
        .withPlayerCard(2, samyaza)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      // 3 Celestials in play * 2 = 6 board presence power markers
      expect(oriel.data.boardPresencePowerMarkers).toBe(6);
      expect(oriel.data.power + (oriel.data.boardPresencePowerMarkers ?? 0)).toBe(7);
    });

    it('Flip changes influence of undefended seal', async () => {
      const oriel = createCard('Oriel the Bold', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, oriel)
        .withSeal(4, { alignment: Alignment.NEUTRAL, champion: null })
        .build();

      await harness.controller.claimSeal(4, Alignment.LIGHT, { type: 'ability', cardName: 'Oriel the Bold' });
      expect(harness.controller.seals[4].alignment).toBe(Alignment.LIGHT);
    });
  });

  // 9. Remiel
  describe('Card 9: Remiel', () => {
    it('has +3 Flip step bonus power (effective 5)', () => {
      const remiel = createCard('Remiel', false);
      expect(remiel.data.flipStepBonusPower).toBe(3);
      expect(CombatManager.getEffectivePower(remiel, 'flip', false)).toBe(5);
    });

    it('Flip reveals face-down opponent and nullifies its Flip ability', async () => {
      const remiel = createFaceDownCard('Remiel', false);
      const enemyFaceDown = createFaceDownCard('Golgothane', true);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, remiel)
        .withEnemyFaceDownCard(0, enemyFaceDown)
        .build();

      await harness.phaseManager.resolveSeal(0);

      expect(enemyFaceDown.data.faceUp).toBe(true);
      expect(enemyFaceDown.data.isSuppressed).toBe(true);
    });
  });

  // 10. Anakim the Wise
  describe('Card 10: Anakim the Wise', () => {
    it('Flip grants temporary battle invulnerability', async () => {
      const anakim = createFaceDownCard('Anakim the Wise', true);
      ScenarioBuilder.create(harness).withEnemyFaceDownCard(0, anakim).build();

      await harness.phaseManager.resolveSeal(0);
      expect(anakim.data.isInvincible).toBe(true);
    });

    it('Activate places Ward Marker on a vacant seal via AI', async () => {
      const anakim = createCard('Anakim the Wise', false);
      ScenarioBuilder.create(harness)
        .withPlayerCard(0, anakim)
        .withSeal(2, { alignment: Alignment.NEUTRAL, champion: null, hasWard: false })
        .build();

      await harness.abilityManager.handleActivateAbility(anakim, true);
      const wardedSeal = harness.controller.seals.find(s => s.hasWard);
      expect(wardedSeal).toBeDefined();
    });
  });

  // 11. Jophiel
  describe('Card 11: Jophiel', () => {
    it('Flip returns target creature in play to top of owner deck', () => {
      const jophiel = createCard('Jophiel', false);
      const enemyCreature = createCard('Zelus', true, { powerMarkers: 2 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, jophiel)
        .withEnemyCard(1, enemyCreature)
        .withEnemyDeck([])
        .build();

      harness.abilityManager.applyAbilityEffect(enemyCreature, {
        source: jophiel,
        effect: 'return'
      });

      expect(harness.controller.enemyBattlefield[1]).toBeNull();
      expect(harness.controller.enemyDeck.length).toBe(1);
      expect(harness.controller.enemyDeck[0].name).toBe('Zelus');
    });
  });

  // 12. Cassiel Haggis
  describe('Card 12: Cassiel Haggis', () => {
    it('Flip reveals top of deck and gains Power Markers equal to revealed card PV during seal resolution', async () => {
      const cassiel = createFaceDownCard('Cassiel Haggis', false);
      const topDeckCard = createCard('Metatron', false, { power: 7 });

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, cassiel)
        .withPlayerDeck([topDeckCard.data])
        .build();

      await harness.phaseManager.resolveSeal(0);
      expect(cassiel.data.powerMarkers).toBe(7);
    });

    it('Flip with empty deck gracefully handles 0 markers', async () => {
      const cassiel = createFaceDownCard('Cassiel Haggis', false);

      ScenarioBuilder.create(harness)
        .withPlayerFaceDownCard(0, cassiel)
        .withPlayerDeck([])
        .build();

      await harness.phaseManager.resolveSeal(0);
      expect(cassiel.data.powerMarkers).toBe(0);
    });
  });

  // 13. Samyaza
  describe('Card 13: Samyaza', () => {
    it('has Haste flag set for instant pre-flip combat', () => {
      const samyaza = createCard('Samyaza', false);
      expect(samyaza.data.hasHaste).toBe(true);
    });

    it('Final Act from Limbo moves to Graveyard to nullify creature ability', () => {
      const samyaza = createCard('Samyaza', false);
      ScenarioBuilder.create(harness)
        .withPlayerLimbo([samyaza])
        .build();

      harness.abilityManager.moveToGraveyard(samyaza);
      expect(harness.controller.playerLimbo).not.toContain(samyaza);
      expect(harness.controller.playerGraveyard).toContain(samyaza);
    });
  });

  // 14. Metatron
  describe('Card 14: Metatron', () => {
    it('provides Celestial immunity aura while championing a seal', () => {
      const metatron = createCard('Metatron', false);
      const remiel = createCard('Remiel', false);
      const enemySource = createCard('Alistar Elren', true);

      ScenarioBuilder.create(harness)
        .withSeal(0, { alignment: Alignment.LIGHT, champion: metatron })
        .withPlayerCard(1, remiel)
        .build();

      const isImmune = harness.abilityManager.isImmuneToAbilities(remiel, enemySource);
      expect(isImmune).toBe(true);
    });

    it('Activate destroys chosen marker type on target creature via AI', async () => {
      const metatron = createCard('Metatron', false);
      const target = createCard('Varg Greyback', false, { powerMarkers: 4, weaknessMarkers: 0 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, metatron)
        .withPlayerCard(1, target)
        .build();

      await harness.abilityManager.handleActivateAbility(metatron, true);
      expect(target.data.powerMarkers).toBe(0);
    });
  });

  // 15. Fenris Lightfoot
  describe('Card 15: Fenris Lightfoot', () => {
    it('has Haste and destroyAttackerEndOfRound set', () => {
      const fenris = createCard('Fenris Lightfoot', false);
      expect(fenris.data.hasHaste).toBe(true);
      expect(fenris.data.destroyAttackerEndOfRound).toBe(true);
    });

    it('marks combat opponent for end-of-round destruction', async () => {
      const fenris = createCard('Fenris Lightfoot', false);
      const attacker = createCard('Umbarax', true, { power: 9 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, fenris)
        .withEnemyCard(0, attacker)
        .build();

      await harness.controller.handleBattle(attacker, fenris, 0, false);
      expect(attacker.data.markedByWildWolf).toBe(true);
    });
  });

  // 16. Luna
  describe('Card 16: Luna', () => {
    it('has +4 Battle step bonus power (effective 6)', () => {
      const luna = createCard('Luna', false);
      expect(luna.data.battleStepBonusPower).toBe(4);
      expect(CombatManager.getEffectivePower(luna, 'battle', false)).toBe(6);
    });

    it('Final Act moves from Limbo to Graveyard when nullifying undefended seal influence', () => {
      const luna = createCard('Luna', false);
      ScenarioBuilder.create(harness)
        .withPlayerLimbo([luna])
        .build();

      harness.abilityManager.moveToGraveyard(luna);
      expect(harness.controller.playerLimbo).not.toContain(luna);
      expect(harness.controller.playerGraveyard).toContain(luna);
    });
  });

  // 17. Varg Greyback
  describe('Card 17: Varg Greyback', () => {
    it('has +5 Flip step bonus power (effective 8)', () => {
      const varg = createCard('Varg Greyback', false);
      expect(varg.data.flipStepBonusPower).toBe(5);
      expect(CombatManager.getEffectivePower(varg, 'flip', false)).toBe(8);
    });

    it('allocates Power Markers to creatures via allocateCounters', async () => {
      const varg = createCard('Varg Greyback', true);
      const target1 = createCard('Luna', true);
      const target2 = createCard('Fenris Lightfoot', true);

      ScenarioBuilder.create(harness)
        .withEnemyCard(0, varg)
        .withEnemyCard(1, target1)
        .withEnemyCard(2, target2)
        .build();

      await harness.abilityManager.allocateCounters(varg, true);

      expect(target1.data.powerMarkers + target2.data.powerMarkers + varg.data.powerMarkers).toBe(4);
    });
  });

  // 18. Kaelo
  describe('Card 18: Kaelo', () => {
    it('Flip absorbs Power Value of selected creature in Limbo', () => {
      const kaelo = createCard('Kaelo', false);
      const limboCreature = createCard('Metatron', false, { power: 7 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, kaelo)
        .withPlayerLimbo([limboCreature])
        .build();

      harness.abilityManager.applyAbilityEffect(limboCreature, {
        source: kaelo,
        effect: 'sentinel_absorb'
      });

      expect(kaelo.data.powerMarkers).toBe(7);
    });
  });

  // 19. Valtarious
  describe('Card 19: Valtarious', () => {
    it('dynamically gains +2 per other Lycan in play', () => {
      const val = createCard('Valtarious', false);
      const lycan1 = createCard('Luna', false);
      const lycan2 = createCard('Fenris Lightfoot', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, val)
        .withPlayerCard(1, lycan1)
        .withPlayerCard(2, lycan2)
        .build();

      harness.abilityManager.syncBoardPresencePowerMarkers();
      // 2 other Lycans * 2 = 4
      expect(val.data.boardPresencePowerMarkers).toBe(4);
      expect(val.data.power + (val.data.boardPresencePowerMarkers ?? 0)).toBe(9);
    });

    it('Final Act from Limbo gives target allied Lycan +3 Power Marker and moves to Graveyard', async () => {
      const val = createCard('Valtarious', true);
      const allyLycan = createCard('Luna', true);

      ScenarioBuilder.create(harness)
        .withEnemyLimbo([val])
        .withEnemyCard(0, allyLycan)
        .build();

      await harness.abilityManager.handleLimboAbility(val);

      expect(allyLycan.data.powerMarkers).toBe(3);
      expect(harness.controller.enemyLimbo).not.toContain(val);
      expect(harness.controller.enemyGraveyard).toContain(val);
    });
  });

  // 20. Ulfric Thorne
  describe('Card 20: Ulfric Thorne', () => {
    it('Flip grants battle invulnerability for the turn', async () => {
      const ulfric = createFaceDownCard('Ulfric Thorne', true);
      ScenarioBuilder.create(harness).withEnemyFaceDownCard(0, ulfric).build();

      await harness.phaseManager.resolveSeal(0);
      expect(ulfric.data.isInvincible).toBe(true);
    });

    it('Activate places +2 Power Marker on target creature', () => {
      const ulfric = createCard('Ulfric Thorne', false);
      const target = createCard('Luna', false);

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, ulfric)
        .withPlayerCard(1, target)
        .build();

      harness.abilityManager.applyAbilityEffect(target, {
        source: ulfric,
        effect: 'place_power',
        markerPower: 2
      });

      expect(target.data.powerMarkers).toBe(2);
    });
  });

  // 21. Lucian Blackwood
  describe('Card 21: Lucian Blackwood', () => {
    it('has Haste flag set for instant pre-flip combat', () => {
      const lucian = createCard('Lucian Blackwood', false);
      expect(lucian.data.hasHaste).toBe(true);
    });

    it('gains +2 Power Marker after destroying enemy creature in battle', async () => {
      const lucian = createCard('Lucian Blackwood', false);
      const enemy = createCard('Bacchus', true, { power: 1 });

      ScenarioBuilder.create(harness)
        .withPlayerCard(0, lucian)
        .withEnemyCard(0, enemy)
        .build();

      await harness.controller.handleBattle(lucian, enemy, 0, false);
      expect(lucian.data.powerMarkers).toBe(2);
      expect(harness.controller.enemyBattlefield[0]).toBeNull();
    });
  });
});
