import { describe, it, expect } from 'vitest';
import { LIGHT_POOL, DARK_POOL } from '../constants.js';
import {
  buildVampiresAndDemonsDeck,
  buildWerewolvesAndVampiresDeck,
  buildStandardLightDeck,
  buildStandardDarkDeck
} from '../deckBuilder.js';
import { HeadlessGameEngine } from '../HeadlessGameEngine.js';
import { Simulator } from '../Simulator.js';

describe('Endless Simulator Test Suite', () => {
  it('loads valid card constants for Light and Dark pools', () => {
    expect(LIGHT_POOL.length).toBe(21);
    expect(DARK_POOL.length).toBe(21);
  });

  it('builds Vampires & Demons deck correctly with 49 cards', () => {
    const deck = buildVampiresAndDemonsDeck();
    expect(deck.length).toBe(49);
    const vampyres = deck.filter(c => c.faction === 'Vampyre');
    const daemons = deck.filter(c => c.faction === 'Daemon');
    const darkness = deck.filter(c => c.faction === 'Darkness');

    expect(vampyres.length).toBe(21);
    expect(daemons.length).toBe(21);
    expect(darkness.length).toBe(7);
  });

  it('builds Werewolves & Vampires deck correctly with 49 cards', () => {
    const deck = buildWerewolvesAndVampiresDeck();
    expect(deck.length).toBe(49);
    const lycans = deck.filter(c => c.faction === 'Lycan');
    const vampyres = deck.filter(c => c.faction === 'Vampyre');
    const avatars = deck.filter(c => c.faction === 'Avatars of light');

    expect(lycans.length).toBe(21);
    expect(vampyres.length).toBe(21);
    expect(avatars.length).toBe(7);
  });

  it('runs a single headless game match to completion', () => {
    const deckA = buildVampiresAndDemonsDeck();
    const deckB = buildWerewolvesAndVampiresDeck();

    const engine = new HeadlessGameEngine(deckA, deckB, "Vampires & Demons", "Werewolves & Vampires");
    const result = engine.runGame();

    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.rounds).toBeLessThanOrEqual(4);
    expect(['player', 'enemy', 'draw']).toContain(result.winner);
    expect(result.winCondition).toBeTruthy();
    expect(result.playerSeals + result.enemySeals + result.neutralSeals).toBe(7);
  });

  it('runs 100-game balance simulation and returns valid metrics', () => {
    const simulator = new Simulator();
    const stats = simulator.runSimulation('vampires-demons-vs-werewolves-vampires', 100);

    expect(stats.totalGames).toBe(100);
    expect(stats.sideAWins + stats.sideBWins + stats.draws).toBe(100);
    expect(Number((stats.sideAWinRate + stats.sideBWinRate + stats.drawRate).toFixed(1))).toBe(100.0);
    expect(stats.avgRounds).toBeGreaterThan(0);
    expect(stats.totalDurationMs).toBeLessThan(10000); // Must be fast!
  });
});
