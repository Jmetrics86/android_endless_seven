import * as fs from 'fs';
import * as path from 'path';

const profilePath = 'C:/Users/jsnbr/Projects/android_endless_seven/simulator/profiles/variant-2026-08-13.json';
const simConstantsPath = 'C:/Users/jsnbr/Projects/android_endless_seven/simulator/src/constants.ts';
const webConstantsPath = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/constants.ts';

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

function generateSimulatorConstants(lightPool, darkPool) {
  return `/**
 * Headless Endless Seven Card Constants
 * Updated to Variant-2026-08-13 as Canonical Ruleset
 */

import { CardData } from './types.js';

export const LIGHT_POOL: CardData[] = ${JSON.stringify(lightPool, null, 2)};

export const DARK_POOL: CardData[] = ${JSON.stringify(darkPool, null, 2)};

export const CANONICAL_LIGHT_POOL: CardData[] = LIGHT_POOL;
export const CANONICAL_DARK_POOL: CardData[] = DARK_POOL;

export const GAME_CONSTANTS = {
  SEVEN: 7
};
`;
}

function generateWebConstants(lightPool, darkPool) {
  return `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Updated to Variant-2026-08-13 as Canonical Ruleset
 */

import { CardData } from './types';

export const LIGHT_POOL: CardData[] = ${JSON.stringify(lightPool, null, 2)};

export const DARK_POOL: CardData[] = ${JSON.stringify(darkPool, null, 2)};

export const GAME_CONSTANTS = {
  SEVEN: 7,
  SLOT_SPACING: 3.8,
  CARD_W: 2.2,
  CARD_H: 3.2,
  TABLE_SIZE: 400,
  /** Play area table surface (sits on floor under seals/zones). */
  TABLE_PLAY_WIDTH: 48,
  TABLE_PLAY_DEPTH: 20
};

export const GAME_VERSION = "0.0.20";
`;
}

const simContent = generateSimulatorConstants(profile.customLightPool, profile.customDarkPool);
const webContent = generateWebConstants(profile.customLightPool, profile.customDarkPool);

fs.writeFileSync(simConstantsPath, simContent);
fs.writeFileSync(webConstantsPath, webContent);

console.log("Successfully updated simulator/src/constants.ts and web/src/constants.ts!");
