/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Declarative Scenario Builder for Endless Seven (Variant-2026-08-13)
 * Provides a fluent API for assembling complex board, seal, limbo, and hand scenarios.
 */

import { Alignment, Phase, CardData } from '../../../types';
import { CardEntity } from '../../../entities/CardEntity';
import { TestHarness } from './testHarness';
import { createCard, createFaceDownCard, getCanonicalCard } from './cardFactory';

export interface SealSetupOptions {
  alignment?: Alignment;
  champion?: CardEntity | string | null;
  championIsEnemy?: boolean;
  hasWard?: boolean;
}

export class ScenarioBuilder {
  private harness: TestHarness;

  constructor(harness: TestHarness) {
    this.harness = harness;
  }

  public static create(harness: TestHarness): ScenarioBuilder {
    return new ScenarioBuilder(harness);
  }

  public withPlayerCard(
    slot: number,
    cardOrName: CardEntity | string,
    overrides?: Partial<CardEntity['data']>
  ): this {
    if (slot < 0 || slot > 6) throw new Error(`Invalid slot index ${slot}`);
    const card = typeof cardOrName === 'string'
      ? createCard(cardOrName, false, overrides)
      : cardOrName;
    card.data.isEnemy = false;
    if (overrides) Object.assign(card.data, overrides);
    this.harness.controller.playerBattlefield[slot] = card;
    return this;
  }

  public withPlayerFaceDownCard(
    slot: number,
    cardOrName: CardEntity | string,
    overrides?: Partial<CardEntity['data']>
  ): this {
    if (slot < 0 || slot > 6) throw new Error(`Invalid slot index ${slot}`);
    const card = typeof cardOrName === 'string'
      ? createFaceDownCard(cardOrName, false, overrides)
      : cardOrName;
    card.data.isEnemy = false;
    card.data.faceUp = false;
    if (overrides) Object.assign(card.data, overrides);
    this.harness.controller.playerBattlefield[slot] = card;
    return this;
  }

  public withEnemyCard(
    slot: number,
    cardOrName: CardEntity | string,
    overrides?: Partial<CardEntity['data']>
  ): this {
    if (slot < 0 || slot > 6) throw new Error(`Invalid slot index ${slot}`);
    const card = typeof cardOrName === 'string'
      ? createCard(cardOrName, true, overrides)
      : cardOrName;
    card.data.isEnemy = true;
    if (overrides) Object.assign(card.data, overrides);
    this.harness.controller.enemyBattlefield[slot] = card;
    return this;
  }

  public withEnemyFaceDownCard(
    slot: number,
    cardOrName: CardEntity | string,
    overrides?: Partial<CardEntity['data']>
  ): this {
    if (slot < 0 || slot > 6) throw new Error(`Invalid slot index ${slot}`);
    const card = typeof cardOrName === 'string'
      ? createFaceDownCard(cardOrName, true, overrides)
      : cardOrName;
    card.data.isEnemy = true;
    card.data.faceUp = false;
    if (overrides) Object.assign(card.data, overrides);
    this.harness.controller.enemyBattlefield[slot] = card;
    return this;
  }

  public withSeal(slot: number, options: SealSetupOptions): this {
    if (slot < 0 || slot > 6) throw new Error(`Invalid slot index ${slot}`);
    const seal = this.harness.controller.seals[slot];
    if (options.alignment !== undefined) seal.alignment = options.alignment;
    if (options.hasWard !== undefined) seal.hasWard = options.hasWard;
    if (options.champion !== undefined) {
      if (typeof options.champion === 'string') {
        seal.champion = createCard(options.champion, options.championIsEnemy ?? false);
      } else {
        seal.champion = options.champion;
      }
    }
    return this;
  }

  public withAllSeals(alignment: Alignment): this {
    for (let i = 0; i < 7; i++) {
      this.harness.controller.seals[i].alignment = alignment;
    }
    return this;
  }

  public withPlayerLimbo(cards: (CardEntity | string)[]): this {
    this.harness.controller.playerLimbo.length = 0;
    for (const c of cards) {
      const card = typeof c === 'string' ? createCard(c, false) : c;
      this.harness.controller.playerLimbo.push(card);
    }
    return this;
  }

  public withEnemyLimbo(cards: (CardEntity | string)[]): this {
    this.harness.controller.enemyLimbo.length = 0;
    for (const c of cards) {
      const card = typeof c === 'string' ? createCard(c, true) : c;
      this.harness.controller.enemyLimbo.push(card);
    }
    return this;
  }

  public withPlayerGraveyard(cards: (CardEntity | string)[]): this {
    this.harness.controller.playerGraveyard.length = 0;
    for (const c of cards) {
      const card = typeof c === 'string' ? createCard(c, false) : c;
      this.harness.controller.playerGraveyard.push(card);
    }
    return this;
  }

  public withEnemyGraveyard(cards: (CardEntity | string)[]): this {
    this.harness.controller.enemyGraveyard.length = 0;
    for (const c of cards) {
      const card = typeof c === 'string' ? createCard(c, true) : c;
      this.harness.controller.enemyGraveyard.push(card);
    }
    return this;
  }

  public withPlayerDeck(cards: (CardData | string)[]): this {
    this.harness.controller.playerDeck.length = 0;
    for (const c of cards) {
      const def = typeof c === 'string' ? getCanonicalCard(c) : c;
      this.harness.controller.playerDeck.push(def);
    }
    return this;
  }

  public withEnemyDeck(cards: (CardData | string)[]): this {
    this.harness.controller.enemyDeck.length = 0;
    for (const c of cards) {
      const def = typeof c === 'string' ? getCanonicalCard(c) : c;
      this.harness.controller.enemyDeck.push(def);
    }
    return this;
  }

  public withPlayerHand(cards: (CardEntity | string)[]): this {
    this.harness.controller.playerHand.length = 0;
    for (const c of cards) {
      const card = typeof c === 'string' ? createCard(c, false) : c;
      this.harness.controller.playerHand.push(card);
    }
    return this;
  }

  public withRound(round: number): this {
    this.harness.state.currentRound = round;
    return this;
  }

  public withPhase(phase: Phase): this {
    this.harness.state.currentPhase = phase;
    return this;
  }

  public withScores(playerScore: number, enemyScore: number): this {
    this.harness.state.playerScore = playerScore;
    this.harness.state.enemyScore = enemyScore;
    return this;
  }

  public withSlowMode(slowMode: boolean): this {
    this.harness.state.slowMode = slowMode;
    return this;
  }

  public build(): TestHarness {
    return this.harness;
  }
}
