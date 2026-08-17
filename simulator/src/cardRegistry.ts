/**
 * Card Registry and Experimentation Profile Management for Endless Seven Simulator
 */

import * as fs from 'fs';
import * as path from 'path';
import { CardData } from './types.js';
import { LIGHT_POOL, DARK_POOL } from './constants.js';
import { RuleConfig, PartialRuleConfig, DEFAULT_RULES, createRuleConfig } from './rules.js';

export interface CardOverride extends Partial<CardData> {
  name: string;
}

export interface ExperimentProfile {
  id: string;
  name: string;
  description?: string;
  rules?: PartialRuleConfig;
  cardOverrides?: (CardOverride | Partial<CardData>)[];
  customLightPool?: CardData[];
  customDarkPool?: CardData[];
}

const registeredProfiles: Map<string, ExperimentProfile> = new Map();

/**
 * Registers an in-memory experiment profile.
 */
export function registerProfile(profile: ExperimentProfile): void {
  registeredProfiles.set(profile.id, profile);
}

/**
 * Gets a registered experiment profile by ID.
 */
export function getRegisteredProfile(id: string): ExperimentProfile | undefined {
  return registeredProfiles.get(id);
}

/**
 * Lists all registered profile IDs.
 */
export function listRegisteredProfiles(): string[] {
  return Array.from(registeredProfiles.keys());
}

/**
 * Deep clones a card data object.
 */
export function cloneCardData(card: CardData): CardData {
  return JSON.parse(JSON.stringify(card));
}

/**
 * Deep clones a pool of card data objects.
 */
export function cloneCardPool(pool: CardData[]): CardData[] {
  return pool.map(c => cloneCardData(c));
}

/**
 * Applies card overrides to a base card pool non-destructively.
 * Overrides can be an array of CardOverride objects or a dictionary keyed by card name.
 */
export function applyCardOverrides(
  basePool: CardData[],
  overrides: (CardOverride | Partial<CardData>)[] | Record<string, Partial<CardData>>
): CardData[] {
  const overrideMap = new Map<string, Partial<CardData>>();

  if (Array.isArray(overrides)) {
    for (const ov of overrides) {
      if (ov.name) {
        overrideMap.set(ov.name, ov);
      }
    }
  } else if (overrides && typeof overrides === 'object') {
    for (const [cardName, ov] of Object.entries(overrides)) {
      overrideMap.set(cardName, ov);
    }
  }

  return basePool.map(card => {
    const cardCopy = cloneCardData(card);
    const ov = overrideMap.get(card.name);
    if (ov) {
      return {
        ...cardCopy,
        ...ov
      };
    }
    return cardCopy;
  });
}

/**
 * Loads an experiment profile from a JSON file.
 */
export function loadProfileFromFile(filePath: string): ExperimentProfile {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Experiment profile file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const profile: ExperimentProfile = JSON.parse(raw);
  if (!profile.id) {
    profile.id = path.basename(filePath, path.extname(filePath));
  }
  if (!profile.name) {
    profile.name = profile.id;
  }
  return profile;
}

/**
 * Resolves the light pool, dark pool, and rule config for an experiment profile or profile name/path.
 */
export function resolveProfile(profileOrIdOrPath?: ExperimentProfile | string): {
  profileName: string;
  lightPool: CardData[];
  darkPool: CardData[];
  rules: RuleConfig;
} {
  let profile: ExperimentProfile | undefined;

  if (typeof profileOrIdOrPath === 'string') {
    // Check if it's a registered profile ID
    profile = getRegisteredProfile(profileOrIdOrPath);
    if (!profile) {
      // Check if it's a file path
      if (fs.existsSync(profileOrIdOrPath) || fs.existsSync(path.resolve(profileOrIdOrPath))) {
        profile = loadProfileFromFile(profileOrIdOrPath);
      } else {
        throw new Error(`Unknown experiment profile or file path: ${profileOrIdOrPath}`);
      }
    }
  } else if (profileOrIdOrPath && typeof profileOrIdOrPath === 'object') {
    profile = profileOrIdOrPath;
  }

  if (!profile) {
    // Canonical baseline
    return {
      profileName: 'Canonical Baseline',
      lightPool: cloneCardPool(LIGHT_POOL),
      darkPool: cloneCardPool(DARK_POOL),
      rules: createRuleConfig()
    };
  }

  let lightPool = profile.customLightPool ? cloneCardPool(profile.customLightPool) : cloneCardPool(LIGHT_POOL);
  let darkPool = profile.customDarkPool ? cloneCardPool(profile.customDarkPool) : cloneCardPool(DARK_POOL);

  if (profile.cardOverrides && profile.cardOverrides.length > 0) {
    lightPool = applyCardOverrides(lightPool, profile.cardOverrides);
    darkPool = applyCardOverrides(darkPool, profile.cardOverrides);
  }

  const rules = createRuleConfig(profile.rules);

  return {
    profileName: profile.name || profile.id,
    lightPool,
    darkPool,
    rules
  };
}
