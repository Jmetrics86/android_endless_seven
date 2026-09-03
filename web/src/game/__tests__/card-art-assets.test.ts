import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CARD_ART_PATHS, CARD_BACK_PATH } from '../../cardArtPaths';
import { LIGHT_POOL, DARK_POOL } from '../../constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// web/src/game/__tests__ -> ../../../public
const publicDir = path.resolve(__dirname, '../../../public');

const CANONICAL_ALL_CARDS = [...LIGHT_POOL, ...DARK_POOL];

describe('Card Art Asset Validation', () => {
  it('should have exactly 42 canonical cards across LIGHT_POOL and DARK_POOL', () => {
    expect(CANONICAL_ALL_CARDS.length).toBe(42);
    expect(LIGHT_POOL.length).toBe(21);
    expect(DARK_POOL.length).toBe(21);
  });

  it('every canonical card should have a valid mapping in CARD_ART_PATHS', () => {
    for (const card of CANONICAL_ALL_CARDS) {
      const mappedPath = CARD_ART_PATHS[card.name];
      expect(mappedPath, `Missing CARD_ART_PATHS mapping for "${card.name}"`).toBeDefined();
      expect(typeof mappedPath).toBe('string');
      expect(mappedPath.length).toBeGreaterThan(0);
    }
  });

  it('every mapped card art path in CARD_ART_PATHS exists on disk in web/public/', () => {
    const keys = Object.keys(CARD_ART_PATHS);
    expect(keys.length).toBeGreaterThanOrEqual(42);

    for (const [cardName, relPath] of Object.entries(CARD_ART_PATHS)) {
      const fullPath = path.join(publicDir, relPath);
      const exists = fs.existsSync(fullPath);
      expect(exists, `Card art file for "${cardName}" does not exist at "${relPath}" (full path: ${fullPath})`).toBe(true);
    }
  });

  it('card back texture exists on disk in web/public/', () => {
    expect(CARD_BACK_PATH).toBeDefined();
    const fullPath = path.join(publicDir, CARD_BACK_PATH);
    const exists = fs.existsSync(fullPath);
    expect(exists, `Card back texture does not exist at "${CARD_BACK_PATH}"`).toBe(true);
  });
});
