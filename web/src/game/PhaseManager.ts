import gsap from 'gsap';
import { recordGameEndAndPersist, loadAchievementsProgress } from '../achievements/storage';
import { logGameEvent } from './analytics';
import { Phase, Alignment, CardData } from '../types';
import { CardEntity, getOrLoadBackTexture } from '../entities/CardEntity';
import { IGameController } from './interfaces';
import { GAME_CONSTANTS } from '../constants';
import {
  pickDeathCreatureType,
  pickDeltaBuffTarget,
  pickPazooLimboCard,
  pickOrielSeal,
  preferEnemyFirstWhenFlipPowerTied,
  vacantSlotPriorityForReinforce,
} from './EnemyEasyAI';

export class PhaseManager {
  constructor(private controller: IGameController) {}

  private updateInterstitial(patch: Partial<NonNullable<import('../types').GameState['combatInterstitial']>>) {
    if (!this.controller.state.slowMode) return;
    const current = this.controller.state.combatInterstitial || {
      active: true,
      sealIndex: this.controller.currentResolvingSealIndex,
      step: 'idle',
      description: '',
      leftCard: null,
      rightCard: null
    };
    this.controller.updateState({
      combatInterstitial: {
        ...current,
        ...patch
      }
    });
  }

  private clearInterstitial() {
    this.controller.updateState({ combatInterstitial: null });
  }

  private async delay(ms: number) {
    if (this.controller.state.slowMode) {
      await new Promise(r => setTimeout(r, ms));
    }
  }

  private refreshInterstitialCards(description: string, step: NonNullable<import('../types').GameState['combatInterstitial']>['step'] = 'idle', patch?: Partial<NonNullable<import('../types').GameState['combatInterstitial']>>) {
    if (!this.controller.state.slowMode) return;
    const idx = this.controller.currentResolvingSealIndex;
    if (idx === -1) return;
    const pCard = this.controller.playerBattlefield[idx];
    const eCard = this.controller.enemyBattlefield[idx];
    const seal = this.controller.seals[idx];
    const right = eCard || seal.champion;

    const leftHovered = pCard ? this.controller.cardToHoveredInfo(pCard) : null;
    let rightHovered = null;
    if (right) {
      const isSecret = right.data.isEnemy && !right.data.faceUp;
      rightHovered = isSecret ? {
        name: 'Face Down Card',
        faction: 'Unknown',
        power: 0,
        type: 'Unknown',
        isChampion: false,
        ability: 'This card is face down.',
        powerMarkers: 0,
        weaknessMarkers: 0,
        faceArtPath: undefined
      } : this.controller.cardToHoveredInfo(right);
    }

    const leftPow = pCard ? pCard.data.power + pCard.data.powerMarkers - pCard.data.weaknessMarkers : 0;
    const rightPow = right ? right.data.power + right.data.powerMarkers - right.data.weaknessMarkers : 0;

    const leftPowerText = pCard ? `${pCard.data.power} Base${pCard.data.powerMarkers ? ` + ${pCard.data.powerMarkers} Buff` : ''}${pCard.data.weaknessMarkers ? ` - ${pCard.data.weaknessMarkers} Weak` : ''} = ${leftPow} Power` : '';
    const rightPowerText = right ? (right.data.isEnemy && !right.data.faceUp ? 'Power: Unknown' : `${right.data.power} Base${right.data.powerMarkers ? ` + ${right.data.powerMarkers} Buff` : ''}${right.data.weaknessMarkers ? ` - ${right.data.weaknessMarkers} Weak` : ''} = ${rightPow} Power`) : '';

    this.updateInterstitial({
      leftCard: leftHovered,
      rightCard: rightHovered,
      description,
      step,
      leftPowerText,
      rightPowerText,
      ...patch
    });
  }

  public async startPrepPhase() {
    this.controller.currentResolvingSealIndex = -1;
    if (this.controller.isProcessing) return;
    
    // Attrition check
    if (this.controller.playerDeck.length < 8 || this.controller.enemyDeck.length < 8) {
      let result: 'player' | 'enemy' | 'draw';
      const pLen = this.controller.playerDeck.length;
      const eLen = this.controller.enemyDeck.length;
      if (pLen < 8 && eLen < 8) {
        result = 'draw';
      } else if (pLen < 8) {
        result = 'enemy';
      } else {
        result = 'player';
      }
      this.finalizeGame("Attrition", result);
      return;
    }

    (this.controller as { clearPrepUndoStack?: () => void }).clearPrepUndoStack?.();
    this.controller.isProcessing = true;
    this.controller.addLog(`--- Round ${this.controller.state.currentRound} Prep Phase ---`);
    this.controller.updateState({ currentPhase: Phase.PREP, phaseStep: 'Step 1: Draw Hand', lockedSealIndex: -1 });

    // Clear any temporary battle invincibility applied in the previous round
    this.clearTemporaryInvincibility();

    // Preload card back texture before creating any hand cards so the first (leftmost) card is never rendered without it
    await getOrLoadBackTexture();

    const isSlow = this.controller.state.slowMode;

    for (let i = 0; i < 8; i++) {
      if (this.controller.playerDeck.length === 0) break;
      const cardData = this.controller.playerDeck.pop()!;
      const card = new CardEntity(cardData, false, this.controller.state.playerAlignment);
      this.controller.entityManager.add(card);
      card.mesh.position.set(-15, 2, 6); // Deck position
      this.controller.sceneManager.scene.add(card.mesh);
      this.controller.playerHand.push(card);
      card.applyBackTextureIfNeeded(); // All cards share same back graphic; ensure it is applied as soon as ready

      if (isSlow) {
        this.controller.realignPlayerHand(0.6);
        await this.delay(100);
      }
    }

    if (!isSlow) {
      this.controller.realignPlayerHand(0);
    }

    this.enemyReinforce();
    this.controller.isProcessing = false;
    this.controller.updateState({ phaseStep: 'Step 3: Reinforce' });
  }

  /** Clear temporary battle invincibility from all cards in play (battlefield + champions). */
  public clearTemporaryInvincibility() {
    [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
      .filter(c => c !== null)
      .forEach(c => {
        if (c!.data.isInvincible) {
          c!.data.isInvincible = false;
          this.controller.addLog(`${c!.data.name}'s Invulnerability fades.`);
        }
      });
  }

  private enemyReinforce() {
    const aiHand: CardData[] = [];
    for (let i = 0; i < 8; i++) { if (this.controller.enemyDeck.length > 0) aiHand.push(this.controller.enemyDeck.pop()!); }

    const handStrength = (d: CardData) => (d.isChampion ? 85 : 0) + d.power;
    aiHand.sort((a, b) => handStrength(b) - handStrength(a));

    const vacantSlots = this.controller.enemyBattlefield.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
    vacantSlots.sort(
      (a, b) =>
        vacantSlotPriorityForReinforce(b, this.controller.playerBattlefield) -
        vacantSlotPriorityForReinforce(a, this.controller.playerBattlefield)
    );
    const isSlow = this.controller.state.slowMode;
    for (let i = 0; i < vacantSlots.length && aiHand.length > 0; i++) {
      const slotIdx = vacantSlots[i];
      const cardData = aiHand.shift()!;
      const card = new CardEntity(cardData, true, this.controller.state.playerAlignment);
      this.controller.entityManager.add(card);
      card.mesh.position.set(-15, 2, -6);
      card.mesh.rotation.x = Math.PI;
      this.controller.sceneManager.scene.add(card.mesh);
      this.controller.enemyBattlefield[slotIdx] = card;
      card.applyBackTextureIfNeeded(); // All cards share same back graphic; ensure it is applied as soon as ready

      const duration = isSlow ? 0.8 : 0;
      const delay = isSlow ? i * 0.15 : 0;
      gsap.to(card.mesh.position, {
        x: (slotIdx - 3) * GAME_CONSTANTS.SLOT_SPACING,
        y: 0.1,
        z: -3.2,
        duration: duration,
        delay: delay
      });
    }
    this.controller.enemyPrepRemainder = [...aiHand];
    this.controller.updateState({});
  }

  public endPrep() {
    if (this.controller.isProcessing) return;
    (this.controller as { clearPrepUndoStack?: () => void }).clearPrepUndoStack?.();
    this.controller.isProcessing = true;
    (this.controller as any).pendingBaronSwapSlot = null;
    this.controller.addLog("Ending Prep Phase. Purging hand...");
    this.controller.updateState({ phaseStep: 'Purging hand...' });

    const isSlow = this.controller.state.slowMode;
    this.controller.playerHand.forEach((card, i) => {
      this.controller.playerLimbo.push(card);
      const duration = isSlow ? 0.6 : 0;
      const delay = isSlow ? i * 0.05 : 0;
      gsap.to(card.mesh.position, {
        x: 15,
        y: 0.2 + (this.controller.playerLimbo.length * 0.05),
        z: 6,
        duration: duration,
        delay: delay,
        onComplete: () => {
          card.mesh.rotation.set(0, 0, 0);
          card.updateVisualMarkers();
        }
      });
    });
    (this.controller as any).playerHand = [];
    
    const finishDelay = isSlow ? 800 : 50;
    setTimeout(() => void this.finishEndPrepAndStartResolution(), finishDelay);
  }

  private async finishEndPrepAndStartResolution() {
    this.controller.appendEnemyPrepCardsToLimbo();
    await this.delay(400);
    await this.controller.abilityManager.runEnemyPrepAutomation();
    await this.startResolution();
  }

  public async startResolution() {
    this.controller.cardsThatBattledThisRound = [];
    this.controller.abilityManager.syncBoardPresencePowerMarkers();
    this.controller.updateState({ currentPhase: Phase.RESOLUTION });
    this.controller.addLog("--- Resolution Phase Started ---");
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      if (this.controller.state.currentPhase === Phase.GAME_OVER) break;
      await this.resolveSeal(i);
    }

    // End-of-round cleanup effects (e.g., Wild Wolf, Delta)
    await this.cleanupEndOfRoundEffects();
    
    if (this.controller.state.currentPhase !== Phase.GAME_OVER) {
      // Reset camera
      this.controller.sealCameraZoomedIn = false;
      const camDuration = this.controller.state.slowMode ? 1.5 : 0;
      gsap.to(this.controller.sceneManager.camera.position, { x: 0, y: 28, z: 32, duration: camDuration, ease: "power2.inOut" });
      gsap.to(this.controller.sceneManager.cameraTarget, { x: 0, y: 0, z: -2, duration: camDuration, ease: "power2.inOut" });
      if (this.controller.state.slowMode) {
        await this.delay(1600);
      }

      if (this.controller.state.currentRound >= 3) {
        const pAlign = this.controller.state.playerAlignment;
        const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
        const pCount = this.controller.seals.filter(s => s.alignment === pAlign).length;
        const eCount = this.controller.seals.filter(s => s.alignment === eAlign).length;
        
        if (pCount === eCount && this.controller.state.currentRound === 3) {
          const pChamps = this.controller.seals.filter(s => s.alignment === pAlign && s.champion !== null).length;
          const eChamps = this.controller.seals.filter(s => s.alignment === eAlign && s.champion !== null).length;
          
          this.controller.addLog(`Round 3 ended in a ${pCount}-${eCount} tie.`);
          this.controller.addLog(`Tie-breaker: Seals controlled by Champions (Player: ${pChamps}, Enemy: ${eChamps})`);
          
          if (pChamps > eChamps) {
            this.finalizeGame("Champion Tie-breaker");
          } else if (eChamps > pChamps) {
            this.finalizeGame("Champion Tie-breaker");
          } else {
            this.controller.addLog("Champions count is also tied! Entering Round 4 Sudden Death...");
            this.controller.state.currentRound++;
            this.controller.isProcessing = false;
            this.startPrepPhase();
          }
        } else {
          this.finalizeGame();
        }
      } else {
        this.controller.state.currentRound++;
        this.controller.isProcessing = false;
        this.startPrepPhase();
      }
    }
  }

