/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Clean, modular Test Controller Harness for Endless Seven (Variant-2026-08-13)
 * Provides comprehensive mocking of Three.js, GSAP, and audio/sound with synchronous callbacks.
 */

import { vi } from 'vitest';
import { Alignment, Phase, GameState, CardData, HoveredCardInfo } from '../../../types';
import { CardEntity } from '../../../entities/CardEntity';
import { SealEntity } from '../../../entities/SealEntity';
import { AbilityManager } from '../../AbilityManager';
import { PhaseManager } from '../../PhaseManager';
import { IGameController } from '../../interfaces';

// Ensure GSAP animations execute immediately without timeouts
vi.mock('gsap', () => ({
  default: {
    to: vi.fn((_target: unknown, _vars: { onComplete?: () => void; duration?: number }) => {
      const vars = _vars as { onComplete?: () => void };
      if (typeof vars?.onComplete === 'function') {
        vars.onComplete();
      }
    }),
    killTweensOf: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      call: vi.fn((fn: () => void) => { fn?.(); return this; }),
    })),
  },
}));

export interface TestHarness {
  controller: IGameController;
  abilityManager: AbilityManager;
  phaseManager: PhaseManager;
  state: GameState;
  resolvePendingAbility: () => void;
  selectPendingTarget: (target: CardEntity) => void;
  selectPendingSeal: (sealIdx: number) => void;
  nullifyPending: (choice: boolean) => void;
  reset: () => void;
}

