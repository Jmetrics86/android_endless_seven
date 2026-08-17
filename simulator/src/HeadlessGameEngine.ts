/**
 * Headless Endless Seven Game Engine
 * Executes full game simulation at maximum speed with 100% mechanical fidelity.
 */

import {
  Alignment,
  Phase,
  CardData,
  HeadlessCard,
  HeadlessSeal,
  effectivePower,
  SimulationResult
} from './types.js';
import { GAME_CONSTANTS } from './constants.js';
import { RuleConfig, PartialRuleConfig, DEFAULT_RULES, createRuleConfig } from './rules.js';
import {
  pickBestHarmTarget,
  pickBestAllyPowerTarget,
  pickBestEnemyWeaknessTarget,
  pickChampionForLordAlaric,
  pickLimboForKaelo,
  pickBogvaDestroyTarget,
  pickNobleTheGreatFollowUp,
  pickBellaTarget,
  pickSealForAbility,
  pickAnakimSealIndex,
  pickWardSealIndex,
  pickPazooLimboCard,
  pickNixCreatureType,
  vacantSlotPriorityForReinforce
} from './AI.js';
import { SmartAI } from './SmartAI.js';
import { NeuralAI } from './NeuralAI.js';

let nextCardId = 1;

export class HeadlessGameEngine {
  public seals: HeadlessSeal[] = [];
  public playerBattlefield: (HeadlessCard | null)[] = [];
  public enemyBattlefield: (HeadlessCard | null)[] = [];
  public playerHand: HeadlessCard[] = [];
  public enemyHand: HeadlessCard[] = [];
  public playerDeck: CardData[] = [];
  public enemyDeck: CardData[] = [];
  public playerLimbo: HeadlessCard[] = [];
  public enemyLimbo: HeadlessCard[] = [];
  public playerGraveyard: HeadlessCard[] = [];
  public enemyGraveyard: HeadlessCard[] = [];
  public cardsThatBattledThisRound: HeadlessCard[] = [];
  public enemyPrepRemainder: CardData[] = [];
  public deferredAbilities: HeadlessCard[] = [];
  public laneAbilityDestruction: ('player' | 'enemy' | null)[] = [];
  public cardsToDestroyAtEndOfRound: HeadlessCard[] = [];

  public currentRound = 1;
  public lockedSealIndex = -1;
  public isGameOver = false;
  public gameOverResult: 'player' | 'enemy' | 'draw' | null = null;
  public gameOverWinCondition = '';
  public logs: string[] = [];

  public playerAlignment: Alignment = Alignment.LIGHT;
  public enemyAlignment: Alignment = Alignment.DARK;
  public playerSideName = "Vampires & Demons";
  public enableAbilityDeferral = true;
  public enemySideName = "Werewolves & Vampires";
  public playerAIType: 'easy' | 'smart' | 'neural' = 'easy';
  public enemyAIType: 'easy' | 'smart' | 'neural' = 'easy';
  public rules: RuleConfig;

  constructor(
    playerDeck: CardData[],
    enemyDeck: CardData[],
    playerSideName = "Side A",
    enemySideName = "Side B",
    playerAlignment = Alignment.LIGHT,
    enemyAlignment = Alignment.DARK,
    playerAIType: 'easy' | 'smart' | 'neural' = 'easy',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'easy',
    rules?: PartialRuleConfig
  ) {
    this.rules = createRuleConfig(rules);
    this.playerDeck = [...playerDeck];
    this.enemyDeck = [...enemyDeck];
    this.playerSideName = playerSideName;
    this.enemySideName = enemySideName;
    this.playerAlignment = playerAlignment;
    this.enemyAlignment = enemyAlignment;
    this.playerAIType = playerAIType;
    this.enemyAIType = enemyAIType;
    this.enableAbilityDeferral = this.rules.enableAbilityDeferral;

    this.playerBattlefield = Array(this.rules.laneCount).fill(null);
    this.enemyBattlefield = Array(this.rules.laneCount).fill(null);
    this.laneAbilityDestruction = Array(this.rules.laneCount).fill(null);

    for (let i = 0; i < this.rules.laneCount; i++) {
      this.seals.push({
        index: i,
        alignment: Alignment.NEUTRAL,
        champion: null
      });
    }
  }

  public addLog(msg: string) {
    this.logs.push(`[Round ${this.currentRound}] ${msg}`);
  }

  public createCard(data: CardData, isEnemy: boolean): HeadlessCard {
    return {
      id: `c_${nextCardId++}`,
      data: { ...data },
      isEnemy,
      alignment: isEnemy ? this.enemyAlignment : this.playerAlignment,
      faceUp: false,
      powerMarkers: 0,
      weaknessMarkers: 0,
      boardPresencePowerMarkers: 0,
      isInvincible: false
    };
  }

  public runGame(): SimulationResult {
    while (!this.isGameOver && this.currentRound <= this.rules.maxRounds) {
      this.runPrepPhase();
      if (this.isGameOver) break;
      this.runResolutionPhase();
      if (this.isGameOver) break;
      this.endRoundCleanup();
    }

    if (!this.isGameOver) {
      this.checkEndGameVictory();
    }

    const playerSealsCount = this.seals.filter(s => s.alignment === this.playerAlignment).length;
    const enemySealsCount = this.seals.filter(s => s.alignment === this.enemyAlignment).length;
    const neutralSealsCount = this.seals.filter(s => s.alignment === Alignment.NEUTRAL).length;
    const playerChamps = this.seals.filter(s => s.alignment === this.playerAlignment && s.champion !== null).length;
    const enemyChamps = this.seals.filter(s => s.alignment === this.enemyAlignment && s.champion !== null).length;

    let winningName = "Draw";
    if (this.gameOverResult === 'player') winningName = this.playerSideName;
    else if (this.gameOverResult === 'enemy') winningName = this.enemySideName;

    return {
      gameIndex: 0,
      winner: this.gameOverResult || 'draw',
      winningSideName: winningName,
      rounds: this.currentRound,
      winCondition: this.gameOverWinCondition || 'Majority of Seals',
      playerSeals: playerSealsCount,
      enemySeals: enemySealsCount,
      neutralSeals: neutralSealsCount,
      playerChampions: playerChamps,
      enemyChampions: enemyChamps,
      logs: this.logs
    };
  }

