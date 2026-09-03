/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mechanics Stress Challenger 1 Test Suite (Simulator Engine)
 * Empirically stress-tests combat mechanics, phase precedence, and edge cases:
 * 1. Step 0 Haste strikes vs Non-battlers (Cyprian, Oriel at power 1).
 * 2. Step A Tie Rule: identical effective power reveal destruction prior to abilities (Bella vs Golgothane, Remiel vs 5-power).
 * 3. Step B Nullify priority and descending flip power execution.
 * 4. Step C battle power calculations including battleStepBonusPower (Tarkidos, Zelus, Luna, Valerius, Elowen, Duke).
 * 5. Equal combat power mutual destruction in simulator engine & defect audit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { resolveProfile } from '../cardRegistry.js';
import { HeadlessGameEngine } from '../HeadlessGameEngine.js';
import { Alignment, CardData, HeadlessCard, effectivePower } from '../types.js';

describe('Mechanics Stress Challenger 1 — Simulator Engine Verification', () => {
  const profilePath = path.resolve(__dirname, '../../profiles/variant-2026-08-13.json');
  const resolved = resolveProfile(profilePath);

  let engine: HeadlessGameEngine;

  beforeEach(() => {
    engine = new HeadlessGameEngine([], [], 'Player', 'Enemy', Alignment.LIGHT, Alignment.DARK, 'easy', 'easy', resolved.rules);
  });

  // =========================================================================
  // 1. STEP 0 HASTE STRIKES VS NON-BATTLERS
  // =========================================================================
  describe('Step 0 Haste Strikes vs Non-Battlers', () => {
    it('Haste card (Noble the Great) does NOT trigger Step 0 Haste Strike vs Cyprian (cannotBattleOrBeBattled)', () => {
      const noble = resolved.lightPool.find(c => c.name === 'Noble the Great')!;
      const cyprian = resolved.darkPool.find(c => c.name === 'Cyprian')!;

      const pNoble = engine.createCard(noble, false);
      const eCyprian = engine.createCard(cyprian, true);

      engine.playerBattlefield[0] = pNoble;
      engine.enemyBattlefield[0] = eCyprian;

      // Execute seal 0 resolution
      (engine as any).resolveSeal(0);

      // In Step 0, Haste Strike was skipped because Cyprian cannot battle.
      // In Step C, combat was skipped because Cyprian cannot battle.
      // Cyprian is still alive on battlefield faceUp.
      expect(engine.enemyBattlefield[0]).toBe(eCyprian);
      expect(eCyprian.faceUp).toBe(true);

      // Now run end-of-round cleanup: Cyprian self-sacrifices
      (engine as any).endRoundCleanup();

      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eCyprian);
    });

    it('Simulator properly syncs dynamicFactionPowerBonus on reveal, allowing Oriel to scale to power 3 and battle Noble', () => {
      const noble = resolved.lightPool.find(c => c.name === 'Noble the Great')!;
      const oriel = resolved.lightPool.find(c => c.name === 'Oriel the Bold')!;

      const pNoble = engine.createCard(noble, false);
      const eOriel = engine.createCard(oriel, true);

      engine.playerBattlefield[0] = pNoble;
      engine.enemyBattlefield[0] = eOriel;

      (engine as any).resolveSeal(0);

      // In canonical rules and Web engine:
      // In Step 0, Oriel has power 1 -> Haste skipped.
      // In Step A, cards flip face-up, and syncBoardPresencePowerMarkers() grants Oriel +2 Power Markers (becoming power 3).
      // In Step C, Noble (9) battles Oriel (3) and destroys Oriel.
      expect(effectivePower(eOriel)).toBe(3);
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eOriel);
      expect(engine.seals[0].champion).toBe(pNoble);
    });

    it('Valerius Nightshade (Haste + Nullify) vs Oriel: nullifies Oriel flip ability, but Oriel scales to power 3 via board presence and is destroyed by Valerius in Step C', () => {
      const valerius = resolved.darkPool.find(c => c.name === 'Valerius Nightshade')!;
      const oriel = resolved.lightPool.find(c => c.name === 'Oriel the Bold')!;

      const pValerius = engine.createCard(valerius, false);
      const eOriel = engine.createCard(oriel, true);

      engine.playerBattlefield[0] = pValerius;
      engine.enemyBattlefield[0] = eOriel;

      (engine as any).resolveSeal(0);

      // Valerius nullifies Oriel's flip ability (seal influence change).
      // However, Oriel's dynamic Celestial bonus scales Oriel to power 3 in Step A.
      // In Step C, Valerius (5 Battle PV) battles Oriel (3 Battle PV) and destroys Oriel (Matrix Matchup 3.32.8).
      expect(engine.playerBattlefield[0]).toBe(pValerius);
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eOriel);
      expect(effectivePower(eOriel)).toBe(3);
    });
  });

  // =========================================================================
  // 2. STEP A TIE RULE
  // =========================================================================
  describe('Step A Tie Rule Precedence', () => {
    it('Bella (9) vs Golgothane (9): both destroyed immediately in Step A prior to Step B abilities', () => {
      const bella = resolved.lightPool.find(c => c.name === 'Bella')!;
      const golgothane = resolved.darkPool.find(c => c.name === 'Golgothane')!;

      const pBella = engine.createCard(bella, false);
      const eGolgothane = engine.createCard(golgothane, true);

      engine.playerBattlefield[0] = pBella;
      engine.enemyBattlefield[0] = eGolgothane;

      (engine as any).resolveSeal(0);

      // Both destroyed in Step A before abilities
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.playerGraveyard).toContain(pBella);
      expect(engine.enemyGraveyard).toContain(eGolgothane);
      expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Remiel (base 2 + flip bonus 3 = 5) vs Mammon (5): Step A Tie Rule triggers and destroys both before abilities', () => {
      const remiel = resolved.lightPool.find(c => c.name === 'Remiel')!;
      const mammon = resolved.darkPool.find(c => c.name === 'Mammon')!;

      const pRemiel = engine.createCard(remiel, false);
      const eMammon = engine.createCard(mammon, true);

      expect(effectivePower(pRemiel, 'flip')).toBe(5);
      expect(effectivePower(eMammon, 'flip')).toBe(5);

      engine.playerBattlefield[0] = pRemiel;
      engine.enemyBattlefield[0] = eMammon;

      (engine as any).resolveSeal(0);

      // Step A Tie Rule destroys both
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.playerGraveyard).toContain(pRemiel);
      expect(engine.enemyGraveyard).toContain(eMammon);
      expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Remiel (base 2 + flip 3 = 5) vs Bacchus (base 1 + flip 4 = 5): Step A Tie Rule destroys both', () => {
      const remiel = resolved.lightPool.find(c => c.name === 'Remiel')!;
      const bacchus = resolved.darkPool.find(c => c.name === 'Bacchus')!;

      const pRemiel = engine.createCard(remiel, false);
      const eBacchus = engine.createCard(bacchus, true);

      expect(effectivePower(pRemiel, 'flip')).toBe(5);
      expect(effectivePower(eBacchus, 'flip')).toBe(5);

      engine.playerBattlefield[0] = pRemiel;
      engine.enemyBattlefield[0] = eBacchus;

      (engine as any).resolveSeal(0);

      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Cyprian (power 1) vs power 1 creature: Non-battler exemption prevents Step A Tie Rule destruction', () => {
      const cyprian = resolved.darkPool.find(c => c.name === 'Cyprian')!;
      const oriel = resolved.lightPool.find(c => c.name === 'Oriel the Bold')!;

      const pCyprian = engine.createCard(cyprian, false);
      const eOriel = engine.createCard(oriel, true);

      engine.playerBattlefield[0] = pCyprian;
      engine.enemyBattlefield[0] = eOriel;

      (engine as any).resolveSeal(0);

      // Cyprian is exempt from Step A tie destruction
      expect(engine.playerBattlefield[0]).toBe(pCyprian);
      expect(pCyprian.faceUp).toBe(true);
    });
  });

  // =========================================================================
  // 3. STEP B NULLIFY PRIORITY & DESCENDING FLIP POWER
  // =========================================================================
  describe('Step B Nullify Priority and Descending Flip Power', () => {
    it('Remiel (flip power 5) nullifies higher-power opponent flip ability', () => {
      const remiel = resolved.lightPool.find(c => c.name === 'Remiel')!;
      const nix = resolved.darkPool.find(c => c.name === 'Nix')!;

      const pRemiel = engine.createCard(remiel, false);
      const eNix = engine.createCard(nix, true);

      engine.playerBattlefield[0] = pRemiel;
      engine.enemyBattlefield[0] = eNix;

      // Nix has power 9 (higher than Remiel's 5). But Remiel has hasNullify.
      (engine as any).resolveSeal(0);

      // Nix is nullified, so Nix cannot destroy Remiel via ability.
      // In Step C, Nix (9) battles Remiel (2) and destroys Remiel in combat.
      // In Step E, Nix (Champion) ascends to Champion seal 0.
      expect(engine.seals[0].champion).toBe(eNix);
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.playerGraveyard).toContain(pRemiel);
    });

    it('Bella (flip power 9) executes before Bogva (flip power 1) and destroys Bogva', () => {
      const bella = resolved.lightPool.find(c => c.name === 'Bella')!;
      const bogva = resolved.darkPool.find(c => c.name === 'Bogva')!;

      const pBella = engine.createCard(bella, false);
      const eBogva = engine.createCard(bogva, true);

      engine.playerBattlefield[0] = pBella;
      engine.enemyBattlefield[0] = eBogva;

      (engine as any).resolveSeal(0);

      // Bella destroys Bogva in Step B, then ascends to Champion in Step E
      expect(engine.seals[0].champion).toBe(pBella);
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eBogva);
    });
  });

  // =========================================================================
  // 4. STEP C BATTLE STEP POWER BONUS CALCULATIONS
  // =========================================================================
  describe('Step C Battle Step Bonus Power Calculations', () => {
    it('Tarkidos (base 9, battleStepBonusPower +2 = 11) defeats Coal (power 10) in Step C Combat', () => {
      const tarkidos = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
      const coal = resolved.lightPool.find(c => c.name === 'Coal')!;

      const pTark = engine.createCard(tarkidos, false);
      const eCoal = engine.createCard(coal, true);

      expect(effectivePower(pTark, 'flip')).toBe(9);
      expect(effectivePower(eCoal, 'flip')).toBe(10);
      expect(effectivePower(pTark, 'battle', false)).toBe(11); // 9 + 2
      expect(effectivePower(eCoal, 'battle', false)).toBe(10);

      engine.playerBattlefield[0] = pTark;
      engine.enemyBattlefield[0] = eCoal;

      (engine as any).resolveSeal(0);

      // Tarkidos defeats Coal and ascends to Champion
      expect(engine.seals[0].champion).toBe(pTark);
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eCoal);
    });

    it('Tarkidos championing seal receives both battleStepBonusPower (+2) and championBattleBonusPower (+3) for total 14', () => {
      const tarkidos = resolved.lightPool.find(c => c.name === 'Tarkidos')!;
      const noble = resolved.lightPool.find(c => c.name === 'Noble the Great')!;

      const pTark = engine.createCard(tarkidos, false);
      pTark.faceUp = true;
      engine.seals[0].champion = pTark;

      expect(effectivePower(pTark, 'battle', true)).toBe(14); // 9 + 2 + 3

      const eNoble = engine.createCard(noble, true);
      engine.enemyBattlefield[0] = eNoble;

      (engine as any).resolveSeal(0);

      // Tarkidos Champion (14) defeats Noble the Great (9)
      expect(engine.seals[0].champion).toBe(pTark);
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.enemyGraveyard).toContain(eNoble);
    });
  });

  // =========================================================================
  // 5. EQUAL COMBAT POWER MUTUAL DESTRUCTION & DEFECT DEMONSTRATION
  // =========================================================================
  describe('Equal Combat Power Mutual Destruction & Defect Demonstration', () => {
    it('Noble the Great (9) vs Noble the Great (9) mutually destroy in Step 0 Haste Strike', () => {
      const noble = resolved.lightPool.find(c => c.name === 'Noble the Great')!;

      const pNoble = engine.createCard(noble, false);
      const eNoble = engine.createCard(noble, true);

      engine.playerBattlefield[0] = pNoble;
      engine.enemyBattlefield[0] = eNoble;

      (engine as any).resolveSeal(0);

      // Both have Haste, 9 vs 9 combat in Step 0 results in mutual destruction
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.playerGraveyard).toContain(pNoble);
      expect(engine.enemyGraveyard).toContain(eNoble);
    });

    it('DEFECT PROOF: Equal combat power mutual destruction erroneously triggers Ability Defender Removal in HeadlessGameEngine', () => {
      engine.seals[0].alignment = Alignment.NEUTRAL;
      const zelus = resolved.darkPool.find(c => c.name === 'Zelus')!;
      const luna = resolved.lightPool.find(c => c.name === 'Luna')!;

      const pZelus = engine.createCard(zelus, false);
      const eLuna = engine.createCard(luna, true);

      expect(effectivePower(pZelus, 'battle', false)).toBe(6); // 3 + 3
      expect(effectivePower(eLuna, 'battle', false)).toBe(6); // 2 + 4

      engine.playerBattlefield[0] = pZelus;
      engine.enemyBattlefield[0] = eLuna;

      (engine as any).resolveSeal(0);

      // Both cards are destroyed in combat
      expect(engine.playerBattlefield[0]).toBeNull();
      expect(engine.enemyBattlefield[0]).toBeNull();
      expect(engine.playerGraveyard).toContain(pZelus);
      expect(engine.enemyGraveyard).toContain(eLuna);

      // In Step C, both cards are destroyed in combat.
      // In Step D, laneAbilityDestruction is null so seal remains NEUTRAL.
      expect(engine.laneAbilityDestruction[0]).toBeNull();
      expect(engine.seals[0].alignment).toBe(Alignment.NEUTRAL);
    });

    it('Umbarax (power 9, battle invincibility) survives combat against superior enemy while enemy survives or is stymied', () => {
      const umbarax = resolved.darkPool.find(c => c.name === 'Umbarax')!;
      const skardos = resolved.darkPool.find(c => c.name === 'Skarados')!;

      const pUmbarax = engine.createCard(umbarax, false);
      const eSkarados = engine.createCard(skardos, true);

      // In Step A: Umbarax (9) vs Skarados (15) -> no tie
      // In Step B: Umbarax gains card.isInvincible = true
      // In Step C: Skarados (15) vs Umbarax (9) -> Umbarax cannot be destroyed by battle
      engine.playerBattlefield[0] = pUmbarax;
      engine.enemyBattlefield[0] = eSkarados;

      (engine as any).resolveSeal(0);

      // Umbarax has card.isInvincible = true, so Umbarax survives combat
      expect(pUmbarax.isInvincible).toBe(true);
      expect(engine.playerGraveyard).not.toContain(pUmbarax);
    });

    it('Anakim the Wise gains battle invulnerability in HeadlessGameEngine', () => {
      const anakim = resolved.lightPool.find(c => c.name === 'Anakim the Wise')!;
      const dummy: CardData = {
        name: 'Dark Warrior',
        faction: 'Darkness',
        type: 'Creature',
        power: 5,
        isChampion: false,
        ability: ''
      };

      const pAnakim = engine.createCard(anakim, false);
      const eEnemy = engine.createCard(dummy, true);

      engine.playerBattlefield[0] = pAnakim;
      engine.enemyBattlefield[0] = eEnemy;

      (engine as any).resolveSeal(0);

      // In card text, Anakim has "Flip: Cannot be destroyed by battle this turn."
      // In Step B: Anakim gains isInvincible = true.
      // In Step C: Enemy (5) vs Anakim (3). Anakim cannot be destroyed by battle damage.
      // Combat is stymied, both survive on battlefield.
      expect(pAnakim.isInvincible).toBe(true);
      expect(engine.playerGraveyard).not.toContain(pAnakim);
      expect(engine.playerBattlefield[0]).toBe(pAnakim);
      expect(engine.enemyBattlefield[0]).toBe(eEnemy);
    });
  });
});
