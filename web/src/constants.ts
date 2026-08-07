/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardData } from './types';

export const LIGHT_POOL: CardData[] = [
  // Avatars of Light (Oathbringers / God)
  { name: "Dawn", faction: "Avatars of light", type: "Avatar", power: 9, isChampion: true, ability: "Champion. Flip: Gain +1 Power Marker for each Oathbringer in play. Activate: If you have 4 Oathbringers in play with at least one Champion controlling a Seal, you win the game.", markerPower: 0, hasActivate: true },
  { name: "Bella", faction: "Avatars of light", type: "Avatar", power: 9, isChampion: true, ability: "Champion. Flip: Destroy any Champion on any Seal. Activate: Destroy one Marker on any creature.", hasTargetedAbility: true, effect: 'destroy_champion_on_seal', targetType: 'champion_on_seal', hasActivate: true },
  { name: "Calmadious", faction: "Avatars of light", type: "God", power: 15, isChampion: true, ability: "Champion. Flip: Purify any Corrupted Seal without a Champion. Activate: Destroy any one Marker type.", hasSealTargetAbility: true, sealEffect: 'LIGHT', hasActivate: true },
  { name: "Coal", faction: "Avatars of light", type: "Avatar", power: 10, isChampion: true, ability: "Champion. Activate: If you control 5 or more Seals with Champions you win the game. Final Act: While in Limbo, you may move this creature into the Graveyard to stop a creature from Championing a Seal.", hasActivate: true, hasLimboAbility: true },
  { name: "Noble The Great", faction: "Avatars of light", type: "Avatar", power: 9, isChampion: true, ability: "Champion. After destroying a creature in battle, you may destroy another creature or Marker type in play." },
  { name: "Tarkidos", faction: "Avatars of light", type: "Avatar", power: 9, isChampion: true, ability: "Champion. Nullify the first ability that would destroy or reduce this creature's Power Value each round. Final Act: While in Limbo, you may move this creature into the Graveyard and Purify any one Seal without a Champion.", hasLimboAbility: true },
  { name: "Valtarious", faction: "Avatars of light", type: "Avatar", power: 9, isChampion: true, ability: "Champion. While in play, Purified Seals cannot be Corrupted." },
  // Celestial
  { name: "Remiel", faction: "Celestial", type: "Creature", power: 2, isChampion: false, ability: "Flip: Reveal any face-down card, its Flip ability is Nullified.", hasNullify: true },
  { name: "Jophiel", faction: "Celestial", type: "Creature", power: 4, isChampion: false, ability: "Flip: Return any creature in play to the top of its owner's deck.", hasTargetedAbility: true, effect: 'return', targetType: 'creature' },
  { name: "Samyaza", faction: "Celestial", type: "Creature", power: 6, isChampion: false, ability: "Haste: Resolves battle before Flip abilities. Final Act: While in the Limbo, you may move this creature into the Graveyard to Nullify the activation of any creature ability.", hasHaste: true, hasLimboAbility: true },
  { name: "Cassiel Haggis", faction: "Celestial", type: "Creature", power: 5, isChampion: false, ability: "Flip: Reveal the top card of your deck, this creature gains Power Markers equal to that creature's Power Value." },
  { name: "Anakim The Wise", faction: "Celestial", type: "Creature", power: 3, isChampion: false, ability: "Cannot be destroyed by battle this turn. Activate: After the Flip, before battle you may choose a Seal. Your Enemy may not Champion or Influence that Seal until the end of the round.", hasActivate: true },
  { name: "Metatron", faction: "Celestial", type: "Creature", power: 7, isChampion: true, ability: "Champion. While this creature Champions a Seal, all other Celestials you control are unaffected by creature abilities. Activate: Destroy one Marker type on any creature.", hasActivate: true },
  { name: "Oriel The bold", faction: "Celestial", type: "Creature", power: 1, isChampion: false, ability: "Flip: Change the Influence of any Seal without a Champion." },
  // Lycan
  { name: "Lucian Blackwood", faction: "Lycan", type: "Creature", power: 7, isChampion: true, ability: "Champion. Haste: Resolves combat before Flip abilities. Place a +2 Power Marker on this creature after destroying an Enemy creature in battle.", hasHaste: true },
  { name: "Ulfric Thorne", faction: "Lycan", type: "Creature", power: 6, isChampion: false, ability: "Cannot be destroyed by battle this turn. Activate: Place a +2 Power Marker on any creature.", hasActivate: true },
  { name: "Garmr", faction: "Lycan", type: "Creature", power: 5, isChampion: false, ability: "Flip: Gain a +1 Power Marker for each Lycan in play and in Limbo." },
  { name: "Kaelo", faction: "Lycan", type: "Creature", power: 4, isChampion: false, ability: "Flip: Choose a creature in Limbo, place Power Markers on this creature equal to that creature's Power Value.", hasTargetedAbility: true, effect: 'sentinel_absorb', targetType: 'limbo_creature' },
  { name: "Varg Fur-back", faction: "Lycan", type: "Creature", power: 3, isChampion: false, ability: "Flip: Place a +1 Power Marker on up to any 3 creatures in play. Activate: Sacrifice this creature and place a +3 Power Marker on any creature.", markerPower: 3, needsAllocation: true, hasActivate: true },
  { name: "Luna", faction: "Lycan", type: "Creature", power: 2, isChampion: false, ability: "Final Act: While in Limbo, if your Enemy changes the Influence of a Seal without a Champion, you may move this creature into the Graveyard to Nullify that action.", hasLimboAbility: true },
  { name: "Fenris Lightfoot", faction: "Lycan", type: "Creature", power: 1, isChampion: false, ability: "Haste: Resolves battle before Flip abilities. Any creature that does battle with this creature is destroyed at the end of the round.", hasHaste: true }
];

