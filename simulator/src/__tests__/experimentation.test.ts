import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { CANONICAL_LIGHT_POOL, CANONICAL_DARK_POOL, LIGHT_POOL } from '../constants.js';
import {
  applyCardOverrides,
  resolveProfile,
  loadProfileFromFile,
  registerProfile,
  getRegisteredProfile
} from '../cardRegistry.js';
import { createRuleConfig, DEFAULT_RULES } from '../rules.js';
import { HeadlessGameEngine } from '../HeadlessGameEngine.js';
import { Simulator } from '../Simulator.js';
import { buildStandardLightDeck, buildStandardDarkDeck } from '../deckBuilder.js';

describe('Simulator Experimentation Framework', () => {
  it('preserves immutable canonical card pools', () => {
    const originalRemielPower = CANONICAL_LIGHT_POOL.find(c => c.name === 'Remiel')?.power;
    expect(originalRemielPower).toBe(2);

    const overriddenPool = applyCardOverrides(CANONICAL_LIGHT_POOL, [
      { name: 'Remiel', power: 5 }
    ]);

    const modifiedRemiel = overriddenPool.find(c => c.name === 'Remiel');
    const canonicalRemiel = CANONICAL_LIGHT_POOL.find(c => c.name === 'Remiel');

    expect(modifiedRemiel?.power).toBe(5);
    expect(canonicalRemiel?.power).toBe(2); // Canonical remains unchanged!
  });

  it('creates and merges RuleConfig correctly', () => {
    const custom = createRuleConfig({
      maxRounds: 6,
      errataFlags: { valeriusStealPower: true }
    });

    expect(custom.maxRounds).toBe(6);
    expect(custom.laneCount).toBe(7); // Inherited default
    expect(custom.errataFlags.valeriusStealPower).toBe(true);
    expect(custom.errataFlags.samyazaLimboNullify).toBe(true); // Inherited default
  });

  it('resolves in-memory registered experiment profiles', () => {
    registerProfile({
      id: 'test_profile_1',
      name: 'Test Profile 1',
      rules: { maxRounds: 2 },
      cardOverrides: [{ name: 'Metatron', power: 10 }]
    });

    const registered = getRegisteredProfile('test_profile_1');
    expect(registered).toBeDefined();
    expect(registered?.name).toBe('Test Profile 1');

    const resolved = resolveProfile('test_profile_1');
    expect(resolved.rules.maxRounds).toBe(2);
    const metatron = resolved.lightPool.find(c => c.name === 'Metatron');
    expect(metatron?.power).toBe(10);
  });

  it('loads experiment profile from JSON file', () => {
    const profilePath = path.resolve(__dirname, '../../profiles/example_experiment.json');
    const profile = loadProfileFromFile(profilePath);

    expect(profile.id).toBe('celestial_experimental_buff');
    expect(profile.rules?.maxRounds).toBe(5);
    expect(profile.cardOverrides?.length).toBe(2);

    const resolved = resolveProfile(profilePath);
    expect(resolved.rules.maxRounds).toBe(5);
    const remiel = resolved.lightPool.find(c => c.name === 'Remiel');
    expect(remiel?.power).toBe(3);
  });

  it('runs HeadlessGameEngine with custom experimental rules and overrides', () => {
    const customPool = applyCardOverrides(CANONICAL_LIGHT_POOL, [
      { name: 'Oriel The bold', power: 20 }
    ]);

    const deckA = buildStandardLightDeck(customPool);
    const deckB = buildStandardDarkDeck();

    const engine = new HeadlessGameEngine(
      deckA,
      deckB,
      'Buffed Light',
      'Standard Dark',
      undefined,
      undefined,
      'easy',
      'easy',
      { maxRounds: 2 }
    );

    const result = engine.runGame();
    expect(result.rounds).toBeLessThanOrEqual(2);
    expect(['player', 'enemy', 'draw']).toContain(result.winner);
  });

  it('runs comparative A/B simulations between baseline and experiment', () => {
    const simulator = new Simulator();
    const comparison = simulator.compareProfiles(
      'light-vs-dark',
      undefined, // Baseline
      {
        id: 'super_buffed_light',
        name: 'Super Buffed Light',
        cardOverrides: [
          { name: 'Oriel The bold', power: 25 },
          { name: 'Remiel', power: 25 }
        ]
      },
      50,
      'easy',
      'easy'
    );

    expect(comparison.statsA.totalGames).toBe(50);
    expect(comparison.statsB.totalGames).toBe(50);
    expect(comparison.report).toContain('ENDLESS SEVEN A/B BALANCE EXPERIMENT COMPARISON');
  });
});
