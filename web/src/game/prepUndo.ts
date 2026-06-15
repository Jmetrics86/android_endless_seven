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
  | { type: 'place'; slotIndex: number; card: CardEntity }
  | { type: 'baron_swap'; slotIndex: number; baron: CardEntity; limboCard: CardEntity };

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

export function applyUndoBaronSwap(c: PrepUndoControllerSlice, entry: Extract<PrepUndoEntry, { type: 'baron_swap' }>): void {
  killCardMeshTweens(entry.baron);
  killCardMeshTweens(entry.limboCard);
  const { slotIndex, baron, limboCard } = entry;

  c.playerBattlefield[slotIndex] = null;
  const limboArr = c.playerLimbo;
  const baronIdx = limboArr.indexOf(baron);
  if (baronIdx >= 0) limboArr.splice(baronIdx, 1);
  limboArr.push(limboCard);
  c.playerBattlefield[slotIndex] = baron;

  gsap.to(baron.mesh.position, {
    x: (slotIndex - 3) * GAME_CONSTANTS.SLOT_SPACING,
    y: 0.1,
    z: 3.2,
    duration: 0.4,
  });
  gsap.to(baron.mesh.rotation, { x: Math.PI, y: 0, z: 0, duration: 0.4 });
  baron.applyBackTextureIfNeeded();

  gsap.to(limboCard.mesh.position, {
    x: 15,
    y: 0.2 + c.playerLimbo.length * 0.05,
    z: 6,
    duration: 0.4,
  });
  gsap.to(limboCard.mesh.rotation, { x: Math.PI, y: 0, z: 0, duration: 0.4 });
  limboCard.applyBackTextureIfNeeded();

  c.abilityManager.syncBoardPresencePowerMarkers();
  c.updateState({});
}

export function executePrepUndoEntry(c: PrepUndoControllerSlice, entry: PrepUndoEntry): void {
  if (entry.type === 'place') {
    applyUndoPlace(c, entry.slotIndex, entry.card);
  } else {
    applyUndoBaronSwap(c, entry);
  }
}
