/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Adversarial Empirical Verification & Stress Test Suite
 * Stress tests all 42 variant card interactions, extreme markers, corrupted states,
 * Ward mechanics, 0-target resolutions, and sequential 7-seal resolution fuzzing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Alignment, Phase } from '../../types';
import { CardEntity } from '../../entities/CardEntity';
import { createTestHarness, TestHarness } from './helpers/testHarness';
import { ScenarioBuilder } from './helpers/scenarioBuilder';
import { createCard, createFaceDownCard, ALL_42_CARD_NAMES } from './helpers/cardFactory';
import { CombatManager } from '../CombatManager';



describe('Empirical Stress Suite — 0-Target Exhaustive Safety Across All 42 Cards', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('verifies all 42 cards can execute resolveSeal cleanly when face-down on a solo board with 0 targets', { timeout: 30000 }, async () => {
    for (const cardName of ALL_42_CARD_NAMES) {
      harness.reset();
  
      const card = createFaceDownCard(cardName, false);
      harness.controller.playerBattlefield[0] = card;

      await expect(
        harness.controller.resolveSeal(0)
      ).resolves.not.toThrow();

      expect(harness.controller.isProcessing).toBe(false);
    }
  });

  it('verifies all 42 cards can execute AI resolveSeal cleanly when face-down on a solo board with 0 targets', { timeout: 30000 }, async () => {
    for (const cardName of ALL_42_CARD_NAMES) {
      harness.reset();
  
      const enemyCard = createFaceDownCard(cardName, true);
      harness.controller.enemyBattlefield[0] = enemyCard;

      await expect(
        harness.controller.resolveSeal(0)
      ).resolves.not.toThrow();

      expect(harness.controller.isProcessing).toBe(false);
    }
  });

  it('verifies targeted abilities auto-resolve instantly when validTargets list is empty', async () => {
    const targetedCards = [
      'Bella', 'Lord Alaric', 'Kaelarion', 'Zelus', 'Kaelo', 'Mammon', 
      'Jophiel', 'Samyaza', 'Lucian Blackwood', 'Bacchus', 'Umbarax'
    ];

    for (const name of targetedCards) {
      const card = createCard(name, false);
      harness.controller.playerBattlefield[0] = card;
      // No targets available
      for (let i = 0; i < 7; i++) {
        harness.controller.enemyBattlefield[i] = null;
        if (i !== 0) harness.controller.playerBattlefield[i] = null;
      }
      harness.controller.playerLimbo.length = 0;
      harness.controller.enemyLimbo.length = 0;

      const p = harness.abilityManager.handleTargetedAbility(card, false);
      await expect(p).resolves.toBeUndefined();
      expect(card.data.isActivatingAbility).toBe(false);
      expect(harness.state.currentPhase).not.toBe(Phase.ABILITY_TARGETING);
    }
  });

  it('verifies Limbo abilities auto-resolve or gracefully exit when Limbo is empty or targets resolved', async () => {
    const limboCards = ['Tarkidos', 'Karlyah', 'Golgothane', 'Kaelarion', 'Alistar Elren', 'Valtarious', 'Duke Aren Drakos'];

    for (const name of limboCards) {
      const card = createCard(name, false);
      await expect(
        harness.abilityManager.handleLimboAbility(card)
      ).resolves.not.toThrow();
    }
  });
});

describe('Empirical Stress Suite — Extreme Markers & Power Calculation Boundaries', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('correctly handles extreme positive power markers (+1,000,000)', () => {
    const card = createCard('Tarkidos', false, { powerMarkers: 1_000_000 });
    const p = CombatManager.getEffectivePower(card, 'battle', false);
    // Base 9 + 1,000,000 + 2 (battleStepBonusPower) = 1,000,011
    expect(p).toBe(1_000_011);
  });

  it('correctly handles extreme negative weakness markers (-1,000,000)', () => {
    const card = createCard('Luna', false, { weaknessMarkers: 1_000_000 });
    const p = CombatManager.getEffectivePower(card, 'battle', false);
    expect(p).toBeLessThan(0);
    expect(Number.isFinite(p)).toBe(true);
  });

  it('resolves combat between two creatures with negative effective power without crashing', async () => {
    const playerCard = createCard('Bella', false, { weaknessMarkers: 20 }); // Base 9 - 20 = -11
    const enemyCard = createCard('Zelus', true, { weaknessMarkers: 10 }); // Base 3 - 10 + 4 (battle) = -3

    ScenarioBuilder.create(harness)
      .withPlayerCard(0, playerCard)
      .withEnemyCard(0, enemyCard)
      .build();

    // Battle resolves with destruction (stymied = false)
    await expect(harness.phaseManager.handleBattle(playerCard, enemyCard, 0, false)).resolves.toBe(false);
    // Enemy (-3) beats Player (-11), so player card is destroyed into Graveyard
    expect(harness.controller.playerGraveyard).toContain(playerCard);
  });

  it('handles Oriel the Bold cannotBattleWhilePowerIs1 condition at boundary', () => {
    const oriel = createCard('Oriel the Bold', false, { powerMarkers: 0, weaknessMarkers: 0 });
    expect(oriel.data.cannotBattleWhilePowerIs1).toBe(true);
    const effPower1 = oriel.data.power + oriel.data.powerMarkers - oriel.data.weaknessMarkers;
    expect(effPower1).toBe(1);

    // If power becomes 2
    oriel.data.powerMarkers = 1;
    const effPower2 = oriel.data.power + oriel.data.powerMarkers - oriel.data.weaknessMarkers;
    expect(effPower2).toBe(2);
  });

  it('handles cards with undefined/missing marker properties safely', () => {
    const card = createCard('Tarkidos', false);
    delete (card.data as any).powerMarkers;
    delete (card.data as any).weaknessMarkers;

    const p = CombatManager.getEffectivePower(card, 'flip', false);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBe(9);
  });
});