export function createTestHarness(initialPlayerAlignment: Alignment = Alignment.LIGHT): TestHarness {
  const playerBattlefield: (CardEntity | null)[] = Array(7).fill(null);
  const enemyBattlefield: (CardEntity | null)[] = Array(7).fill(null);
  const playerHand: CardEntity[] = [];
  const playerLimbo: CardEntity[] = [];
  const enemyLimbo: CardEntity[] = [];
  const playerGraveyard: CardEntity[] = [];
  const enemyGraveyard: CardEntity[] = [];
  const playerDeck: CardData[] = [];
  const enemyDeck: CardData[] = [];
  const enemyPrepRemainder: CardData[] = [];
  const cardsThatBattledThisRound: CardEntity[] = [];

  const seals: SealEntity[] = Array.from({ length: 7 }, (_, i) => {
    const sealObj = {
      index: i,
      champion: null as CardEntity | null,
      alignment: Alignment.NEUTRAL as Alignment,
      hasWard: false,
      setWard: vi.fn((hasWard: boolean) => {
        sealObj.hasWard = hasWard;
      }),
      mesh: {
        position: { x: (i - 3) * 3.8, y: 0, z: 0, set: vi.fn() },
        rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
        add: vi.fn(),
        remove: vi.fn(),
      },
      updateVisuals: vi.fn(),
      pulse: vi.fn(),
    };
    return sealObj as unknown as SealEntity;
  });

  const state: any = {
    playerAlignment: initialPlayerAlignment,
    currentRound: 1,
    currentPhase: Phase.PREP,
    playerScore: 0,
    enemyScore: 0,
    playerDeckCount: 20,
    enemyDeckCount: 20,
    playerGraveyardCount: 0,
    enemyGraveyardCount: 0,
    instructionText: '',
    phaseStep: '',
    powerPool: 0,
    weaknessPool: 0,
    logs: [],
    playerLimboCards: [],
    enemyLimboCards: [],
    playerGraveyardCards: [],
    enemyGraveyardCards: [],
    playerDeckCards: [],
    enemyDeckCards: [],
    playerAbilityQueue: [],
    enemyAbilityQueue: [],
    slowMode: false,
    isResolutionPaused: false,
    combatInterstitial: null,
    decisionContext: undefined,
    gameOverResult: null,
    gameOverReason: undefined,
  };

  const controller: any = {
    state,
    playerBattlefield,
    enemyBattlefield,
    playerHand,
    playerLimbo,
    enemyLimbo,
    playerGraveyard,
    enemyGraveyard,
    playerDeck,
    enemyDeck,
    enemyPrepRemainder,
    seals,
    playerLimboMesh: { position: { x: -16, y: 0, z: 6 } },
    enemyLimboMesh: { position: { x: 16, y: 0, z: -6 } },
    playerGraveyardMesh: { position: { x: -16, y: 0, z: 10 } },
    enemyGraveyardMesh: { position: { x: 16, y: 0, z: -10 } },
    sceneManager: { scene: { add: vi.fn(), remove: vi.fn() }, camera: { position: { set: vi.fn() } }, cameraTarget: {} },
    entityManager: { add: vi.fn(), remove: vi.fn() },
    uiManager: { showMessage: vi.fn(), updateScores: vi.fn() },
    isProcessing: false,
    sealCameraZoomedIn: false,
    currentResolvingSealIndex: 0,
    cardsThatBattledThisRound,
    updateState: vi.fn((patch: Partial<GameState>) => {
      Object.assign(state, patch);
    }),

    addLog: vi.fn((msg: string) => {
      state.logs.push(msg);
    }),

    cardToHoveredInfo: vi.fn((card: CardEntity): HoveredCardInfo => ({
      name: card.data.name,
      faction: card.data.faction,
      power: card.data.power,
      type: card.data.type,
      isChampion: card.data.isChampion,
      ability: card.data.ability,
      powerMarkers: card.data.powerMarkers,
      weaknessMarkers: card.data.weaknessMarkers,
    })),

    isImmuneToAbilities: (target: CardEntity, source: CardEntity) => {
      return controller.abilityManager.isImmuneToAbilities(target, source);
    },

    isProtected: vi.fn(() => false),

    destroyCard: vi.fn((card: CardEntity, isEnemy: boolean, idx: number, isChampion: boolean, killedBy?: { cardName: string; cause: 'combat' | 'ability' }) => {
      if (!card) return;
      if (isChampion) {
        if (seals[idx] && seals[idx].champion === card) {
          seals[idx].champion = null;
        }
      } else if (isEnemy) {
        if (enemyBattlefield[idx] === card) {
          enemyBattlefield[idx] = null;
        }
      } else {
        if (playerBattlefield[idx] === card) {
          playerBattlefield[idx] = null;
        }
      }
      const gv = isEnemy ? enemyGraveyard : playerGraveyard;
      if (!gv.includes(card)) {
        gv.push(card);
      }
      controller.addLog(`${card.data.name} was destroyed${killedBy ? ` by ${killedBy.cardName}` : ''}.`);
    }),

    claimSeal: vi.fn(async (idx: number, alignment: Alignment, cause?: { type: 'combat' | 'ability'; cardName: string }) => {
      const seal = seals[idx];
      if (!seal) return;
      // Ward Marker absorption
      if (seal.hasWard && alignment !== seal.alignment) {
        seal.setWard(false);
        controller.addLog(`Ward Marker on Seal ${idx + 1} absorbed influence change!`);
        return;
      }
      seal.alignment = alignment;
      controller.addLog(`Seal ${idx + 1} claimed as ${alignment}${cause ? ` via ${cause.cardName}` : ''}.`);
    }),

    disposeCard: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    showCombatDamageFloats: vi.fn(),

    allocateCounters: (card: CardEntity, isAI: boolean) => controller.abilityManager.allocateCounters(card, isAI),
    handleTargetedAbility: (source: CardEntity, isAI: boolean) => controller.abilityManager.handleTargetedAbility(source, isAI),
    executeGlobalAbility: (source: CardEntity) => controller.abilityManager.executeGlobalAbility(source),
    handleSealTargetAbility: (source: CardEntity, isAI: boolean) => controller.abilityManager.handleSealTargetAbility(source, isAI),
    handleBattle: (attacker: CardEntity, defender: CardEntity, idx: number, isAgainstChamp: boolean) => controller.phaseManager.handleBattle(attacker, defender, idx, isAgainstChamp),
    handleSiege: (idx: number, card: CardEntity | null, isPlayer: boolean) => controller.phaseManager.handleSiege(idx, card, isPlayer),
    
    ascendToSeal: (card: CardEntity, idx: number) => {
      const seal = seals[idx];
      if (!seal) return;
      if (seal.hasWard) {
        seal.setWard(false);
        controller.addLog(`Ward Marker on Seal ${idx + 1} blocked ascension of ${card.data.name}!`);
        return;
      }
      seal.champion = card;
      if (card.data.isEnemy) {
        if (enemyBattlefield[idx] === card) enemyBattlefield[idx] = null;
      } else {
        if (playerBattlefield[idx] === card) playerBattlefield[idx] = null;
      }
      controller.addLog(`${card.data.name} ascends to champion Seal ${idx + 1}!`);
    },

    checkGameOver: vi.fn(() => controller.phaseManager.checkGameOver()),
    startPrep: vi.fn(() => controller.phaseManager.startPrep()),
    endPrep: vi.fn(() => controller.phaseManager.endPrep()),
    startResolution: vi.fn(async () => {
      controller.isProcessing = true;
      try {
        await controller.phaseManager.startResolution();
      } finally {
        controller.isProcessing = false;
      }
    }),
    resolveSeal: vi.fn(async (idx: number) => {
      controller.isProcessing = true;
      try {
        await controller.phaseManager.resolveSeal(idx);
      } finally {
        controller.isProcessing = false;
      }
    }),
    appendEnemyPrepCardsToLimbo: vi.fn(() => {
      while (enemyPrepRemainder.length > 0) {
        const c = enemyPrepRemainder.shift();
        if (c) enemyLimbo.push(c as any);
      }
    }),
    forceSkip: vi.fn(),
    setSlowMode: vi.fn((enabled: boolean) => {
      state.slowMode = enabled;
    }),
    selectLimboCardForAbility: vi.fn(),
    realignPlayerHand: vi.fn(),
  };

  const abilityManager = new AbilityManager(controller);
  const phaseManager = new PhaseManager(controller);
  controller.abilityManager = abilityManager;
  controller.phaseManager = phaseManager;

  // Universal auto-resolver hooks for test harness promises
  let _resolutionCallback: any = null;
  Object.defineProperty(controller, 'resolutionCallback', {
    get: () => _resolutionCallback,
    set: (cb) => {
      _resolutionCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_resolutionCallback) {
            const fn = _resolutionCallback;
            _resolutionCallback = null;
            const pending = (controller as any).pendingAbilityData;
            if (pending?.validTargets?.length > 0) {
              try {
                abilityManager.applyAbilityEffect(pending.validTargets[0], pending);
              } catch (_) {}
            }
            try { fn(); } catch (_) {}
          }
        });
      }
    },
    configurable: true
  });

  let _sealSelectionCallback: any = null;
  Object.defineProperty(controller, 'sealSelectionCallback', {
    get: () => _sealSelectionCallback,
    set: (cb) => {
      _sealSelectionCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_sealSelectionCallback) {
            const fn = _sealSelectionCallback;
            _sealSelectionCallback = null;
            const vacant = seals.findIndex(s => !s.champion);
            fn(vacant >= 0 ? vacant : 0);
          }
        });
      }
    },
    configurable: true
  });

  let _markerTypeCallback: any = null;
  Object.defineProperty(controller, 'markerTypeCallback', {
    get: () => _markerTypeCallback,
    set: (cb) => {
      _markerTypeCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_markerTypeCallback) {
            const fn = _markerTypeCallback;
            _markerTypeCallback = null;
            fn('power');
          }
        });
      }
    },
    configurable: true
  });

  let _nullifyCallback: any = null;
  Object.defineProperty(controller, 'nullifyCallback', {
    get: () => _nullifyCallback,
    set: (cb) => {
      _nullifyCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_nullifyCallback) {
            const fn = _nullifyCallback;
            _nullifyCallback = null;
            fn('skip');
          }
        });
      }
    },
    configurable: true
  });

  let _creatureTypeCallback: any = null;
  Object.defineProperty(controller, 'creatureTypeCallback', {
    get: () => _creatureTypeCallback,
    set: (cb) => {
      _creatureTypeCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_creatureTypeCallback) {
            const fn = _creatureTypeCallback;
            _creatureTypeCallback = null;
            const opts = (state as any).creatureTypeOptions || ['Graveborn'];
            fn(opts[0] || 'Graveborn');
          }
        });
      }
    },
    configurable: true
  });

  let _sealContinueCallback: any = null;
  Object.defineProperty(controller, 'sealContinueCallback', {
    get: () => _sealContinueCallback,
    set: (cb) => {
      _sealContinueCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_sealContinueCallback) {
            const fn = _sealContinueCallback;
            _sealContinueCallback = null;
            fn();
          }
        });
      }
    },
    configurable: true
  });

  let _singleTargetCallback: any = null;
  Object.defineProperty(controller, 'singleTargetCallback', {
    get: () => _singleTargetCallback,
    set: (cb) => {
      _singleTargetCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_singleTargetCallback) {
            const fn = _singleTargetCallback;
            _singleTargetCallback = null;
            const valid = (controller as any).pendingAbilityData?.validTargets || [];
            fn(valid[0] || null);
          }
        });
      }
    },
    configurable: true
  });

  let _targetChoiceCallback: any = null;
  Object.defineProperty(controller, 'targetChoiceCallback', {
    get: () => _targetChoiceCallback,
    set: (cb) => {
      _targetChoiceCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_targetChoiceCallback) {
            const fn = _targetChoiceCallback;
            _targetChoiceCallback = null;
            fn('power');
          }
        });
      }
    },
    configurable: true
  });

  let _targetCardCallback: any = null;
  Object.defineProperty(controller, 'targetCardCallback', {
    get: () => _targetCardCallback,
    set: (cb) => {
      _targetCardCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_targetCardCallback) {
            const fn = _targetCardCallback;
            _targetCardCallback = null;
            const valid = (controller as any).pendingAbilityData?.validTargets || [];
            fn(valid[0] || null);
          }
        });
      }
    },
    configurable: true
  });

  let _alignmentCallback: any = null;
  Object.defineProperty(controller, 'alignmentCallback', {
    get: () => _alignmentCallback,
    set: (cb) => {
      _alignmentCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_alignmentCallback) {
            const fn = _alignmentCallback;
            _alignmentCallback = null;
            fn(Alignment.LIGHT);
          }
        });
      }
    },
    configurable: true
  });

  let _alignmentChoiceCallback: any = null;
  Object.defineProperty(controller, 'alignmentChoiceCallback', {
    get: () => _alignmentChoiceCallback,
    set: (cb) => {
      _alignmentChoiceCallback = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_alignmentChoiceCallback) {
            const fn = _alignmentChoiceCallback;
            _alignmentChoiceCallback = null;
            fn(Alignment.LIGHT);
          }
        });
      }
    },
    configurable: true
  });


  let _metatronResolve: any = null;
  Object.defineProperty(abilityManager, 'metatronResolve', {
    get: () => _metatronResolve,
    set: (cb) => {
      _metatronResolve = cb;
      if (cb) {
        queueMicrotask(() => {
          if (_metatronResolve) {
            const fn = _metatronResolve;
            _metatronResolve = null;
            const valid = (controller as any).pendingAbilityData?.validTargets || [];
            fn(valid[0] || null);
          }
        });
      }
    },
    configurable: true
  });

  return {
    controller,
    abilityManager,
    phaseManager,
    state,

    resolvePendingAbility: () => {
      if (controller.resolutionCallback) {
        const cb = controller.resolutionCallback;
        controller.resolutionCallback = null;
        cb();
      }
    },

    selectPendingTarget: (target: CardEntity) => {
      if (controller.pendingAbilityData) {
        abilityManager.applyAbilityEffect(target, controller.pendingAbilityData);
        if (controller.resolutionCallback) {
          const cb = controller.resolutionCallback;
          controller.resolutionCallback = null;
          cb();
        }
      }
    },

    selectPendingSeal: (sealIdx: number) => {
      if (controller.sealSelectionCallback) {
        const cb = controller.sealSelectionCallback;
        controller.sealSelectionCallback = null;
        cb(sealIdx);
      }
    },

    nullifyPending: (choice: boolean) => {
      if (controller.nullifyCallback) {
        const cb = controller.nullifyCallback;
        controller.nullifyCallback = null;
        cb(choice);
      }
    },

    reset: () => {
      playerBattlefield.fill(null);
      enemyBattlefield.fill(null);
      playerHand.length = 0;
      playerLimbo.length = 0;
      enemyLimbo.length = 0;
      playerGraveyard.length = 0;
      enemyGraveyard.length = 0;
      playerDeck.length = 0;
      enemyDeck.length = 0;
      enemyPrepRemainder.length = 0;
      cardsThatBattledThisRound.length = 0;
      seals.forEach((s, i) => {
        s.index = i;
        s.champion = null;
        s.alignment = Alignment.NEUTRAL;
        s.setWard(false);
      });
      state.logs.length = 0;
      state.currentPhase = Phase.PREP;
      state.currentRound = 1;
      state.gameOverResult = null;
      state.gameOverReason = undefined;
      controller.resolutionCallback = null;
      controller.pendingAbilityData = null;
      controller.nullifyCallback = null;
      controller.sealSelectionCallback = null;
      vi.clearAllMocks();
    }
  };
}
