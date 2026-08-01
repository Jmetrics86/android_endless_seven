/**
 * V2 Advanced Self-Play Dataset Exporter
 * Includes Card ID One-Hot/Categorical Features & Multi-Deck Scenarios
 */

import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { 
  buildVampiresAndDemonsDeck, 
  buildWerewolvesAndVampiresDeck, 
  buildStandardLightDeck, 
  buildStandardDarkDeck 
} from './deckBuilder.js';
import { effectivePower, HeadlessCard } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export function generateV2Dataset(numGames = 5000, outputDir = './kaggle_dataset'): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, 'v2_selfplay_dataset.csv');
  const rows: string[] = [];

  // Card Dictionary mapping unique card names to numeric IDs (1..42)
  const cardNames = [
    "Bella", "Noble The Great", "Valtarious", "Calmadious", "Coal", "Dawn", "Lucian Blackwood",
    "Tarkidos", "Kaelo", "Luna", "Ulfric Thorne", "Garmr", "Varg Fur-back", "Fenris Lightfoot",
    "Metatron", "Cassiel Haggis", "Jophiel", "Remiel", "Oriel The bold", "Anakim The Wise", "Samyaza",
    "Skarados", "Lycandor", "Golgothane", "Umbarax", "Pazoo", "Karlyah", "Nix", "Mammon",
    "Bogva", "Desire", "Zelus", "Belphegor", "Alistar Elren", "Bacchus", "Lord Alaric",
    "Kaelarion", "Duke Aren Drakos", "Elowen Thornver", "Cyprian", "Valerius Nightshade", "Sulvian Vane"
  ];
  
  const cardIdMap = new Map<string, number>();
  cardNames.forEach((name, idx) => cardIdMap.set(name, idx + 1));

  for (let g = 0; g < numGames; g++) {
    // Alternate between 4 distinct deck matchup combinations for maximum training diversity
    let deckA, deckB, sideAName, sideBName;
    const mode = g % 4;

    if (mode === 0) {
      deckA = buildVampiresAndDemonsDeck('dark');
      deckB = buildWerewolvesAndVampiresDeck('light');
      sideAName = "Vampires & Demons";
      sideBName = "Werewolves & Vampires";
    } else if (mode === 1) {
      deckA = buildStandardLightDeck();
      deckB = buildStandardDarkDeck();
      sideAName = "Light Pool";
      sideBName = "Dark Pool";
    } else if (mode === 2) {
      deckA = buildVampiresAndDemonsDeck('light');
      deckB = buildWerewolvesAndVampiresDeck('dark');
      sideAName = "Vampires & Demons (Light)";
      sideBName = "Werewolves & Vampires (Dark)";
    } else {
      deckA = buildStandardDarkDeck();
      deckB = buildStandardLightDeck();
      sideAName = "Dark Pool";
      sideBName = "Light Pool";
    }

    const engine = new HeadlessGameEngine(deckA, deckB, sideAName, sideBName, undefined, undefined, 'smart', 'smart');

    // Run game step-by-step to capture exact prep decisions
    const gameSnapshots: {
      round: number;
      isEnemy: number;
      mySeals: number;
      oppSeals: number;
      handChampCount: number;
      handPowerSum: number;
      slot: number;
      cardId: number;
      cardPower: number;
      isChamp: number;
      hasHaste: number;
      hasActivate: number;
      oppPower: number;
    }[] = [];

    // Draw round 1 prep hand to take snapshot
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
          const cId = cardIdMap.get(card.data.name) || 0;

          gameSnapshots.push({
            round: engine.currentRound,
            isEnemy: 0,
            mySeals,
            oppSeals,
            handChampCount: handChamps,
            handPowerSum,
            slot,
            cardId: cId,
            cardPower: card.data.power,
            isChamp: card.data.isChampion ? 1 : 0,
            hasHaste: card.data.hasHaste ? 1 : 0,
            hasActivate: card.data.hasActivate ? 1 : 0,
            oppPower
          });
        }
      }
    }

    // Run game to completion
    engine.runGame();

    const outcome = engine.gameOverResult === 'player' ? 1.0 : (engine.gameOverResult === 'enemy' ? -1.0 : 0.0);

    for (const snap of gameSnapshots) {
      // Apply round-based temporal reward discount (gamma = 0.9)
      const discount = Math.pow(0.9, 3 - snap.round);
      const reward = outcome * discount;

      rows.push(
        `${g},${snap.round},${snap.isEnemy},${snap.mySeals},${snap.oppSeals},${snap.handChampCount},` +
        `${snap.handPowerSum},${snap.slot},${snap.cardId},${snap.cardPower},${snap.isChamp},` +
        `${snap.hasHaste},${snap.hasActivate},${snap.oppPower},${reward.toFixed(4)}`
      );
    }
  }

  const header = "game_id,round,is_enemy,my_seals,opp_seals,hand_champions,hand_total_power,slot_index,card_id,card_power,card_is_champion,card_has_haste,card_has_activate,opp_slot_power,reward\n";
  fs.writeFileSync(csvPath, header + rows.join("\n"), 'utf-8');
  console.log(`Generated ${rows.length} V2 multi-deck decision records across ${numGames} games -> ${csvPath}`);
  return csvPath;
}

if (process.argv[1] && process.argv[1].endsWith('exportV2Dataset.ts')) {
  generateV2Dataset(5000);
}
