/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardEntity } from '../entities/CardEntity';
import { SealEntity } from '../entities/SealEntity';
import { IGameController } from './interfaces';
import { Alignment, Phase } from '../types';
import { GAME_CONSTANTS } from '../constants';
import {
  pickChampionForLordAlaric,
  pickLimboForKaelo,
  pickBogvaDestroyTarget,
  pickNobleTheGreatFollowUp,
  pickBellaTarget,
  pickSealForEnemySealAbility,
  pickAnakimSealIndex,
  pickPazooLimboCard,
  pickNixCreatureType,
  preferEnemyFirstWhenFlipPowerTied,
  vacantSlotPriorityForReinforce,
  shouldEnemyUseSamyazaAgainst,
  shouldEnemyUseLuna,
  pickVargBuffTarget,
  pickTarkidosNeutralSeal,
  pickOrielSeal,
  limboCardStrengthForBaronSwap,
  pickBestLimboCardForEnemyBaronSwap,
  baronSwapImprovesLane,
  pickAvatarFinalActTarget,
  pickBestAllyPowerTarget,
  pickBestEnemyWeaknessTarget,
  pickBestHarmTarget,
  harmTargetScore,
  enemyWeaknessScore
} from './EnemyEasyAI';
import gsap from 'gsap';

export class AbilityManager {
  private metatronResolve: ((target: CardEntity) => void) | null = null;

  constructor(private controller: IGameController) {}

  public isImmuneToAbilities(target: CardEntity, source: CardEntity): boolean {
    if (source.data.type !== 'Creature') return false;
    if (target.data.abilityImmune) return true; // Belphegor
    if (target.data.faction !== 'Celestial') return false;
    
    const metatronOnSeal = this.controller.seals.find(s => 
      s.champion && 
      s.champion.data.name === "Metatron" && 
      s.champion.data.isEnemy === target.data.isEnemy
    );
    
    if (metatronOnSeal && metatronOnSeal.champion !== target) return true;
    return false;
  }

  public isProtected(card: CardEntity): boolean {
    return false;
  }

  public handleFinalAct(dying: CardEntity, killer: CardEntity) {
    // Limbo abilities (Final Acts) are manual triggers from Limbo.
  }

