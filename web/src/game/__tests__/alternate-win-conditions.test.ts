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
    logs: [] as string[]
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
    renderQueue: []
  };
  mock.abilityManager = new AbilityManager(mock);
  mock.phaseManager = new PhaseManager(mock);
  vi.spyOn(mock.phaseManager, 'finalizeGame').mockImplementation((reason: string) => {
    mock.state.gameOverResult = 'player';
    mock.state.gameOverReason = reason;
  });
  return mock;
}

function card(name: string, isEnemy = false): CardEntity {
  const def = getCardDef(name);
  return {
    id: `mock-${name}-${Math.random()}`,
    data: { ...def, isEnemy, faceUp: true, originalPower: def.power, powerMarkers: 0, weaknessMarkers: 0 },
    position: 'hand',
    updateVisualMarkers: vi.fn()
  } as unknown as CardEntity;
}

describe('Alternate Win Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Nix (Graveborn Win Condition)', () => {
    it('does not win if less than 4 Graveborns', () => {
      const ctrl = createCtrl();
      const nix = card('Nix');
      ctrl.playerBattlefield[0] = nix;
      ctrl.playerBattlefield[1] = card('Golgothane');
      ctrl.seals[2].champion = card('Umbarax');

      ctrl.abilityManager.handleActivateAbility(nix);
      expect(ctrl.state.gameOverReason).toBeUndefined();
    });

    it('wins if 4 Graveborns and a Champion on a seal', () => {
      const ctrl = createCtrl();
      const nix = card('Nix');
      ctrl.playerBattlefield[0] = nix;
      ctrl.playerBattlefield[1] = card('Golgothane');
      ctrl.playerBattlefield[2] = card('Lycandor');
      ctrl.seals[3].champion = card('Umbarax');

      ctrl.abilityManager.handleActivateAbility(nix);
      expect(ctrl.state.gameOverReason).toBe('Graveborn (4 Graveborn + Champion on Seal)');
    });
  });

  describe('Dawn (Oathbringer Win Condition)', () => {
    it('wins if 4 Oathbringers (Avatars of light) and a Champion on a seal', () => {
      const ctrl = createCtrl();
      const dawn = card('Dawn');
      ctrl.playerBattlefield[0] = dawn;
      ctrl.playerBattlefield[1] = card('Bella');
      ctrl.playerBattlefield[2] = card('Noble The Great');
      ctrl.seals[3].champion = card('Coal');

      ctrl.abilityManager.handleActivateAbility(dawn);
      expect(ctrl.state.gameOverReason).toBe('Dawn (4 Oathbringers + Champion on Seal)');
    });
  });

  describe('Karlyah / Coal (5 Champion Seals Win Condition)', () => {
    it('wins if controlling 5 or more Seals with Champions', () => {
      const ctrl = createCtrl();
      const karlyah = card('Karlyah');
      ctrl.playerBattlefield[0] = karlyah;
      ctrl.seals[0].champion = card('Nix');
      ctrl.seals[1].champion = card('Umbarax');
      ctrl.seals[2].champion = card('Pazoo');
      ctrl.seals[3].champion = card('Skarados');
      ctrl.seals[4].champion = card('Lycandor');

      ctrl.abilityManager.handleActivateAbility(karlyah);
      expect(ctrl.state.gameOverReason).toBe('Five Seals with Champions');
    });
  });
});
