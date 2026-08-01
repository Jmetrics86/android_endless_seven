/**
 * Self-Play Dataset Exporter for Kaggle GPU AI Training
 */

import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { buildVampiresAndDemonsDeck, buildWerewolvesAndVampiresDeck } from './deckBuilder.js';
import { effectivePower, HeadlessCard } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export interface DatasetRow {
  game_id: number;
  round: number;
  is_enemy: number;
  my_seals: number;
  opp_seals: number;
  hand_champions: number;
  hand_total_power: number;
  slot_index: number;
  card_power: number;
  card_is_champion: number;
  card_has_haste: number;
  opp_slot_power: number;
  win_outcome: number; // 1.0 (win), -1.0 (loss), 0.0 (draw)
}

export function generateSelfPlayDataset(numGames = 5000, outputDir = './kaggle_dataset'): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, 'self_play_dataset.csv');
  const rows: DatasetRow[] = [];

  for (let g = 0; g < numGames; g++) {
    const deckA = buildVampiresAndDemonsDeck('dark');
    const deckB = buildWerewolvesAndVampiresDeck('light');

    const engine = new HeadlessGameEngine(deckA, deckB, "Side A", "Side B", undefined, undefined, 'smart', 'smart');

    // Hook into prep phase to collect decision features
    const gameRecords: Omit<DatasetRow, 'win_outcome'>[] = [];

    // Run game step by step
    while (!engine.isGameOver && engine.currentRound <= 4) {
      // Record state before prep placement
      if (engine.playerDeck.length >= 8 && engine.enemyDeck.length >= 8) {
        // Draw 8 cards
        const pHand: HeadlessCard[] = [];
        for (let i = 0; i < 8 && engine.playerDeck.length > 0; i++) {
          pHand.push(engine.createCard(engine.playerDeck.pop()!, false));
        }

        const mySeals = engine.seals.filter(s => s.alignment === engine.playerAlignment).length;
        const oppSeals = engine.seals.filter(s => s.alignment === engine.enemyAlignment).length;

        const handChamps = pHand.filter(c => c.data.isChampion).length;
        const handPowerSum = pHand.reduce((acc, c) => acc + c.data.power, 0);

        for (const card of pHand) {
          for (let slot = 0; slot < 7; slot++) {
            if (engine.playerBattlefield[slot] === null) {
              const oppCard = engine.enemyBattlefield[slot];
              const oppPower = oppCard ? effectivePower(oppCard) : 0;

              gameRecords.push({
                game_id: g,
                round: engine.currentRound,
                is_enemy: 0,
                my_seals: mySeals,
                opp_seals: oppSeals,
                hand_champions: handChamps,
                hand_total_power: handPowerSum,
                slot_index: slot,
                card_power: card.data.power,
                card_is_champion: card.data.isChampion ? 1 : 0,
                card_has_haste: card.data.hasHaste ? 1 : 0,
                opp_slot_power: oppPower
              });
            }
          }
        }
      }

      // Run resolution & cleanup
      engine.runGame();
    }

    const outcome = engine.gameOverResult === 'player' ? 1.0 : (engine.gameOverResult === 'enemy' ? -1.0 : 0.0);

    for (const rec of gameRecords) {
      rows.push({
        ...rec,
        win_outcome: outcome
      });
    }
  }

  // Write CSV
  const header = "game_id,round,is_enemy,my_seals,opp_seals,hand_champions,hand_total_power,slot_index,card_power,card_is_champion,card_has_haste,opp_slot_power,win_outcome\n";
  const body = rows.map(r => 
    `${r.game_id},${r.round},${r.is_enemy},${r.my_seals},${r.opp_seals},${r.hand_champions},${r.hand_total_power},${r.slot_index},${r.card_power},${r.card_is_champion},${r.card_has_haste},${r.opp_slot_power},${r.win_outcome}`
  ).join("\n");

  fs.writeFileSync(csvPath, header + body, 'utf-8');
  console.log(`Generated ${rows.length} self-play decision samples across ${numGames} games -> ${csvPath}`);
  return csvPath;
}

if (process.argv[1] && process.argv[1].endsWith('exportSelfPlayData.ts')) {
  generateSelfPlayDataset(5000);
}