  private runPrepPhase() {
    this.addLog(`--- Prep Phase (Round ${this.currentRound}) ---`);
    this.laneAbilityDestruction = Array(this.rules.laneCount).fill(null);

    // Attrition check
    if (this.playerDeck.length < this.rules.attritionThreshold || this.enemyDeck.length < this.rules.attritionThreshold) {
      const pLen = this.playerDeck.length;
      const eLen = this.enemyDeck.length;
      let result: 'player' | 'enemy' | 'draw' = 'draw';
      if (pLen < this.rules.attritionThreshold && eLen < this.rules.attritionThreshold) result = 'draw';
      else if (pLen < this.rules.attritionThreshold) result = 'enemy';
      else result = 'player';
      this.finalizeGame('Attrition', result);
      return;
    }

    // Reset round held flags
    [
      ...this.playerLimbo,
      ...this.enemyLimbo,
      ...this.playerBattlefield,
      ...this.enemyBattlefield,
      ...this.seals.map(s => s.champion)
    ].forEach(c => {
      if (c) c.isHeldForRound = false;
    });

    // Draw cards for Player & Enemy
    this.playerHand = [];
    this.enemyHand = [];

    for (let i = 0; i < this.rules.handDrawCount; i++) {
      if (this.playerDeck.length > 0) {
        const d = this.playerDeck.pop()!;
        this.playerHand.push(this.createCard(d, false));
      }
      if (this.enemyDeck.length > 0) {
        const d = this.enemyDeck.pop()!;
        this.enemyHand.push(this.createCard(d, true));
      }
    }

    // AI Placement for Player side
    this.aiPlaceHandOnBattlefield(false);

    // AI Placement for Enemy side
    this.aiPlaceHandOnBattlefield(true);

    // Purge remaining hand to Limbo
    this.playerHand.forEach(c => this.playerLimbo.push(c));
    this.playerHand = [];

    this.enemyHand.forEach(c => this.enemyLimbo.push(c));
    this.enemyHand = [];
  }



  private aiPlaceHandOnBattlefield(isEnemy: boolean) {
    const hand = isEnemy ? this.enemyHand : this.playerHand;
    const battlefield = isEnemy ? this.enemyBattlefield : this.playerBattlefield;
    const oppBattlefield = isEnemy ? this.playerBattlefield : this.enemyBattlefield;
    const aiType = isEnemy ? this.enemyAIType : this.playerAIType;

    if (aiType === 'neural') {
      const placements = NeuralAI.selectPrepPlacements(hand, battlefield, oppBattlefield, this.seals, isEnemy, this.currentRound);
      for (const p of placements) {
        const idx = hand.indexOf(p.card);
        if (idx !== -1) hand.splice(idx, 1);
        battlefield[p.slotIdx] = p.card;
      }
      return;
    }

    if (aiType === 'smart') {
      const placements = SmartAI.selectPrepPlacements(hand, battlefield, oppBattlefield, this.seals, isEnemy);
      for (const p of placements) {
        const idx = hand.indexOf(p.card);
        if (idx !== -1) hand.splice(idx, 1);
        battlefield[p.slotIdx] = p.card;
      }
      return;
    }

    const handStrength = (c: HeadlessCard) => (c.data.isChampion ? 85 : 0) + c.data.power;
    hand.sort((a, b) => handStrength(b) - handStrength(a));

    const vacantSlots = battlefield.map((v, i) => (v === null ? i : -1)).filter(i => i !== -1);
    vacantSlots.sort(
      (a, b) => vacantSlotPriorityForReinforce(b, oppBattlefield) - vacantSlotPriorityForReinforce(a, oppBattlefield)
    );

    for (let i = 0; i < vacantSlots.length && hand.length > 0; i++) {
      const slotIdx = vacantSlots[i];
      const card = hand.shift()!;
      battlefield[slotIdx] = card;
    }
  }

  private runResolutionPhase() {
    this.addLog(`--- Resolution Phase (Round ${this.currentRound}) ---`);
    this.cardsThatBattledThisRound = [];
    this.syncBoardPresencePowerMarkers();

    for (let i = 0; i < this.rules.laneCount; i++) {
      if (this.isGameOver) break;
      this.resolveSeal(i);
    }

    // Final Act: Karlyah - destroy a creature that battled this round
    if (!this.isGameOver) {
      this.tryKarlyahFinalAct();
    }
  }

  private cannotBattle(c: HeadlessCard | null): boolean {
    if (!c) return false;
    if (c.data.cannotBattleOrBeBattled) return true;
    if (c.data.cannotBattleWhilePowerIs1 && effectivePower(c) === 1) return true;
    return false;
  }

  /**
   * Check if a card is protected by Metatron's aura.
   * While Metatron champions a Seal, all OTHER Celestials on the same side
   * are unaffected by creature abilities.
   */
  private isProtectedByMetatron(card: HeadlessCard): boolean {
    if (card.data.faction !== 'Celestial') return false;
    if (card.data.name === 'Metatron') return false; // Metatron doesn't protect himself
    // Check if an allied Metatron is championing any seal
    return this.seals.some(s => 
      s.champion && 
      s.champion.data.name === 'Metatron' && 
      s.champion.isEnemy === card.isEnemy
    );
  }

