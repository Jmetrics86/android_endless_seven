/**
 * Card-Level Self-Play Exporter for SHAP Analysis
 */

import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { buildVampiresAndDemonsDeck, buildWerewolvesAndVampiresDeck, buildStandardLightDeck, buildStandardDarkDeck } from './deckBuilder.js';
import { effectivePower, HeadlessCard } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export interface CardDecisionRow {
  game_id: number;
  round: number;
  is_enemy: number;
  card_name: string;
  card_faction: string;
  card_type: string;
  card_power: number;
  is_champion: number;
  has_haste: number;
  has_activate: number;
  slot_index: number;
  opp_slot_power: number;
  my_seals: number;
  opp_seals: number;
  win_outcome: number; // 1.0 (win), -1.0 (loss), 0.0 (draw)
}

export function generateCardLevelDataset(numGames = 3000, outputDir = './kaggle_dataset'): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, 'card_level_dataset.csv');
  const rows: CardDecisionRow[] = [];

  for (let g = 0; g < numGames; g++) {
    // 50% Vampires&Demons vs Werewolves&Vampires, 50% Light vs Dark Pool
    const isStandardMatchup = g % 2 === 0;
    const deckA = isStandardMatchup ? buildVampiresAndDemonsDeck('dark') : buildStandardLightDeck();
    const deckB = isStandardMatchup ? buildWerewolvesAndVampiresDeck('light') : buildStandardDarkDeck();

    const engine = new HeadlessGameEngine(
      deckA,
      deckB,
      isStandardMatchup ? "Vampires & Demons" : "Light Pool",
      isStandardMatchup ? "Werewolves & Vampires" : "Dark Pool",
      undefined,
      undefined,
      'smart',
      'smart'
    );

    const gameRecords: Omit<CardDecisionRow, 'win_outcome'>[] = [];

    // Run game to completion
    engine.runGame();

    const pOutcome = engine.gameOverResult === 'player' ? 1.0 : (engine.gameOverResult === 'enemy' ? -1.0 : 0.0);

    // Collect all cards played during the match
    const pSeals = engine.seals.filter(s => s.alignment === engine.playerAlignment).length;
    const eSeals = engine.seals.filter(s => s.alignment === engine.enemyAlignment).length;

    const allPlayerCards = [
      ...engine.playerBattlefield,
      ...engine.seals.map(s => s.champion).filter(c => c && !c.isEnemy),
      ...engine.playerLimbo,
      ...engine.playerGraveyard
    ].filter((c): c is HeadlessCard => c !== null && !c.isEnemy);

    const allEnemyCards = [
      ...engine.enemyBattlefield,
      ...engine.seals.map(s => s.champion).filter(c => c && c.isEnemy),
      ...engine.enemyLimbo,
      ...engine.enemyGraveyard
    ].filter((c): c is HeadlessCard => c !== null && c.isEnemy);

    // Record Player side cards
    const uniquePlayerCards = Array.from(new Set(allPlayerCards.map(c => c.data.name))).map(name => allPlayerCards.find(c => c.data.name === name)!);
    for (const card of uniquePlayerCards) {
      rows.push({
        game_id: g,
        round: engine.currentRound,
        is_enemy: 0,
        card_name: card.data.name,
        card_faction: card.data.faction,
        card_type: card.data.type,
        card_power: card.data.power,
        is_champion: card.data.isChampion ? 1 : 0,
        has_haste: card.data.hasHaste ? 1 : 0,
        has_activate: card.data.hasActivate ? 1 : 0,
        slot_index: 0,
        opp_slot_power: 0,
        my_seals: pSeals,
        opp_seals: eSeals,
        win_outcome: pOutcome
      });
    }

    // Record Enemy side cards
    const uniqueEnemyCards = Array.from(new Set(allEnemyCards.map(c => c.data.name))).map(name => allEnemyCards.find(c => c.data.name === name)!);
    for (const card of uniqueEnemyCards) {
      rows.push({
        game_id: g,
        round: engine.currentRound,
        is_enemy: 1,
        card_name: card.data.name,
        card_faction: card.data.faction,
        card_type: card.data.type,
        card_power: card.data.power,
        is_champion: card.data.isChampion ? 1 : 0,
        has_haste: card.data.hasHaste ? 1 : 0,
        has_activate: card.data.hasActivate ? 1 : 0,
        slot_index: 0,
        opp_slot_power: 0,
        my_seals: eSeals,
        opp_seals: pSeals,
        win_outcome: -pOutcome
      });
    }
  }

  const header = "game_id,round,is_enemy,card_name,card_faction,card_type,card_power,is_champion,has_haste,has_activate,slot_index,opp_slot_power,my_seals,opp_seals,win_outcome\n";
  const body = rows.map(r => 
    `${r.game_id},${r.round},${r.is_enemy},"${r.card_name}","${r.card_faction}","${r.card_type}",${r.card_power},${r.is_champion},${r.has_haste},${r.has_activate},${r.slot_index},${r.opp_slot_power},${r.my_seals},${r.opp_seals},${r.win_outcome}`
  ).join("\n");

  fs.writeFileSync(csvPath, header + body, 'utf-8');
  console.log(`Generated ${rows.length} card-level decision records across ${numGames} games -> ${csvPath}`);
  return csvPath;
}

if (process.argv[1] && process.argv[1].endsWith('exportCardLevelLogs.ts')) {
  generateCardLevelDataset(3000);
}
