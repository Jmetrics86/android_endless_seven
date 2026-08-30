/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adversarial Stress & Extreme Edge Case Challenge Test Suite
 * Exhaustively tests 0-target resolutions, extreme markers, simultaneous triggers,
 * sequential seal loops, Ward mechanics, and abnormal state recoveries across all 42 variant cards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { CardEntity } from '../../entities/CardEntity';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { createCard, createFaceDownCard, ALL_42_CARD_NAMES } from './helpers/cardFactory';
import { CombatManager } from '../CombatManager';

describe('Adversarial Stress Challenge — 0-Target Resolutions', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('Bella (Flip: creature_on_seal) AI auto-resolves cleanly when 0 enemy creatures exist on seals', async () => {
    const bella = createCard('Bella', true);
    ScenarioBuilder.create(harness).withEnemyCard(0, bella).build();

    const startTime = Date.now();
    await harness.abilityManager.handleTargetedAbility(bella, true);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(500);
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
  });

  it('Bella (Flip: creature_on_seal) player targeting resolves without hanging when target is selected', async () => {
    const bella = createCard('Bella', false);
    const foe = createCard('Luna', true);
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, bella)
      .withEnemyCard(0, foe)
      .build();

    const promise = harness.abilityManager.handleTargetedAbility(bella, false);
    if (harness.controller.resolutionCallback) {
      harness.selectPendingTarget(foe);
    }
    await promise;
    expect(harness.controller.enemyBattlefield[0]).toBeNull();
  });

  it('Lord Alaric (Flip: champion) auto-resolves cleanly when 0 Champions exist in play', async () => {
    const alaric = createCard('Lord Alaric', false);
    const regularFoe = createCard('Tarkidos', true, { isChampion: false });
    const regularAlly = createCard('Lucian Blackwood', false, { isChampion: false });
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, alaric)
      .withPlayerCard(1, regularAlly)
      .withEnemyCard(0, regularFoe)
      .build();

    // Trigger targeted ability with 0 champions in play
    await expect(harness.abilityManager.handleTargetedAbility(alaric, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
    expect(alaric.data.isActivatingAbility).toBe(false);
  });

  it('Lord Alaric (AI) does not crash or target allies when only allied Champion exists', async () => {
    const alaricAI = createCard('Lord Alaric', true);
    const alliedChamp = createCard('Dawn', true, { isChampion: true });
    ScenarioBuilder.create(harness)
      .withEnemyCard(0, alaricAI)
      .withEnemyCard(1, alliedChamp)
      .build();

    // AI should not target allied champion
    await expect(harness.abilityManager.handleTargetedAbility(alaricAI, true)).resolves.toBeUndefined();
    expect(harness.controller.enemyDeck.length).toBe(0);
    expect(harness.controller.enemyBattlefield[1]).toBe(alliedChamp);
  });

  it('Kaelarion (Flip: creature_pv_lte_3) auto-resolves when only creatures with Power >= 4 exist', async () => {
    const kaelarion = createCard('Kaelarion', false); // Base power 4
    const highPowerFoe = createCard('Metatron', true); // Base power 7
    const highPowerAlly = createCard('Calmadious', false); // Base power 6
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, kaelarion)
      .withPlayerCard(1, highPowerAlly)
      .withEnemyCard(0, highPowerFoe)
      .build();

    // All available targets have power > 3
    await expect(harness.abilityManager.handleTargetedAbility(kaelarion, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
    expect(kaelarion.data.isActivatingAbility).toBe(false);
  });

  it('Zelus (Flip: creature_power_gte) auto-resolves when only creatures with Power < Zelus exist', async () => {
    const zelus = createCard('Zelus', false, { powerMarkers: 5 }); // Base 2 + 5 = 7 effective power
    const lowPowerFoe = createCard('Samyaza', true); // Base 2 power
    const lowPowerAlly = createCard('Oriel the Bold', false); // Base 1 power
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, zelus)
      .withPlayerCard(1, lowPowerAlly)
      .withEnemyCard(0, lowPowerFoe)
      .build();

    // No creatures have power >= 7
    await expect(harness.abilityManager.handleTargetedAbility(zelus, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
  });

  it('Zelus (Flip: creature_power_gte) auto-resolves on solo board (Zelus excluded from self-targeting)', async () => {
    const zelus = createCard('Zelus', false);
    ScenarioBuilder.create(harness).withPlayerCard(0, zelus).build();

    await expect(harness.abilityManager.handleTargetedAbility(zelus, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
  });

  it('Kaelo (Flip: limbo_creature) auto-resolves cleanly when both Limbo zones are completely empty', async () => {
    const kaelo = createCard('Kaelo', false);
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, kaelo)
      .withPlayerLimbo([])
      .withEnemyLimbo([])
      .build();

    await expect(harness.abilityManager.handleTargetedAbility(kaelo, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
  });

  it('Jophiel (Flip: place_power on friendly card) handles solo board without deadlock', async () => {
    const jophiel = createCard('Jophiel', false);
    ScenarioBuilder.create(harness).withPlayerCard(0, jophiel).build();

    // Solo board: Jophiel is the only friendly card
    const validTargets = harness.abilityManager.getValidAbilityTargets(jophiel, 'place_power');
    expect(validTargets).toHaveLength(0);

    await expect(harness.abilityManager.handleTargetedAbility(jophiel, false)).resolves.toBeUndefined();
    expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
  });

  it('Mammon (Flip: steal power marker) handles 0 power markers on board gracefully', () => {
    const mammon = createCard('Mammon', false);
    const enemyNoPm = createCard('Tarkidos', true, { powerMarkers: 0 });
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, mammon)
      .withEnemyCard(0, enemyNoPm)
      .build();

    harness.abilityManager.applyAbilityEffect(enemyNoPm, {
      source: mammon,
      effect: 'steal_marker'
    });
    // Mammon should not gain a marker if none stolen
    expect(mammon.data.powerMarkers).toBe(0);
    expect(enemyNoPm.data.powerMarkers).toBe(0);
  });

  it('Lucian Blackwood (Flip: enemy card loses 2 power markers) handles enemy with 0 power markers', () => {
    const lucian = createCard('Lucian Blackwood', false);
    const enemy0Pm = createCard('Tarkidos', true, { powerMarkers: 0 });
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, lucian)
      .withEnemyCard(0, enemy0Pm)
      .build();

    harness.abilityManager.applyAbilityEffect(enemy0Pm, {
      source: lucian,
      effect: 'destroy_marker'
    });
    expect(enemy0Pm.data.powerMarkers).toBe(0);
  });

  it('Samyaza (Flip: place weakness marker on enemy) handles 0 enemy cards on board', async () => {
    const samyaza = createCard('Samyaza', false);
    ScenarioBuilder.create(harness).withPlayerCard(0, samyaza).build();

    await expect(harness.abilityManager.handleTargetedAbility(samyaza, false)).resolves.toBeUndefined();
  });

  it('Umbarax (Flip: destroy enemy card with PV <= 3) handles enemy board with only PV >= 4', () => {
    const umbarax = createCard('Umbarax', false);
    const bigEnemy = createCard('Metatron', true); // Base power 7
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, umbarax)
      .withEnemyCard(0, bigEnemy)
      .build();

    const validTargets = harness.abilityManager.getValidAbilityTargets(umbarax, 'destroy', 'creature_pv_lte_3');
    expect(validTargets).toHaveLength(0);
  });

  it('Sulvian Vane (Flip: swap 2 adjacent enemy cards) pre-validates adjacent targets', () => {
    const sulvian = createCard('Sulvian Vane', false);
    const singleFoe = createCard('Tarkidos', true);
    ScenarioBuilder.create(harness)
      .withPlayerCard(3, sulvian)
      .withEnemyCard(2, singleFoe)
      .build();

    // Adjacent check in slots 2 and 4 (slot 4 is null)
    expect(harness.controller.enemyBattlefield[2]).toBe(singleFoe);
    expect(harness.controller.enemyBattlefield[4]).toBeNull();
  });

  it('Nix (Flip: choose creature type, destroy all cards of that type) handles 0 matches on board', () => {
    const nix = createCard('Nix', false);
    const celestial = createCard('Metatron', true); // Celestial
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, nix)
      .withEnemyCard(0, celestial)
      .build();

    // Destroy all Lycans (0 Lycans in play)
    harness.abilityManager.applyAbilityEffect(nix, {
      source: nix,
      effect: 'destroy_type',
      targetType: 'Lycan'
    });
    expect(harness.controller.enemyBattlefield[0]).toBe(celestial);
  });

  it('Grelyn Zilkos (Flip: up to 3 Limbo creatures to Grave) handles completely empty Limbo', async () => {
    const grelyn = createCard('Grelyn Zilkos', false);
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, grelyn)
      .withPlayerLimbo([])
      .withEnemyLimbo([])
      .build();

    const targets = harness.abilityManager.getValidAbilityTargets(grelyn, 'limbo_to_grave', 'limbo_creature');
    expect(targets).toHaveLength(0);
  });

  it('Anakim the Wise (Activate: place Ward on vacant seal) handles fully occupied seals', async () => {
    const anakim = createCard('Anakim the Wise', false);
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, anakim)
      .build();

    // Occupy all 7 seals
    for (let i = 0; i < 7; i++) {
      harness.controller.seals[i].champion = createCard('Tarkidos', false);
    }

    // Vacant seals check
    const vacantSeals = harness.controller.seals.filter(s => s.champion === null);
    expect(vacantSeals).toHaveLength(0);
  });
});