  private resolveSeal(idx: number) {
    const seal = this.seals[idx];
    let pCard = this.playerBattlefield[idx];
    let eCard = this.enemyBattlefield[idx];

    // Haste Strike check
    const pHaste = pCard && pCard.data.hasHaste;
    const eHaste = eCard && eCard.data.hasHaste;

    if ((pHaste || eHaste) && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
      if (pCard && seal.champion && seal.champion.isEnemy && !this.cannotBattle(seal.champion)) {
        pCard.faceUp = true;
        seal.champion.faceUp = true;
        this.handleBattle(pCard, seal.champion, idx, true);
      } else if (eCard && seal.champion && !seal.champion.isEnemy && !this.cannotBattle(seal.champion)) {
        eCard.faceUp = true;
        seal.champion.faceUp = true;
        this.handleBattle(eCard, seal.champion, idx, true);
      } else if (pCard && eCard) {
        pCard.faceUp = true;
        eCard.faceUp = true;
        this.handleBattle(pCard, eCard, idx, false);
      }
      pCard = this.playerBattlefield[idx];
      eCard = this.enemyBattlefield[idx];
    }

    // Step A: The Flip
    if (pCard) pCard.faceUp = true;
    if (eCard) eCard.faceUp = true;

    // Step A Tie Rule Check: Equal effective power upon reveal = both cards destroyed immediately before abilities
    if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
      this.destroyCard(pCard);
      this.destroyCard(eCard);
      this.seals[idx].alignment = Alignment.NEUTRAL;
      return;
    }

    // Check Nullify (Remiel / Valerius Nightshade)
    const pNullified = !!(eCard && eCard.data.hasNullify);
    const eNullified = !!(pCard && pCard.data.hasNullify);

    if (pCard && !pNullified) {
      this.triggerFlipAbility(pCard, idx);
    }
    if (eCard && !eNullified) {
      this.triggerFlipAbility(eCard, idx);
    }

    // Step B: Activate Abilities
    if (pCard && pCard.data.hasActivate) {
      this.triggerActivateAbility(pCard);
    }
    if (eCard && eCard.data.hasActivate) {
      this.triggerActivateAbility(eCard);
    }

    if (this.isGameOver) return;

    // Refresh slots
    pCard = this.playerBattlefield[idx];
    eCard = this.enemyBattlefield[idx];

    // Step C: Combat Phase
    if (pCard && seal.champion && seal.champion.isEnemy) {
      if (!this.cannotBattle(pCard) && !this.cannotBattle(seal.champion)) {
        this.handleBattle(pCard, seal.champion, idx, true);
      }
    } else if (eCard && seal.champion && !seal.champion.isEnemy) {
      if (!this.cannotBattle(eCard) && !this.cannotBattle(seal.champion)) {
        this.handleBattle(eCard, seal.champion, idx, true);
      }
    } else if (pCard && eCard) {
      if (!this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
        this.handleBattle(pCard, eCard, idx, false);
      }
    }

    // Refresh slots again after combat
    pCard = this.playerBattlefield[idx];
    eCard = this.enemyBattlefield[idx];

    // Step D: Siege Phase (Alignment Change)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      let targetAlignment: Alignment | null = null;
      let oppAlignment: Alignment | null = null;
      let isPlayerClaim = false;

      if (pCard && !eCard) {
        isPlayerClaim = true;
        targetAlignment = this.playerAlignment;
        oppAlignment = this.enemyAlignment;
      } else if (eCard && !pCard) {
        isPlayerClaim = false;
        targetAlignment = this.enemyAlignment;
        oppAlignment = this.playerAlignment;
      } else if (!pCard && !eCard && this.laneAbilityDestruction[idx]) {
        isPlayerClaim = this.laneAbilityDestruction[idx] === 'player';
        targetAlignment = isPlayerClaim ? this.playerAlignment : this.enemyAlignment;
        oppAlignment = isPlayerClaim ? this.enemyAlignment : this.playerAlignment;
      }

