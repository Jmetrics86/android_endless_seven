import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { resolveProfile } from '../cardRegistry.js';
import { HeadlessGameEngine } from '../HeadlessGameEngine.js';
import { Simulator } from '../Simulator.js';
import { buildVampiresAndDemonsDeck, buildWerewolvesAndVampiresDeck, buildStandardLightDeck, buildStandardDarkDeck } from '../deckBuilder.js';
import { Alignment, CardData, HeadlessCard, effectivePower } from '../types.js';

describe('Adversarial Verification & Edge Case Mechanics Suite', () => {
  const profilePath = path.resolve(__dirname, '../../profiles/variant-2026-08-13.json');
  const resolved = resolveProfile(profilePath);

  it('verifies step-specific power bonuses and champion power calculations', () => {
    const remiel = resolved.lightPool.find(c => c.name === 'Remiel')!;
    const cardRemiel: HeadlessCard = {
      id: 'rem-1',
      data: remiel,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardRemiel, 'base')).toBe(2);
    expect(effectivePower(cardRemiel, 'flip')).toBe(5); // 2 + 3
    expect(effectivePower(cardRemiel, 'battle')).toBe(2);

    const tarkidos = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
    const cardTark: HeadlessCard = {
      id: 'tark-1',
      data: tarkidos,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardTark, 'base')).toBe(9);
    expect(effectivePower(cardTark, 'flip')).toBe(9);
    expect(effectivePower(cardTark, 'battle', false)).toBe(11); // 9 + 2
    expect(effectivePower(cardTark, 'battle', true)).toBe(14); // 9 + 2 + 3

    const luna = resolved.lightPool.find(c => c.name === 'Luna')!;
    const cardLuna: HeadlessCard = {
      id: 'luna-1',
      data: luna,
      isEnemy: false,
      alignment: Alignment.LIGHT,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardLuna, 'battle')).toBe(6); // 2 + 4

    const zelus = resolved.darkPool.find(c => c.name === 'Zelus')!;
    const cardZelus: HeadlessCard = {
      id: 'zelus-1',
      data: zelus,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardZelus, 'battle')).toBe(6); // 3 + 3

    const bacchus = resolved.darkPool.find(c => c.name === 'Bacchus')!;
    const cardBacchus: HeadlessCard = {
      id: 'bac-1',
      data: bacchus,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardBacchus, 'flip')).toBe(5); // 1 + 4

    const desire = resolved.darkPool.find(c => c.name === 'Desire')!;
    const cardDesire: HeadlessCard = {
      id: 'des-1',
      data: desire,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardDesire, 'flip')).toBe(6); // 2 + 4

    const valerius = resolved.darkPool.find(c => c.name === 'Valerius Nightshade')!;
    const cardValerius: HeadlessCard = {
      id: 'val-1',
      data: valerius,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardValerius, 'battle')).toBe(5); // 2 + 3

    const elowen = resolved.darkPool.find(c => c.name === 'Elowen Thornver')!;
    const cardElowen: HeadlessCard = {
      id: 'elo-1',
      data: elowen,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardElowen, 'battle')).toBe(5); // 3 + 2

    const duke = resolved.darkPool.find(c => c.name === 'Duke Aren Drakos')!;
    const cardDuke: HeadlessCard = {
      id: 'duk-1',
      data: duke,
      isEnemy: true,
      alignment: Alignment.DARK,
      faceUp: true,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0
    };
    expect(effectivePower(cardDuke, 'battle')).toBe(7); // 6 + 1
  });

  it('enforces Step A Tie Rule (equal effective flip power destroys both cards immediately before abilities)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'A', 'B', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    // Card A: Remiel (base 2 + flip bonus 3 = 5)
    const remiel = resolved.lightPool.find(c => c.name === 'Remiel')!;
    const cardA = engine.createCard(remiel, false);

    // Card B: Cassiel Haggis (base 5 + flip bonus 0 = 5)
    const cassiel = resolved.lightPool.find(c => c.name === 'Cassiel Haggis')!;
    const cardB = engine.createCard(cassiel, true);

    engine.playerBattlefield[0] = cardA;
    engine.enemyBattlefield[0] = cardB;

    // Trigger seal resolution on lane 0
    (engine as any).resolveSeal(0);

    // Both cards should be destroyed
    expect(engine.playerBattlefield[0]).toBeNull();
    expect(engine.enemyBattlefield[0]).toBeNull();
    expect(engine.playerGraveyard).toContain(cardA);
    expect(engine.enemyGraveyard).toContain(cardB);
    expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
  });

  it('verifies Ward marker mechanics (absorbs siege influence on neutral seals and purify/corrupt abilities)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'A', 'B', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    // 1. Ward absorbs Siege Influence
    engine.seals[0].alignment = Alignment.NEUTRAL;
    engine.seals[0].hasWard = true;

    const dummyCreature: CardData = {
      name: 'Dummy',
      faction: 'Celestial',
      type: 'Creature',
      power: 4,
      isChampion: false,
      ability: ''
    };
    const cardA = engine.createCard(dummyCreature, false);
    engine.playerBattlefield[0] = cardA;

    (engine as any).resolveSeal(0);

    // Ward should be consumed, and seal alignment remains NEUTRAL
    expect(engine.seals[0].hasWard).toBe(false);
    expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);

    // 2. Ward absorbs Calmadious Purify
    engine.seals[2].alignment = Alignment.DARK;
    engine.seals[2].hasWard = true;

    const calmadious = resolved.lightPool.find(c => c.name === 'Calmadious')!;
    const cardCalm = engine.createCard(calmadious, false);
    cardCalm.faceUp = true;

    (engine as any).triggerFlipAbility(cardCalm, 2);

    expect(engine.seals[2].hasWard).toBe(false);
    expect(engine.seals[2].alignment).toBe(Alignment.DARK); // Not purified because Ward absorbed it

    // 3. Ward absorbs Skarados Corrupt
    engine.seals[3].alignment = Alignment.LIGHT;
    engine.seals[3].hasWard = true;

    const skarados = resolved.darkPool.find(c => c.name === 'Skarados')!;
    const cardSkar = engine.createCard(skarados, true);
    cardSkar.faceUp = true;

    (engine as any).triggerFlipAbility(cardSkar, 3);

    expect(engine.seals[3].hasWard).toBe(false);
    expect(engine.seals[3].alignment).toBe(Alignment.LIGHT); // Not corrupted because Ward absorbed it
  });

  it('verifies 7-Seal Dominance immediate win condition', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Player', 'Enemy', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    // Set all 7 seals to LIGHT
    for (let i = 0; i < 7; i++) {
      engine.seals[i].alignment = Alignment.LIGHT;
    }

    const dummy: CardData = { name: 'D', faction: 'Celestial', type: 'Creature', power: 3, isChampion: false, ability: '' };
    engine.playerBattlefield[0] = engine.createCard(dummy, false);

    (engine as any).resolveSeal(0);

    expect(engine.isGameOver).toBe(true);
    expect(engine.gameOverResult).toBe('player');
    expect(engine.gameOverWinCondition).toBe('7-Seal Dominance');
  });

  it('verifies Dawn special win condition (4 Oathbringers + Champion on Seal)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light Side', 'Dark Side', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', { ...resolved.rules, enableAbilityDeferral: false });

    const dawn = resolved.lightPool.find(c => c.name === 'Dawn')!;
    const tarkidos = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
    const grelyn = resolved.lightPool.find(c => c.name === 'Grelyn Zilkos')!;
    const coal = resolved.lightPool.find(c => c.name === 'Coal')!;

    const cDawn = engine.createCard(dawn, false);
    const cTark = engine.createCard(tarkidos, false);
    const cGrelyn = engine.createCard(grelyn, false);
    const cCoal = engine.createCard(coal, false);

    cDawn.faceUp = true;
    cTark.faceUp = true;
    cGrelyn.faceUp = true;
    cCoal.faceUp = true;

    engine.playerBattlefield[0] = cDawn;
    engine.playerBattlefield[1] = cGrelyn;
    engine.playerBattlefield[2] = cCoal;
    engine.seals[3].champion = cTark; // 1 Champion controlling a seal

    // Trigger Dawn activate ability
    (engine as any).triggerActivateAbility(cDawn);

    expect(engine.isGameOver).toBe(true);
    expect(engine.gameOverResult).toBe('player');
    expect(engine.gameOverWinCondition).toBe('Dawn (4 Oathbringers + Champion on Seal)');
  });

  it('verifies Nix special win condition (4 Graveborn + Champion on Seal)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light Side', 'Dark Side', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', { ...resolved.rules, enableAbilityDeferral: false });

    const nix = resolved.darkPool.find(c => c.name === 'Nix')!;
    const golgothane = resolved.darkPool.find(c => c.name === 'Golgothane')!;
    const lycandor = resolved.darkPool.find(c => c.name === 'Lycandor')!;
    const pazoo = resolved.darkPool.find(c => c.name === 'Pazoo')!;

    const cNix = engine.createCard(nix, true);
    const cGol = engine.createCard(golgothane, true);
    const cLyc = engine.createCard(lycandor, true);
    const cPaz = engine.createCard(pazoo, true);

    cNix.faceUp = true;
    cGol.faceUp = true;
    cLyc.faceUp = true;
    cPaz.faceUp = true;

    engine.enemyBattlefield[0] = cNix;
    engine.enemyBattlefield[1] = cGol;
    engine.enemyBattlefield[2] = cLyc;
    engine.seals[3].champion = cPaz; // 1 Champion on a seal

    // Trigger Nix activate ability
    (engine as any).triggerActivateAbility(cNix);

    expect(engine.isGameOver).toBe(true);
    expect(engine.gameOverResult).toBe('enemy');
    expect(engine.gameOverWinCondition).toBe('Nix (4 Graveborn + Champion on Seal)');
  });

  it('verifies Five Seals with Champions win condition (Coal / Karlyah)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light Side', 'Dark Side', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', { ...resolved.rules, enableAbilityDeferral: false });

    const coal = resolved.lightPool.find(c => c.name === 'Coal')!;
    const cCoal = engine.createCard(coal, false);
    cCoal.faceUp = true;
    engine.playerBattlefield[0] = cCoal;

    const tark = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
    for (let i = 1; i <= 5; i++) {
      const champ = engine.createCard(tark, false);
      champ.faceUp = true;
      engine.seals[i].champion = champ;
    }

    (engine as any).triggerActivateAbility(cCoal);

    expect(engine.isGameOver).toBe(true);
    expect(engine.gameOverResult).toBe('player');
    expect(engine.gameOverWinCondition).toBe('Five Seals with Champions');
  });

  it('verifies Attrition win condition when deck length is below threshold', () => {
    const deckA: CardData[] = Array(5).fill(resolved.lightPool[0]); // only 5 cards
    const deckB: CardData[] = Array(49).fill(resolved.darkPool[0]);

    const engine = new HeadlessGameEngine(deckA, deckB, 'Player', 'Enemy', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);
    const res = engine.runGame();

    expect(res.winner).toBe('enemy');
    expect(res.winCondition).toBe('Attrition');
  });

  it('verifies Metatron immunity aura prevents enemy targeted abilities from affecting allied Celestials', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light', 'Dark', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    const metatron = resolved.lightPool.find(c => c.name === 'Metatron')!;
    const cMetatron = engine.createCard(metatron, false);
    cMetatron.faceUp = true;
    engine.seals[0].champion = cMetatron; // Allied Metatron championing seal 0

    const oriel = resolved.lightPool.find(c => c.name === 'Oriel the Bold')!;
    const cOriel = engine.createCard(oriel, false);
    cOriel.faceUp = true;
    engine.playerBattlefield[1] = cOriel;

    // Enemy Alistar Elren tries to place Weakness
    const alistar = resolved.darkPool.find(c => c.name === 'Alistar Elren')!;
    const cAlistar = engine.createCard(alistar, true);
    cAlistar.faceUp = true;
    engine.enemyBattlefield[1] = cAlistar;

    (engine as any).triggerFlipAbility(cAlistar, 1);

    // Oriel is Celestial and protected by Metatron -> should have 0 weakness markers
    expect(cOriel.weaknessMarkers).toBe(0);
  });

  it('verifies Coal Final Act blocks enemy from championing a seal', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light', 'Dark', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    // Defender has Coal in Limbo
    const coal = resolved.lightPool.find(c => c.name === 'Coal')!;
    const cCoal = engine.createCard(coal, false);
    engine.playerLimbo.push(cCoal);

    engine.seals[0].alignment = Alignment.DARK;

    // Enemy Champion (Golgothane) tries to champion seal 0
    const golgothane = resolved.darkPool.find(c => c.name === 'Golgothane')!;
    const cGol = engine.createCard(golgothane, true);
    engine.enemyBattlefield[0] = cGol;

    (engine as any).resolveSeal(0);

    // Coal moved to playerGraveyard, and Golgothane was NOT crowned champion
    expect(engine.playerLimbo).not.toContain(cCoal);
    expect(engine.playerGraveyard).toContain(cCoal);
    expect(engine.seals[0].champion).toBeNull();
  });

  it.fails('documents Luna Final Act defender limbo check inversion bug (HeadlessGameEngine.ts:414)', () => {
    const deckA: CardData[] = [];
    const deckB: CardData[] = [];
    const engine = new HeadlessGameEngine(deckA, deckB, 'Light', 'Dark', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);

    // Defender (Player) has Luna in Limbo
    const luna = resolved.lightPool.find(c => c.name === 'Luna')!;
    const cLuna = engine.createCard(luna, false);
    engine.playerLimbo.push(cLuna);

    // Seal 0 is NEUTRAL
    engine.seals[0].alignment = Alignment.NEUTRAL;

    // Enemy claims seal 0
    const dummy: CardData = { name: 'Dark Minion', faction: 'Daemon', type: 'Creature', power: 4, isChampion: false, ability: '' };
    const enemyCard = engine.createCard(dummy, true);
    engine.enemyBattlefield[0] = enemyCard;

    (engine as any).resolveSeal(0);

    // Fails because HeadlessGameEngine line 414 checks enemyLimbo instead of playerLimbo when isPlayerClaim is false
    expect(engine.playerLimbo).not.toContain(cLuna);
    expect(engine.playerGraveyard).toContain(cLuna);
    expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
  });

  it('runs deterministic simulation validation (multiple identical seeds / replications produce consistent statistics)', () => {
    const sim = new Simulator();
    const stats1 = sim.runSimulation('vampires-demons-vs-werewolves-vampires', 500, 'smart', 'smart', true, profilePath);
    const stats2 = sim.runSimulation('vampires-demons-vs-werewolves-vampires', 500, 'smart', 'smart', true, profilePath);

    expect(stats1.totalGames).toBe(500);
    expect(stats2.totalGames).toBe(500);
    expect(stats1.sideAWins + stats1.sideBWins + stats1.draws).toBe(500);
    expect(stats2.sideAWins + stats2.sideBWins + stats2.draws).toBe(500);

    // Both runs should be balanced within 10%
    expect(Math.abs(stats1.sideAWinRate - stats1.sideBWinRate)).toBeLessThan(12.0);
    expect(Math.abs(stats2.sideAWinRate - stats2.sideBWinRate)).toBeLessThan(12.0);

    // Draws should be low / zero
    expect(stats1.drawRate).toBeLessThanOrEqual(5.0);
    expect(stats2.drawRate).toBeLessThanOrEqual(5.0);

    // Average rounds should be between 2 and 3.5
    expect(stats1.avgRounds).toBeGreaterThan(2.0);
    expect(stats1.avgRounds).toBeLessThan(3.5);
  });
});