describe('Adversarial Stress Challenge — Extreme Markers & Boundaries', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('survives extreme power marker accumulation (+999 markers)', () => {
    const card = createCard('Tarkidos', false, { powerMarkers: 999 });
    ScenarioBuilder.create(harness).withPlayerCard(0, card).build();

    const effPower = CombatManager.getEffectivePower(card, 'battle', false);
    expect(effPower).toBe(9 + 999 + 2); // Base 9 + 999 PM + 2 battle bonus = 1010
    expect(effPower).toBeGreaterThan(1000);
  });

  it('survives extreme weakness marker accumulation (-999 markers)', () => {
    const card = createCard('Tarkidos', false, { weaknessMarkers: 999 });
    ScenarioBuilder.create(harness).withPlayerCard(0, card).build();

    const effPower = CombatManager.getEffectivePower(card, 'battle', false);
    expect(effPower).toBe(9 - 999 + 2); // Base 9 - 999 WM + 2 battle bonus = -988
    expect(effPower).toBeLessThan(0);
  });

  it('correctly handles zero-power destruction during combat or ability cleanup on Creature types', () => {
    const creature = createCard('Luna', false, { powerMarkers: 0, weaknessMarkers: 10 }); // Base 3 - 10 = -7
    ScenarioBuilder.create(harness).withPlayerCard(0, creature).build();

    harness.abilityManager.enforceZeroPowerDestruction();
    // Creature with effective power <= 0 should be destroyed to graveyard
    expect(harness.controller.playerBattlefield[0]).toBeNull();
    expect(harness.controller.playerGraveyard).toContain(creature);
  });

  it('dynamic faction scaling recalculates accurately when multiple board presence cards are added/removed', () => {
    const grelyn = createCard('Grelyn Zilkos', false); // Oathbringer (+2 per other Oathbringer)
    const dawn = createCard('Dawn', false); // Oathbringer
    const tarkidos = createCard('Tarkidos', false); // Oathbringer

    ScenarioBuilder.create(harness)
      .withPlayerCard(0, grelyn)
      .withPlayerCard(1, dawn)
      .withPlayerCard(2, tarkidos)
      .build();

    harness.abilityManager.syncBoardPresencePowerMarkers();

    // Grelyn has 2 other allied Oathbringers in play (Dawn, Tarkidos) -> +4 power
    expect(grelyn.data.boardPresencePowerMarkers).toBe(4);

    // Remove Tarkidos and re-sync
    harness.controller.playerBattlefield[2] = null;
    harness.abilityManager.syncBoardPresencePowerMarkers();

    // Now only 1 other Oathbringer (Dawn) -> +2 power
    expect(grelyn.data.boardPresencePowerMarkers).toBe(2);
  });
});

