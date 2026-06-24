/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prep-phase undo entries and apply (used by GameController Back).
 */

import gsap from 'gsap';
import type { CardEntity } from '../entities/CardEntity';
import type { GameState } from '../types';
import { GAME_CONSTANTS } from '../constants';

export type PrepUndoEntry =
  | { type: 'place'; slotIndex: number; card: CardEntity };

export interface PrepUndoControllerSlice {
  playerHand: CardEntity[];
  playerBattlefield: (CardEntity | null)[];
  playerLimbo: CardEntity[];
  abilityManager: { syncBoardPresencePowerMarkers(): void };
  updateState(patch: Partial<GameState>): void;
  realignPlayerHand(duration?: number): void;
}

export function killCardMeshTweens(card: CardEntity): void {
  gsap.killTweensOf(card.mesh.position);
  gsap.killTweensOf(card.mesh.rotation);
}

export function applyUndoPlace(c: PrepUndoControllerSlice, slotIndex: number, card: CardEntity): void {
  killCardMeshTweens(card);
  c.playerBattlefield[slotIndex] = null;
  c.playerHand.push(card);
  card.resetHoverLift(0.06);
  c.realignPlayerHand(0.4);
  card.applyBackTextureIfNeeded();
  c.abilityManager.syncBoardPresencePowerMarkers();
  c.updateState({});
}

export function executePrepUndoEntry(c: PrepUndoControllerSlice, entry: PrepUndoEntry): void {
  if (entry.type === 'place') {
    applyUndoPlace(c, entry.slotIndex, entry.card);
  }
}
