import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { buildDualTribalDeck, TribalFaction } from './deckBuilder.js';
import { CardData } from './types.js';

interface DeckDef {
  id: string;
  name: string;
  t1: TribalFaction;
  t2: TribalFaction;
  avatars: 'light' | 'dark';
}

const DECKS: DeckDef[] = [
  { id: 'VD-Light', name: 'Vampyre + Daemon (Light)', t1: 'Vampyre', t2: 'Daemon', avatars: 'light' },
  { id: 'VD-Dark',  name: 'Vampyre + Daemon (Dark)',  t1: 'Vampyre', t2: 'Daemon', avatars: 'dark'  },
  { id: 'LV-Light', name: 'Lycan + Vampyre (Light)',  t1: 'Lycan',   t2: 'Vampyre', avatars: 'light' },
  { id: 'LV-Dark',  name: 'Lycan + Vampyre (Dark)',   t1: 'Lycan',   t2: 'Vampyre', avatars: 'dark'  },
  { id: 'CL-Light', name: 'Celestial + Lycan (Light)', t1: 'Celestial', t2: 'Lycan', avatars: 'light' },
  { id: 'CL-Dark',  name: 'Celestial + Lycan (Dark)',  t1: 'Celestial', t2: 'Lycan', avatars: 'dark'  },
  { id: 'CV-Light', name: 'Celestial + Vampyre (Light)', t1: 'Celestial', t2: 'Vampyre', avatars: 'light' },
  { id: 'CV-Dark',  name: 'Celestial + Vampyre (Dark)',  t1: 'Celestial', t2: 'Vampyre', avatars: 'dark'  },
  { id: 'CD-Light', name: 'Celestial + Daemon (Light)', t1: 'Celestial', t2: 'Daemon', avatars: 'light' },
  { id: 'CD-Dark',  name: 'Celestial + Daemon (Dark)',  t1: 'Celestial', t2: 'Daemon', avatars: 'dark'  },
  { id: 'LD-Light', name: 'Lycan + Daemon (Light)',   t1: 'Lycan',   t2: 'Daemon', avatars: 'light' },
  { id: 'LD-Dark',  name: 'Lycan + Daemon (Dark)',    t1: 'Lycan',   t2: 'Daemon', avatars: 'dark'  }
];

const MATCHES_PER_PAIR = 1000;

console.log("==================================================================");
console.log("    ENDLESS SEVEN ALL-VS-ALL META TOURNAMENT (144,000 MATCHES)    ");
console.log("==================================================================");
console.log(`12 Deck Permutations x 12 Opponent Decks x ${MATCHES_PER_PAIR} Matches Per Pair\n`);

// 12x12 Matrix: matrix[i][j] = wins for Deck i against Deck j
const matrix: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));
const totalSeals: number[] = Array(12).fill(0);
const totalWins: number[] = Array(12).fill(0);
const totalGames: number[] = Array(12).fill(0);

const startTime = Date.now();

for (let i = 0; i < DECKS.length; i++) {
  const dA = DECKS[i];
  for (let j = 0; j < DECKS.length; j++) {
    const dB = DECKS[j];
    
    let winsA = 0;
    let sealsA = 0;

    for (let k = 0; k < MATCHES_PER_PAIR; k++) {
      const deckA = buildDualTribalDeck(dA.t1, dA.t2, dA.avatars);
      const deckB = buildDualTribalDeck(dB.t1, dB.t2, dB.avatars);

      const engine = new HeadlessGameEngine(deckA, deckB, dA.name, dB.name, undefined, undefined, 'smart', 'smart');
      engine.enableAbilityDeferral = true;
      const res = engine.runGame();

      if (res.winner === 'player') winsA++;
      sealsA += res.playerSeals;
    }

    matrix[i][j] = winsA;
    totalWins[i] += winsA;
    totalSeals[i] += sealsA;
    totalGames[i] += MATCHES_PER_PAIR;

    const winPct = ((winsA / MATCHES_PER_PAIR) * 100).toFixed(1);
    console.log(`▶ Matchup [${dA.id.padEnd(8)} vs ${dB.id.padEnd(8)}]: Side A Win Rate = ${winPct}%`);
  }
}

const totalDuration = Date.now() - startTime;

console.log("\n\n==================================================================");
console.log("     ALL-VS-ALL META TOURNAMENT LEADERBOARD (RANDOM OPPONENTS)   ");
console.log("==================================================================");
console.log(`Total Matches Processed: ${12 * 12 * MATCHES_PER_PAIR} in ${(totalDuration / 1000).toFixed(2)}s\n`);

interface LeaderboardEntry {
  id: string;
  name: string;
  totalWins: number;
  totalGames: number;
  winRate: number;
  avgSeals: number;
}

const leaderboard: LeaderboardEntry[] = DECKS.map((d, idx) => ({
  id: d.id,
  name: d.name,
  totalWins: totalWins[idx],
  totalGames: totalGames[idx],
  winRate: Number(((totalWins[idx] / totalGames[idx]) * 100).toFixed(2)),
  avgSeals: Number((totalSeals[idx] / totalGames[idx]).toFixed(2))
}));

leaderboard.sort((a, b) => b.winRate - a.winRate);

leaderboard.forEach((entry, rank) => {
  let tier = 'Tier D';
  if (entry.winRate >= 60.0) tier = 'Tier S (Meta Tyrant)';
  else if (entry.winRate >= 55.0) tier = 'Tier A+ (Strong Meta)';
  else if (entry.winRate >= 50.0) tier = 'Tier A (Balanced Target)';
  else if (entry.winRate >= 45.0) tier = 'Tier B (Competitive)';
  else if (entry.winRate >= 40.0) tier = 'Tier C (Suboptimal)';

  console.log(`Rank #${(rank + 1).toString().padStart(2)}: ${entry.id.padEnd(10)} | ${entry.name.padEnd(32)} | Overall Win Rate: ${entry.winRate.toFixed(2)}% | Avg Seals: ${entry.avgSeals.toFixed(2)} | ${tier}`);
});

console.log("\n\n==================================================================");
console.log("               12x12 HEAD-TO-HEAD WIN RATE MATRIX                 ");
console.log("==================================================================");
let header = "Attacker \\ Defender".padEnd(20) + " | " + DECKS.map(d => d.id.padEnd(8)).join(" | ");
console.log(header);
console.log("-".repeat(header.length));

for (let i = 0; i < DECKS.length; i++) {
  let row = DECKS[i].id.padEnd(20) + " | ";
  for (let j = 0; j < DECKS.length; j++) {
    const pct = ((matrix[i][j] / MATCHES_PER_PAIR) * 100).toFixed(1) + "%";
    row += pct.padEnd(8) + " | ";
  }
  console.log(row);
}