  public async resolveSeal(idx: number) {
    this.controller.currentResolvingSealIndex = idx;
    const seal = this.controller.seals[idx];
    this.controller.updateState({ phaseStep: `Resolving Seal ${idx + 1}` });
    this.controller.addLog(`Resolving Seal ${idx + 1}...`);
    
    if (this.controller.state.slowMode) {
      this.controller.zoomIn(idx);
    }

    let pCard = this.controller.playerBattlefield[idx];
    let eCard = this.controller.enemyBattlefield[idx];
    const rightCard = eCard || seal.champion;
    const hasCards = !!pCard || !!rightCard;

    const pWasFaceDown = !!pCard && !pCard.data.faceUp;
    const eWasFaceDown = !!eCard && !eCard.data.faceUp;

    if (hasCards) {
      this.refreshInterstitialCards(`Resolving Seal ${idx + 1}...`, 'idle');
      await this.delay(1200);
    } else {
      await this.delay(1000);
    }

    // Step 0: Haste Check
    const pHaste = pCard && pCard.data.hasHaste;
    const eHaste = eCard && eCard.data.hasHaste;

    if ((pHaste || eHaste) && !pCard?.data.cannotBattleOrBeBattled && !eCard?.data.cannotBattleOrBeBattled) {
      this.controller.updateState({ phaseStep: "Step 0: Haste Strike" });
      
      if (hasCards) {
        const hasteActive = pHaste && eHaste ? 'both' : (pHaste ? 'left' : 'right');
        this.refreshInterstitialCards(
          `Haste Strike! ${pHaste ? pCard.data.name : ''}${pHaste && eHaste ? ' and ' : ''}${eHaste ? eCard.data.name : ''} strike immediately.`,
          'haste',
          { hasteActive }
        );
        await this.delay(1800);
      }

      const revealForCombat = async (...cards: (CardEntity | null | undefined)[]) => {
        const toReveal = cards.filter((c): c is CardEntity => !!c && !c.data.faceUp);
        if (toReveal.length === 0) return;
        toReveal.forEach((c) => {
          gsap.to(c.mesh.rotation, { x: 0, duration: 0.35 });
          c.data.faceUp = true;
          c.updateVisualMarkers();
        });
        await this.delay(420);
      };

      if (pCard && seal.champion && seal.champion.data.isEnemy) {
        await revealForCombat(pCard, seal.champion);
        await this.controller.handleBattle(pCard, seal.champion, idx, true);
      } else if (eCard && seal.champion && !seal.champion.data.isEnemy) {
        await revealForCombat(eCard, seal.champion);
        await this.controller.handleBattle(eCard, seal.champion, idx, true);
      } else if (pCard && eCard) {
        await revealForCombat(pCard, eCard);
        await this.controller.handleBattle(pCard, eCard, idx, false);
      }
      pCard = this.controller.playerBattlefield[idx];
      eCard = this.controller.enemyBattlefield[idx];

      if (hasCards) {
        this.refreshInterstitialCards("Haste Strike completed.", 'haste', { hasteActive: 'none' });
        await this.delay(1000);
      }
    }

    // Step A: The Flip
    this.controller.updateState({ phaseStep: "Step A: The Flip" });
    const pNeedsFlipAnim = pCard && !pCard.data.faceUp;
    const eNeedsFlipAnim = eCard && !eCard.data.faceUp;
    
    if (pNeedsFlipAnim || eNeedsFlipAnim) {
      if (hasCards) {
        this.refreshInterstitialCards(
          `Revealing face-down cards: ${pNeedsFlipAnim ? pCard.data.name : ''}${pNeedsFlipAnim && eNeedsFlipAnim ? ' and ' : ''}${eNeedsFlipAnim ? eCard.data.name : ''}.`,
          'flip',
          {
            leftGlow: !!pNeedsFlipAnim,
            rightGlow: !!eNeedsFlipAnim
          }
        );
      }
      if (pNeedsFlipAnim) gsap.to(pCard.mesh.rotation, { x: 0, duration: 0.5 });
      if (eNeedsFlipAnim) gsap.to(eCard.mesh.rotation, { x: 0, duration: 0.5 });
      await this.delay(1200);
    }

    if (pCard) {
      pCard.data.faceUp = true;
      pCard.updateVisualMarkers();
    }
    if (eCard) {
      eCard.data.faceUp = true;
      eCard.updateVisualMarkers();
    }

    if (hasCards && (pNeedsFlipAnim || eNeedsFlipAnim)) {
      this.refreshInterstitialCards("Cards are revealed!", 'flip', { leftGlow: false, rightGlow: false });
      await this.delay(1000);
    }

    // Tie Rule Check
    if (pCard && eCard) {
      const pEff = pCard.data.power + pCard.data.powerMarkers - pCard.data.weaknessMarkers;
      const eEff = eCard.data.power + eCard.data.powerMarkers - eCard.data.weaknessMarkers;
      if (pEff === eEff) {
        this.controller.addLog(`Tie Rule: ${pCard.data.name} and ${eCard.data.name} have equal effective Power (${pEff}). Both are destroyed immediately!`);
        
        if (hasCards) {
          this.refreshInterstitialCards(
            `Tie Rule: Equal effective Power (${pEff}). Both are destroyed!`,
            'combat',
            { leftDamageFlash: true, rightDamageFlash: true }
          );
          await this.delay(1500);
        }

        const killer = { cardName: 'Tie Rule', cause: 'ability' as const };
        this.controller.destroyCard(pCard, false, idx, false, killer);
        this.controller.destroyCard(eCard, true, idx, false, killer);
        this.controller.playerBattlefield[idx] = null;
        this.controller.enemyBattlefield[idx] = null;
        await this.controller.claimSeal(idx, Alignment.NEUTRAL);
        
        if (hasCards) {
          this.refreshInterstitialCards("Tie Rule resolved.", 'done', { leftDamageFlash: false, rightDamageFlash: false });
          await this.delay(1000);
          this.clearInterstitial();
        } else {
          await this.delay(1000);
        }
        return;
      }
    }

    // Step B: Flip & Activate Abilities
    this.controller.updateState({ phaseStep: "Step B: Abilities" });
    this.controller.addLog("Processing Abilities...");
    let pEff = pCard ? pCard.data.power + pCard.data.powerMarkers - pCard.data.weaknessMarkers : -999;
    let eEff = eCard ? eCard.data.power + eCard.data.powerMarkers - eCard.data.weaknessMarkers : -999;
    
    let executionOrder: ('player' | 'enemy' | 'champion')[] = [];
    
    const pHasNullifyFlip = pCard && pWasFaceDown && pCard.data.hasNullify && !pCard.data.isSuppressed;
    const eHasNullifyFlip = eCard && eWasFaceDown && eCard.data.hasNullify && !eCard.data.isSuppressed;

    if (pHasNullifyFlip && !eHasNullifyFlip) {
      executionOrder = ['player', 'enemy'];
    } else if (eHasNullifyFlip && !pHasNullifyFlip) {
      executionOrder = ['enemy', 'player'];
    } else if (pEff > eEff) {
      executionOrder = ['player', 'enemy'];
    } else if (eEff > pEff) {
      executionOrder = ['enemy', 'player'];
    } else {
      executionOrder = preferEnemyFirstWhenFlipPowerTied(pCard, eCard, pWasFaceDown, eWasFaceDown)
        ? ['enemy', 'player']
        : ['player', 'enemy'];
    }

    if (seal.champion) executionOrder.push('champion');

    for (const side of executionOrder) {
      let current: CardEntity | null = null;
      let opponent: CardEntity | null = null;
      let isFlipping = false;

      let opponentFlipping = false;

      if (side === 'player') {
        current = pCard;
        opponent = eCard;
        isFlipping = pWasFaceDown;
        opponentFlipping = eWasFaceDown;
      } else if (side === 'enemy') {
        current = eCard;
        opponent = pCard;
        isFlipping = eWasFaceDown;
        opponentFlipping = pWasFaceDown;
      } else {
        current = seal.champion;
        opponent = current?.data.isEnemy ? pCard : eCard;
        isFlipping = false;
        opponentFlipping = current?.data.isEnemy ? pWasFaceDown : eWasFaceDown;
      }

      if (!current || current.data.isSuppressed) continue;
      
      const isActivate = current.data.hasActivate;
      if (!isFlipping && !isActivate) continue;

      if (hasCards) {
        const isLeft = !current.data.isEnemy;
        this.refreshInterstitialCards(
          `${current.data.name} triggers ability: "${current.data.ability}"`,
          'ability',
          {
            leftGlow: isLeft,
            rightGlow: !isLeft
          }
        );
        await this.delay(2200);
      }

      // Fallen One Nullify Check
      const nullified = await this.controller.abilityManager.checkNullify(current);
      if (nullified) continue;

      // Nullify
      if (current.data.hasNullify) {
        if (opponent && opponentFlipping && !this.controller.abilityManager.isImmuneToAbilities(opponent, current)) {
          opponent.data.faceUp = true;
          opponent.data.isSuppressed = true;
          opponent.updateVisualMarkers();
          this.controller.addLog(`${current.data.name} reveals and nullifies ${opponent.data.name}`);
          gsap.to(opponent.mesh.rotation, { x: 0, duration: 0.5 });
        } else if (opponent && !opponentFlipping) {
          this.controller.addLog(`${current.data.name}'s nullify fails: ${opponent.data.name} is already revealed.`);
        } else if (opponent) {
          this.controller.addLog(`${opponent.data.name} is immune to ${current.data.name}'s nullify`);
        }
      }
      
      // Invulnerability
      if (current.data.ability.toLowerCase().includes("invulnerability") || current.data.name === "Anakim The Wise" || current.data.name === "Mammon" || current.data.name === "Ulfric Thorne") {
        current.data.isInvincible = true;
        this.controller.addLog(`${current.data.name} gains battle invulnerability this turn`);
      }

      // Bogva: Flip — -1 Weakness on each enemy creature (no allocation)
      if (current.data.name === "Bogva") {
        const enemyCreatures = (!current.data.isEnemy
          ? [...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion).filter(c => c !== null && c!.data.isEnemy)]
          : [...this.controller.playerBattlefield, ...this.controller.seals.map(s => s.champion).filter(c => c !== null && !c!.data.isEnemy)]
        ).filter(c => c !== null) as CardEntity[];
        enemyCreatures.forEach(c => {
          if (!this.controller.abilityManager.isImmuneToAbilities(c, current)) {
            c.data.weaknessMarkers += 1;
            c.updateVisualMarkers();
          }
        });
        this.controller.addLog(`${current.data.name} places a -1 Weakness Marker on each enemy creature.`);
      }

      // Anakim The Wise Activate
      if (isActivate && current.data.name === "Anakim The Wise") {
        current.data.isActivatingAbility = true;
        await (this.controller.abilityManager as any).handleActivateAbility(current, current.data.isEnemy);
        current.data.isActivatingAbility = false;
      }
      // Activate abilities
      if (isActivate && (current.data.name === "Calmadious" || current.data.name === "Bella" || current.data.name === "Metatron" || current.data.name === "Coal" || current.data.name === "Dawn" || current.data.name === "Lord Alaric" || current.data.name === "Mammon" || current.data.name === "Skarados" || current.data.name === "Karlyah" || current.data.name === "Nix" || current.data.name === "Ulfric Thorne" || current.data.name === "Varg Fur-back")) {
        current.data.isActivatingAbility = true;
        await (this.controller.abilityManager as any).handleActivateAbility(current, current.data.isEnemy);
        current.data.isActivatingAbility = false;
      }

      // The Spinner / Omega / Hades: board-count Power Markers are applied via AbilityManager.syncBoardPresencePowerMarkers
      // after Step B (see below) so Activate passes do not re-stack markers on champions with hasActivate.

      // Cassiel Haggis (formerly Herald)
      if (current.data.name === "Cassiel Haggis") {
        const deck = !current.data.isEnemy ? this.controller.playerDeck : this.controller.enemyDeck;
        if (deck.length > 0) {
          const topCard = deck[deck.length - 1];
          const markers = topCard.power;
          current.data.powerMarkers += markers;
          current.updateVisualMarkers();
          this.controller.addLog(`${current.data.name} gains ${markers} Power Markers from top of deck (${topCard.name})`);
        } else {
          this.controller.addLog(`${current.data.name} finds no cards in deck to gain markers from`);
        }
      }

      // Oriel The bold (formerly Thrones)
      if (current.data.name === "Oriel The bold") {
        const pAlign = this.controller.state.playerAlignment;
        const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
        const targetAlign = !current.data.isEnemy ? pAlign : eAlign;

        if (current.data.isEnemy) {
          const validSeals = this.controller.seals.filter(s => !s.champion);
          if (validSeals.length > 0) {
            const preferred = validSeals.find(s => s.alignment !== targetAlign) || validSeals[0];
            this.controller.addLog(`${current.data.name} changes the influence of Seal ${preferred.index + 1}`);
            await this.controller.claimSeal(preferred.index, targetAlign, {
              type: 'ability',
              cardName: current.data.name
            });
          } else {
            this.controller.addLog(`${current.data.name} finds no valid Seals to affect`);
          }
        } else {
          const hasValid = this.controller.seals.some(s => !s.champion);
          if (hasValid) {
            this.controller.updateState({ 
              currentPhase: Phase.SEAL_TARGETING,
              instructionText: "Oriel The bold: Select a Seal without a Champion to change its Influence."
            });
            this.controller.zoomOut();
            const targetIdx = await new Promise<number>((resolve) => {
              (this.controller as any).sealSelectionCallback = resolve;
            });
            if (targetIdx >= 0) {
              const seal = this.controller.seals[targetIdx];
              if (!seal.champion) {
                this.controller.addLog(`${current.data.name} changes the influence of Seal ${targetIdx + 1}`);
                await this.controller.claimSeal(targetIdx, targetAlign, {
                  type: 'ability',
                  cardName: current.data.name
                });
              } else {
                this.controller.addLog(`Oriel The bold cannot change a Seal that already has a Champion.`);
              }
            }
          } else {
            this.controller.addLog(`${current.data.name} finds no valid Seals to affect`);
          }
        }
      }

      // Beta: Flip invulnerability + Action: +2 Power Marker on any adjacent creature (each adjacent). Only flipped cards are affected.
      // Varg Fur-back (formerly Delta) Activate: mark that Varg Fur-back can sacrifice at end of round
      if (isActivate && current.data.name === "Varg Fur-back") {
        current.data.isActivatingAbility = true;
        current.data.pendingDeltaSacrifice = true;
        this.controller.addLog(`${current.data.name} readies its end-of-round sacrifice.`);
        current.data.isActivatingAbility = false;
      }

      // Desire (formerly Lust)
      if (current.data.name === "Desire") {
        if (opponent && !this.controller.abilityManager.isImmuneToAbilities(opponent, current)) {
          this.controller.addLog(`${current.data.name} forces mutual sacrifice with ${opponent.data.name}`);
          this.controller.destroyCard(current, current.data.isEnemy, idx, false, { cardName: 'Desire', cause: 'ability' });
          this.controller.destroyCard(opponent, !current.data.isEnemy, idx, false, { cardName: 'Desire', cause: 'ability' });
          // Effect: After sacrifice, if the Seal has no Champion, you may change the Influence of the seal
          const seal = this.controller.seals[idx];
          if (current.data.hasLustSealEffect && !seal.champion) {
            if (current.data.isEnemy) {
              const validSeals = this.controller.seals.filter(s => s.index === idx && !s.champion);
              if (validSeals.length > 0) {
                const pAlign = this.controller.state.playerAlignment;
                const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
                const npcAlign = current.data.isEnemy ? eAlign : pAlign;
                this.controller.addLog(`Desire's effect: Seal ${idx + 1} influence changed to ${npcAlign === Alignment.LIGHT ? 'Light' : 'Dark'}.`);
                await this.controller.claimSeal(idx, npcAlign, {
                  type: 'ability',
                  cardName: current.data.name
                });
              }
            } else {
              const hasValid = this.controller.seals[idx] && !this.controller.seals[idx].champion;
              if (hasValid) {
                this.controller.updateState({
                  currentPhase: Phase.RESOLUTION,
                  instructionText: "Desire: Seal has no Champion. Choose new Influence for the Seal (Light or Dark).",
                  decisionContext: 'LUST_SEAL_INFLUENCE',
                  sealIndexForChoice: idx
                });
                this.controller.zoomOut();
                const chosenAlign = await new Promise<Alignment>((resolve) => {
                  (this.controller as any).alignmentChoiceCallback = resolve;
                });
                this.controller.updateState({ decisionContext: undefined, sealIndexForChoice: undefined });
                this.controller.addLog(`Desire's effect: Seal ${idx + 1} influence changed.`);
                await this.controller.claimSeal(idx, chosenAlign, {
                  type: 'ability',
                  cardName: current.data.name
                });
              }
            }
          }
        } else if (opponent) {
          this.controller.addLog(`${opponent.data.name} is immune to ${current.data.name}'s sacrifice`);
        }
      }

      // Duke: Flip = place any creature in play on top of that player's deck (handled via hasTargetedAbility)

      // Death: Flip = Choose a creature type, destroy all cards of that type in play. Only flipped cards count or are destroyed.
      // Target types: Avatar, Horseman, God, or creature factions (Vampyre, Lycan, Celestial, Daemon) — not generic "Creature".
      if (current.data.name === "Death" && isFlipping) {
        const allInPlay = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)].filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
        const deathTargetType = (c: CardEntity): string =>
          c.data.type === 'Creature' ? c.data.faction : c.data.type;
        const typesInPlay = [...new Set(allInPlay.map(deathTargetType))];
        if (typesInPlay.length === 0) {
          this.controller.addLog(`${current.data.name} finds no creatures in play to destroy.`);
        } else {
          const chosenType = current.data.isEnemy
            ? pickDeathCreatureType({
                typesInPlay,
                allInPlay,
                sourceIsEnemy: current.data.isEnemy,
              })
            : await new Promise<string>((resolve) => {
                this.controller.updateState({
                  currentPhase: Phase.ABILITY_TARGETING,
                  decisionContext: 'DEATH_CREATURE_TYPE',
                  creatureTypeOptions: typesInPlay,
                  instructionText: `Death: Choose a creature type to destroy all of that type in play.`,
                  decisionMessage: `Types in play: ${typesInPlay.join(', ')}`
                });
                this.controller.zoomOut();
                (this.controller as any).creatureTypeCallback = resolve;
              });
          this.controller.updateState({ decisionContext: undefined, creatureTypeOptions: undefined });
          (this.controller as any).creatureTypeCallback = null;
          if (!chosenType) {
            this.controller.addLog(`${current.data.name} did not choose a creature type.`);
          } else {
            const isCreatureFaction = ['Vampyre', 'Lycan', 'Celestial', 'Daemon'].includes(chosenType);
            const toDestroy = allInPlay.filter(c =>
              isCreatureFaction ? (c.data.type === 'Creature' && c.data.faction === chosenType) : c.data.type === chosenType
            );
            const killer = { cardName: current.data.name, cause: 'ability' as const };
            for (const card of toDestroy) {
              const idxP = this.controller.playerBattlefield.indexOf(card);
              const idxE = this.controller.enemyBattlefield.indexOf(card);
              const seal = this.controller.seals.find(s => s.champion === card);
              if (seal) {
                this.controller.destroyCard(card, card.data.isEnemy, seal.index, true, killer);
                seal.champion = null;
              } else if (idxP !== -1) this.controller.destroyCard(card, false, idxP, false, killer);
              else if (idxE !== -1) this.controller.destroyCard(card, true, idxE, false, killer);
            }
            this.controller.addLog(`${current.data.name} destroys all ${chosenType}(s) in play (${toDestroy.length} card(s)).`);
          }
        }
      }

      // Pazoo: +2 Power per Graveborn. Secondary: Limbo → deck.
      if (current.data.name === "Pazoo" && isFlipping) {
        const gravebornCount = this.controller.abilityManager.countGravebornInPlay(current.data.isEnemy);
        const gain = 2 * gravebornCount;
        this.controller.addLog(`${current.data.name} gains +2 Power per Graveborn (${gravebornCount} in play) = ${gain} Power Marker(s) (updated with board state).`);
        // Secondary: Place any card from Limbo you control on top of your deck
        const limbo = current.data.isEnemy ? this.controller.enemyLimbo : this.controller.playerLimbo;
        if (limbo.length > 0) {
          if (current.data.isEnemy) {
            const pick = pickPazooLimboCard(limbo);
            if (pick) {
              const idx = limbo.indexOf(pick);
              limbo.splice(idx, 1);
              const deck = current.data.isEnemy ? this.controller.enemyDeck : this.controller.playerDeck;
              const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = pick.data;
              deck.push({ ...baseData });
              this.controller.disposeCard(pick);
              this.controller.addLog(`${current.data.name} places ${pick.data.name} from Limbo on top of deck.`);
            }
          } else {
            this.controller.updateState({
              currentPhase: Phase.ABILITY_TARGETING,
              instructionText: "Pazoo (Secondary): Choose a card from your Limbo to place on top of your deck.",
              isSelectingLimboTarget: true
            });
            this.controller.zoomOut();
            await new Promise<void>((resolve) => {
              (this.controller as any).resolutionCallback = resolve;
              (this.controller as any).pendingAbilityData = { source: current, effect: 'pazoo_limbo_to_deck' };
            });
          }
          this.controller.abilityManager.syncBoardPresencePowerMarkers();
        }
      }

      // Lycandor: Flip = Place -2 Weakness on all Enemy creatures for each Graveborn you have in play. Only flipped cards are affected.
      if (current.data.name === "Lycandor" && isFlipping) {
        const gravebornCount = this.controller.abilityManager.countGravebornForLycandorFlip(current.data.isEnemy, current);
        const amount = 2 * gravebornCount;
        const enemyCreatures = (!current.data.isEnemy
          ? [...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion).filter(c => c !== null && c!.data.isEnemy)]
          : [...this.controller.playerBattlefield, ...this.controller.seals.map(s => s.champion).filter(c => c !== null && !c!.data.isEnemy)]
        ).filter(c => c !== null && (c as CardEntity).data.faceUp) as CardEntity[];
        enemyCreatures.forEach(c => {
          if (!this.controller.abilityManager.isImmuneToAbilities(c, current)) {
            c.data.weaknessMarkers += amount;
            c.updateVisualMarkers();
          }
        });
        this.controller.addLog(`${current.data.name} places -2 Weakness per Graveborn (${gravebornCount}) on each enemy creature (${amount} total per creature).`);
      }

      if (current.data.needsAllocation && isFlipping) {
        await this.controller.allocateCounters(current, current.data.isEnemy);
        this.controller.abilityManager.syncBoardPresencePowerMarkers();
      }
      if (current.data.hasTargetedAbility && (isFlipping || !current.data.hasActivate)) {
        await this.controller.handleTargetedAbility(current, current.data.isEnemy);
      }
      // Bogva Action: after Flip (place weakness), destroy a creature with Weakness Markers
      if (current.data.name === "Bogva") {
        await (this.controller.abilityManager as any).handleBogvaDestroyAction(current, current.data.isEnemy);
      }
      if (current.data.hasGlobalAbility) {
        await this.controller.executeGlobalAbility(current);
      }
      if (current.data.hasSealTargetAbility && isFlipping) {
        await this.controller.handleSealTargetAbility(current, current.data.isEnemy);
      }
      // Re-evaluate board state for next ability step iteration
      pCard = this.controller.playerBattlefield[idx];
      eCard = this.controller.enemyBattlefield[idx];

      if (hasCards) {
        this.refreshInterstitialCards("Ability resolved.", 'ability', { leftGlow: false, rightGlow: false });
        await this.delay(1000);
      }
    }

    // After all flip/activate abilities (including global marker changes), enforce that
    // any creature whose effective Power Value has been reduced to 0 or less is destroyed,
    // even if it has temporary combat invincibility. This applies across the whole board.
    this.controller.abilityManager.enforceZeroPowerDestruction();

    if (pCard) pCard.data.faceUp = true;
    if (eCard) eCard.data.faceUp = true;
    this.controller.abilityManager.syncBoardPresencePowerMarkers();

    // Step C: Combat
    this.controller.updateState({ phaseStep: "Step C: Combat" });
    let pStymied = false;
    let eStymied = false;

    // Fledgeling: Cannot battle or be battled — skip combat at this seal
    if (pCard?.data.cannotBattleOrBeBattled || eCard?.data.cannotBattleOrBeBattled) {
      this.controller.addLog(`${pCard?.data.cannotBattleOrBeBattled ? pCard?.data.name : eCard?.data.name} cannot battle or be battled.`);
      if (hasCards) {
        this.refreshInterstitialCards(
          `${pCard?.data.cannotBattleOrBeBattled ? pCard?.data.name : eCard?.data.name} cannot battle or be battled. Skipping combat.`,
          'combat'
        );
        await this.delay(1500);
      }
      pStymied = true;
      eStymied = true;
    } else if (pCard && seal.champion && seal.champion.data.isEnemy) {
      this.controller.addLog(`Player ${pCard.data.name} battles Enemy Champion ${seal.champion.data.name}`);
      pStymied = await this.controller.handleBattle(pCard, seal.champion, idx, true);
      pCard = this.controller.playerBattlefield[idx];
    }
    if (eCard && seal.champion && !seal.champion.data.isEnemy) {
      this.controller.addLog(`Enemy ${eCard.data.name} battles Player Champion ${seal.champion.data.name}`);
      eStymied = await this.controller.handleBattle(eCard, seal.champion, idx, true);
      eCard = this.controller.enemyBattlefield[idx];
    }

    const pBlocked = seal.champion && seal.champion.data.isEnemy;
    const eBlocked = seal.champion && !seal.champion.data.isEnemy;

    if (pCard && eCard && !pBlocked && !eBlocked) {
      this.controller.addLog(`Battle: ${pCard.data.name} vs ${eCard.data.name}`);
      const battleStymied = await this.controller.handleBattle(pCard, eCard, idx, false);
      if (battleStymied) {
        pStymied = true;
        eStymied = true;
      }
    }

    // Step D: Siege
    this.controller.updateState({ phaseStep: "Step D: Siege" });
    pCard = this.controller.playerBattlefield[idx];
    eCard = this.controller.enemyBattlefield[idx];

    if (pStymied || eStymied) {
      this.controller.addLog(`Seal ${idx + 1} remains Neutral due to Stymied combat.`);
      await this.controller.claimSeal(idx, Alignment.NEUTRAL);
      if (hasCards) {
        this.refreshInterstitialCards(`Seal ${idx + 1} remains Neutral due to Stymied combat.`, 'done');
        await this.delay(1500);
      }
    } else {
      if (pCard && !pBlocked) {
        const targetAlign = this.controller.state.playerAlignment;
        if (hasCards) {
          this.refreshInterstitialCards(`Siege: Player influences Seal ${idx + 1} towards ${targetAlign}`, 'done');
          await this.delay(1500);
        }
        await this.controller.handleSiege(idx, pCard, true);
      } else if (eCard && !eBlocked) {
        const pAlign = this.controller.state.playerAlignment;
        const targetAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
        if (hasCards) {
          this.refreshInterstitialCards(`Siege: Enemy influences Seal ${idx + 1} towards ${targetAlign}`, 'done');
          await this.delay(1500);
        }
        await this.controller.handleSiege(idx, eCard, false);
      }
    }

    // Step E: Ascension
    this.controller.updateState({ phaseStep: "Step E: Ascension" });
    const survivor = this.controller.playerBattlefield[idx] || this.controller.enemyBattlefield[idx];
    if (survivor && survivor.data.isChampion && !seal.champion) {
      // Coal block ascension check
      const opponentIsEnemy = !survivor.data.isEnemy;
      const opponentLimbo = opponentIsEnemy ? this.controller.enemyLimbo : this.controller.playerLimbo;
      const coal = opponentLimbo.find(c => c.data.name === "Coal");
      let blocked = false;

      if (coal) {
        if (opponentIsEnemy) {
          this.controller.addLog(`Enemy uses Coal from Limbo to block ${survivor.data.name}'s ascension!`);
          this.controller.abilityManager.moveToGraveyard(coal);
          blocked = true;
        } else {
          this.controller.updateState({
            instructionText: `Use Coal from Limbo to block ${survivor.data.name}'s ascension?`,
            currentPhase: Phase.ABILITY_TARGETING,
            decisionContext: 'COAL_BLOCK_ASCENSION',
            decisionMessage: `Opponent's ${survivor.data.name} is about to ascend to Seal ${idx + 1}. Use Coal from your Limbo to block it? (Coal is moved to your Graveyard.)`
          });
          
          this.controller.zoomOut();
          
          const confirmed = await new Promise<boolean>((resolve) => {
            (this.controller as any).nullifyCallback = resolve;
          });
          
          this.controller.updateState({ decisionContext: undefined, decisionMessage: undefined });
          
          if (confirmed) {
            this.controller.addLog(`Player uses Coal from Limbo to block ${survivor.data.name}'s ascension!`);
            this.controller.abilityManager.moveToGraveyard(coal);
            blocked = true;
          }
          if (this.controller.currentResolvingSealIndex !== -1) {
            this.controller.zoomIn(this.controller.currentResolvingSealIndex);
          }
        }
      }

      if (blocked) {
        this.controller.addLog(`${survivor.data.name}'s ascension was blocked by Coal.`);
        if (hasCards) {
          this.refreshInterstitialCards(`Ascension blocked by Coal.`, 'done');
          await this.delay(1500);
        }
      } else {
        if (hasCards) {
          this.refreshInterstitialCards(`${survivor.data.name} ascends to Seal ${idx + 1}!`, 'done');
          await this.delay(1800);
        }
        this.ascendToSeal(survivor, idx);
      }
    }

    if (hasCards) {
      this.clearInterstitial();
      await this.delay(600);
    } else {
      await this.delay(600);
    }
  }

  public async handleBattle(attacker: CardEntity, defender: CardEntity, idx: number, isAgainstChamp: boolean): Promise<boolean> {
    this.controller.cardsThatBattledThisRound.push(attacker);
    this.controller.cardsThatBattledThisRound.push(defender);
    const aPow = attacker.data.power + attacker.data.powerMarkers - attacker.data.weaknessMarkers;
    const dPow = defender.data.power + defender.data.powerMarkers - defender.data.weaknessMarkers;

    const isAProtected = this.controller.abilityManager.isProtected(attacker);
    const isDProtected = this.controller.abilityManager.isProtected(defender);
    let stymied = false;

    // Valerius Nightshade: Any creature battling Valerius has its Flip ability nullified.
    if (attacker.data.name === "Valerius Nightshade" && !defender.data.isSuppressed && !this.controller.abilityManager.isImmuneToAbilities(defender, attacker)) {
      defender.data.isSuppressed = true;
      this.controller.addLog(`Valerius Nightshade nullifies the Flip ability of ${defender.data.name}.`);
    }
    if (defender.data.name === "Valerius Nightshade" && !attacker.data.isSuppressed && !this.controller.abilityManager.isImmuneToAbilities(attacker, defender)) {
      attacker.data.isSuppressed = true;
      this.controller.addLog(`Valerius Nightshade nullifies the Flip ability of ${attacker.data.name}.`);
    }

    const elderAttacker = attacker.data.name === "Sulvian Vane";
    const elderDefender = defender.data.name === "Sulvian Vane";
    const sendToDeckInstead = (loser: CardEntity) => {
      this.controller.abilityManager.returnCreatureToOwnerDeck(loser);
    };

    const isAttackerLeft = !attacker.data.isEnemy;
    this.refreshInterstitialCards(
      `Battle: ${attacker.data.name} (Power: ${aPow}) attacks ${defender.data.name} (Power: ${dPow})!`,
      'combat',
      {
        leftGlow: isAttackerLeft,
        rightGlow: !isAttackerLeft
      }
    );
    await this.delay(1500);

    const playCombatSmashWinnerLoser = async (winner: CardEntity, loser: CardEntity): Promise<void> => {
      const w0 = { x: winner.mesh.position.x, y: winner.mesh.position.y, z: winner.mesh.position.z };
      const l0 = { x: loser.mesh.position.x, y: loser.mesh.position.y, z: loser.mesh.position.z };
      const elevate = 0.85;
      const halfDepth = GAME_CONSTANTS.CARD_H / 2;
      const midZ = (w0.z + l0.z) / 2;
      // Stop at edges so cards don't clip; high-z card moves to mid+half, low-z to mid-half
      const impactZWinner = w0.z > l0.z ? midZ + halfDepth : midZ - halfDepth;
      const impactZLoser = l0.z > w0.z ? midZ + halfDepth : midZ - halfDepth;
      const rockBack = 0.28; // recoil distance after impact
      const rockZWinner = w0.z > l0.z ? impactZWinner + rockBack : impactZWinner - rockBack;
      const rockZLoser = l0.z > w0.z ? impactZLoser - rockBack : impactZLoser + rockBack;

      const dx = l0.x - w0.x;
      const dz = l0.z - w0.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      const dirX = dx / dist;
      const dirZ = dz / dist;

      const throwDist = 18;
      const knockX = l0.x + dirX * throwDist;
      const knockZ = l0.z + dirZ * throwDist;
      const knockY = l0.y + 0.35;

      const wScale = (winner.mesh as any).scale;
      const lScale = (loser.mesh as any).scale;
      const lRot = (loser.mesh as any).rotation;

      // Lift both up and bring together with acceleration into impact (power2.in)
      gsap.to(winner.mesh.position, { y: w0.y + elevate, z: impactZWinner, duration: 0.2, ease: 'power2.in' });
      gsap.to(loser.mesh.position, { y: l0.y + elevate, z: impactZLoser, duration: 0.2, ease: 'power2.in' });

      // Optional "smash" scale pulse (skip in unit tests where mock cards don't have scale)
      if (wScale && lScale && typeof wScale.x === 'number' && typeof lScale.x === 'number') {
        gsap.to(wScale, { x: wScale.x * 1.15, y: wScale.y * 1.15, z: wScale.z * 1.15, duration: 0.1, ease: 'power2.out', delay: 0.18 });
        gsap.to(lScale, { x: lScale.x * 1.15, y: lScale.y * 1.15, z: lScale.z * 1.15, duration: 0.1, ease: 'power2.out', delay: 0.18 });
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // Rock back from impact
          gsap.to(winner.mesh.position, { z: rockZWinner, duration: 0.08, ease: 'power2.out' });
          gsap.to(loser.mesh.position, { z: rockZLoser, duration: 0.08, ease: 'power2.out' });
        }, 200);
        setTimeout(() => {
          // Winner drops back to original slot; loser gets knocked away
          gsap.to(winner.mesh.position, { y: w0.y, z: w0.z, duration: 0.22, ease: 'power2.inOut' });
          gsap.to(loser.mesh.position, { x: knockX, y: knockY, z: knockZ, duration: 0.34, ease: 'power3.in' });
          if (lRot && typeof lRot.y === 'number') {
            gsap.to(lRot, { y: Math.random() * 0.6, z: Math.random() * 0.2, duration: 0.34, ease: 'power3.in' });
          }

          // Total approx: 0.08 rock + 0.22 drop + 0.34 knock (triggered at ~0.28)
          setTimeout(() => resolve(), 380);
        }, 280);
      });
    };

    const playCombatSmashMutual = async (a: CardEntity, d: CardEntity): Promise<void> => {
      const a0 = { x: a.mesh.position.x, y: a.mesh.position.y, z: a.mesh.position.z };
      const d0 = { x: d.mesh.position.x, y: d.mesh.position.y, z: d.mesh.position.z };
      const elevate = 0.85;
      const halfDepth = GAME_CONSTANTS.CARD_H / 2;
      const midZ = (a0.z + d0.z) / 2;
      const impactZA = a0.z > d0.z ? midZ + halfDepth : midZ - halfDepth;
      const impactZD = d0.z > a0.z ? midZ + halfDepth : midZ - halfDepth;
      const rockBack = 0.28;
      const rockZA = a0.z > d0.z ? impactZA + rockBack : impactZA - rockBack;
      const rockZD = d0.z > a0.z ? impactZD + rockBack : impactZD - rockBack;

      const dxA = a0.x - d0.x;
      const dzA = a0.z - d0.z;
      const distA = Math.sqrt(dxA * dxA + dzA * dzA) || 1;
      const dirAX = dxA / distA;
      const dirAZ = dzA / distA;

      const dxD = d0.x - a0.x;
      const dzD = d0.z - a0.z;
      const distD = Math.sqrt(dxD * dxD + dzD * dzD) || 1;
      const dirDX = dxD / distD;
      const dirDZ = dzD / distD;

      const throwDist = 16;
      const knockAX = a0.x + dirAX * throwDist;
      const knockAZ = a0.z + dirAZ * throwDist;
      const knockAY = a0.y + 0.35;

      const knockDX = d0.x + dirDX * throwDist;
      const knockDZ = d0.z + dirDZ * throwDist;
      const knockDY = d0.y + 0.35;

      const aScale = (a.mesh as any).scale;
      const dScale = (d.mesh as any).scale;

      gsap.to(a.mesh.position, { y: a0.y + elevate, z: impactZA, duration: 0.2, ease: 'power2.in' });
      gsap.to(d.mesh.position, { y: d0.y + elevate, z: impactZD, duration: 0.2, ease: 'power2.in' });

      if (aScale && dScale && typeof aScale.x === 'number' && typeof dScale.x === 'number') {
        gsap.to(aScale, { x: aScale.x * 1.12, y: aScale.y * 1.12, z: aScale.z * 1.12, duration: 0.1, ease: 'power2.out', delay: 0.18 });
        gsap.to(dScale, { x: dScale.x * 1.12, y: dScale.y * 1.12, z: dScale.z * 1.12, duration: 0.1, ease: 'power2.out', delay: 0.18 });
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          gsap.to(a.mesh.position, { z: rockZA, duration: 0.08, ease: 'power2.out' });
          gsap.to(d.mesh.position, { z: rockZD, duration: 0.08, ease: 'power2.out' });
        }, 200);
        setTimeout(() => {
          gsap.to(a.mesh.position, { x: knockAX, y: knockAY, z: knockAZ, duration: 0.42, ease: 'power3.in' });
          gsap.to(d.mesh.position, { x: knockDX, y: knockDY, z: knockDZ, duration: 0.42, ease: 'power3.in' });
          setTimeout(() => resolve(), 440);
        }, 280);
      });
    };

    if (aPow > dPow) {
      if (!defender.data.isInvincible && !isDProtected) {
        this.controller.addLog(`Combat: ${attacker.data.name} (Power: ${aPow}) attacks and destroys ${defender.data.name} (Power: ${dPow}) at Seal ${idx + 1}.`);
        
        this.refreshInterstitialCards(
          `${attacker.data.name} defeats and destroys ${defender.data.name}!`,
          'combat',
          {
            leftGlow: false,
            rightGlow: false,
            rightDamageFlash: true
          }
        );

        this.controller.showCombatDamageFloats(attacker, defender, aPow, dPow);
        await playCombatSmashWinnerLoser(attacker, defender);
        this.controller.abilityManager.handleFinalAct(defender, attacker);
        if (elderAttacker) sendToDeckInstead(defender);
        else this.controller.destroyCard(defender, defender.data.isEnemy, idx, isAgainstChamp, { cardName: attacker.data.name, cause: 'combat' });
        await this.controller.abilityManager.handlePostCombat(attacker);

        this.refreshInterstitialCards(
          `${defender.data.name} is destroyed.`,
          'combat',
          { rightDamageFlash: false }
        );
        await this.delay(1000);
      } else {
        this.controller.addLog(`Combat: ${defender.data.name} is Protected or Invincible. ${attacker.data.name}'s attack (Power: ${aPow}) is stymied at Seal ${idx + 1}.`);
        
        this.refreshInterstitialCards(
          `${defender.data.name} is Protected or Invincible! Attack stymied.`,
          'combat',
          { leftGlow: false, rightGlow: false }
        );
        await this.delay(1200);
        stymied = true;
      }
    } else if (dPow > aPow) {
      if (!attacker.data.isInvincible && !isAProtected) {
        this.controller.addLog(`Combat: ${defender.data.name} (Power: ${dPow}) defends and destroys ${attacker.data.name} (Power: ${aPow}) at Seal ${idx + 1}.`);
        
        this.refreshInterstitialCards(
          `${defender.data.name} defends and destroys ${attacker.data.name}!`,
          'combat',
          {
            leftGlow: false,
            rightGlow: false,
            leftDamageFlash: true
          }
        );

        this.controller.showCombatDamageFloats(attacker, defender, aPow, dPow);
        await playCombatSmashWinnerLoser(defender, attacker);
        this.controller.abilityManager.handleFinalAct(attacker, defender);
        if (elderDefender) sendToDeckInstead(attacker);
        else this.controller.destroyCard(attacker, attacker.data.isEnemy, idx, false, { cardName: defender.data.name, cause: 'combat' });
        await this.controller.abilityManager.handlePostCombat(defender);

        this.refreshInterstitialCards(
          `${attacker.data.name} is destroyed.`,
          'combat',
          { leftDamageFlash: false }
        );
        await this.delay(1000);
      } else {
        this.controller.addLog(`Combat: ${attacker.data.name} is Protected or Invincible. ${defender.data.name}'s defense (Power: ${dPow}) is stymied at Seal ${idx + 1}.`);
        
        this.refreshInterstitialCards(
          `${attacker.data.name} is Protected or Invincible! Attack stymied.`,
          'combat',
          { leftGlow: false, rightGlow: false }
        );
        await this.delay(1200);
        stymied = true;
      }
    } else {
      this.controller.addLog(`Combat: Equal effective Power (${aPow} vs ${dPow}) at Seal ${idx + 1} results in mutual destruction between ${attacker.data.name} and ${defender.data.name}.`);

      const attackerWillDie = !attacker.data.isInvincible && !isAProtected;
      const defenderWillDie = !defender.data.isInvincible && !isDProtected;

      this.refreshInterstitialCards(
        `Mutual destruction between ${attacker.data.name} and ${defender.data.name}!`,
        'combat',
        {
          leftGlow: false,
          rightGlow: false,
          leftDamageFlash: attackerWillDie,
          rightDamageFlash: defenderWillDie
        }
      );

      if (attackerWillDie || defenderWillDie) {
        this.controller.showCombatDamageFloats(attacker, defender, aPow, dPow);
        if (attackerWillDie && !defenderWillDie) await playCombatSmashWinnerLoser(defender, attacker);
        else if (defenderWillDie && !attackerWillDie) await playCombatSmashWinnerLoser(attacker, defender);
        else await playCombatSmashMutual(attacker, defender);
      }

      if (!attacker.data.isInvincible && !isAProtected) {
        this.controller.abilityManager.handleFinalAct(attacker, defender);
        if (elderDefender) sendToDeckInstead(attacker);
        else this.controller.destroyCard(attacker, attacker.data.isEnemy, idx, false, { cardName: defender.data.name, cause: 'combat' });
      } else if (attacker.data.isInvincible) {
        stymied = true;
      }
      if (!defender.data.isInvincible && !isDProtected) {
        this.controller.abilityManager.handleFinalAct(defender, attacker);
        if (elderAttacker) sendToDeckInstead(defender);
        else this.controller.destroyCard(defender, defender.data.isEnemy, idx, isAgainstChamp, { cardName: attacker.data.name, cause: 'combat' });
      } else if (defender.data.isInvincible) {
        stymied = true;
      }

      this.refreshInterstitialCards(
        `Combat finished.`,
        'combat',
        { leftDamageFlash: false, rightDamageFlash: false }
      );
      await this.delay(1000);
    }

    // Fenris Lightfoot (formerly Wild Wolf): Any creature that does battle with Fenris Lightfoot is destroyed at end of the round.
    const applyWildWolfMark = (wolf: CardEntity, other: CardEntity | null) => {
      if (!other) return;
      // Only mark if the other creature is still in play after combat
      const inPlay =
        this.controller.playerBattlefield.includes(other) ||
        this.controller.enemyBattlefield.includes(other) ||
        this.controller.seals.some(s => s.champion === other);
      if (inPlay) {
        other.data.markedByWildWolf = true;
        other.updateVisualMarkers();
        this.controller.addLog(`${wolf.data.name} marks ${other.data.name} for destruction at end of round.`);
      }
    };

    if (attacker.data.name === "Fenris Lightfoot") {
      applyWildWolfMark(attacker, defender);
    } else if (defender.data.name === "Fenris Lightfoot") {
      applyWildWolfMark(defender, attacker);
    }

    await this.delay(500);
    return stymied;
  }

  private enforceDuplicateRule() {
    const sides = [false, true]; // false = player, true = enemy
    for (const isEnemy of sides) {
      const cardsInPlay: { card: CardEntity; idx: number; isChampion: boolean }[] = [];
      
      const bf = isEnemy ? this.controller.enemyBattlefield : this.controller.playerBattlefield;
      bf.forEach((c, idx) => {
        if (c !== null) {
          cardsInPlay.push({ card: c, idx, isChampion: false });
        }
      });
      
      this.controller.seals.forEach((seal, idx) => {
        const champ = seal.champion;
        if (champ && champ.data.isEnemy === isEnemy) {
          cardsInPlay.push({ card: champ, idx, isChampion: true });
        }
      });
      
      const groups: Record<string, typeof cardsInPlay> = {};
      for (const item of cardsInPlay) {
        const name = item.card.data.name;
        if (!groups[name]) groups[name] = [];
        groups[name].push(item);
      }
      
      for (const name in groups) {
        const group = groups[name];
        if (group.length > 1) {
          group.sort((a, b) => {
            const aPow = a.card.data.power + a.card.data.powerMarkers - a.card.data.weaknessMarkers;
            const bPow = b.card.data.power + b.card.data.powerMarkers - b.card.data.weaknessMarkers;
            if (aPow !== bPow) return bPow - aPow;
            if (a.isChampion !== b.isChampion) return a.isChampion ? -1 : 1;
            return 0;
          });
          
          const survivor = group[0];
          this.controller.addLog(`Duplicate Rule: player controls multiple ${name}s. Keeping ${survivor.card.data.name} (Power ${survivor.card.data.power + survivor.card.data.powerMarkers - survivor.card.data.weaknessMarkers}) and sacrificing others.`);
          
          for (let i = 1; i < group.length; i++) {
            const duplicate = group[i];
            const killedBy = { cardName: 'Duplicate Rule', cause: 'ability' as const };
            if (duplicate.isChampion) {
              this.controller.destroyCard(duplicate.card, isEnemy, duplicate.idx, true, killedBy);
              this.controller.seals[duplicate.idx].champion = null;
            } else {
              this.controller.destroyCard(duplicate.card, isEnemy, duplicate.idx, false, killedBy);
              if (isEnemy) {
                this.controller.enemyBattlefield[duplicate.idx] = null;
              } else {
                this.controller.playerBattlefield[duplicate.idx] = null;
              }
            }
          }
        }
      }
    }
  }

  private async cleanupEndOfRoundEffects() {
    // Duplicate Rule
    this.enforceDuplicateRule();

    // Fenris Lightfoot (Wild Wolf) cleanup
    const wildWolfVictims: { card: CardEntity; isEnemy: boolean; idx: number; isChampion: boolean }[] = [];
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      const pCard = this.controller.playerBattlefield[i];
      if (pCard && pCard.data.markedByWildWolf) wildWolfVictims.push({ card: pCard, isEnemy: false, idx: i, isChampion: false });
      const eCard = this.controller.enemyBattlefield[i];
      if (eCard && eCard.data.markedByWildWolf) wildWolfVictims.push({ card: eCard, isEnemy: true, idx: i, isChampion: false });
    }
    this.controller.seals.forEach((seal, idx) => {
      const champ = seal.champion;
      if (champ && champ.data.markedByWildWolf) wildWolfVictims.push({ card: champ, isEnemy: champ.data.isEnemy, idx, isChampion: true });
    });
    for (const { card, isEnemy, idx, isChampion } of wildWolfVictims) {
      this.controller.destroyCard(card, isEnemy, idx, isChampion, { cardName: 'Fenris Lightfoot', cause: 'ability' });
      card.data.markedByWildWolf = false;
    }

    // Resolve Varg Fur-back's (Delta's) end-of-round sacrifice and buff
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      const eCard = this.controller.enemyBattlefield[i];
      if (eCard && eCard.data.name === "Varg Fur-back" && eCard.data.pendingDeltaSacrifice) {
        const enemyAllies = [
          ...this.controller.enemyBattlefield,
          ...this.controller.seals.map(s => s.champion)
        ].filter(c => c !== null) as CardEntity[];

        const target = pickDeltaBuffTarget(enemyAllies, this.controller.seals);

        target.data.powerMarkers += 3;
        target.updateVisualMarkers();
        this.controller.addLog(`${target.data.name} receives +3 Power Markers from Varg Fur-back's sacrifice.`);

        eCard.data.pendingDeltaSacrifice = false;
        this.controller.destroyCard(eCard, true, i, false);
      }
    }

    // Kaelarion (Noble): End of Turn — +2 Power Marker on this creature
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      for (const card of [this.controller.playerBattlefield[i], this.controller.enemyBattlefield[i]]) {
        if (card && card.data.name === "Kaelarion") {
          card.data.powerMarkers += 2;
          card.updateVisualMarkers();
          this.controller.addLog(`${card.data.name} gains +2 Power Markers at end of turn.`);
        }
      }
    }
    this.controller.seals.forEach((seal) => {
      const champ = seal.champion;
      if (champ && champ.data.name === "Kaelarion") {
        champ.data.powerMarkers += 2;
        champ.updateVisualMarkers();
        this.controller.addLog(`${champ.data.name} gains +2 Power Markers at end of turn.`);
      }
    });

    // Player Varg Fur-back (Delta) Choice
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      const pCard = this.controller.playerBattlefield[i];
      if (pCard && pCard.data.name === "Varg Fur-back" && pCard.data.pendingDeltaSacrifice) {
        this.controller.updateState({
          decisionContext: 'DELTA_SACRIFICE',
          instructionText: "Use Varg Fur-back to sacrifice itself and grant +3 Power Markers to a creature?",
          decisionMessage: "Varg Fur-back will be sacrificed. You will then choose one creature to receive +3 Power Markers. Use this ability?"
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          (this.controller as any).nullifyCallback = resolve;
        });

        this.controller.updateState({ decisionContext: undefined, decisionMessage: undefined });

        if (confirmed) {
          this.controller.addLog(`${pCard.data.name} sacrifices itself to empower an ally.`);

          (this.controller as any).pendingDeltaSacrificeSource = pCard;
          (this.controller as any).pendingDeltaSacrificeSourceIdx = i;

          this.controller.zoomOut();
          await this.delay(1200);
          this.controller.updateState({
            currentPhase: Phase.DELTA_BUFF_TARGETING,
            instructionText: "Select a creature to receive +3 Power Markers from Varg Fur-back's sacrifice. (Varg Fur-back can be selected.)"
          });

          await new Promise<void>((resolve) => {
            (this.controller as any).resolutionCallback = resolve;
          });

          if ((this.controller as any).pendingDeltaSacrificeSource) {
            (this.controller as any).pendingDeltaSacrificeSource.data.pendingDeltaSacrifice = false;
            (this.controller as any).pendingDeltaSacrificeSource = null;
            (this.controller as any).pendingDeltaSacrificeSourceIdx = -1;
          }
        } else {
          pCard.data.pendingDeltaSacrifice = false;
        }
      }
    }

    // Cyprian (Fledgeling): Sacrifice at end of the turn
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      const pCard = this.controller.playerBattlefield[i];
      if (pCard && pCard.data.sacrificeEndOfTurn) {
        this.controller.addLog(`${pCard.data.name} is sacrificed at end of turn.`);
        this.controller.destroyCard(pCard, false, i, false);
      }
      const eCard = this.controller.enemyBattlefield[i];
      if (eCard && eCard.data.sacrificeEndOfTurn) {
        this.controller.addLog(`${eCard.data.name} is sacrificed at end of turn.`);
        this.controller.destroyCard(eCard, true, i, false);
      }
    }
  }

  public async handleSiege(idx: number, attacker: CardEntity | null, isPlayer: boolean) {
    const aPow = attacker ? attacker.data.power + attacker.data.powerMarkers - attacker.data.weaknessMarkers : 0;
    
    if (aPow > 0 || !attacker) {
      const pAlign = this.controller.state.playerAlignment;
      const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
      const targetAlign = isPlayer ? pAlign : eAlign;
      this.controller.addLog(`${isPlayer ? 'Player' : 'Enemy'} influences Seal ${idx + 1} towards ${targetAlign}`);
      await this.controller.claimSeal(idx, targetAlign, {
        type: 'combat',
        cardName: attacker!.data.name
      });
    }
  }

  public checkGameOver() {
    const pAlign = this.controller.state.playerAlignment;
    const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
    const pCount = this.controller.seals.filter(s => s.alignment === pAlign).length;
    const eCount = this.controller.seals.filter(s => s.alignment === eAlign).length;
    const bothDecksEmpty = this.controller.playerDeck.length === 0 && this.controller.enemyDeck.length === 0;

    if (pCount === 7 || eCount === 7 || bothDecksEmpty) {
      let winCondition: string;
      if (bothDecksEmpty) {
        winCondition = "Draw (both decks exhausted)";
      } else {
        winCondition = "All Seven Seals";
      }
      this.finalizeGame(winCondition);
    }
  }

  public finalizeGame(winCondition?: string, forcedResult?: 'player' | 'enemy' | 'draw') {
    const pAlign = this.controller.state.playerAlignment;
    const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
    const pCount = this.controller.seals.filter(s => s.alignment === pAlign).length;
    const eCount = this.controller.seals.filter(s => s.alignment === eAlign).length;

    let body = "";
    let result: 'player' | 'enemy' | 'draw';

    if (forcedResult) {
      result = forcedResult;
      if (result === 'player') {
        body = winCondition === "Attrition" 
          ? "Victory by Attrition: Opponent has run out of cards to draw."
          : "Victory in Sudden Death!";
        this.controller.addLog(`GAME OVER: Player Victory (${winCondition})`);
      } else if (result === 'enemy') {
        body = winCondition === "Attrition"
          ? "Loss by Attrition: You have run out of cards to draw."
          : "Loss in Sudden Death.";
        this.controller.addLog(`GAME OVER: Enemy Victory (${winCondition})`);
      } else {
        body = "Draw by Attrition: Both sides ran out of cards to draw.";
        this.controller.addLog("GAME OVER: Draw (Attrition)");
      }
    } else {
      if (pCount > eCount) {
        body = pAlign === Alignment.LIGHT 
          ? "The Seventh Seal is Purified. The cycle of Light begins anew, casting away the shadows of the void."
          : "The Void has consumed the threshold. The world yields to the eternal rhythm of the Dark.";
        this.controller.addLog("GAME OVER: Player Victory");
        result = 'player';
      } else if (eCount > pCount) {
        body = pAlign === Alignment.LIGHT
          ? "The Light has flickered out. The opponent's corruption has claimed the world's essence."
          : "The Light has unexpectedly pierced the veil. Your dominion of shadow has been repelled.";
        this.controller.addLog("GAME OVER: Enemy Victory");
        result = 'enemy';
      } else {
        body = "The scales remain perfectly balanced. Neither Light nor Shadow can claim the throne of existence.";
        this.controller.addLog("GAME OVER: Draw");
        result = 'draw';
      }
    }

    const gameOverStats = {
      result,
      playerSealCount: pCount,
      enemySealCount: eCount,
      roundEnded: this.controller.state.currentRound,
    };
    const gameOverNewAchievements = recordGameEndAndPersist(gameOverStats);

    const progress = loadAchievementsProgress();
    logGameEvent('game_over', {
      result,
      player_seals: pCount,
      enemy_seals: eCount,
      cycles: this.controller.state.currentRound,
      lifetime_wins: progress.lifetimeWins,
      lifetime_losses: progress.lifetimeLosses,
      lifetime_draws: progress.lifetimeDraws,
      lifetime_games: progress.lifetimeGames,
      unlocked_count: progress.unlocked.length,
    });

    gameOverNewAchievements.forEach((id) => {
      logGameEvent('achievement_unlocked', {
        achievement_id: id,
      });
    });

    this.controller.updateState({
      currentPhase: Phase.GAME_OVER,
      instructionText: body,
      gameOverResult: result,
      gameOverWinCondition: winCondition ?? (result === 'draw' ? 'Draw' : 'Majority of Seals'),
      gameOverStats,
      gameOverNewAchievements,
    });
  }

  public zoomOut() {
    const phase = this.controller.state.currentPhase;
    const duration = this.controller.state.slowMode ? 1.2 : 0;
    if (
      phase === Phase.COUNTER_ALLOCATION ||
      phase === Phase.ABILITY_TARGETING ||
      phase === Phase.SEAL_TARGETING ||
      phase === Phase.DELTA_BUFF_TARGETING
    ) {
      // Orthogonal top-down view centered on the battlefield slots (hides hand at z=22)
      gsap.to(this.controller.sceneManager.camera.position, { x: 0, y: 25, z: 0.1, duration, ease: "power2.inOut" });
      gsap.to(this.controller.sceneManager.cameraTarget, { x: 0, y: 0, z: 0, duration, ease: "power2.inOut" });
    } else {
      // Default perspective view
      gsap.to(this.controller.sceneManager.camera.position, { x: 0, y: 28, z: 32, duration, ease: "power2.inOut" });
      gsap.to(this.controller.sceneManager.cameraTarget, { x: 0, y: 0, z: -2, duration, ease: "power2.inOut" });
    }
  }

  public zoomIn(idx: number) {
    const seal = this.controller.seals[idx];
    const duration = this.controller.state.slowMode ? 1.2 : 0;
    gsap.to(this.controller.sceneManager.camera.position, { x: seal.mesh.position.x, y: 8, z: 8, duration, ease: "power2.inOut" });
    gsap.to(this.controller.sceneManager.cameraTarget, { x: seal.mesh.position.x, y: 0, z: 0, duration, ease: "power2.inOut" });
  }

  public ascendToSeal(card: CardEntity, idx: number) {
    if (this.controller.state.currentRound >= 4) {
      this.controller.addLog(`Sudden Death Victory! ${card.data.name} ascended to a Seal.`);
      const result = card.data.isEnemy ? 'enemy' : 'player';
      this.finalizeGame("Sudden Death", result);
      return;
    }

    if (card.data.isEnemy) this.controller.enemyBattlefield[idx] = null;
    else this.controller.playerBattlefield[idx] = null;

    this.controller.addLog(`${card.data.name} ascends to Seal ${idx + 1}`);
    this.controller.seals[idx].champion = card;
    card.applyBackTextureIfNeeded(); // All cards share same back graphic
    // Ensure power/weakness marker visuals persist when card moves to seal (e.g. Alpha +2 from destroying enemy)
    card.updateVisualMarkers();
    this.controller.abilityManager.syncBoardPresencePowerMarkers();
    
    const duration = this.controller.state.slowMode ? 0.6 : 0;
    gsap.to(card.mesh.position, {
      x: this.controller.seals[idx].mesh.position.x,
      y: 0.6,
      z: 0,
      duration: duration,
      ease: "back.out"
    });
  }
}