      if (targetAlignment && oppAlignment) {
        const canCorrupt = !this.seals.some(s => s.champion && s.champion.data.name === 'Valtarious' && s.champion.data.faction === 'Avatars of light' && s.champion.isEnemy !== isPlayerClaim);
        if (canCorrupt || seal.alignment !== oppAlignment) {
          if (seal.hasWard) {
            seal.hasWard = false; // Ward absorbs the influence attempt!
          } else {
            const oldAlignment = seal.alignment;
            seal.alignment = targetAlignment;
            // Final Act: Luna - Nullify seal influence change from enemy
            if (oldAlignment !== targetAlignment && !seal.champion) {
              const defenderIsEnemy = !isPlayerClaim;
              const defenderLimbo = defenderIsEnemy ? this.enemyLimbo : this.playerLimbo;
              const lunaIdx = defenderLimbo.findIndex(c => c.data.name === 'Luna' && c.data.hasLimboAbility);
              if (lunaIdx !== -1) {
                const luna = defenderLimbo.splice(lunaIdx, 1)[0];
                const grave = defenderIsEnemy ? this.enemyGraveyard : this.playerGraveyard;
                grave.push(luna);
                seal.alignment = oldAlignment; // Nullify the influence change
                this.addLog(`Final Act: Luna nullifies seal ${idx} influence change`);
              }
            }
            // Final Act: Tarkidos - Purify any corrupted seal without a Champion
            this.triggerTarkidosFinalAct(isPlayerClaim);
          }
        }
      }
    }

    // Step E: Ascension Phase (Champion takes control of Seal)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && pCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(false, pCard, idx);
          if (!coalBlocked) {
            seal.champion = pCard;
            this.playerBattlefield[idx] = null;
          }
        }
      } else if (eCard && eCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(true, eCard, idx);
          if (!coalBlocked) {
            seal.champion = eCard;
            this.enemyBattlefield[idx] = null;
          }
        }
      }
    }

    // 7 Seals Immediate Dominance Check
    const pCount = this.seals.filter(s => s.alignment === this.playerAlignment).length;
    const eCount = this.seals.filter(s => s.alignment === this.enemyAlignment).length;
    if (pCount === 7) {
      this.finalizeGame("7-Seal Dominance", 'player');
    } else if (eCount === 7) {
      this.finalizeGame("7-Seal Dominance", 'enemy');
    }
  }

  /**
   * Final Act: Tarkidos - While in Limbo, move to Graveyard and Purify any Seal without a Champion.
   * Triggers after an enemy successfully changes a seal's alignment.
   */
  private triggerTarkidosFinalAct(beneficiaryIsPlayer: boolean) {
    const limbo = beneficiaryIsPlayer ? this.playerLimbo : this.enemyLimbo;
    const tarkidosIdx = limbo.findIndex(c => c.data.name === 'Tarkidos' && c.data.hasLimboAbility);
    if (tarkidosIdx === -1) return;

    const myAlign = beneficiaryIsPlayer ? this.playerAlignment : this.enemyAlignment;
    const oppAlign = beneficiaryIsPlayer ? this.enemyAlignment : this.playerAlignment;
    // Find an enemy-controlled seal without a champion to purify
    const corruptedSeal = this.seals.find(s => s.alignment === oppAlign && !s.champion);
    if (!corruptedSeal) return;

    const tarkidos = limbo.splice(tarkidosIdx, 1)[0];
    const grave = beneficiaryIsPlayer ? this.playerGraveyard : this.enemyGraveyard;
    grave.push(tarkidos);
    if (corruptedSeal.hasWard) {
      corruptedSeal.hasWard = false;
    } else {
      corruptedSeal.alignment = myAlign;
    }
    this.addLog(`Final Act: Tarkidos purifies seal ${corruptedSeal.index}`);
  }

  /**
   * Final Act: Coal - While in Limbo, move to Graveyard to prevent a creature from Championing a Seal.
   * Returns true if the championing was blocked.
   */
  private tryCoalFinalAct(championIsEnemy: boolean, champion: HeadlessCard, sealIdx: number): boolean {
    // The defender (opponent of the champion) checks their Limbo for Coal
    const defenderLimbo = championIsEnemy ? this.playerLimbo : this.enemyLimbo;
    const coalIdx = defenderLimbo.findIndex(c => c.data.name === 'Coal' && c.data.hasLimboAbility);
    if (coalIdx === -1) return false;

    const coal = defenderLimbo.splice(coalIdx, 1)[0];
    const grave = championIsEnemy ? this.playerGraveyard : this.enemyGraveyard;
    grave.push(coal);
    this.addLog(`Final Act: Coal prevents ${champion.data.name} from championing seal ${sealIdx}`);
    return true;
  }

  /**
   * Final Act: Karlyah - While in Limbo, move to Graveyard to destroy a creature that battled this turn.
   * Called at the end of each lane resolution after combat.
   */
  private tryKarlyahFinalAct() {
    for (const isEnemy of [true, false]) {
      const limbo = isEnemy ? this.enemyLimbo : this.playerLimbo;
      const karlyahIdx = limbo.findIndex(c => c.data.name === 'Karlyah' && c.data.hasLimboAbility);
      if (karlyahIdx === -1) continue;

      // Look for enemy creatures that battled this round
      const enemyBattlers = this.cardsThatBattledThisRound.filter(c => c.isEnemy !== isEnemy && c.faceUp);
      if (enemyBattlers.length === 0) continue;

      const target = pickBestHarmTarget(limbo[karlyahIdx], enemyBattlers, this.seals);
      if (!target) continue;

      const karlyah = limbo.splice(karlyahIdx, 1)[0];
      const grave = isEnemy ? this.enemyGraveyard : this.playerGraveyard;
      grave.push(karlyah);
      this.destroyCard(target);
      this.addLog(`Final Act: Karlyah destroys ${target.data.name} (battled this turn)`);
    }
  }

  /**
   * Process end-of-round Final Act abilities that are opportunistic (not reactive to specific events).
   * These trigger during endRoundCleanup.
   */
  private processEndOfRoundFinalActs() {
    for (const isEnemy of [true, false]) {
      const limbo = isEnemy ? this.enemyLimbo : this.playerLimbo;
      if (this.isGameOver) break;

      // Valtarious (Lycan): Give any Lycan in play a +3 Power Marker
      const valtIdx = limbo.findIndex(c => c.data.name === 'Valtarious' && c.data.hasLimboAbility && c.data.faction === 'Lycan');
      if (valtIdx !== -1) {
        const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.data.faction === 'Lycan' && c.isEnemy === isEnemy);
        if (allInPlay.length > 0) {
          const target = pickBestAllyPowerTarget(allInPlay, this.seals);
          if (target) {
            const valt = limbo.splice(valtIdx, 1)[0];
            const grave = isEnemy ? this.enemyGraveyard : this.playerGraveyard;
            grave.push(valt);
            target.powerMarkers += 3;
            this.addLog(`Final Act: Valtarious gives ${target.data.name} +3 Power`);
          }
        }
      }

      // Golgothane: Shuffle all creatures in enemy's Limbo back into their deck
      const golgoIdx = limbo.findIndex(c => c.data.name === 'Golgothane' && c.data.hasLimboAbility);
      if (golgoIdx !== -1) {
        const oppLimbo = isEnemy ? this.playerLimbo : this.enemyLimbo;
        if (oppLimbo.length > 0) {
          const golgo = limbo.splice(golgoIdx, 1)[0];
          const grave = isEnemy ? this.enemyGraveyard : this.playerGraveyard;
          grave.push(golgo);
          const oppDeck = isEnemy ? this.playerDeck : this.enemyDeck;
          for (const c of oppLimbo) {
            oppDeck.push({ ...c.data });
          }
          this.addLog(`Final Act: Golgothane shuffles ${oppLimbo.length} enemy Limbo cards into deck`);
          oppLimbo.length = 0; // Clear enemy Limbo
        }
      }

      // Alistar Elren: Place -3 Weakness on any creature
      const alistarIdx = limbo.findIndex(c => c.data.name === 'Alistar Elren' && c.data.hasLimboAbility);
      if (alistarIdx !== -1) {
        const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !c.data.abilityImmune && !this.isProtectedByMetatron(c));
        if (foes.length > 0) {
          const target = pickBestEnemyWeaknessTarget(foes, this.seals);
          if (target) {
            const alistar = limbo.splice(alistarIdx, 1)[0];
            const grave = isEnemy ? this.enemyGraveyard : this.playerGraveyard;
            grave.push(alistar);
            target.weaknessMarkers += 3;
            this.addLog(`Final Act: Alistar Elren places -3 Weakness on ${target.data.name}`);
          }
        }
      }

      // Kaelarion: Place a Champion on top of its owner's deck (return an enemy champion)
      const kaelIdx = limbo.findIndex(c => c.data.name === 'Kaelarion' && c.data.hasLimboAbility);
      if (kaelIdx !== -1) {
        const enemyChamps = this.seals.map(s => s.champion).filter((c): c is HeadlessCard => c !== null && c.isEnemy !== isEnemy && c.data.isChampion);
        if (enemyChamps.length > 0) {
          const target = pickBestHarmTarget(limbo[kaelIdx], enemyChamps, this.seals);
          if (target) {
            const kael = limbo.splice(kaelIdx, 1)[0];
            const grave = isEnemy ? this.enemyGraveyard : this.playerGraveyard;
            grave.push(kael);
            this.returnCreatureToOwnerDeck(target);
            this.addLog(`Final Act: Kaelarion returns ${target.data.name} to its owner's deck`);
          }
        }
      }
    }
  }


  private triggerFlipAbility(card: HeadlessCard, sealIdx: number) {
    const isEnemy = card.isEnemy;
    const name = card.data.name;

    if (name === "Dawn") {
      const oathbringers = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.faction === "Avatars of light").length;
      const multiplier = card.data.ability?.includes("+2 Power Marker") ? 2 : 1;
      card.powerMarkers += (oathbringers * multiplier);
    } else if (name === "Bella") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      const champsOnSeals = this.seals.map(s => s.champion).filter((c): c is HeadlessCard => c !== null && c.isEnemy !== isEnemy);
      const isAnyCreatureOnSeal = card.data.ability?.includes("any creature on any Seal");
      const targetPool = isAnyCreatureOnSeal ? foes.filter(c => this.seals.some(s => s.champion === c || this.playerBattlefield[s.index] === c || this.enemyBattlefield[s.index] === c)) : champsOnSeals;
      const target = pickBestHarmTarget(card, targetPool.length > 0 ? targetPool : champsOnSeals, this.seals);
      if (target) {
        const s = this.seals.find(sec => sec.champion === target);
        if (s) s.champion = null;
        this.destroyCard(target);
      }
    } else if (name === "Grelyn Zilkos") {
      const oppLimbo = isEnemy ? this.playerLimbo : this.enemyLimbo;
      const count = Math.min(3, oppLimbo.length);
      for (let i = 0; i < count; i++) {
        const target = oppLimbo.shift();
        if (target) {
          const grave = isEnemy ? this.playerGraveyard : this.enemyGraveyard;
          grave.push(target);
        }
      }
    } else if (name === "Calmadious") {
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
      const valid = this.seals.filter(s => !s.champion && s.alignment === oppAlign);
      if (valid.length > 0) {
        const target = valid[0];
        if (target.hasWard) {
          target.hasWard = false; // Ward absorbs the purify attempt
        } else {
          target.alignment = myAlign;
        }
      }
    } else if (name === "Skarados") {
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
      this.seals.filter(s => !s.champion && s.alignment === oppAlign).forEach(s => {
        if (s.hasWard) {
          s.hasWard = false; // Ward absorbs one corruption attempt
        } else {
          s.alignment = myAlign;
        }
      });
    } else if (name === "Cassiel Haggis") {
      const deck = isEnemy ? this.enemyDeck : this.playerDeck;
      if (deck.length > 0) {
        const topCard = deck[deck.length - 1];
        card.powerMarkers += topCard.power;
      }
    } else if (name === "Garmr") {
      const inPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.faction === 'Lycan').length;
      const inLimbo = [...this.playerLimbo, ...this.enemyLimbo].filter(c => c.data.faction === 'Lycan').length;
      card.powerMarkers += (inPlay + inLimbo);
    } else if (name === "Kaelo") {
      const limbo = [...this.playerLimbo, ...this.enemyLimbo];
      const target = pickLimboForKaelo(limbo);
      if (target) {
        card.powerMarkers += target.data.power;
      }
    } else if (name === "Varg Fur-back" || name === "Varg Greyback") {
      const allCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      for (let i = 0; i < 2; i++) {
        const target = pickBestAllyPowerTarget(allCards.filter(c => c.isEnemy === isEnemy), this.seals);
        if (target) target.powerMarkers += 2;
      }
    } else if (name === "Oriel The bold" || name === "Oriel the Bold" || name === "Elowen Thornver") {
      const valid = this.seals.filter(s => !s.champion);
      const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      const chosen = pickSealForAbility(valid, oppAlign, myAlign, oppAlign);
      if (chosen) {
        if (chosen.hasWard) {
          chosen.hasWard = false;
        } else {
          chosen.alignment = myAlign;
        }
      }
    } else if (name === "Nix") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      const types = Array.from(new Set(allInPlay.map(c => c.data.faction)));
      const chosenType = pickNixCreatureType(types, allInPlay, isEnemy);
      if (chosenType) {
        allInPlay.filter(c => c.data.faction === chosenType).forEach(c => this.destroyCard(c));
      }
    } else if (name === "Golgothane" || name === "Kaelarion") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !this.isProtectedByMetatron(c));
      const targetPool = name === "Kaelarion" ? allInPlay.filter(c => c.data.power <= 3) : allInPlay;
      const target = pickBestHarmTarget(card, targetPool, this.seals);
      if (target) this.destroyCard(target);
    } else if (name === "Lycandor") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !this.isProtectedByMetatron(c));
      if (card.data.ability?.includes("-3 Weakness Marker on each")) {
        foes.forEach(f => f.weaknessMarkers += 3);
      } else {
        const gravebornCount = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.faceUp && c.data.type === 'Graveborn' && c.isEnemy === isEnemy).length;
        foes.forEach(f => {
          f.weaknessMarkers += 2 * gravebornCount;
        });
      }
    } else if (name === "Umbarax") {
      card.isInvincible = true;
    } else if (name === "Pazoo") {
      const gravebornCount = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.faceUp && c.data.type === 'Graveborn' && c.isEnemy === isEnemy).length;
      card.powerMarkers += 2 * gravebornCount;
      const limbo = isEnemy ? this.enemyLimbo : this.playerLimbo;
      const target = pickPazooLimboCard(limbo);
      if (target) {
        const idx = limbo.indexOf(target);
        if (idx !== -1) limbo.splice(idx, 1);
        const deck = isEnemy ? this.enemyDeck : this.playerDeck;
        deck.push(target.data);
      }
    } else if (name === "Bogva") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !this.isProtectedByMetatron(c));
      foes.forEach(f => f.weaknessMarkers += 1);
    } else if (name === "Alistar Elren" || name === "Belphegor") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !c.data.abilityImmune && !this.isProtectedByMetatron(c));
      const target = pickBestEnemyWeaknessTarget(foes, this.seals);
      const weakVal = card.data.markerWeakness ?? (card.data.ability?.includes("-2 Weakness") ? 2 : 3);
      if (target) target.weaknessMarkers += weakVal;
    } else if (name === "Zelus") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && effectivePower(c) >= effectivePower(card) && !c.data.abilityImmune && !this.isProtectedByMetatron(c));
      const target = pickBestEnemyWeaknessTarget(foes, this.seals);
      const weakVal = card.data.markerWeakness ?? (card.data.ability?.includes("-2 Weakness") ? 2 : 3);
      if (target) target.weaknessMarkers += weakVal;
    } else if (name === "Desire") {
      if (card.data.ability?.includes("sacrifice a creature in Play")) {
        // Variant: All players must choose and sacrifice a creature in Play
        // AI picks weakest own creature to sacrifice
        const pAll = [...this.playerBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && !c.isEnemy && c !== card);
        const eAll = [...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy && c !== card);
        // Each side sacrifices their weakest creature (AI choice: minimize loss)
        if (pAll.length > 0) {
          const weakest = pAll.reduce((a, b) => effectivePower(a) <= effectivePower(b) ? a : b);
          this.destroyCard(weakest);
        }
        if (eAll.length > 0) {
          const weakest = eAll.reduce((a, b) => effectivePower(a) <= effectivePower(b) ? a : b);
          this.destroyCard(weakest);
        }
      } else {
        if (this.playerBattlefield[sealIdx]) {
          this.destroyCard(this.playerBattlefield[sealIdx]!);
        }
        if (this.enemyBattlefield[sealIdx]) {
          this.destroyCard(this.enemyBattlefield[sealIdx]!);
        }
        if (!this.seals[sealIdx].champion) {
          this.seals[sealIdx].alignment = isEnemy ? this.enemyAlignment : this.playerAlignment;
        }
      }
    } else if (name === "Bacchus") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c !== card && c.faceUp);
      let totalP = 0;
      allInPlay.forEach(c => {
        totalP += c.powerMarkers;
        c.powerMarkers = 0;
      });
      card.powerMarkers += totalP;
    } else if (name === "Lord Alaric") {
      const champs = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.data.isChampion);
      const target = pickChampionForLordAlaric(card, champs, this.seals);
      if (target) {
        this.returnCreatureToOwnerDeck(target);
      }
    } else if (name === "Duke Aren Drakos" || name === "Jophiel") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      const target = pickBestHarmTarget(card, allInPlay, this.seals);
      if (target) this.returnCreatureToOwnerDeck(target);
    } else if (name === "Cyprian") {
      const allies = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy === isEnemy);
      const target = pickBestAllyPowerTarget(allies, this.seals);
      if (target) target.powerMarkers += 3;
    }
  }

  private triggerActivateAbility(source: HeadlessCard, isDeferredTrigger = false) {
    const isEnemy = source.isEnemy;
    const name = source.data.name;

    // AI Deferral Logic
    if (!isDeferredTrigger && this.enableAbilityDeferral) {
      let shouldDefer = false;
      const allCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      
      if (name === "Bella") {
        const target = pickBellaTarget(source, allCards.filter(c => c.powerMarkers > 0 || c.weaknessMarkers > 0), this.seals);
        if (!target) shouldDefer = true;
      } else if (name === "Calmadious" || name === "Skarados") {
        const markersInPlay = allCards.some(c => c.powerMarkers > 0 || c.weaknessMarkers > 0);
        if (!markersInPlay) shouldDefer = true;
      } else if (name === "Metatron") {
        const target = pickBellaTarget(source, allCards.filter(c => c.powerMarkers > 0 || c.weaknessMarkers > 0), this.seals);
        if (!target) shouldDefer = true;
      } else if (name === "Ulfric Thorne") {
        const target = pickBestAllyPowerTarget(allCards.filter(c => c.isEnemy === isEnemy), this.seals);
        if (!target) shouldDefer = true;
      }

      // Also allow a 20% random deferral chance for testing ability timing impact if no strict rule triggered
      if (!shouldDefer && Math.random() < 0.20) {
        shouldDefer = true;
      }

      if (shouldDefer) {
        this.deferredAbilities.push(source);
        return;
      }
    }

    if (name === "Dawn") {
      // Fixed: Only count THIS player's Oathbringers, not both sides'
      const oathbringers = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.faction === "Avatars of light" && c.isEnemy === isEnemy).length;
      const hasChampOnSeal = this.seals.some(s => s.champion && s.champion.isEnemy === isEnemy);
      if (oathbringers >= 4 && hasChampOnSeal) {
        this.finalizeGame("Dawn (4 Oathbringers + Champion on Seal)", isEnemy ? 'enemy' : 'player');
      }
    } else if (name === "Nix") {
      const graveborns = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.type === "Graveborn" && c.isEnemy === isEnemy).length;
      const hasChampOnSeal = this.seals.some(s => s.champion && s.champion.isEnemy === isEnemy);
      if (graveborns >= 4 && hasChampOnSeal) {
        this.finalizeGame("Nix (4 Graveborn + Champion on Seal)", isEnemy ? 'enemy' : 'player');
      }
    } else if (name === "Coal" || name === "Karlyah") {
      const champsOnSeals = this.seals.filter(s => s.champion && s.champion.isEnemy === isEnemy).length;
      if (champsOnSeals >= 5) {
        this.finalizeGame("Five Seals with Champions", isEnemy ? 'enemy' : 'player');
      }
    } else if (name === "Lord Alaric") {
      const count = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.isEnemy === isEnemy && c.data.faction === "Vampyre").length;
      source.powerMarkers += count;
    } else if (name === "Anakim The Wise" || name === "Anakim the Wise") {
      if (source.data.ability?.includes("Ward Marker")) {
        const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
        const idx = pickWardSealIndex(this.seals, myAlign);
        if (idx !== -1) {
          this.seals[idx].hasWard = true;
        }
      } else {
        const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
        const idx = pickAnakimSealIndex(this.seals, myAlign);
        if (idx !== -1) {
          this.lockedSealIndex = idx;
        }
      }
    } else if (name === "Ulfric Thorne") {
      const allies = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy === isEnemy);
      const target = pickBestAllyPowerTarget(allies, this.seals);
      if (target) target.powerMarkers += 2;
    } else if (name === "Mammon") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c !== source && c.faceUp);
      let totalP = 0;
      allInPlay.forEach(c => {
        totalP += c.powerMarkers;
        c.powerMarkers = 0;
      });
      source.powerMarkers += totalP;
    } else if (name === "Bella" || name === "Calmadious" || name === "Skarados" || name === "Metatron") {
      // Activate: Destroy one Marker type on any creature
      const allCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      const target = pickBellaTarget(source, allCards.filter(c => c.powerMarkers > 0 || c.weaknessMarkers > 0), this.seals);
      if (target) {
        // Remove weakness from allies, or power from enemies
        if (target.isEnemy === source.isEnemy && target.weaknessMarkers > 0) {
          target.weaknessMarkers = 0;
        } else if (target.isEnemy !== source.isEnemy && target.powerMarkers > 0) {
          target.powerMarkers = 0;
          target.boardPresencePowerMarkers = 0;
        }
      }
    } else if (name === "Bogva") {
      // Activate: Destroy any creature in play that has a Weakness Marker
      const foesWithWeakness = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && c.weaknessMarkers > 0);
      const target = pickBestHarmTarget(source, foesWithWeakness, this.seals);
      if (target) this.destroyCard(target);
    }
  }

  private handleBattle(cardA: HeadlessCard, cardB: HeadlessCard, sealIdx: number, isAgainstChampion: boolean) {
    this.cardsThatBattledThisRound.push(cardA);
    this.cardsThatBattledThisRound.push(cardB);

    if (cardA.data.destroyAttackerEndOfRound || cardA.data.name === "Fenris Lightfoot" || cardA.data.name === "Elowen Thornver") {
      this.cardsToDestroyAtEndOfRound.push(cardB);
    }
    if (cardB.data.destroyAttackerEndOfRound || cardB.data.name === "Fenris Lightfoot" || cardB.data.name === "Elowen Thornver") {
      this.cardsToDestroyAtEndOfRound.push(cardA);
    }

    // Valerius Nightshade Errata: Steals 1 Power from the opponent before combat damage is calculated.
    const valeriusSteal = this.rules.errataFlags.valeriusStealPower ||
      cardA.data.ability?.includes("steals 1 Power") ||
      cardB.data.ability?.includes("steals 1 Power");

    if (valeriusSteal) {
      if (cardA.data.name === "Valerius Nightshade") {
        cardA.powerMarkers += 1;
        cardB.weaknessMarkers += 1;
      }
      if (cardB.data.name === "Valerius Nightshade") {
        cardB.powerMarkers += 1;
        cardA.weaknessMarkers += 1;
      }
    }

    const isAChamp = isAgainstChampion && this.seals[sealIdx]?.champion === cardA;
    const isBChamp = isAgainstChampion && this.seals[sealIdx]?.champion === cardB;
    const powA = effectivePower(cardA, 'battle', isAChamp);
    const powB = effectivePower(cardB, 'battle', isBChamp);

    if (powA > powB) {
      if (!cardB.isInvincible) {
        this.destroyCard(cardB);
        if (isAgainstChampion) this.seals[sealIdx].champion = null;
      }
      this.handlePostCombatWin(cardA);
    } else if (powB > powA) {
      if (!cardA.isInvincible) {
        this.destroyCard(cardA);
      }
      this.handlePostCombatWin(cardB);
    }
  }

  private handlePostCombatWin(winner: HeadlessCard) {
    const isEnemy = winner.isEnemy;
    if (winner.data.name === "Umbarax") {
      const graveborns = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.faceUp && c.data.type === 'Graveborn' && c.isEnemy === isEnemy).length;
      winner.powerMarkers += 2 + (2 * graveborns);
    } else if (winner.data.name === "Lucian Blackwood") {
      winner.powerMarkers += 2;
    } else if (winner.data.name === "Noble The Great" || winner.data.name === "Noble the Great") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      const target = pickNobleTheGreatFollowUp(winner, foes, this.seals);
      if (target) this.destroyCard(target);
    }
  }

  public destroyCard(card: HeadlessCard) {
    const idxP = this.playerBattlefield.indexOf(card);
    const idxE = this.enemyBattlefield.indexOf(card);
    const seal = this.seals.find(s => s.champion === card);

    if (seal) seal.champion = null;
    else if (idxP !== -1) {
      this.playerBattlefield[idxP] = null;
      this.laneAbilityDestruction[idxP] = 'enemy';
    } else if (idxE !== -1) {
      this.enemyBattlefield[idxE] = null;
      this.laneAbilityDestruction[idxE] = 'player';
    }

    const grave = card.isEnemy ? this.enemyGraveyard : this.playerGraveyard;
    grave.push(card);
  }

  public returnCreatureToOwnerDeck(card: HeadlessCard) {
    const idxP = this.playerBattlefield.indexOf(card);
    const idxE = this.enemyBattlefield.indexOf(card);
    const seal = this.seals.find(s => s.champion === card);

    if (seal) seal.champion = null;
    else if (idxP !== -1) this.playerBattlefield[idxP] = null;
    else if (idxE !== -1) this.enemyBattlefield[idxE] = null;

    const deck = card.isEnemy ? this.enemyDeck : this.playerDeck;
    deck.push({ ...card.data });
  }

  private endRoundCleanup() {
    // Process Deferred Abilities
    for (const card of this.deferredAbilities) {
      if (card && card.faceUp && !this.isGameOver) {
        this.triggerActivateAbility(card, true);
      }
    }
    this.deferredAbilities = [];

    // End of round sacrifices
    [...this.playerBattlefield, ...this.enemyBattlefield].forEach(c => {
      if (c && c.data.sacrificeEndOfTurn) {
        this.destroyCard(c);
      }
    });

    // End of round battle destructions (Fenris Lightfoot, Elowen Thornver)
    for (const card of this.cardsToDestroyAtEndOfRound) {
      if (card && card.faceUp && !this.isGameOver) {
        this.destroyCard(card);
      }
    }
    this.cardsToDestroyAtEndOfRound = [];



    // Clear invincibility
    [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].forEach(c => {
      if (c) c.isInvincible = false;
    });

    this.syncBoardPresencePowerMarkers();
    this.enforceZeroPowerDestruction();

    // Process end-of-round Final Act abilities (Valtarious, Golgothane, Alistar Elren, Kaelarion)
    if (!this.isGameOver) {
      this.processEndOfRoundFinalActs();
      this.syncBoardPresencePowerMarkers();
      this.enforceZeroPowerDestruction();
    }

    if (this.currentRound >= this.rules.maxRounds - 1) {
      this.checkEndGameVictory();
      if (!this.isGameOver) {
        this.addLog(`Tied after Round ${this.currentRound}! Advancing to Sudden Death...`);
        this.currentRound++;
      }
    } else {
      this.currentRound++;
    }
  }

  private syncBoardPresencePowerMarkers() {
    const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);

    allInPlay.forEach(c => {
      let expected = 0;
      if (c.data.dynamicFactionPowerBonus) {
        const { faction, bonusPerCard, excludeSelf } = c.data.dynamicFactionPowerBonus;
        const count = allInPlay.filter(x => x.data.faction === faction && (excludeSelf ? x !== c : true)).length;
        expected = bonusPerCard * count;
      } else if (c.data.name === 'Dawn') {
        expected = allInPlay.filter(x => x.data.faction === 'Avatars of light').length;
      } else if (c.data.name === 'Garmr') {
        const inPlay = allInPlay.filter(x => x.data.faction === 'Lycan').length;
        const inLimbo = [...this.playerLimbo, ...this.enemyLimbo].filter(x => x.data.faction === 'Lycan').length;
        expected = inPlay + inLimbo;
      } else if (c.data.name === 'Pazoo' && !c.data.dynamicFactionPowerBonus) {
        // Legacy Pazoo: counts Graveborn type specifically
        const graveborns = allInPlay.filter(x => x.data.type === 'Graveborn' && x.isEnemy === c.isEnemy).length;
        expected = 2 * graveborns;
      }

      const delta = expected - c.boardPresencePowerMarkers;
      if (delta !== 0) {
        c.powerMarkers += delta;
        c.boardPresencePowerMarkers = expected;
      }
    });
  }

  private enforceZeroPowerDestruction() {
    const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
    for (const c of allInPlay) {
      if (c.data.type === 'Creature' && effectivePower(c) <= 0) {
        this.destroyCard(c);
      }
    }
  }

  private checkEndGameVictory() {
    const pCount = this.seals.filter(s => s.alignment === this.playerAlignment).length;
    const eCount = this.seals.filter(s => s.alignment === this.enemyAlignment).length;

    if (pCount > eCount) {
      this.finalizeGame("Majority of Seals", 'player');
    } else if (eCount > pCount) {
      this.finalizeGame("Majority of Seals", 'enemy');
    } else {
      // Tie breaker by Champions on Seals
      const pChamps = this.seals.filter(s => s.alignment === this.playerAlignment && s.champion !== null).length;
      const eChamps = this.seals.filter(s => s.alignment === this.enemyAlignment && s.champion !== null).length;

      if (pChamps > eChamps) {
        this.finalizeGame("Champion Tie-breaker", 'player');
      } else if (eChamps > pChamps) {
        this.finalizeGame("Champion Tie-breaker", 'enemy');
      } else if (this.currentRound >= this.rules.maxRounds) {
        this.finalizeGame("Draw (Tied Seals and Champions)", 'draw');
      }
    }
  }

  private finalizeGame(winCondition: string, winner?: 'player' | 'enemy' | 'draw') {
    this.isGameOver = true;
    this.gameOverWinCondition = winCondition;
    if (winner) {
      this.gameOverResult = winner;
    } else {
      const pCount = this.seals.filter(s => s.alignment === this.playerAlignment).length;
      const eCount = this.seals.filter(s => s.alignment === this.enemyAlignment).length;
      this.gameOverResult = pCount > eCount ? 'player' : (eCount > pCount ? 'enemy' : 'draw');
    }
    this.addLog(`Game Over: ${this.gameOverResult?.toUpperCase()} wins by ${winCondition}`);
  }
}
