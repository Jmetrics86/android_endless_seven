/**
 * Headless Endless Seven Simulator Types
 */

export enum Alignment {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  NEUTRAL = 'NEUTRAL'
}

export enum Phase {
  PREP = 'PREP',
  RESOLUTION = 'RESOLUTION',
  GAME_OVER = 'GAME_OVER'
}

export interface CardData {
  name: string;
  faction: string;
  type: string;
  power: number;
  isChampion: boolean;
  ability: string;
  markerPower?: number;
  markerWeakness?: number;
  needsAllocation?: boolean;
  hasTargetedAbility?: boolean;
  effect?: string;
  targetType?: string;
  hasNullify?: boolean;
  hasSealTargetAbility?: boolean;
  sealEffect?: string;
  hasGlobalAbility?: boolean;
  hasHaste?: boolean;
  hasLimboAbility?: boolean;
  hasActivate?: boolean;
  cannotBattleOrBeBattled?: boolean;
  sacrificeEndOfTurn?: boolean;
  abilityImmune?: boolean;
  hasLustSealEffect?: boolean;
  hasTarkidosNullifyUsedThisRound?: boolean;
  flipStepBonusPower?: number;
  battleStepBonusPower?: number;
  championBattleBonusPower?: number;
  dynamicFactionPowerBonus?: { faction: string; bonusPerCard: number; excludeSelf?: boolean };
  cannotBattleWhilePowerIs1?: boolean;
  destroyAttackerEndOfRound?: boolean;
}

export interface HeadlessCard {
  id: string;
  data: CardData;
  isEnemy: boolean;
  alignment: Alignment;
  faceUp: boolean;
  powerMarkers: number;
  weaknessMarkers: number;
  boardPresencePowerMarkers: number;
  isInvincible?: boolean;
  hasTarkidosNullifyUsedThisRound?: boolean;
  isHeldForRound?: boolean;
}

export function effectivePower(c: HeadlessCard, step: 'base' | 'flip' | 'battle' = 'base', isChampioningSeal = false): number {
  let p = c.data.power + c.powerMarkers - c.weaknessMarkers;
  if (step === 'flip' && c.data.flipStepBonusPower) {
    p += c.data.flipStepBonusPower;
  }
  if (step === 'battle') {
    if (c.data.battleStepBonusPower) p += c.data.battleStepBonusPower;
    if (isChampioningSeal && c.data.championBattleBonusPower) p += c.data.championBattleBonusPower;
  }
  return p;
}

export interface HeadlessSeal {
  index: number;
  alignment: Alignment;
  champion: HeadlessCard | null;
  hasWard?: boolean;
}

export interface SimulationResult {
  gameIndex: number;
  winner: 'player' | 'enemy' | 'draw';
  winningSideName: string;
  rounds: number;
  winCondition: string;
  playerSeals: number;
  enemySeals: number;
  neutralSeals: number;
  playerChampions: number;
  enemyChampions: number;
  logs: string[];
}

export interface MatchupStats {
  matchupName: string;
  sideAName: string;
  sideBName: string;
  totalGames: number;
  sideAWins: number;
  sideBWins: number;
  draws: number;
  sideAWinRate: number;
  sideBWinRate: number;
  drawRate: number;
  avgRounds: number;
  winConditionsBreakdown: Record<string, number>;
  avgSealsControlled: {
    sideA: number;
    sideB: number;
    neutral: number;
  };
  totalDurationMs: number;
}