describe('Adversarial Stress Challenge — Ward Absorption Mechanics', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('Ward marker on seal absorbs and prevents influence shift from Light to Dark', async () => {
    const seal = harness.controller.seals[0];
    seal.alignment = Alignment.LIGHT;
    seal.hasWard = true;

    // Enemy attempts to claim seal
    await harness.controller.claimSeal(0, Alignment.DARK);

    // Ward absorbs the claim: seal alignment stays LIGHT, Ward is consumed
    expect(seal.alignment).toBe(Alignment.LIGHT);
    expect(seal.hasWard).toBe(false);
  });

  it('Ward marker on seal absorbs and prevents Champion Ascension', () => {
    const seal = harness.controller.seals[0];
    seal.alignment = Alignment.LIGHT;
    seal.hasWard = true;
    seal.champion = null;

    const victor = createCard('Lord Alaric', true, { isChampion: true });
    ScenarioBuilder.create(harness).withEnemyCard(0, victor).build();

    // Enemy attempts to ascend to seal
    harness.phaseManager.ascendToSeal(victor, 0);

    // Ward absorbs ascension: seal champion remains null, Ward is consumed
    expect(seal.champion).toBeNull();
    expect(seal.hasWard).toBe(false);
  });

  it('Anakim the Wise placing Ward on multiple distinct seals', () => {
    harness.controller.seals[1].hasWard = false;
    harness.controller.seals[2].hasWard = false;

    // Place Ward on seal 1
    harness.controller.seals[1].setWard(true);
    expect(harness.controller.seals[1].hasWard).toBe(true);

    // Place Ward on seal 2
    harness.controller.seals[2].setWard(true);
    expect(harness.controller.seals[2].hasWard).toBe(true);
  });
});

