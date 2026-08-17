/**
 * Deck Builder for Headless Endless Seven Simulator
 */

import { CardData } from './types.js';
import { LIGHT_POOL, DARK_POOL } from './constants.js';

export interface DeckPools {
  lightPool?: CardData[];
  darkPool?: CardData[];
  avatarCopies?: number;
}

export function cloneCard(card: CardData): CardData {
  return JSON.parse(JSON.stringify(card));
}

/**
 * Standard deck construction rule from original game:
 * - Tribal factions (Celestial, Lycan, Daemon, Vampyre): 3 copies of each card.
 * - Special/God/Avatar factions (Avatars of light, Darkness): 1 copy of each card (or custom avatarCopies).
 */
export function buildDeckFromPool(pool: CardData[], avatarCopies = 1): CardData[] {
  const tribalFactions = ['Celestial', 'Lycan', 'Daemon', 'Vampyre'];
  const specialFactions = ['Avatars of light', 'Darkness', 'Light', 'Dark'];
  const deck: CardData[] = [];
  
  pool.forEach(card => {
    const copies = specialFactions.includes(card.faction) ? avatarCopies : (tribalFactions.includes(card.faction) ? 3 : 1);
    for (let i = 0; i < copies; i++) {
      deck.push(cloneCard(card));
    }
  });

  return shuffle(deck);
}

export function buildStandardLightDeck(customLightPool?: CardData[], avatarCopies = 1): CardData[] {
  return buildDeckFromPool(customLightPool || LIGHT_POOL, avatarCopies);
}

export function buildStandardDarkDeck(customDarkPool?: CardData[], avatarCopies = 1): CardData[] {
  return buildDeckFromPool(customDarkPool || DARK_POOL, avatarCopies);
}

/**
 * Vampires and Demons Deck:
 * - Vampyre cards: 3 copies each (21)
 * - Daemon cards: 3 copies each (21)
 * - Avatars (Darkness or Light): 1 copy each (7) (or avatarCopies)
 */
export function buildVampiresAndDemonsDeck(
  avatarSet: 'light' | 'dark' = 'dark',
  pools?: DeckPools
): CardData[] {
  const darkPool = pools?.darkPool || DARK_POOL;
  const lightPool = pools?.lightPool || LIGHT_POOL;
  const avatarCopies = pools?.avatarCopies ?? 1;

  const vampyres = darkPool.filter(c => c.faction === 'Vampyre');
  const daemons = darkPool.filter(c => c.faction === 'Daemon');
  const avatars = avatarSet === 'dark' 
    ? darkPool.filter(c => c.faction === 'Darkness')
    : lightPool.filter(c => c.faction === 'Avatars of light');

  const deck: CardData[] = [];
  vampyres.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  daemons.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  avatars.forEach(card => { for (let i = 0; i < avatarCopies; i++) deck.push(cloneCard(card)); });

  return shuffle(deck);
}

/**
 * Werewolves and Vampires Deck:
 * - Lycan (Werewolf) cards: 3 copies each (21)
 * - Vampyre (Vampire) cards: 3 copies each (21)
 * - Avatars (Light or Darkness): 1 copy each (7) (or avatarCopies)
 */
export function buildWerewolvesAndVampiresDeck(
  avatarSet: 'light' | 'dark' = 'light',
  pools?: DeckPools
): CardData[] {
  const lightPool = pools?.lightPool || LIGHT_POOL;
  const darkPool = pools?.darkPool || DARK_POOL;
  const avatarCopies = pools?.avatarCopies ?? 1;

  const lycans = lightPool.filter(c => c.faction === 'Lycan');
  const vampyres = darkPool.filter(c => c.faction === 'Vampyre');
  const avatars = avatarSet === 'light'
    ? lightPool.filter(c => c.faction === 'Avatars of light')
    : darkPool.filter(c => c.faction === 'Darkness');

  const deck: CardData[] = [];
  lycans.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  vampyres.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  avatars.forEach(card => { for (let i = 0; i < avatarCopies; i++) deck.push(cloneCard(card)); });

  return shuffle(deck);
}

export type TribalFaction = 'Vampyre' | 'Lycan' | 'Celestial' | 'Daemon';

/**
 * 3-Way Blend 49-Card Deck Builder:
 * - 21 cards from Tribal 1 (7 cards x 3 copies)
 * - 21 cards from Tribal 2 (7 cards x 3 copies)
 * - 7 cards from Avatar pool (7 cards x avatarCopies)
 */
export function buildDualTribalDeck(
  tribal1: TribalFaction,
  tribal2: TribalFaction,
  avatarSet: 'light' | 'dark',
  pools?: DeckPools
): CardData[] {
  const lightPool = pools?.lightPool || LIGHT_POOL;
  const darkPool = pools?.darkPool || DARK_POOL;
  const avatarCopies = pools?.avatarCopies ?? 1;
  const allCards = [...lightPool, ...darkPool];

  const t1Cards = allCards.filter(c => c.faction === tribal1);
  const t2Cards = allCards.filter(c => c.faction === tribal2);
  const avatars = avatarSet === 'light'
    ? lightPool.filter(c => c.faction === 'Avatars of light')
    : darkPool.filter(c => c.faction === 'Darkness');

  const deck: CardData[] = [];
  t1Cards.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  t2Cards.forEach(card => { for (let i = 0; i < 3; i++) deck.push(cloneCard(card)); });
  avatars.forEach(card => { for (let i = 0; i < avatarCopies; i++) deck.push(cloneCard(card)); });

  return shuffle(deck);
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