export const DARK_POOL: CardData[] = [
  // Darkness (Graveborn / God)
  { name: "Nix", faction: "Darkness", type: "Graveborn", power: 9, isChampion: true, ability: "Champion. Flip: Choose a creature type, destroy all cards of that type in play. Activate: If you have 4 Graveborn in play with at least one Champion controlling a Seal, you win the game.", hasActivate: true, effect: 'destroy_creature_type' },
  { name: "Golgothane", faction: "Darkness", type: "Graveborn", power: 9, isChampion: true, ability: "Champion. Flip: Destroy any creature in play. Final Act: While in Limbo, you may move this creature to the Graveyard and shuffle all the creatures in your enemy's Limbo back into their deck.", hasTargetedAbility: true, effect: 'destroy', targetType: 'creature', hasLimboAbility: true },
  { name: "Lycandor", faction: "Darkness", type: "Graveborn", power: 9, isChampion: true, ability: "Champion. Flip: Place a -2 Weakness Marker on all Enemy creatures for each Graveborn you have in play." },
  { name: "Umbarax", faction: "Darkness", type: "Graveborn", power: 9, isChampion: true, ability: "Champion. Flip: Cannot be destroyed by battle this turn. After destroying a creature in battle, place +2 Power Markers on this creature plus +2 for each Graveborn in play." },
  { name: "Karlyah", faction: "Darkness", type: "Avatar", power: 10, isChampion: true, ability: "Champion. Activate: If you control 5 or more Seals with Champions you win the game. Final Act: While in Limbo, you may move this creature into the Graveyard to destroy a creature that battled this turn.", hasActivate: true, hasLimboAbility: true },
  { name: "Pazoo", faction: "Darkness", type: "Avatar", power: 9, isChampion: true, ability: "Champion. Flip: Gains a +2 Power Marker for each Graveborn in play. You may place any creature from Limbo you control on top of your deck.", markerPower: 2 },
  { name: "Skarados", faction: "Darkness", type: "God", power: 15, isChampion: true, ability: "Champion. Flip: Corrupt every Purified seal without a Champion. Activate: Destroy any one Marker type.", hasGlobalAbility: true, effect: 'corrupt_undefended', hasActivate: true },
  // Daemon
  { name: "Bogva", faction: "Daemon", type: "Creature", power: 7, isChampion: true, ability: "Champion. Flip: Place a -1 Weakness Marker on each of your enemy's creatures. Action: Destroy any creature in play with a Weakness Marker on it.", markerWeakness: 1 },
  { name: "Alistar Elren", faction: "Daemon", type: "Creature", power: 6, isChampion: false, ability: "Flip: Place a -3 Weakness Marker on any creature in play. Final Act: While in limbo, you may move this creature into the Graveyard to place a -3 Weakness Marker on any creature in play.", hasLimboAbility: true, hasTargetedAbility: true, effect: 'place_weakness', targetType: 'creature', markerWeakness: 3 },
  { name: "Mammon", faction: "Daemon", type: "Creature", power: 5, isChampion: false, ability: "Cannot be destroyed by battle this turn. Activate: Transfer all Power Markers in play to this creature.", hasActivate: true },
  { name: "Belphegor", faction: "Daemon", type: "Creature", power: 4, isChampion: false, ability: "Unaffected by abilities. Flip: Place a -3 Weakness Marker on any creature in play. Final Act: While in Limbo, you may move this creature into the Graveyard to Nullify the activation of any creature ability.", abilityImmune: true, hasLimboAbility: true, hasTargetedAbility: true, effect: 'place_weakness', targetType: 'creature', markerWeakness: 3 },
  { name: "Zelus", faction: "Daemon", type: "Creature", power: 3, isChampion: false, ability: "Flip: Place a -3 Weakness Marker on any creature in play with a Power Value equal to or greater than this creature.", hasTargetedAbility: true, effect: 'place_weakness', targetType: 'creature_power_gte', markerWeakness: 3 },
  { name: "Desire", faction: "Daemon", type: "Creature", power: 2, isChampion: false, ability: "Flip: All players sacrifice a creature at this position. If the Seal has no Champion, you may change the influence of this Seal.", hasLustSealEffect: true },
  { name: "Bacchus", faction: "Daemon", type: "Creature", power: 1, isChampion: false, ability: "Flip: Transfer all Power Markers in play to this creature.", hasGlobalAbility: true, effect: 'siphon_power_only' },
  // Vampyre
  { name: "Lord Alaric", faction: "Vampyre", type: "Creature", power: 7, isChampion: true, ability: "Champion. Flip: Place any Champion on top of its owner's deck. Activate: Place a +1 Power Marker on this creature for each Vampyre in play.", hasTargetedAbility: true, effect: 'return', targetType: 'champion', hasActivate: true },
  { name: "Duke Aren Drakos", faction: "Vampyre", type: "Creature", power: 6, isChampion: false, ability: "Flip: Place a creature in play on top of that player's deck. While this creature is in Play, your creatures are considered Vampyre.", hasTargetedAbility: true, effect: 'return', targetType: 'creature' },
  { name: "Sulvian Vane", faction: "Vampyre", type: "Creature", power: 5, isChampion: false, ability: "Haste: Resolve battle before Flip abilities. Any creature that battles this creature is placed on top of its owner's deck.", hasHaste: true },
  { name: "Kaelarion", faction: "Vampyre", type: "Creature", power: 4, isChampion: false, ability: "Flip: Destroy any one creature in play. At the end of the turn, place a +2 Power Marker on this creature. Final Act: While in Limbo, you may move this creature into the Graveyard and place a Champion on top of its owner's deck.", hasTargetedAbility: true, effect: 'destroy', targetType: 'creature', hasLimboAbility: true },
  { name: "Elowen Thornver", faction: "Vampyre", type: "Creature", power: 3, isChampion: false, ability: "Flip: Change the Influence of any Seal without a Champion.", hasSealTargetAbility: true },
  { name: "Valerius Nightshade", faction: "Vampyre", type: "Creature", power: 2, isChampion: false, ability: "Haste: Resolve battle before Flip abilities. Any creature battling this creature has its Flip ability Nullified and Valerius steals 1 Power before combat.", hasHaste: true },
  { name: "Cyprian", faction: "Vampyre", type: "Creature", power: 1, isChampion: false, ability: "Cannot battle or be battled. Flip: Place a +3 Power Marker on any creature in play. Sacrifice this creature at the end of the turn.", hasTargetedAbility: true, effect: 'place_power', targetType: 'creature', markerPower: 3, cannotBattleOrBeBattled: true, sacrificeEndOfTurn: true }
];

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

export const GAME_VERSION = "0.0.19";