  public async handlePostCombat(winner: CardEntity): Promise<void> {
    if (winner.data.name === "Umbarax" || winner.data.name === "Lucian Blackwood") {
      const gravebornCount = winner.data.name === "Umbarax" ? this.countGravebornInPlay(winner.data.isEnemy) : 0;
      const gain = winner.data.name === "Umbarax" ? 2 * gravebornCount : 2;
      winner.data.powerMarkers += gain;
      winner.updateVisualMarkers();
      this.controller.addLog(`${winner.data.name} gains ${gain} Power Marker(s)${winner.data.name === "Umbarax" && gravebornCount > 0 ? ` (+2 per Graveborn, ${gravebornCount} in play)` : ''}.`);
      return;
    }
    if (winner.data.name === "Noble The Great") {
      const allBoard = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      if (allBoard.length === 0) return;
      const isAI = winner.data.isEnemy;
      if (isAI) {
        const target = pickNobleTheGreatFollowUp(winner, allBoard, this.controller.seals);
        if (target) {
          this.applyAbilityEffect(target, { source: winner, effect: 'destroy_or_marker', targetType: 'any' });
        }
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Noble The Great: Select a creature or marker type to destroy."
      });
      this.controller.zoomOut();
      await new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source: winner, effect: 'destroy_or_marker', targetType: 'any' };
      });
    }
  }

  public async executeGlobalAbility(source: CardEntity) {
    const effect = source.data.effect;
    if (effect === 'siphon_all') {
      const allCards = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && c !== source && (c as CardEntity).data.faceUp) as CardEntity[];
      let totalP = 0, totalW = 0;
      allCards.forEach(c => {
        totalP += c.data.powerMarkers;
        totalW += c.data.weaknessMarkers;
        c.data.powerMarkers = 0;
        c.data.weaknessMarkers = 0;
        c.updateVisualMarkers();
      });
      source.data.powerMarkers += totalP;
      source.data.weaknessMarkers += totalW;
      source.updateVisualMarkers();
      this.resetBoardPresencePowerTracking();
      this.syncBoardPresencePowerMarkers();
    } else if (effect === 'corrupt_undefended') {
      for (const s of this.controller.seals.filter(s => !s.champion && s.alignment === Alignment.LIGHT)) {
        await this.controller.claimSeal(s.index, Alignment.DARK, {
          type: 'ability',
          cardName: source.data.name
        });
      }
    } else if (effect === 'siphon_power_only') {
      const allCards = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && c !== source && (c as CardEntity).data.faceUp) as CardEntity[];
      let totalP = 0;
      allCards.forEach(c => {
        totalP += c.data.powerMarkers;
        c.data.powerMarkers = 0;
        c.updateVisualMarkers();
      });
      source.data.powerMarkers += totalP;
      source.updateVisualMarkers();
      this.resetBoardPresencePowerTracking();
      this.syncBoardPresencePowerMarkers();
      this.controller.addLog(`${source.data.name} transfers all Power Markers in play to itself.`);
    }
  }

  /** Count Graveborn in play (owner's side only). Only face-up cards count. */
  public countGravebornInPlay(isEnemy: boolean): number {
    const all = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
    return all.filter(c => c.data.type === 'Graveborn' && c.data.isEnemy === isEnemy).length;
  }

  public countVampyresInPlay(isEnemy: boolean): number {
    const all = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
      .filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
    const hasDuke = all.some(c => c.data.name === "Duke Aren Drakos" && c.data.isEnemy === isEnemy);
    return all.filter(c => c.data.isEnemy === isEnemy && (hasDuke || c.data.faction === "Vampyre")).length;
  }

  /** Lycandor Flip: "for each Graveborn you have in play" */
  public countGravebornForLycandorFlip(ownerIsEnemy: boolean, flippingSource: CardEntity): number {
    let n = this.countGravebornInPlay(ownerIsEnemy);
    if (
      flippingSource.data.type === 'Graveborn' &&
      flippingSource.data.isEnemy === ownerIsEnemy &&
      !flippingSource.data.faceUp
    ) {
      n += 1;
    }
    return n;
  }

  // Test suite compatibility aliases
  public countHorsemenInPlay(isEnemy: boolean): number {
    return this.countGravebornInPlay(isEnemy);
  }
  public countHorsemenForPestilenceFlip(ownerIsEnemy: boolean, flippingSource: CardEntity): number {
    return this.countGravebornForLycandorFlip(ownerIsEnemy, flippingSource);
  }

  private static readonly BOARD_PRESENCE_NAMES = new Set(['Dawn', 'Garmr', 'Pazoo']);

  private isCardInPlayZone(card: CardEntity): boolean {
    const bf = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield];
    if (bf.some(c => c === card)) return true;
    return this.controller.seals.some(s => s.champion === card);
  }

  /** Expected Power Marker contribution from board-presence rules (Dawn / Garmr / Pazoo). */
  public computeExpectedBoardPresencePower(card: CardEntity): number {
    if (!card.data.faceUp || !this.isCardInPlayZone(card)) return 0;
    if (card.data.name === 'Dawn') {
      const all = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      return all.filter(c => c.data.faction === 'Avatars of light').length;
    }
    if (card.data.name === 'Garmr') {
      const inPlay = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp && c.data.faction === 'Lycan').length;
      const inLimbo = [...this.controller.playerLimbo, ...this.controller.enemyLimbo]
        .filter(c => c.data.faction === 'Lycan').length;
      return inPlay + inLimbo;
    }
    if (card.data.name === 'Pazoo') {
      return 2 * this.countGravebornInPlay(card.data.isEnemy);
    }
    return 0;
  }

  public resetBoardPresencePowerTracking(): void {
    const zones: (CardEntity | null | undefined)[][] = [
      this.controller.playerBattlefield,
      this.controller.enemyBattlefield,
      this.controller.seals.map(s => s.champion),
      this.controller.playerLimbo,
      this.controller.enemyLimbo,
      this.controller.playerGraveyard,
      this.controller.enemyGraveyard
    ];
    for (const z of zones) {
      for (const c of z) {
        if (c?.data) c.data.boardPresencePowerMarkers = 0;
      }
    }
  }

  public afterBulkPowerMarkersCleared(): void {
    this.resetBoardPresencePowerTracking();
    this.syncBoardPresencePowerMarkers();
  }

  public stripBoardPresencePowerFromCard(card: CardEntity): void {
    const t = card.data.boardPresencePowerMarkers ?? 0;
    if (t) {
      card.data.powerMarkers -= t;
      card.data.boardPresencePowerMarkers = 0;
      card.updateVisualMarkers();
    }
  }

  public syncBoardPresencePowerMarkers(): void {
    const all = [
      ...this.controller.playerBattlefield,
      ...this.controller.enemyBattlefield,
      ...this.controller.seals.map(s => s.champion)
    ].filter(c => c !== null) as CardEntity[];

    all.forEach(c => {
      if (AbilityManager.BOARD_PRESENCE_NAMES.has(c.data.name)) {
        const expected = this.computeExpectedBoardPresencePower(c);
        const currentTracking = c.data.boardPresencePowerMarkers ?? 0;
        const delta = expected - currentTracking;
        if (delta !== 0) {
          c.data.powerMarkers += delta;
          c.data.boardPresencePowerMarkers = expected;
          c.updateVisualMarkers();
        }
      }
    });
  }

  public enforceZeroPowerDestruction() {
    const all = [
      ...this.controller.playerBattlefield,
      ...this.controller.enemyBattlefield,
      ...this.controller.seals.map(s => s.champion)
    ].filter(c => c !== null) as CardEntity[];

    for (const c of all) {
      if (c.data.type !== 'Creature') continue;
      const p = c.data.power + c.data.powerMarkers - c.data.weaknessMarkers;
      if (p <= 0) {
        this.controller.addLog(`${c.data.name}'s effective Power is ${p} (<= 0) and is destroyed.`);
        const idxP = this.controller.playerBattlefield.indexOf(c);
        const idxE = this.controller.enemyBattlefield.indexOf(c);
        const seal = this.controller.seals.find(s => s.champion === c);
        const killer = { cardName: 'Markers', cause: 'ability' as const };
        if (seal) {
          this.controller.destroyCard(c, c.data.isEnemy, seal.index, true, killer);
          seal.champion = null;
        } else if (idxP !== -1) {
          this.controller.destroyCard(c, false, idxP, false, killer);
        } else if (idxE !== -1) {
          this.controller.destroyCard(c, true, idxE, false, killer);
        }
      }
    }
  }

  public async handleActivateAbility(source: CardEntity, isAI: boolean): Promise<void> {
    // 1. Dawn (formerly The Spinner): Activate = Win if 4 Oathbringers (Light) in play and at least one Champion on a Seal.
    if (source.data.name === "Dawn") {
      const isEnemy = source.data.isEnemy;
      const lightCardsInPlay = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp && c.data.faction === "Avatars of light") as CardEntity[];
      const count = lightCardsInPlay.length;
      const hasChampionOnSeal = this.controller.seals.some(s => s.champion && s.champion.data.isEnemy === isEnemy);
      if (count >= 4 && hasChampionOnSeal) {
        this.controller.addLog(`Dawn: 4+ Oathbringers in play and a Champion on a Seal — you win!`);
        (this.controller as any).phaseManager.finalizeGame("Dawn (4 Oathbringers + Champion on Seal)");
        return;
      }
      this.controller.addLog(`Dawn activates (${count} Oathbringers in play, Champion on Seal: ${hasChampionOnSeal}).`);
      return;
    }

    // 2. Bella (formerly The Allotter): Activate = Destroy one Marker on any creature.
    if (source.data.name === "Bella") {
      const allBoard = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp && ((c as CardEntity).data.powerMarkers > 0 || (c as CardEntity).data.weaknessMarkers > 0)) as CardEntity[];
      if (allBoard.length === 0) {
        this.controller.addLog("Bella: No creatures with markers to target.");
        return;
      }
      if (isAI) {
        const target = pickBellaTarget(source, allBoard, this.controller.seals);
        if (target) {
          this.applyAbilityEffect(target, { source, effect: 'destroy_marker' });
        }
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Bella: Select a creature to destroy one marker from."
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: 'destroy_marker', targetType: 'creature', validTargets: allBoard };
      });
    }

    // 3. Calmadious (formerly The Almighty) / Skarados (formerly The Destroyer) / Metatron (formerly Seraphim): Destroy all/one marker type(s)
    if (source.data.name === "Calmadious" || source.data.name === "Skarados" || source.data.name === "Metatron") {
      const allBoard = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      const isAlmightyOrDestroyer = source.data.name === "Calmadious" || source.data.name === "Skarados";
      
      const key = (choice: 'power' | 'weakness') => choice === 'power' ? 'powerMarkers' : 'weaknessMarkers';
      const typeName = (choice: 'power' | 'weakness') => choice === 'power' ? 'Power' : 'Weakness';
      
      if (isAlmightyOrDestroyer) {
        if (isAI) {
          const totalP = allBoard.reduce((s, c) => s + c.data.powerMarkers, 0);
          const totalW = allBoard.reduce((s, c) => s + c.data.weaknessMarkers, 0);
          const choice: 'power' | 'weakness' = totalP >= totalW && totalP > 0 ? 'power' : totalW > 0 ? 'weakness' : 'power';
          let count = 0;
          allBoard.forEach(c => {
            count += c.data[key(choice)];
            c.data[key(choice)] = 0;
            c.updateVisualMarkers();
          });
          this.controller.addLog(`${source.data.name} destroys all ${typeName(choice)} Markers in play (${count} removed).`);
          if (choice === 'power') this.afterBulkPowerMarkersCleared();
          return;
        }
        
        this.controller.updateState({
          decisionContext: 'DESTROYER_MARKER_TYPE',
          instructionText: `${source.data.name}: Choose which marker type to eliminate across all cards.`,
          decisionMessage: "Destroy all Power Markers in play, or all Weakness Markers in play (both sides). Choose one type."
        });
        this.controller.zoomOut();
        const choice = await new Promise<'power' | 'weakness'>((resolve) => {
          (this.controller as any).markerTypeCallback = resolve;
        });
        this.controller.updateState({ decisionContext: undefined, decisionMessage: undefined });
        let count = 0;
        allBoard.forEach(c => {
          count += c.data[key(choice)];
          c.data[key(choice)] = 0;
          c.updateVisualMarkers();
        });
        this.controller.addLog(`${source.data.name} destroys all ${typeName(choice)} Markers in play (${count} removed).`);
        if (choice === 'power') this.afterBulkPowerMarkersCleared();
        return;
      } else {
        const validTargets = allBoard.filter(c => c.data.powerMarkers > 0 || c.data.weaknessMarkers > 0);
        if (validTargets.length === 0) {
          this.controller.addLog("Metatron: No creatures with markers to target.");
          return;
        }
        if (isAI) {
          const target = validTargets[0];
          const choice: 'power' | 'weakness' = target.data.powerMarkers > 0 ? 'power' : 'weakness';
          const count = target.data[key(choice)];
          target.data[key(choice)] = 0;
          target.updateVisualMarkers();
          this.controller.addLog(`Enemy Metatron destroys all ${typeName(choice)} Markers on ${target.data.name} (${count} removed).`);
          if (choice === 'power') this.afterBulkPowerMarkersCleared();
          return;
        }
        this.controller.updateState({
          currentPhase: Phase.ABILITY_TARGETING,
          instructionText: "Metatron: Select a creature to destroy one marker type on."
        });
        this.controller.zoomOut();
        const target = await new Promise<CardEntity>((resolve) => {
          this.metatronResolve = resolve;
          (this.controller as any).pendingAbilityData = { source, effect: 'metatron_select_type', targetType: 'creature', validTargets };
        });
        if (!target) return;
        if (this.isImmuneToAbilities(target, source)) {
          this.controller.addLog(`${target.data.name} is immune to ${source.data.name}'s ability.`);
          return;
        }
        this.controller.updateState({
          decisionContext: 'DESTROYER_MARKER_TYPE',
          instructionText: "Metatron: Choose which marker type to eliminate on the chosen creature.",
          decisionMessage: `Destroy all Power Markers or all Weakness Markers on ${target.data.name}.`
        });
        const choice = await new Promise<'power' | 'weakness'>((resolve) => {
          (this.controller as any).markerTypeCallback = resolve;
        });
        this.controller.updateState({ decisionContext: undefined, decisionMessage: undefined });
        const count = target.data[key(choice)];
        target.data[key(choice)] = 0;
        target.updateVisualMarkers();
        this.controller.addLog(`${source.data.name} destroys all ${typeName(choice)} Markers on ${target.data.name} (${count} removed).`);
        if (choice === 'power') this.afterBulkPowerMarkersCleared();
        return;
      }
    }

    // 4. Coal (formerly Saint Michael): Activate = win if control 5+ Seals with Champions
    if (source.data.name === "Coal") {
      const isEnemy = source.data.isEnemy;
      const sealsWithChampion = this.controller.seals.filter(s => s.champion && s.champion.data.isEnemy === isEnemy).length;
      if (sealsWithChampion >= 5) {
        this.controller.addLog(`${source.data.name}: You control ${sealsWithChampion} Seals with Champions — you win!`);
        (this.controller as any).phaseManager.finalizeGame("Five Seals with Champions");
        return;
      }
      this.controller.addLog(`${source.data.name} activates (${sealsWithChampion}/5 Seals with Champions).`);
      return;
    }

    // 5. Karlyah (formerly Lilith): Activate = win if control 5+ Seals with Champions
    if (source.data.name === "Karlyah") {
      const isEnemy = source.data.isEnemy;
      const sealsWithChampion = this.controller.seals.filter(s => s.champion && s.champion.data.isEnemy === isEnemy).length;
      if (sealsWithChampion >= 5) {
        this.controller.addLog(`${source.data.name}: You control ${sealsWithChampion} Seals with Champions — you win!`);
        (this.controller as any).phaseManager.finalizeGame("Five Seals with Champions");
        return;
      }
      this.controller.addLog(`${source.data.name} activates (${sealsWithChampion}/5 Seals with Champions).`);
      return;
    }

    // 6. Nix (formerly Death): Activate = Win if 4 Graveborn in play and a Champion on a Seal.
    if (source.data.name === "Nix") {
      const isEnemy = source.data.isEnemy;
      const gravebornCount = this.countGravebornInPlay(isEnemy);
      const hasChampionOnSeal = this.controller.seals.some(s => s.champion && s.champion.data.isEnemy === isEnemy);
      if (gravebornCount >= 4 && hasChampionOnSeal) {
        this.controller.addLog(`${source.data.name}: 4+ Graveborn in play and a Champion on a Seal — you win!`);
        (this.controller as any).phaseManager.finalizeGame("Graveborn (4 Graveborn + Champion on Seal)");
        return;
      }
      this.controller.addLog(`${source.data.name} activates (${gravebornCount} Graveborn, Champion on Seal: ${hasChampionOnSeal}).`);
      return;
    }

    // 7. Lord Alaric (formerly Lord): Activate = Place +1 Power Marker on Alaric for each Vampyre in play
    if (source.data.name === "Lord Alaric") {
      const isEnemy = source.data.isEnemy;
      const count = this.countVampyresInPlay(isEnemy);
      source.data.powerMarkers += count;
      source.updateVisualMarkers();
      this.controller.addLog(`${source.data.name} gains ${count} Power Markers (one per Vampyre in play).`);
      return;
    }

    // 8. Anakim The Wise (formerly Nephilim): Activate = choose a Seal. Enemy may not Champion or Influence that Seal this round.
    if (source.data.name === "Anakim The Wise") {
      if (isAI) {
        const eAlign = this.controller.state.playerAlignment === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
        const idx = pickAnakimSealIndex(this.controller.seals, eAlign);
        if (idx !== -1) {
          this.controller.updateState({ lockedSealIndex: idx });
          this.controller.addLog(`Enemy Anakim The Wise locks Seal ${idx + 1} for this round.`);
        }
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.SEAL_TARGETING,
        instructionText: "Anakim The Wise: Choose a Seal to Lock from Enemy Influence."
      });
      this.controller.zoomOut();
      const targetIdx = await new Promise<number>((resolve) => {
        (this.controller as any).sealSelectionCallback = resolve;
      });
      if (targetIdx >= 0) {
        this.controller.updateState({ lockedSealIndex: targetIdx });
        this.controller.addLog(`Anakim The Wise locks Seal ${targetIdx + 1} for this round.`);
      }
      return;
    }

    // 9. Ulfric Thorne (formerly Beta): Activate = Place a +2 Power Marker on any creature.
    if (source.data.name === "Ulfric Thorne") {
      const allBoard = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      if (allBoard.length === 0) return;
      if (isAI) {
        const allies = allBoard.filter(c => c.data.isEnemy === source.data.isEnemy);
        const target = allies.length > 0 ? pickBestAllyPowerTarget(allies, this.controller.seals) : allBoard[0];
        if (target) {
          target.data.powerMarkers += 2;
          target.updateVisualMarkers();
          this.controller.addLog(`Enemy Ulfric Thorne places +2 Power Marker on ${target.data.name}.`);
        }
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Ulfric Thorne: Choose a creature to place +2 Power Marker on."
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: 'place_power', markerPower: 2, targetType: 'creature', validTargets: allBoard };
      });
    }

    // 10. Mammon (formerly Greed): Activate = Transfer all Power Markers in play to this creature.
    if (source.data.name === "Mammon") {
      const allBoard = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && c !== source && (c as CardEntity).data.faceUp) as CardEntity[];
      let transferred = 0;
      allBoard.forEach(c => {
        transferred += c.data.powerMarkers;
        c.data.powerMarkers = 0;
        c.updateVisualMarkers();
      });
      source.data.powerMarkers += transferred;
      source.updateVisualMarkers();
      this.controller.addLog(`${source.data.name} transfers all ${transferred} Power Markers in play to itself.`);
      this.afterBulkPowerMarkersCleared();
      return;
    }
  }

  public async allocateCounters(card: CardEntity, isAI: boolean): Promise<void> {
    const data = card.data;
    let powerPool = data.markerPower || 0;
    let weaknessPool = data.markerWeakness || 0;

    if (isAI) {
      const seals = this.controller.seals;
      const sourceIsEnemy = card.data.isEnemy;
      const myBf = sourceIsEnemy ? this.controller.enemyBattlefield : this.controller.playerBattlefield;
      const theirBf = sourceIsEnemy ? this.controller.playerBattlefield : this.controller.enemyBattlefield;
      const myUnits = myBf.filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      const enemyUnits = theirBf.filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];

      for (let i = 0; i < powerPool; i++) {
        const candidates = myUnits.filter((c) => !this.isImmuneToAbilities(c, card));
        const t = pickBestAllyPowerTarget(candidates, seals);
        if (t) {
          t.data.powerMarkers++;
          t.updateVisualMarkers();
        }
      }
      for (let i = 0; i < weaknessPool; i++) {
        const candidates = enemyUnits.filter((c) => !this.isImmuneToAbilities(c, card));
        const t = pickBestEnemyWeaknessTarget(candidates, seals);
        if (t) {
          t.data.weaknessMarkers++;
          t.updateVisualMarkers();
        }
      }
      return Promise.resolve();
    } else {
      this.controller.updateState({ 
        currentPhase: Phase.COUNTER_ALLOCATION, 
        powerPool, 
        weaknessPool,
        abilitySourceCardName: card.data.name
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
      });
    }
  }

  public applyAbilityEffect(target: CardEntity, pendingAbilityData: any) {
    if (!pendingAbilityData) return;
    const { effect, source } = pendingAbilityData;

    if (effect === 'metatron_select_type') {
      if (this.metatronResolve) {
        this.metatronResolve(target);
        this.metatronResolve = null;
      }
      return;
    }
    
    if (this.isImmuneToAbilities(target, source)) {
      this.controller.addLog(`${target.data.name} is immune to ${source.data.name}'s ability`);
      return;
    }

    if (target.data.name === 'Tarkidos') {
      const isHarmful = ['destroy', 'destroy_champion_on_seal', 'place_weakness', 'destroy_creature_with_weakness', 'return'].includes(effect);
      if (isHarmful && !target.data.hasTarkidosNullifyUsedThisRound) {
        target.data.hasTarkidosNullifyUsedThisRound = true;
        this.controller.addLog(`Tarkidos's passive nullifies the ability from ${source.data.name}!`);
        return;
      }
    }

    if (target.data.isInvincible && effect !== 'destroy_marker' && effect !== 'return' && effect !== 'return_champion_to_deck') return;

    if (effect === 'sentinel_absorb') {
      const powerValue = target.data.power;
      source.data.powerMarkers += powerValue;
      source.updateVisualMarkers();
      this.controller.addLog(`${source.data.name} gains ${powerValue} Power Markers from ${target.data.name}'s Power Value in Limbo.`);
      this.syncBoardPresencePowerMarkers();
      return;
    }

    if (effect === 'saint_michael_destroy') {
      const idxP = this.controller.playerBattlefield.indexOf(target);
      const idxE = this.controller.enemyBattlefield.indexOf(target);
      const seal = this.controller.seals.find(s => s.champion === target);
      const killedBy = { cardName: source.data.name, cause: 'ability' as const };
      if (seal) {
        this.controller.destroyCard(target, target.data.isEnemy, seal.index, true, killedBy);
        seal.champion = null;
      } else if (idxP !== -1) this.controller.destroyCard(target, false, idxP, false, killedBy);
      else if (idxE !== -1) this.controller.destroyCard(target, true, idxE, false, killedBy);
      this.controller.addLog(`${source.data.name} is moved to the Graveyard.`);
      this.moveToGraveyard(source);
      return;
    }

    if (effect === 'destroy_or_marker') {
      if (target.data.powerMarkers > 0 || target.data.weaknessMarkers > 0) {
        if (target.data.powerMarkers > 0) {
          target.data.powerMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Power Marker on ${target.data.name}.`);
        } else {
          target.data.weaknessMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Weakness Marker on ${target.data.name}.`);
        }
        target.updateVisualMarkers();
      } else {
        const idxP = this.controller.playerBattlefield.indexOf(target);
        const idxE = this.controller.enemyBattlefield.indexOf(target);
        const seal = this.controller.seals.find(s => s.champion === target);
        const killedBy = { cardName: source.data.name, cause: 'ability' as const };
        if (seal) {
          this.controller.destroyCard(target, target.data.isEnemy, seal.index, true, killedBy);
          seal.champion = null;
        } else if (idxP !== -1) this.controller.destroyCard(target, false, idxP, false, killedBy);
        else if (idxE !== -1) this.controller.destroyCard(target, true, idxE, false, killedBy);
      }
      return;
    }

    if (effect === 'destroy_champion_on_seal') {
      const seal = this.controller.seals.find(s => s.champion === target);
      if (seal) {
        const killedBy = { cardName: source.data.name, cause: 'ability' as const };
        this.controller.destroyCard(target, target.data.isEnemy, seal.index, true, killedBy);
        seal.champion = null;
      }
      return;
    }

    if (effect === 'return_champion_to_deck') {
      const idxP = this.controller.playerBattlefield.indexOf(target);
      const idxE = this.controller.enemyBattlefield.indexOf(target);
      const seal = this.controller.seals.find(s => s.champion === target);
      
      if (seal) seal.champion = null;
      else if (idxP !== -1) this.controller.playerBattlefield[idxP] = null;
      else if (idxE !== -1) this.controller.enemyBattlefield[idxE] = null;

      this.controller.addLog(`${source.data.name} places Champion ${target.data.name} on top of its owner's deck.`);
      const deck = target.data.isEnemy ? this.controller.enemyDeck : this.controller.playerDeck;
      const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = target.data;
      deck.push({ ...baseData });
      this.stripBoardPresencePowerFromCard(target);
      this.syncBoardPresencePowerMarkers();
      this.moveToGraveyard(source);
      gsap.to(target.mesh.position, { y: 10, duration: 0.5, onComplete: () => {
        this.controller.disposeCard(target);
      }});
      return;
    }

    if (effect === 'destroy_marker') {
      const markerType = pendingAbilityData.markerType as 'power' | 'weakness' | undefined;
      if (markerType === 'power') {
        if (target.data.powerMarkers > 0) {
          target.data.powerMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Power Marker on ${target.data.name}`);
        } else {
          this.controller.addLog(`No Power markers to destroy on ${target.data.name}`);
        }
      } else if (markerType === 'weakness') {
        if (target.data.weaknessMarkers > 0) {
          target.data.weaknessMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Weakness Marker on ${target.data.name}`);
        } else {
          this.controller.addLog(`No Weakness markers to destroy on ${target.data.name}`);
        }
      } else {
        if (target.data.powerMarkers > 0) {
          target.data.powerMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Power Marker on ${target.data.name}`);
        } else if (target.data.weaknessMarkers > 0) {
          target.data.weaknessMarkers--;
          this.controller.addLog(`${source.data.name} destroys a Weakness Marker on ${target.data.name}`);
        } else {
          this.controller.addLog(`No markers to destroy on ${target.data.name}`);
        }
      }
      target.updateVisualMarkers();
    } else if (effect === 'destroy') {
      const idxP = this.controller.playerBattlefield.indexOf(target);
      const idxE = this.controller.enemyBattlefield.indexOf(target);
      const seal = this.controller.seals.find(s => s.champion === target);
      const killedBy = { cardName: source.data.name, cause: 'ability' as const };
      if (seal) {
        this.controller.destroyCard(target, target.data.isEnemy, seal.index, true, killedBy);
        seal.champion = null;
      } else if (idxP !== -1) this.controller.destroyCard(target, false, idxP, false, killedBy);
      else if (idxE !== -1) this.controller.destroyCard(target, true, idxE, false, killedBy);
    } else if (effect === 'return') {
      const idxP = this.controller.playerBattlefield.indexOf(target);
      const idxE = this.controller.enemyBattlefield.indexOf(target);
      const seal = this.controller.seals.find(s => s.champion === target);
      
      if (seal) seal.champion = null;
      else if (idxP !== -1) this.controller.playerBattlefield[idxP] = null;
      else if (idxE !== -1) this.controller.enemyBattlefield[idxE] = null;

      this.controller.addLog(`${source.data.name} places ${target.data.name} on top of its owner's deck`);
      const deck = target.data.isEnemy ? this.controller.enemyDeck : this.controller.playerDeck;
      const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = target.data;
      deck.push({ ...baseData });
      this.stripBoardPresencePowerFromCard(target);
      this.syncBoardPresencePowerMarkers();
      gsap.to(target.mesh.position, { y: 10, duration: 0.5, onComplete: () => {
        this.controller.disposeCard(target);
      }});
    } else if (effect === 'place_power') {
      const amount = pendingAbilityData.markerPower ?? source.data.markerPower ?? 3;
      target.data.powerMarkers += amount;
      target.updateVisualMarkers();
      this.controller.addLog(`${source.data.name} places +${amount} Power Marker(s) on ${target.data.name}`);
    } else if (effect === 'place_weakness') {
      const amount = pendingAbilityData.markerWeakness ?? source.data.markerWeakness ?? 3;
      target.data.weaknessMarkers += amount;
      target.updateVisualMarkers();
      this.controller.addLog(`${source.data.name} places -${amount} Weakness Marker(s) on ${target.data.name}`);
    } else if (effect === 'destroy_creature_with_weakness') {
      const idxP = this.controller.playerBattlefield.indexOf(target);
      const idxE = this.controller.enemyBattlefield.indexOf(target);
      const seal = this.controller.seals.find(s => s.champion === target);
      const killedBy = { cardName: source.data.name, cause: 'ability' as const };
      if (seal) {
        this.controller.destroyCard(target, target.data.isEnemy, seal.index, true, killedBy);
        seal.champion = null;
      } else if (idxP !== -1) this.controller.destroyCard(target, false, idxP, false, killedBy);
      else if (idxE !== -1) this.controller.destroyCard(target, true, idxE, false, killedBy);
    }
    if (source && source.data.isActivatingAbility) {
      source.data.isActivatingAbility = false;
    }
    if (source && source.data.hasLimboAbility && (this.controller.playerLimbo.includes(source) || this.controller.enemyLimbo.includes(source))) {
      this.moveToGraveyard(source);
    }
  }

  public returnCreatureToOwnerDeck(target: CardEntity) {
    const idxP = this.controller.playerBattlefield.indexOf(target);
    const idxE = this.controller.enemyBattlefield.indexOf(target);
    const seal = this.controller.seals.find(s => s.champion === target);
    if (seal) seal.champion = null;
    else if (idxP !== -1) this.controller.playerBattlefield[idxP] = null;
    else if (idxE !== -1) this.controller.enemyBattlefield[idxE] = null;
    const deck = target.data.isEnemy ? this.controller.enemyDeck : this.controller.playerDeck;
    const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = target.data;
    deck.push({ ...baseData });
    this.stripBoardPresencePowerFromCard(target);
    this.syncBoardPresencePowerMarkers();
    this.controller.addLog(`${target.data.name} is placed on top of its owner's deck.`);
    gsap.to(target.mesh.position, { y: 10, duration: 0.5, onComplete: () => {
      this.controller.disposeCard(target);
    }});
  }

  public async handleTargetedAbility(source: CardEntity, isAI: boolean) {
    const data = source.data;
    if (data.targetType === 'champion') {
      const targets = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp && (c as CardEntity).data.isChampion) as CardEntity[];
      if (isAI) {
        if (targets.length > 0) {
          const target = pickChampionForLordAlaric(source, targets, this.controller.seals);
          if (target) this.applyAbilityEffect(target, { source, effect: data.effect });
        } else {
          this.controller.addLog(`${source.data.name} finds no Champion in play to place on deck.`);
        }
        return Promise.resolve();
      }
      source.data.isActivatingAbility = true;
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Lord Alaric: Choose a Champion to place on top of its owner's deck."
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: data.effect, targetType: data.targetType };
      });
    }

    if (data.targetType === 'champion_on_seal') {
      const targets = this.controller.seals.map(s => s.champion).filter(c => c !== null) as CardEntity[];
      if (isAI) {
        if (targets.length > 0) {
          const target = pickBestHarmTarget(source, targets, this.controller.seals);
          if (target) this.applyAbilityEffect(target, { source, effect: data.effect });
        } else {
          this.controller.addLog(`${source.data.name} finds no Champion on a Seal to destroy.`);
        }
        return Promise.resolve();
      }
      source.data.isActivatingAbility = true;
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Bella: Choose a Champion on a Seal to destroy."
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: data.effect, targetType: data.targetType, validTargets: targets };
      });
    }

    if (data.targetType === 'limbo_creature') {
      const ownerLimbo = source.data.isEnemy ? this.controller.enemyLimbo : this.controller.playerLimbo;
      const targets = isAI ? [...ownerLimbo] : [...this.controller.playerLimbo, ...this.controller.enemyLimbo];
      if (isAI) {
        if (targets.length > 0) {
          const target = pickLimboForKaelo(targets);
          if (target) this.applyAbilityEffect(target, { source, effect: data.effect });
        } else {
          this.controller.addLog(`${source.data.name} finds no creature in Limbo to absorb.`);
        }
        return Promise.resolve();
      }
      source.data.isActivatingAbility = true;
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: 'Kaelo: Choose a creature in Limbo (power value added to Kaelo).',
        isSelectingLimboTarget: true
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: data.effect, targetType: data.targetType };
      });
    }

    if (data.targetType === 'creature_power_gte') {
      const sourcePower = source.data.power + source.data.powerMarkers - source.data.weaknessMarkers;
      const allCreatures = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && c !== source && (c as CardEntity).data.faceUp) as CardEntity[];
      const validTargets = allCreatures.filter(c => {
        const p = c.data.power + c.data.powerMarkers - c.data.weaknessMarkers;
        return p >= sourcePower && !this.isImmuneToAbilities(c, source);
      });
      if (isAI) {
        if (validTargets.length > 0) {
          const foes = validTargets.filter((t) => t.data.isEnemy !== source.data.isEnemy);
          const pool = foes.length > 0 ? foes : validTargets;
          let target = pool[0];
          let best = enemyWeaknessScore(target, this.controller.seals);
          for (let i = 1; i < pool.length; i++) {
            const sc = enemyWeaknessScore(pool[i], this.controller.seals);
            if (sc > best) {
              best = sc;
              target = pool[i];
            }
          }
          this.applyAbilityEffect(target, { source, effect: data.effect, markerWeakness: data.markerWeakness ?? 3 });
        } else {
          this.controller.addLog(`${source.data.name} finds no creature with Power Value ≥ its own to affect.`);
        }
        return Promise.resolve();
      }
      source.data.isActivatingAbility = true;
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: `Zelus: Choose a creature with Power Value ≥ Zelus's to place -3 Weakness on.`
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: data.effect, targetType: data.targetType, validTargets, markerWeakness: data.markerWeakness ?? 3 };
      });
    }

    if (isAI) {
      let targets: CardEntity[];
      if (data.targetType === 'creature') {
        const all = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
        targets = all.filter(c => !this.isImmuneToAbilities(c, source));
      } else {
        targets = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      }
      const seals = this.controller.seals;
      if (targets.length > 0) {
        const eff = data.effect;
        let target: CardEntity | null = null;
        if (eff === 'place_power') {
          const allies = targets.filter((t) => t.data.isEnemy === source.data.isEnemy);
          const pool = allies.length > 0 ? allies : targets;
          target = pickBestAllyPowerTarget(pool, seals);
        } else if (eff === 'place_weakness' || eff === 'destroy' || eff === 'return') {
          const foes = targets.filter((t) => t.data.isEnemy !== source.data.isEnemy);
          const pool = foes.length > 0 ? foes : targets;
          target = pickBestHarmTarget(source, pool, seals);
        } else if (eff === 'destroy_marker') {
          const withPm = targets.filter((t) => t.data.powerMarkers > 0);
          const withWm = targets.filter((t) => t.data.weaknessMarkers > 0);
          const foePm = withPm.filter((t) => t.data.isEnemy !== source.data.isEnemy);
          const foeWm = withWm.filter((t) => t.data.isEnemy !== source.data.isEnemy);
          if (foePm.length > 0) {
            target = foePm.reduce((a, b) => (harmTargetScore(source, a, seals) + a.data.powerMarkers * 5 >= harmTargetScore(source, b, seals) + b.data.powerMarkers * 5 ? a : b));
          } else if (foeWm.length > 0) {
            target = foeWm.reduce((a, b) => (a.data.weaknessMarkers >= b.data.weaknessMarkers ? a : b));
          } else if (withPm.length > 0) {
            target = withPm.reduce((a, b) => (a.data.powerMarkers >= b.data.powerMarkers ? a : b));
          } else if (withWm.length > 0) {
            target = withWm[0];
          }
        } else {
          target = targets[0];
        }
        if (target) {
          this.applyAbilityEffect(target, { source, effect: data.effect, markerWeakness: source.data.markerWeakness });
        }
      } else if (data.effect === 'place_weakness') {
        this.controller.addLog(`${source.data.name} finds no valid creature to place Weakness on.`);
      }
      return Promise.resolve();
    }

    const instructionText = data.effect === 'place_power'
      ? `${source.data.name}: Choose a creature to place +${source.data.markerPower ?? 3} Power Marker(s) on.`
      : data.effect === 'place_weakness'
      ? (data.targetType === 'creature_power_gte' ? `Zelus: Choose a creature with Power Value ≥ Zelus's to place -3 Weakness on.` : `${source.data.name}: Choose a creature to place -${source.data.markerWeakness ?? 3} Weakness on.`)
      : `Select a target to ${data.effect?.toUpperCase()}.`;
    source.data.isActivatingAbility = true;
    this.controller.updateState({
      currentPhase: Phase.ABILITY_TARGETING,
      instructionText
    });
    this.controller.zoomOut();
    return new Promise<void>((resolve) => {
      (this.controller as any).resolutionCallback = resolve;
      (this.controller as any).pendingAbilityData = { source, effect: data.effect, targetType: data.targetType, markerWeakness: source.data.markerWeakness };
    });
  }

  public async handleBogvaDestroyAction(source: CardEntity, isAI: boolean) {
    const validTargets = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
      .filter(c => c !== null && (c as CardEntity).data.faceUp && (c as CardEntity).data.weaknessMarkers > 0) as CardEntity[];
    if (validTargets.length === 0) {
      this.controller.addLog(`${source.data.name} finds no creature with Weakness Markers to destroy.`);
      return;
    }
    if (isAI) {
      const target = pickBogvaDestroyTarget(source, validTargets, this.controller.seals);
      if (target) {
        this.applyAbilityEffect(target, { source, effect: 'destroy_creature_with_weakness' });
      }
      return;
    }
    this.controller.updateState({
      currentPhase: Phase.ABILITY_TARGETING,
      instructionText: "Bogva: Choose a creature with Weakness Markers to destroy."
    });
    this.controller.zoomOut();
    await new Promise<void>((resolve) => {
      (this.controller as any).resolutionCallback = resolve;
      (this.controller as any).pendingAbilityData = { source, effect: 'destroy_creature_with_weakness', validTargets };
    });
  }

  public async handleLimboAbility(card: CardEntity) {
    if (card.data.name === "Tarkidos") {
      this.controller.updateState({
        currentPhase: Phase.SEAL_TARGETING,
        instructionText: "Tarkidos: Select a Seal without a Champion to Purify."
      });
      this.controller.zoomOut();
      const targetIdx = await new Promise<number>((resolve) => {
        (this.controller as any).sealSelectionCallback = (idx: number) => {
          const seal = this.controller.seals[idx];
          if (!seal.champion) {
            resolve(idx);
          } else {
            this.controller.addLog("Invalid target for Tarkidos.");
            resolve(-1);
          }
        };
      });

      if (targetIdx !== -1) {
        await this.controller.claimSeal(targetIdx, Alignment.LIGHT, {
          type: 'ability',
          cardName: card.data.name
        });
        this.moveToGraveyard(card);
      } else {
        this.controller.updateState({ currentPhase: Phase.PREP });
      }
      return;
    }

    if (card.data.name === "Karlyah") {
      const inPlay = (c: CardEntity) =>
        this.controller.playerBattlefield.includes(c) ||
        this.controller.enemyBattlefield.includes(c) ||
        this.controller.seals.some(s => s.champion === c);
      const validTargets = [...new Set(this.controller.cardsThatBattledThisRound)].filter(inPlay);
      if (validTargets.length === 0) {
        this.controller.addLog("Karlyah: No cards that battled this turn are still in play.");
        this.controller.updateState({ currentPhase: Phase.PREP });
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Karlyah (Limbo): Select a card that battled this turn to destroy. Karlyah moves to Graveyard."
      });
      this.controller.zoomOut();
      await new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source: card, effect: 'saint_michael_destroy', targetType: 'battled', validTargets };
      });
      return;
    }

    if (card.data.name === "Golgothane") {
      const enemyLimbo = card.data.isEnemy ? this.controller.playerLimbo : this.controller.enemyLimbo;
      const enemyDeck = card.data.isEnemy ? this.controller.playerDeck : this.controller.enemyDeck;
      if (enemyLimbo.length === 0) {
        this.controller.addLog("Golgothane: Enemy has no creatures in Limbo to shuffle.");
        this.controller.updateState({ currentPhase: Phase.PREP });
        return;
      }
      this.controller.addLog(`Golgothane: Shuffling all ${enemyLimbo.length} enemy creatures from Limbo back into their deck.`);
      while (enemyLimbo.length > 0) {
        const c = enemyLimbo.pop()!;
        const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = c.data;
        enemyDeck.push({ ...baseData });
        this.controller.disposeCard(c);
      }
      enemyDeck.sort(() => Math.random() - 0.5);
      this.moveToGraveyard(card);
      this.controller.updateState({ currentPhase: Phase.PREP });
      this.syncBoardPresencePowerMarkers();
      return;
    }

    if (card.data.name === "Kaelarion") {
      const champions = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
        .filter(c => c !== null && (c as CardEntity).data.faceUp && (c as CardEntity).data.isChampion) as CardEntity[];
      if (champions.length === 0) {
        this.controller.addLog("Kaelarion: No Champions in play to target.");
        this.controller.updateState({ currentPhase: Phase.PREP });
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Kaelarion (Limbo): Select a Champion in play to place on top of its owner's deck."
      });
      this.controller.zoomOut();
      await new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source: card, effect: 'return_champion_to_deck', targetType: 'champion', validTargets: champions };
      });
      return;
    }

    if (card.data.name === "Alistar Elren") {
      const targets = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
      if (targets.length === 0) {
        this.controller.addLog("Alistar Elren: No creatures in play to target.");
        this.controller.updateState({ currentPhase: Phase.PREP });
        return;
      }
      this.controller.updateState({
        currentPhase: Phase.ABILITY_TARGETING,
        instructionText: "Alistar Elren (Limbo): Select a creature in play to place a -3 Weakness Marker on. Alistar Elren moves to Graveyard."
      });
      this.controller.zoomOut();
      await new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source: card, effect: 'place_weakness', targetType: 'creature', validTargets: targets, markerWeakness: 3 };
      });
      return;
    }
  }

  public async runEnemyPrepAutomation(): Promise<void> {
    await new Promise((r) => setTimeout(r, 120));
    const snapshot = [...this.controller.enemyLimbo];
    for (const card of snapshot) {
      if (!card.data.isEnemy) continue;
      if (!this.controller.enemyLimbo.includes(card)) continue;
      if (card.data.name === 'Tarkidos') await this.executeEnemyMartyrLimbo(card);
      else if (card.data.name === 'Karlyah') {
        await this.executeEnemyAvatarFinalLimbo(card);
      } else if (card.data.name === 'Golgothane') {
        const playerLimbo = this.controller.playerLimbo;
        if (playerLimbo.length > 0) {
          this.controller.addLog(`Enemy Golgothane: Shuffling all ${playerLimbo.length} player creatures from Limbo back into their deck.`);
          while (playerLimbo.length > 0) {
            const c = playerLimbo.pop()!;
            const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = c.data;
            this.controller.playerDeck.push({ ...baseData });
            this.controller.disposeCard(c);
          }
          this.controller.playerDeck.sort(() => Math.random() - 0.5);
          this.moveToGraveyard(card);
        }
      } else if (card.data.name === 'Kaelarion') {
        const champions = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
          .filter(c => c !== null && (c as CardEntity).data.faceUp && (c as CardEntity).data.isChampion) as CardEntity[];
        if (champions.length > 0) {
          const target = pickChampionForLordAlaric(card, champions, this.controller.seals);
          if (target) {
            this.controller.addLog(`Enemy Kaelarion: Placing Champion ${target.data.name} on top of owner's deck.`);
            this.returnCreatureToOwnerDeck(target);
            this.moveToGraveyard(card);
          }
        }
      } else if (card.data.name === 'Alistar Elren') {
        const creatures = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
          .filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
        if (creatures.length > 0) {
          const target = pickBestHarmTarget(card, creatures, this.controller.seals);
          if (target) {
            this.applyAbilityEffect(target, { source: card, effect: 'place_weakness', markerWeakness: 3 });
            this.moveToGraveyard(card);
            this.controller.addLog(`Enemy Alistar Elren (Limbo): Places -3 Weakness Marker on ${target.data.name}.`);
          }
        }
      }
    }
    this.syncBoardPresencePowerMarkers();
    this.controller.updateState({});
  }

  private async executeEnemyMartyrLimbo(card: CardEntity): Promise<void> {
    if (!this.controller.enemyLimbo.includes(card) || card.data.name !== 'Tarkidos') return;
    const seal = pickTarkidosNeutralSeal(this.controller.seals);
    if (!seal) return;
    await this.controller.claimSeal(seal.index, Alignment.LIGHT, { type: 'ability', cardName: card.data.name });
    this.moveToGraveyard(card);
    this.controller.addLog(`Enemy Tarkidos purifies Seal ${seal.index + 1} from Limbo.`);
  }

  private async executeEnemyAvatarFinalLimbo(card: CardEntity): Promise<void> {
    if (!this.controller.enemyLimbo.includes(card)) return;
    const inPlay = (c: CardEntity) =>
      this.controller.playerBattlefield.includes(c) ||
      this.controller.enemyBattlefield.includes(c) ||
      this.controller.seals.some((s) => s.champion === c);
    const validTargets = [...new Set(this.controller.cardsThatBattledThisRound)].filter(inPlay);
    if (validTargets.length === 0) return;
    const target = pickAvatarFinalActTarget(card, validTargets, this.controller.seals);
    if (!target) return;
    this.applyAbilityEffect(target, {
      source: card,
      effect: 'saint_michael_destroy',
      targetType: 'battled',
      validTargets,
    });
    this.controller.addLog(`Enemy ${card.data.name} (Limbo) destroys ${target.data.name} that battled last round.`);
  }



  public async checkNullify(source: CardEntity): Promise<boolean> {
    const isEnemy = source.data.isEnemy;
    const opponentLimbo = isEnemy ? this.controller.playerLimbo : this.controller.enemyLimbo;
    const nullifier = opponentLimbo.find((c) => c.data.name === 'Samyaza' || c.data.name === 'Belphegor');
    if (!nullifier || !opponentLimbo.includes(nullifier)) return false;

    if (!isEnemy) {
      if (shouldEnemyUseSamyazaAgainst(source)) {
        this.controller.addLog(`Enemy uses ${nullifier.data.name} from Limbo to Nullify ${source.data.name}'s ability!`);
        this.moveToGraveyard(nullifier);
        return true;
      }
      return false;
    }

    this.controller.updateState({
      instructionText: `Use ${nullifier.data.name} from Limbo to Nullify ${source.data.name}?`,
      currentPhase: Phase.ABILITY_TARGETING,
      decisionContext: 'FALLEN_ONE',
      decisionMessage: `Opponent revealed ${source.data.name}. Use ${nullifier.data.name} from your Limbo to nullify its ability? (${nullifier.data.name} is moved to your Graveyard.)`
    });

    const confirmed = await new Promise<boolean>((resolve) => {
      (this.controller as any).nullifyCallback = resolve;
    });

    this.controller.updateState({ decisionContext: undefined, decisionMessage: undefined });

    if (confirmed) {
      this.controller.addLog(`Player uses ${nullifier.data.name} from Limbo to Nullify ${source.data.name}'s ability!`);
      this.moveToGraveyard(nullifier);
      return true;
    }
    return false;
  }

  public moveToGraveyard(card: CardEntity) {
    const isEnemy = card.data.isEnemy;
    const limbo = isEnemy ? this.controller.enemyLimbo : this.controller.playerLimbo;
    const grave = isEnemy ? this.controller.enemyGraveyard : this.controller.playerGraveyard;
    const graveMesh = isEnemy ? this.controller.enemyGraveyardMesh : this.controller.playerGraveyardMesh;

    if (grave.includes(card)) return;

    const idx = limbo.indexOf(card);
    if (idx === -1) {
      this.controller.addLog(`${card.data.name} is not in Limbo and cannot be moved to the Graveyard this way.`);
      return;
    }
    limbo.splice(idx, 1);
    grave.push(card);

    gsap.to(card.mesh.position, {
      x: graveMesh.position.x + (Math.random() - 0.5),
      y: 0.2 + (grave.length * 0.05),
      z: graveMesh.position.z + (Math.random() - 0.5),
      duration: 0.8
    });
    this.controller.updateState({}); // Refresh counts
    this.syncBoardPresencePowerMarkers();
  }

  public async handleSealTargetAbility(source: CardEntity, isAI: boolean) {
    const pAlign = this.controller.state.playerAlignment;
    const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
    let effect = source.data.sealEffect as Alignment | undefined;
    if (source.data.name === "Elowen Thornver") {
      effect = source.data.isEnemy ? eAlign : pAlign;
    }
    const corruptOnly = source.data.name === "Calmadious";
    if (isAI) {
      const targetAlign = effect === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
      let validSeals = this.controller.seals.filter(s => !s.champion && (s.alignment === targetAlign || s.alignment === Alignment.NEUTRAL));
      if (corruptOnly && effect === Alignment.LIGHT) validSeals = validSeals.filter(s => s.alignment === Alignment.DARK);
      if (validSeals.length > 0 && effect) {
        const seal = pickSealForEnemySealAbility(validSeals, effect, pAlign, eAlign);
        if (seal) {
          await this.controller.claimSeal(seal.index, effect, {
            type: 'ability',
            cardName: source.data.name
          });
        }
      }
      return Promise.resolve();
    } else {
      this.controller.updateState({
        currentPhase: Phase.SEAL_TARGETING,
        instructionText: source.data.name === "Elowen Thornver"
          ? `Elowen Thornver: Select a Seal without a Champion to change to ${effect === Alignment.LIGHT ? 'Light' : 'Dark'}.`
          : corruptOnly && effect === Alignment.LIGHT
          ? "Calmadious: Select a Corrupted (Dark) Seal without a Champion to Purify."
          : `Select an undefended seal to ${effect === Alignment.LIGHT ? 'PURIFY' : 'CORRUPT'}.`
      });
      this.controller.zoomOut();
      return new Promise<void>((resolve) => {
        (this.controller as any).resolutionCallback = resolve;
        (this.controller as any).pendingAbilityData = { source, effect: effect ?? pAlign, corruptOnly: corruptOnly && effect === Alignment.LIGHT };
      });
    }
  }
}
