/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEndStats } from './achievements/types';

export enum Alignment {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  NEUTRAL = 'NEUTRAL'
}

export enum Phase {
  PREP = 'PREP',
  RESOLUTION = 'RESOLUTION',
  COUNTER_ALLOCATION = 'COUNTER_ALLOCATION',
  ABILITY_TARGETING = 'ABILITY_TARGETING',
  SEAL_TARGETING = 'SEAL_TARGETING',
  DELTA_BUFF_TARGETING = 'DELTA_BUFF_TARGETING',
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
  /** Cyprian (formerly Fledgeling): Cannot battle or be battled */
  cannotBattleOrBeBattled?: boolean;
  /** Cyprian (formerly Fledgeling): Sacrifice at end of turn */
  sacrificeEndOfTurn?: boolean;
  /** Belphegor (formerly Sloth): Unaffected by abilities */
  abilityImmune?: boolean;
  /** Desire (formerly Lust): After sacrifice, may change seal influence if no champion */
  hasLustSealEffect?: boolean;
  hasTarkidosNullifyUsedThisRound?: boolean;
}

/** Card summary for magnified hover preview (small screens). */
export interface HoveredCardInfo {
  name: string;
  faction: string;
  power: number;
  type: string;
  isChampion: boolean;
  ability: string;
  powerMarkers: number;
  weaknessMarkers: number;
  /** Path under public/ for face art, or undefined if none. */
  faceArtPath?: string;
}

export interface QueuedAbility {
  id: string;
  cardName: string;
  description: string;
  abilityType: 'activate' | 'limbo';
  requiredLocation: 'board' | 'limbo';
  sourceCard: any;
  isPlayer: boolean;
  valid: boolean;
  faceArtPath?: string;
}

export interface GameState {
  playerAlignment: Alignment;
  currentRound: number;
  currentPhase: Phase;
  playerScore: number;
  enemyScore: number;
  playerDeckCount: number;
  enemyDeckCount: number;
  playerGraveyardCount: number;
  enemyGraveyardCount: number;
  instructionText: string;
  phaseStep: string;
  powerPool: number;
  weaknessPool: number;
  abilitySourceCardName?: string;
  lockedSealIndex?: number;
  decisionContext?: 'FALLEN_ONE' | 'DELTA_SACRIFICE' | 'LUNA_NULLIFY' | 'ALMIGHTY_MARKER_TYPE' | 'DESTROYER_MARKER_TYPE' | 'LUST_SEAL_INFLUENCE' | 'DEATH_CREATURE_TYPE' | 'COAL_BLOCK_ASCENSION';
  /** Seal index when choosing influence (e.g. Lust effect). */
  sealIndexForChoice?: number;
  /** Death Flip: creature types in play to choose from (Avatar, God, Horseman, Vampyre, Lycan, Celestial, Daemon). */
  creatureTypeOptions?: string[];
  /** Stable message for the current decision dialog (not overwritten by hover). */
  decisionMessage?: string;
  logs: string[];
  /** Set when a card is hovered (for small-screen magnified preview). Cleared when not hovered or when a prompt is active. */
  hoveredCard?: HoveredCardInfo | null;
  /** Set when a card is being dragged (Prep phase long-press). */
  draggingCard?: HoveredCardInfo | null;
  /** Client coordinates for the drag preview. */
  dragPosition?: { x: number; y: number } | null;
  /** Card summaries for Limbo/Graveyard search UI. Updated whenever state is pushed. */
  playerLimboCards: HoveredCardInfo[];
  enemyLimboCards: HoveredCardInfo[];
  playerGraveyardCards: HoveredCardInfo[];
  enemyGraveyardCards: HoveredCardInfo[];
  /** Card summaries for Deck search UI (read-only browse). */
  playerDeckCards: HoveredCardInfo[];
  enemyDeckCards: HoveredCardInfo[];
  /** True when in ABILITY_TARGETING and the target must be a creature in Limbo (e.g. Sentinel). */
  isSelectingLimboTarget?: boolean;
  /** Stored abilities for player and enemy. */
  playerAbilityQueue: QueuedAbility[];
  enemyAbilityQueue: QueuedAbility[];
  /** Set when game ends: who won or draw. */
  gameOverResult?: 'player' | 'enemy' | 'draw';
  /** Human-readable win condition that was enacted (e.g. "Majority of Seals (4 of 7)", "Horseman (4 Horsemen + Champion on Seal)"). */
  gameOverWinCondition?: string;
  /** Snapshot at game end for achievements / recap. */
  gameOverStats?: GameEndStats;
  /** Achievement ids newly unlocked this game (cookie already updated). */
  gameOverNewAchievements?: string[];
  /** When hovering over a Limbo or Graveyard zone, shows which zone and card count. */
  hoveredZone?: { zone: 'playerLimbo' | 'enemyLimbo' | 'playerGraveyard' | 'enemyGraveyard'; count: number } | null;
  /** Active combat/interaction interstitial overlay state. */
  combatInterstitial?: CombatInterstitialState | null;
  slowMode: boolean;
  isResolutionPaused?: boolean;
}

export interface CombatInterstitialState {
  active: boolean;
  sealIndex: number;
  leftCard?: HoveredCardInfo | null;
  rightCard?: HoveredCardInfo | null;
  step: 'idle' | 'haste' | 'flip' | 'ability' | 'combat' | 'done';
  description: string;
  hasteActive?: 'left' | 'right' | 'both' | 'none';
  leftGlow?: boolean;
  rightGlow?: boolean;
  leftDamageFlash?: boolean;
  rightDamageFlash?: boolean;
  leftPowerText?: string;
  rightPowerText?: string;
}
