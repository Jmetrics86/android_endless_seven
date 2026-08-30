/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Canonical Card Factory for Endless Seven (Variant-2026-08-13)
 * Provides clean, fully typed card creation utilities for automated testing.
 */

import { vi } from 'vitest';
import { CardEntity } from '../../../entities/CardEntity';
import { CardData, Alignment } from '../../../types';
import { LIGHT_POOL, DARK_POOL } from '../../../constants';

/**
 * Returns a cloned copy of the canonical CardData for the given card name.
 */
export function getCanonicalCard(name: string): CardData {
  const allCards = [...LIGHT_POOL, ...DARK_POOL];
  const card = allCards.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  if (!card) {
    throw new Error(`Card "${name}" not found in canonical LIGHT_POOL or DARK_POOL constants.`);
  }
  return JSON.parse(JSON.stringify(card));
}

/**
 * Creates a mock CardEntity matching the canonical definition from constants.ts with optional overrides.
 */
export function createCard(
  name: string,
  isEnemy: boolean = false,
  overrides?: Partial<CardEntity['data']>
): CardEntity {
  const baseDef = getCanonicalCard(name);
  const data: CardEntity['data'] = {
    ...baseDef,
    isEnemy,
    faceUp: true,
    powerMarkers: 0,
    weaknessMarkers: 0,
    boardPresencePowerMarkers: 0,
    isInvincible: false,
    isSuppressed: false,
    isHeldForRound: false,
    hasActivatedThisRound: false,
    markedByWildWolf: false,
    pendingDeltaSacrifice: false,
    markedForDeltaBuff: false,
    isActivatingAbility: false,
    ...overrides,
  };

  const cardObj = {
    id: `card-${name.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`,
    data,
    mesh: {
      position: { x: 0, y: 0, z: 0, set: vi.fn((x: number, y: number, z: number) => { cardObj.mesh.position.x = x; cardObj.mesh.position.y = y; cardObj.mesh.position.z = z; }) },
      rotation: { x: 0, y: 0, z: 0, set: vi.fn((x: number, y: number, z: number) => { cardObj.mesh.rotation.x = x; cardObj.mesh.rotation.y = y; cardObj.mesh.rotation.z = z; }) },
      scale: { x: 1, y: 1, z: 1, set: vi.fn() },
      add: vi.fn(),
      remove: vi.fn(),
    },
    updateVisualMarkers: vi.fn(),
    applyBackTextureIfNeeded: vi.fn(),
    resetHoverLift: vi.fn(),
    dispose: vi.fn(),
  };

  return cardObj as unknown as CardEntity;
}

/**
 * Creates a face-down mock CardEntity.
 */
export function createFaceDownCard(
  name: string,
  isEnemy: boolean = false,
  overrides?: Partial<CardEntity['data']>
): CardEntity {
  return createCard(name, isEnemy, { faceUp: false, ...overrides });
}

/**
 * Canonical card lists
 */
export const LIGHT_POOL_NAMES = LIGHT_POOL.map(c => c.name);
export const DARK_POOL_NAMES = DARK_POOL.map(c => c.name);
export const ALL_42_CARD_NAMES = [...LIGHT_POOL_NAMES, ...DARK_POOL_NAMES];
