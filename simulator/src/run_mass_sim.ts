import { Simulator } from './Simulator.js';

const simulator = new Simulator();

const matchups = [
  'vampyre-daemon-light',
  'vampyre-daemon-dark',
  'lycan-vampyre-light',
  'lycan-vampyre-dark',
  'celestial-lycan-light',
  'celestial-lycan-dark',
  'celestial-vampyre-light',
  'celestial-vampyre-dark',
  'celestial-daemon-light',
  'celestial-daemon-dark',
  'lycan-daemon-light',
  'lycan-daemon-dark'
];

console.log("==================================================================");
console.log("  GOLD-STANDARD 10,000-GAME BENCHMARK PER DECK (120,000 MATCHES)  ");
console.log("==================================================================");
console.log("Deferral Mechanics: ALWAYS ENABLED (Default Engine Behavior)");
console.log("Precision Target: Standard Error ±0.5% | 95% CI ±0.98%\n");

interface Results {
  preset: string;
  winRate: number;
  drawRate: number;
  avgRounds: number;
  avgSeals: number;
  avgOppSeals: number;
  winConditions: Record<string, number>;
}

const resultsList: Results[] = [];
const totalStartTime = Date.now();

async function runAll() {
  for (const preset of matchups) {
    const startTime = Date.now();
    // 10,000 games per composition with deferral ON
    const stats = simulator.runSimulation(preset, 10000, 'smart', 'smart', true);
    const duration = Date.now() - startTime;
    
    resultsList.push({
      preset,
      winRate: stats.sideAWinRate,
      drawRate: stats.drawRate,
      avgRounds: stats.avgRounds,
      avgSeals: stats.avgSealsControlled.sideA,
      avgOppSeals: stats.avgSealsControlled.sideB,
      winConditions: stats.winConditionsBreakdown
    });

    console.log(`▶ 10,000 Games Completed for: [${preset}] in ${duration} ms (${(duration / 10000).toFixed(3)} ms/game)`);
    console.log(`   Win Rate: ${stats.sideAWinRate}% (SE: ±0.5%) | Loss Rate: ${stats.sideBWinRate}% | Draw Rate: ${stats.drawRate}%`);
    console.log(`   Avg Seals Controlled: ${stats.avgSealsControlled.sideA} / 7 (Opponent: ${stats.avgSealsControlled.sideB} / 7) | Avg Rounds: ${stats.avgRounds}\n`);
  }

  const totalDuration = Date.now() - totalStartTime;

  // Sort by Win Rate descending
  resultsList.sort((a, b) => b.winRate - a.winRate);

  console.log("\n==================================================================");
  console.log("   DEFINITIVE 120,000-GAME BALANCE RANKINGS & TIER REPORT        ");
  console.log("==================================================================");
  console.log(`Total Matches Processed: 120,000 in ${(totalDuration / 1000).toFixed(2)} seconds\n`);

  resultsList.forEach((r, idx) => {
    let tier = 'Tier D';
    if (r.winRate >= 63.0) tier = 'Tier S (Overpowered)';
    else if (r.winRate >= 58.0) tier = 'Tier A+ (Strong)';
    else if (r.winRate >= 50.0) tier = 'Tier A (Balanced Target)';
    else if (r.winRate >= 45.0) tier = 'Tier B (Competitive)';
    else if (r.winRate >= 40.0) tier = 'Tier C (Niche/Suboptimal)';

    console.log(`Rank #${idx + 1}: ${r.preset.padEnd(25)} | Win Rate: ${r.winRate.toFixed(2)}% | Avg Seals: ${r.avgSeals.toFixed(2)} | Tier: ${tier}`);
  });
}

runAll();