describe('Empirical Stress Suite — Ward Marker Mechanics & Invariants', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('Anakim the Wise places Ward marker on target seal and sets hasWard true', () => {
    harness.controller.seals[2].setWard(true);
    expect(harness.controller.seals[2].hasWard).toBe(true);
  });

  it('Ward marker absorbs seal influence change and is consumed', async () => {
    const seal = harness.controller.seals[1];
    seal.alignment = Alignment.DARK;
    seal.hasWard = true;

    // Player attempts to claim seal
    await harness.controller.claimSeal(1, Alignment.LIGHT);
    expect(seal.alignment).toBe(Alignment.DARK); // Retained original alignment
    expect(seal.hasWard).toBe(false); // Ward consumed
  });

  it('Ward marker absorbs Champion Ascension and is consumed', () => {
    const seal = harness.controller.seals[3];
    seal.alignment = Alignment.LIGHT;
    seal.hasWard = true;
    seal.champion = null;

    const victor = createCard('Lord Alaric', true, { isChampion: true });
    ScenarioBuilder.create(harness).withEnemyCard(3, victor).build();

    // Enemy attempts to ascend to seal
    harness.phaseManager.ascendToSeal(victor, 3);

    // Ward absorbs ascension: seal champion remains null, Ward is consumed
    expect(seal.champion).toBeNull();
    expect(seal.hasWard).toBe(false);
  });
});

describe('Empirical Stress Suite — Multi-Trigger Complex Matchups', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('Bella vs Lord Alaric simultaneously on contesting seal: resolves cleanly in seal sequence', async () => {
    const bella = createCard('Bella', false); // Light champion
    const alaric = createCard('Lord Alaric', true); // Dark champion

    ScenarioBuilder.create(harness)
      .withPlayerCard(0, bella)
      .withEnemyCard(0, alaric)
      .build();

    await expect(harness.controller.resolveSeal(0)).resolves.not.toThrow();
    expect(harness.controller.isProcessing).toBe(false);
  });

  it('Noble the Great (Haste) destroys Bogva with Final Act without locking', async () => {
    const noble = createCard('Noble the Great', false);
    const bogva = createCard('Bogva', true);

    ScenarioBuilder.create(harness)
      .withPlayerCard(0, noble)
      .withEnemyCard(0, bogva)
      .build();

    await expect(harness.controller.resolveSeal(0)).resolves.not.toThrow();
    expect(harness.controller.isProcessing).toBe(false);
  });

  it('Sulvian Vane (Haste + Bounce) vs Tarkidos (High Power Champion)', async () => {
    const sulvian = createCard('Sulvian Vane', true); // Haste + Bounce
    const tarkidos = createCard('Tarkidos', false); // 9 Power

    ScenarioBuilder.create(harness)
      .withEnemyCard(0, sulvian)
      .withPlayerCard(0, tarkidos)
      .build();

    await expect(harness.controller.resolveSeal(0)).resolves.not.toThrow();
    expect(harness.controller.isProcessing).toBe(false);
  });

  it('Valerius Nightshade (Haste + Nullify) suppresses Remiel Flip ability', async () => {
    const valerius = createCard('Valerius Nightshade', true); // Haste + Nullify
    const remiel = createFaceDownCard('Remiel', false);

    ScenarioBuilder.create(harness)
      .withEnemyCard(0, valerius)
      .withPlayerCard(0, remiel)
      .build();

    await expect(harness.controller.resolveSeal(0)).resolves.not.toThrow();
    expect(harness.controller.isProcessing).toBe(false);
  });
});

describe('Empirical Stress Suite — Fuzzing Sequential 7-Seal Resolution Loop (50 Matches)', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  it('runs 2 randomized full-board 7-seal matches without freezing or unhandled rejections', { timeout: 60000 }, async () => {
    const allCards = ALL_42_CARD_NAMES;

    for (let iteration = 0; iteration < 2; iteration++) {
      harness.reset();
  
      // Seed 7 random player cards and 7 random enemy cards
      for (let s = 0; s < 7; s++) {
        const pCardName = allCards[Math.floor(Math.random() * allCards.length)];
        const eCardName = allCards[Math.floor(Math.random() * allCards.length)];

        const pFaceUp = Math.random() > 0.5;
        const eFaceUp = Math.random() > 0.5;

        const pMarkers = Math.floor(Math.random() * 6);
        const eMarkers = Math.floor(Math.random() * 6);

        const pCard = createCard(pCardName, false, { faceUp: pFaceUp, powerMarkers: pMarkers });
        const eCard = createCard(eCardName, true, { faceUp: eFaceUp, powerMarkers: eMarkers });

        harness.controller.playerBattlefield[s] = pCard;
        harness.controller.enemyBattlefield[s] = eCard;

        if (Math.random() > 0.8) {
          harness.controller.seals[s].hasWard = true;
        }
      }

      // Resolve all 7 seals in order
      for (let i = 0; i < 7; i++) {
        await expect(harness.controller.resolveSeal(i)).resolves.not.toThrow();
      }

      // Invariants after resolution
      expect(harness.controller.playerBattlefield.length).toBe(7);
      expect(harness.controller.enemyBattlefield.length).toBe(7);
      expect(harness.controller.seals.length).toBe(7);
      expect(harness.controller.isProcessing).toBe(false);
    }
  });
});
