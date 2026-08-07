import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbilityManager } from '../AbilityManager';
import { PhaseManager } from '../PhaseManager';
import { CardData, CardEntity, Alignment } from '../../types';
import { LIGHT_POOL, DARK_POOL } from '../../constants';

vi.mock('gsap', () => ({
  default: {
    to: vi.fn((_target: unknown, _vars: { onComplete?: () => void }) => {
      const vars = _vars as { onComplete?: () => void };
      if (typeof vars?.onComplete === 'function') {
        vars.onComplete();
      }
    }),
  },
}));

function getCardDef(name: string): CardData {
  const card = [...LIGHT_POOL, ...DARK_POOL].find(c => c.name === name);
  if (!card) throw new Error(`Card ${name} not found in constants`);
  return card;
}

function createCtrl() {
  const playerBattlefield = new Array(7).fill(null);
  const enemyBattlefield = new Array(7).fill(null);
  const seals = Array.from({ length: 7 }, (_, i) => ({
    id: i,
    alignment: Alignment.NEUTRAL,
    champion: null as any,
  }));
  const state = {
    gameOverResult: null as string | null,
    gameOverReason: undefined as string | undefined,
    playerAlignment: Alignment.LIGHT,
    enemyAlignment: Alignment.DARK,
    logs: [] as string[],
    decisionContext: null as any,
  };
  const mock: any = {
    state,
    playerBattlefield,
    enemyBattlefield,
    playerHand: [],
    playerDeck: [],
    enemyDeck: [],
    seals,
    sceneManager: { scene: {} },
    addLog: (msg: string) => state.logs.push(msg),
    renderQueue: [],
    cardsThatBattledThisRound: [],
    showCombatDamageFloats: vi.fn(),
    destroyCard: vi.fn((card: CardEntity, isEnemy: boolean, idx: number, isAgainstChamp: boolean = false) => {
      if (isAgainstChamp) {
        mock.seals[idx].champion = null;
      } else {
        if (isEnemy) {
          mock.enemyBattlefield[idx] = null;
        } else {
          mock.playerBattlefield[idx] = null;
        }
      }
    }),
    disposeCard: vi.fn()
  };
  mock.abilityManager = new AbilityManager(mock);
  mock.phaseManager = new PhaseManager(mock);
  vi.spyOn(mock.phaseManager, 'finalizeGame').mockImplementation((reason: string) => {
    mock.state.gameOverResult = 'player';
    mock.state.gameOverReason = reason;
  });
  return mock;
}

function card(name: string, isEnemy = false, powerOverride?: number): CardEntity {
  const def = getCardDef(name);
  return {
    id: `mock-${name}-${Math.random()}`,
    data: { ...def, isEnemy, faceUp: true, originalPower: powerOverride ?? def.power, power: powerOverride ?? def.power, powerMarkers: 0, weaknessMarkers: 0 },
    position: 'hand',
    updateVisualMarkers: vi.fn(),
    mesh: { position: { x: 0, y: 0, z: 0 } }
  } as unknown as CardEntity;
}

describe('Bounce Mechanics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Sulvian Vane bounces attacker and is destroyed normally if she loses', async () => {
    const ctrl = createCtrl();
    const sulvian = card('Sulvian Vane');
    // attacker power 10 > sulvian power 5
    const attacker = card('Fenris Lightfoot', true, 10);

    ctrl.playerBattlefield[0] = sulvian;
    ctrl.enemyBattlefield[0] = attacker;
    ctrl.enemyDeck = [];

    await ctrl.phaseManager.handleBattle(sulvian, attacker, 0, false);

    // Sulvian destroyed
    expect(ctrl.destroyCard).toHaveBeenCalled();
    expect(ctrl.playerBattlefield[0]).toBeNull();
    // Attacker bounced
    expect(ctrl.enemyBattlefield[0]).toBeNull();
    expect(ctrl.enemyDeck.length).toBe(1);
    expect(ctrl.enemyDeck[0].name).toBe(attacker.data.name);
  });

  it('Duke Aren Drakos bounces ally creature to player deck', () => {
    const ctrl = createCtrl();
    const duke = card('Duke Aren Drakos');
    const target = card('Fenris Lightfoot');

    ctrl.playerBattlefield[0] = duke;
    ctrl.playerBattlefield[1] = target;
    ctrl.playerDeck = [];

    ctrl.abilityManager.applyAbilityEffect(target, { source: duke, effect: 'return' });

    expect(ctrl.playerBattlefield[1]).toBeNull();
    expect(ctrl.playerDeck.length).toBe(1);
    expect(ctrl.playerDeck[0].name).toBe(target.data.name);
  });
});