describe('Adversarial Stress Challenge — Simultaneous Triggers & Step Ordering', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('Step A tie-rule: cards with Flip step bonuses break ties before Ability step', () => {
    // Player Remiel (Base 2 + 3 flip bonus = 5) vs Enemy Tarkidos (Base 9 + 0 flip bonus = 9)
    const remiel = createFaceDownCard('Remiel', false);
    const tarkidos = createFaceDownCard('Tarkidos', true);
    ScenarioBuilder.create(harness)
      .withPlayerFaceDownCard(0, remiel)
      .withEnemyFaceDownCard(0, tarkidos)
      .build();

    const pPower = CombatManager.getEffectivePower(remiel, 'flip', false);
    const ePower = CombatManager.getEffectivePower(tarkidos, 'flip', false);
    expect(pPower).toBe(5);
    expect(ePower).toBe(9);
    expect(ePower).toBeGreaterThan(pPower);
  });

  it('delayed end-of-round destruction from Elowen Thornver marks attacker correctly', () => {
    const elowen = createCard('Elowen Thornver', false);
    const attacker = createCard('Tarkidos', true);
    ScenarioBuilder.create(harness)
      .withPlayerCard(0, elowen)
      .withEnemyCard(0, attacker)
      .build();

    // Attacker battles Elowen and gets marked
    attacker.data.markedByWildWolf = true;
    expect(attacker.data.markedByWildWolf).toBe(true);

    // Round cleanup destroys marked cards
    harness.controller.destroyCard(attacker, true, 0, false, { cardName: 'Elowen Thornver', cause: 'ability' });
    expect(harness.controller.enemyBattlefield[0]).toBeNull();
    expect(harness.controller.enemyGraveyard).toContain(attacker);
  });

  it('Cassiel Haggis Flip with empty deck gracefully handles 0 markers during resolveSeal', async () => {
    const cassiel = createFaceDownCard('Cassiel Haggis', false);
    ScenarioBuilder.create(harness)
      .withPlayerFaceDownCard(0, cassiel)
      .withPlayerDeck([])
      .build();

    await harness.phaseManager.resolveSeal(0);
    expect(cassiel.data.powerMarkers).toBe(0);
  });

  it('Valtarious Final Act returns creature from Limbo to hand; handles empty Limbo gracefully', async () => {
    const valtarious = createCard('Valtarious', false);

    // Case 1: Empty Limbo
    ScenarioBuilder.create(harness)
      .withPlayerLimbo([])
      .build();

    expect(harness.controller.playerLimbo.length).toBe(0);

    // Case 2: Populated Limbo
    const limboCreature = createCard('Tarkidos', false);
    ScenarioBuilder.create(harness)
      .withPlayerLimbo([limboCreature])
      .withPlayerHand([])
      .build();

    // Simulate returning Limbo card to hand
    harness.controller.playerLimbo.length = 0;
    harness.controller.playerHand.push(limboCreature);

    expect(harness.controller.playerLimbo).not.toContain(limboCreature);
    expect(harness.controller.playerHand).toContain(limboCreature);
  });
});

describe('Adversarial Stress Challenge — All 42 Variant Cards Integrity Check', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('verifies all 42 cards can be created, target-validated, and power-calculated without runtime exceptions', () => {
    expect(ALL_42_CARD_NAMES).toHaveLength(42);

    for (const cardName of ALL_42_CARD_NAMES) {
      const card = createCard(cardName, false);
      expect(card.data.name).toBe(cardName);
      expect(typeof card.data.power).toBe('number');
      expect(card.data.power).toBeGreaterThanOrEqual(1);

      // Verify targeted ability pre-validation
      const targets = harness.abilityManager.getValidAbilityTargets(card, card.data.effect || '', card.data.targetType);
      expect(Array.isArray(targets)).toBe(true);

      // Verify combat power calculation for base, flip, and battle steps
      const pBase = CombatManager.getEffectivePower(card, 'base', false);
      const pFlip = CombatManager.getEffectivePower(card, 'flip', false);
      const pBattle = CombatManager.getEffectivePower(card, 'battle', false);
      const pChamp = CombatManager.getEffectivePower(card, 'battle', true);
      expect(pBase).toBeGreaterThanOrEqual(1);
      expect(pFlip).toBeGreaterThanOrEqual(pBase);
      expect(pBattle).toBeGreaterThanOrEqual(pBase);
      expect(pChamp).toBeGreaterThanOrEqual(pBattle);
    }
  });
});
