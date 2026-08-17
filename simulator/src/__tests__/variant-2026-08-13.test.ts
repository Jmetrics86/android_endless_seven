import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { resolveProfile, loadProfileFromFile } from '../cardRegistry.js';
import { HeadlessGameEngine } from '../HeadlessGameEngine.js';
import { Simulator } from '../Simulator.js';
import { buildDeckFromPool } from '../deckBuilder.js';
import { effectivePower, Alignment } from '../types.js';

describe('Variant 2026-08-13 Card Set & Mechanics Suite', () => {
  const profilePath = path.resolve(__dirname, '../../profiles/variant-2026-08-13.json');
  const resolved = resolveProfile(profilePath);

  it('loads variant-2026-08-13 profile correctly with full pools and x2 avatars', () => {
    expect(resolved.rules.avatarCopies).toBe(2);
    expect(resolved.lightPool.length).toBe(21);
    expect(resolved.darkPool.length).toBe(21);

    // Verify Grelyn Zilkos replaced Valtarious in Light Avatars
    const grelyn = resolved.lightPool.find(c => c.name === 'Grelyn Zilkos');
    expect(grelyn).toBeDefined();
    expect(grelyn?.power).toBe(9);
    expect(grelyn?.faction).toBe('Avatars of light');

    // Verify Valtarious is now in Lycan faction at PV 5
    const valtarious = resolved.lightPool.find(c => c.name === 'Valtarious');
    expect(valtarious).toBeDefined();
    expect(valtarious?.power).toBe(5);
    expect(valtarious?.faction).toBe('Lycan');

    // Verify Varg Greyback name & stats
    const varg = resolved.lightPool.find(c => c.name === 'Varg Greyback');
    expect(varg).toBeDefined();
    expect(varg?.power).toBe(3);
    expect(varg?.flipStepBonusPower).toBe(5);
  });

  it('calculates step-specific power bonuses accurately', () => {
    const luna = resolved.lightPool.find(c => c.name === 'Luna')!;
    const headlessLuna = {
      id: 'luna-1',
      data: luna,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };

    expect(effectivePower(headlessLuna, 'base')).toBe(2);
    expect(effectivePower(headlessLuna, 'battle')).toBe(6); // 2 + 4

    const varg = resolved.lightPool.find(c => c.name === 'Varg Greyback')!;
    const headlessVarg = {
      id: 'varg-1',
      data: varg,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };

    expect(effectivePower(headlessVarg, 'base')).toBe(3);
    expect(effectivePower(headlessVarg, 'flip')).toBe(8); // 3 + 5

    const tarkidos = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
    const headlessTark = {
      id: 'tark-1',
      data: tarkidos,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };

    expect(effectivePower(headlessTark, 'battle', false)).toBe(11); // 9 + 2
    expect(effectivePower(headlessTark, 'battle', true)).toBe(14); // 9 + 2 + 3 (championing)
  });

  it('executes Anakim Ward marker placement and prevents seal influence/championing', () => {
    const anakim = resolved.lightPool.find(c => c.name === 'Anakim the Wise')!;
    const deckA = buildDeckFromPool(resolved.lightPool, 2);
    const deckB = buildDeckFromPool(resolved.darkPool, 2);

    const engine = new HeadlessGameEngine(
      deckA,
      deckB,
      'Variant Light',
      'Variant Dark',
      undefined,
      undefined,
      'easy',
      'easy',
      resolved.rules
    );

    // Place Ward marker on seal 2
    engine.seals[2].hasWard = true;
    expect(engine.seals[2].hasWard).toBe(true);
  });

  it('runs 100-match simulation with variant-2026-08-13 without runtime errors', () => {
    const simulator = new Simulator();
    const stats = simulator.runSimulation(
      'vampires-demons-vs-werewolves-vampires',
      100,
      'smart',
      'smart',
      true,
      profilePath
    );

    expect(stats.totalGames).toBe(100);
    expect(stats.sideAWins + stats.sideBWins + stats.draws).toBe(100);
    expect(stats.avgRounds).toBeGreaterThan(1);
  });
});
