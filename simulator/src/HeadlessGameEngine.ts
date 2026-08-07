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
  public laneAbilityDestruction: ('player' | 'enemy' | null)[] = [null, null, null, null, null, null, null];

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

  constructor(
    playerDeck: CardData[],
    enemyDeck: CardData[],
    playerSideName = "Side A",
    enemySideName = "Side B",
    playerAlignment = Alignment.LIGHT,
    enemyAlignment = Alignment.DARK,
    playerAIType: 'easy' | 'smart' | 'neural' = 'easy',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'easy'
  ) {
    this.playerDeck = [...playerDeck];
    this.enemyDeck = [...enemyDeck];
    this.playerSideName = playerSideName;
    this.enemySideName = enemySideName;
    this.playerAlignment = playerAlignment;
    this.enemyAlignment = enemyAlignment;
    this.playerAIType = playerAIType;
    this.enemyAIType = enemyAIType;

    this.playerBattlefield = Array(GAME_CONSTANTS.SEVEN).fill(null);
    this.enemyBattlefield = Array(GAME_CONSTANTS.SEVEN).fill(null);

    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
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
    while (!this.isGameOver && this.currentRound <= 4) {
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
    this.laneAbilityDestruction = [null, null, null, null, null, null, null];

    // Attrition check
    if (this.playerDeck.length < 8 || this.enemyDeck.length < 8) {
      const pLen = this.playerDeck.length;
      const eLen = this.enemyDeck.length;
      let result: 'player' | 'enemy' | 'draw' = 'draw';
      if (pLen < 8 && eLen < 8) result = 'draw';
      else if (pLen < 8) result = 'enemy';
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

    // Draw 8 cards for Player & Enemy
    this.playerHand = [];
    this.enemyHand = [];

    for (let i = 0; i < 8; i++) {
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

    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      if (this.isGameOver) break;
      this.resolveSeal(i);
    }
  }

  private resolveSeal(idx: number) {
    const seal = this.seals[idx];
    let pCard = this.playerBattlefield[idx];
    let eCard = this.enemyBattlefield[idx];

    // Haste Strike check
    const pHaste = pCard && pCard.data.hasHaste;
    const eHaste = eCard && eCard.data.hasHaste;

    if ((pHaste || eHaste) && !pCard?.data.cannotBattleOrBeBattled && !eCard?.data.cannotBattleOrBeBattled) {
      if (pCard && seal.champion && seal.champion.isEnemy) {
        pCard.faceUp = true;
        seal.champion.faceUp = true;
        this.handleBattle(pCard, seal.champion, idx, true);
      } else if (eCard && seal.champion && !seal.champion.isEnemy) {
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
    if (pCard && eCard && effectivePower(pCard) === effectivePower(eCard) && !pCard.data.cannotBattleOrBeBattled && !eCard.data.cannotBattleOrBeBattled) {
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
      if (!pCard.data.cannotBattleOrBeBattled && !seal.champion.data.cannotBattleOrBeBattled) {
        this.handleBattle(pCard, seal.champion, idx, true);
      }
    } else if (eCard && seal.champion && !seal.champion.isEnemy) {
      if (!eCard.data.cannotBattleOrBeBattled && !seal.champion.data.cannotBattleOrBeBattled) {
        this.handleBattle(eCard, seal.champion, idx, true);
      }
    } else if (pCard && eCard) {
      if (!pCard.data.cannotBattleOrBeBattled && !eCard.data.cannotBattleOrBeBattled) {
        this.handleBattle(pCard, eCard, idx, false);
      }
    }

    // Refresh slots again after combat
    pCard = this.playerBattlefield[idx];
    eCard = this.enemyBattlefield[idx];

    // Step D: Siege Phase (Alignment Change)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && !eCard) {
        const canCorrupt = !this.seals.some(s => s.champion && s.champion.data.name === 'Valtarious' && s.champion.isEnemy !== pCard!.isEnemy);
        if (canCorrupt || seal.alignment !== this.enemyAlignment) {
          seal.alignment = this.playerAlignment;
        }
      } else if (eCard && !pCard) {
        const canCorrupt = !this.seals.some(s => s.champion && s.champion.data.name === 'Valtarious' && s.champion.isEnemy !== eCard!.isEnemy);
        if (canCorrupt || seal.alignment !== this.playerAlignment) {
          seal.alignment = this.enemyAlignment;
        }
      } else if (!pCard && !eCard && this.laneAbilityDestruction[idx]) {
        // Ability-based defender destruction without a card present!
        const claimingSide = this.laneAbilityDestruction[idx];
        const isPlayerClaim = claimingSide === 'player';
        const targetAlignment = isPlayerClaim ? this.playerAlignment : this.enemyAlignment;
        const oppAlignment = isPlayerClaim ? this.enemyAlignment : this.playerAlignment;
        const canCorrupt = !this.seals.some(s => s.champion && s.champion.data.name === 'Valtarious' && s.champion.isEnemy !== isPlayerClaim);
        if (canCorrupt || seal.alignment !== oppAlignment) {
          seal.alignment = targetAlignment;
        }
      }
    }

    // Step E: Ascension Phase (Champion takes control of Seal)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && pCard.data.isChampion) {
        seal.champion = pCard;
        this.playerBattlefield[idx] = null;
      } else if (eCard && eCard.data.isChampion) {
        seal.champion = eCard;
        this.enemyBattlefield[idx] = null;
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

  private triggerFlipAbility(card: HeadlessCard, sealIdx: number) {
    const isEnemy = card.isEnemy;
    const name = card.data.name;

    if (name === "Dawn") {
      const oathbringers = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.faction === "Avatars of light").length;
      card.powerMarkers += oathbringers;
    } else if (name === "Bella") {
      const champsOnSeals = this.seals.map(s => s.champion).filter((c): c is HeadlessCard => c !== null && c.isEnemy !== isEnemy);
      const target = pickBestHarmTarget(card, champsOnSeals, this.seals);
      if (target) {
        const s = this.seals.find(sec => sec.champion === target);
        if (s) {
          this.destroyCard(target);
          s.champion = null;
        }
      }
    } else if (name === "Calmadious") {
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      const valid = this.seals.filter(s => !s.champion && s.alignment === oppAlign);
      if (valid.length > 0) {
        valid[0].alignment = isEnemy ? this.enemyAlignment : this.playerAlignment;
      }
    } else if (name === "Skarados") {
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      this.seals.filter(s => !s.champion && s.alignment === oppAlign).forEach(s => {
        s.alignment = isEnemy ? this.enemyAlignment : this.playerAlignment;
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
    } else if (name === "Varg Fur-back") {
      const allCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      for (let i = 0; i < 3; i++) {
        const target = pickBestAllyPowerTarget(allCards.filter(c => c.isEnemy === isEnemy), this.seals);
        if (target) target.powerMarkers++;
      }
    } else if (name === "Oriel The bold" || name === "Elowen Thornver") {
      const valid = this.seals.filter(s => !s.champion);
      const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
      const oppAlign = isEnemy ? this.playerAlignment : this.enemyAlignment;
      const chosen = pickSealForAbility(valid, oppAlign, myAlign, oppAlign);
      if (chosen) {
        chosen.alignment = myAlign;
      }
    } else if (name === "Nix") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
      const types = Array.from(new Set(allInPlay.map(c => c.data.faction)));
      const chosenType = pickNixCreatureType(types, allInPlay, isEnemy);
      if (chosenType) {
        allInPlay.filter(c => c.data.faction === chosenType).forEach(c => this.destroyCard(c));
      }
    } else if (name === "Golgothane" || name === "Kaelarion") {
      const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      const target = pickBestHarmTarget(card, allInPlay, this.seals);
      if (target) this.destroyCard(target);
    } else if (name === "Lycandor") {
      const gravebornCount = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.faceUp && c.data.type === 'Graveborn' && c.isEnemy === isEnemy).length;
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      foes.forEach(f => {
        f.weaknessMarkers += 2 * gravebornCount;
      });
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
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy);
      foes.forEach(f => f.weaknessMarkers += 1);
    } else if (name === "Alistar Elren" || name === "Belphegor") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && !c.data.abilityImmune);
      const target = pickBestEnemyWeaknessTarget(foes, this.seals);
      if (target) target.weaknessMarkers += 3;
    } else if (name === "Zelus") {
      const foes = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp && c.isEnemy !== isEnemy && effectivePower(c) >= effectivePower(card) && !c.data.abilityImmune);
      const target = pickBestEnemyWeaknessTarget(foes, this.seals);
      if (target) target.weaknessMarkers += 3;
    } else if (name === "Desire") {
      if (this.playerBattlefield[sealIdx]) {
        this.destroyCard(this.playerBattlefield[sealIdx]!);
      }
      if (this.enemyBattlefield[sealIdx]) {
        this.destroyCard(this.enemyBattlefield[sealIdx]!);
      }
      if (!this.seals[sealIdx].champion) {
        this.seals[sealIdx].alignment = isEnemy ? this.enemyAlignment : this.playerAlignment;
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
      const oathbringers = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)]
        .filter(c => c !== null && c.faceUp && c.data.faction === "Avatars of light").length;
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
    } else if (name === "Anakim The Wise") {
      const myAlign = isEnemy ? this.enemyAlignment : this.playerAlignment;
      const idx = pickAnakimSealIndex(this.seals, myAlign);
      if (idx !== -1) {
        this.lockedSealIndex = idx;
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
    }
  }

  private handleBattle(cardA: HeadlessCard, cardB: HeadlessCard, sealIdx: number, isAgainstChampion: boolean) {
    this.cardsThatBattledThisRound.push(cardA);
    this.cardsThatBattledThisRound.push(cardB);

    // Valerius Nightshade Errata: Steals 1 Power from the opponent before combat damage is calculated.
    if (cardA.data.name === "Valerius Nightshade") {
      cardA.powerMarkers += 1;
      cardB.weaknessMarkers += 1;
    }
    if (cardB.data.name === "Valerius Nightshade") {
      cardB.powerMarkers += 1;
      cardA.weaknessMarkers += 1;
    }

    const powA = effectivePower(cardA);
    const powB = effectivePower(cardB);

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
    } else if (winner.data.name === "Noble The Great") {
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

    // End of round buffs (Kaelarion)
    [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].forEach(c => {
      if (c && c.data.name === "Kaelarion") {
        c.powerMarkers += 2;
      }
    });

    // Clear invincibility
    [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].forEach(c => {
      if (c) c.isInvincible = false;
    });

    this.syncBoardPresencePowerMarkers();
    this.enforceZeroPowerDestruction();

    if (this.currentRound >= 3) {
      this.checkEndGameVictory();
      if (!this.isGameOver) {
        this.addLog("Tied after Round 3! Advancing to Round 4 Sudden Death...");
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
      if (c.data.name === 'Dawn') {
        expected = allInPlay.filter(x => x.data.faction === 'Avatars of light').length;
      } else if (c.data.name === 'Garmr') {
        const inPlay = allInPlay.filter(x => x.data.faction === 'Lycan').length;
        const inLimbo = [...this.playerLimbo, ...this.enemyLimbo].filter(x => x.data.faction === 'Lycan').length;
        expected = inPlay + inLimbo;
      } else if (c.data.name === 'Pazoo') {
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
      } else if (this.currentRound >= 4) {
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
