/**
 * Comprehensive Variant-2026-08-13 Balance Simulation
 * 
 * Tests ALL 12 tribal combination matchups against baseline pools,
 * plus head-to-head mirror matches and cross-combination matchups.
 * Uses SmartAI on both sides for meaningful heuristic play.
 */

import { Simulator, MATCHUP_PRESETS } from './Simulator.js';
import { resolveProfile } from './cardRegistry.js';
import { buildDualTribalDeck, DeckPools, TribalFaction } from './deckBuilder.js';
import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { Alignment, SimulationResult, MatchupStats } from './types.js';
import { createRuleConfig, RuleConfig } from './rules.js';
import * as fs from 'fs';

const PROFILE_PATH = './profiles/variant-2026-08-13.json';
const MATCHES_PER_MATCHUP = 1000;
const AI_TYPE: 'easy' | 'smart' | 'neural' = 'smart';

interface TribalCombo {
  name: string;
  tribeA: TribalFaction;
  tribeB: TribalFaction;
  alignment: 'light' | 'dark';
}

// All viable Light tribal combos
const LIGHT_COMBOS: TribalCombo[] = [
  { name: 'Celestial + Lycan (Light)', tribeA: 'Celestial', tribeB: 'Lycan', alignment: 'light' },
  { name: 'Celestial + Vampyre (Light)', tribeA: 'Celestial', tribeB: 'Vampyre', alignment: 'light' },
  { name: 'Celestial + Daemon (Light)', tribeA: 'Celestial', tribeB: 'Daemon', alignment: 'light' },
  { name: 'Lycan + Vampyre (Light)', tribeA: 'Lycan', tribeB: 'Vampyre', alignment: 'light' },
  { name: 'Lycan + Daemon (Light)', tribeA: 'Lycan', tribeB: 'Daemon', alignment: 'light' },
  { name: 'Vampyre + Daemon (Light)', tribeA: 'Vampyre', tribeB: 'Daemon', alignment: 'light' },
];

// All viable Dark tribal combos
const DARK_COMBOS: TribalCombo[] = [
  { name: 'Celestial + Lycan (Dark)', tribeA: 'Celestial', tribeB: 'Lycan', alignment: 'dark' },
  { name: 'Celestial + Vampyre (Dark)', tribeA: 'Celestial', tribeB: 'Vampyre', alignment: 'dark' },
  { name: 'Celestial + Daemon (Dark)', tribeA: 'Celestial', tribeB: 'Daemon', alignment: 'dark' },
  { name: 'Lycan + Vampyre (Dark)', tribeA: 'Lycan', tribeB: 'Vampyre', alignment: 'dark' },
  { name: 'Lycan + Daemon (Dark)', tribeA: 'Lycan', tribeB: 'Daemon', alignment: 'dark' },
  { name: 'Vampyre + Daemon (Dark)', tribeA: 'Vampyre', tribeB: 'Daemon', alignment: 'dark' },
];

function runH2HMatchup(
  comboA: TribalCombo,
  comboB: TribalCombo,
  pools: DeckPools,
  rules: RuleConfig,
  totalGames: number
): MatchupStats {
  let aWins = 0, bWins = 0, draws = 0, totalRounds = 0;
  let aSeals = 0, bSeals = 0, neutralSeals = 0;
  const winConditions: Record<string, number> = {};
  const start = Date.now();

  for (let i = 0; i < totalGames; i++) {
    const deckA = buildDualTribalDeck(comboA.tribeA, comboA.tribeB, comboA.alignment, pools);
    const deckB = buildDualTribalDeck(comboB.tribeA, comboB.tribeB, comboB.alignment, pools);
    const playerAlign = comboA.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK;
    const enemyAlign = comboB.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK;

    const engine = new HeadlessGameEngine(
      deckA, deckB, comboA.name, comboB.name,
      playerAlign, enemyAlign, AI_TYPE, AI_TYPE, rules
    );
    const res = engine.runGame();

    if (res.winner === 'player') aWins++;
    else if (res.winner === 'enemy') bWins++;
    else draws++;
    totalRounds += res.rounds;
    aSeals += res.playerSeals;
    bSeals += res.enemySeals;
    neutralSeals += res.neutralSeals;
    winConditions[res.winCondition] = (winConditions[res.winCondition] || 0) + 1;
  }

  return {
    matchupName: `${comboA.name} vs ${comboB.name}`,
    sideAName: comboA.name,
    sideBName: comboB.name,
    totalGames,
    sideAWins: aWins,
    sideBWins: bWins,
    draws,
    sideAWinRate: Number(((aWins / totalGames) * 100).toFixed(2)),
    sideBWinRate: Number(((bWins / totalGames) * 100).toFixed(2)),
    drawRate: Number(((draws / totalGames) * 100).toFixed(2)),
    avgRounds: Number((totalRounds / totalGames).toFixed(2)),
    winConditionsBreakdown: winConditions,
    avgSealsControlled: {
      sideA: Number((aSeals / totalGames).toFixed(2)),
      sideB: Number((bSeals / totalGames).toFixed(2)),
      neutral: Number((neutralSeals / totalGames).toFixed(2))
    },
    totalDurationMs: Date.now() - start
  };
}

async function main() {
  console.log('🔥 Variant-2026-08-13 Comprehensive Balance Simulation');
  console.log('='.repeat(60));

  const resolved = resolveProfile(PROFILE_PATH);
  const pools: DeckPools = {
    lightPool: resolved.lightPool,
    darkPool: resolved.darkPool,
    avatarCopies: resolved.rules.avatarCopies ?? 1
  };
  const rules = createRuleConfig({ ...resolved.rules, enableAbilityDeferral: true });

  console.log(`Profile: ${resolved.profileName}`);
  console.log(`Matches per matchup: ${MATCHES_PER_MATCHUP}`);
  console.log(`AI Type: ${AI_TYPE}`);
  console.log('');

  // ========================================
  // PHASE 1: Light vs Dark baseline pool test
  // ========================================
  console.log('📊 Phase 1: Standard Light Pool vs Dark Pool');
  const sim = new Simulator();
  const baselineStats = sim.runSimulation('light-vs-dark', MATCHES_PER_MATCHUP, AI_TYPE, AI_TYPE, true, PROFILE_PATH);
  console.log(`  Light: ${baselineStats.sideAWinRate}% | Dark: ${baselineStats.sideBWinRate}% | Draw: ${baselineStats.drawRate}%`);
  console.log('');

  // ========================================
  // PHASE 2: Each Light combo vs Dark baseline
  // ========================================
  console.log('📊 Phase 2: Light Combos vs Dark Baseline');
  const lightVsBaseline: MatchupStats[] = [];
  for (const combo of LIGHT_COMBOS) {
    const presetKey = `${combo.tribeA.toLowerCase()}-${combo.tribeB.toLowerCase()}-light`;
    const stats = sim.runSimulation(presetKey, MATCHES_PER_MATCHUP, AI_TYPE, AI_TYPE, true, PROFILE_PATH);
    lightVsBaseline.push(stats);
    console.log(`  ${combo.name}: ${stats.sideAWinRate}% | Dark Baseline: ${stats.sideBWinRate}% | Draw: ${stats.drawRate}%`);
  }
  console.log('');

  // ========================================
  // PHASE 3: Each Dark combo vs Light baseline
  // ========================================
  console.log('📊 Phase 3: Dark Combos vs Light Baseline');
  const darkVsBaseline: MatchupStats[] = [];
  for (const combo of DARK_COMBOS) {
    const presetKey = `${combo.tribeA.toLowerCase()}-${combo.tribeB.toLowerCase()}-dark`;
    const stats = sim.runSimulation(presetKey, MATCHES_PER_MATCHUP, AI_TYPE, AI_TYPE, true, PROFILE_PATH);
    darkVsBaseline.push(stats);
    console.log(`  ${combo.name}: ${stats.sideAWinRate}% | Light Baseline: ${stats.sideBWinRate}% | Draw: ${stats.drawRate}%`);
  }
  console.log('');

  // ========================================
  // PHASE 4: Cross-combination Head-to-Head (Light combos vs Dark combos)
  // ========================================
  console.log('📊 Phase 4: Cross-Combination Head-to-Head (Light vs Dark combos)');
  const h2hResults: MatchupStats[] = [];
  for (const lightCombo of LIGHT_COMBOS) {
    for (const darkCombo of DARK_COMBOS) {
      const stats = runH2HMatchup(lightCombo, darkCombo, pools, rules, MATCHES_PER_MATCHUP);
      h2hResults.push(stats);
      console.log(`  ${lightCombo.name} vs ${darkCombo.name}: ${stats.sideAWinRate}% | ${stats.sideBWinRate}% | Draw: ${stats.drawRate}%`);
    }
  }
  console.log('');

  // ========================================
  // Generate Report
  // ========================================
  const report = generateBalanceReport(baselineStats, lightVsBaseline, darkVsBaseline, h2hResults);
  
  const outputPath = './VARIANT_2026_08_13_COMPREHENSIVE_BALANCE_REPORT.md';
  fs.writeFileSync(outputPath, report);
  console.log(`\n✅ Report written to ${outputPath}`);
}

function generateBalanceReport(
  baseline: MatchupStats,
  lightVsBaseline: MatchupStats[],
  darkVsBaseline: MatchupStats[],
  h2hResults: MatchupStats[]
): string {
  const lines: string[] = [];

  lines.push('# Variant-2026-08-13 Comprehensive Balance Report');
  lines.push('');
  lines.push(`**Matches per Matchup:** ${MATCHES_PER_MATCHUP}`);
  lines.push(`**AI Type:** ${AI_TYPE}`);
  lines.push(`**Profile:** variant-2026-08-13`);
  lines.push('');

  // Baseline
  lines.push('## Standard Pool Balance');
  lines.push('');
  lines.push('| Side | Win Rate | Avg Seals | Draw Rate |');
  lines.push('|:-----|:--------:|:---------:|:---------:|');
  lines.push(`| Light Pool | ${baseline.sideAWinRate}% | ${baseline.avgSealsControlled.sideA} | ${baseline.drawRate}% |`);
  lines.push(`| Dark Pool | ${baseline.sideBWinRate}% | ${baseline.avgSealsControlled.sideB} | - |`);
  const baseDiff = Math.abs(baseline.sideAWinRate - baseline.sideBWinRate);
  lines.push('');
  lines.push(baseDiff <= 5 ? '> [!TIP]\n> ✅ **Very Balanced** baseline pool matchup.' :
    baseDiff <= 12 ? '> [!NOTE]\n> ⚖️ **Moderately Balanced** baseline pool matchup.' :
    '> [!WARNING]\n> ⚠️ **Unbalanced** baseline pool matchup.');
  lines.push('');

  // Light combos vs baseline
  lines.push('## Light Tribal Combos vs Dark Baseline');
  lines.push('');
  lines.push('| Tribal Combo | Win Rate | Dark Win Rate | Draw | Δ from 50% | Assessment |');
  lines.push('|:-------------|:--------:|:------------:|:----:|:----------:|:----------:|');
  for (const s of lightVsBaseline) {
    const delta = (s.sideAWinRate - 50).toFixed(1);
    const assess = Math.abs(s.sideAWinRate - 50) <= 5 ? '✅ Balanced' :
      Math.abs(s.sideAWinRate - 50) <= 12 ? '⚖️ Moderate' : '⚠️ Unbalanced';
    lines.push(`| ${s.sideAName} | ${s.sideAWinRate}% | ${s.sideBWinRate}% | ${s.drawRate}% | ${delta}% | ${assess} |`);
  }
  lines.push('');

  // Dark combos vs baseline
  lines.push('## Dark Tribal Combos vs Light Baseline');
  lines.push('');
  lines.push('| Tribal Combo | Win Rate | Light Win Rate | Draw | Δ from 50% | Assessment |');
  lines.push('|:-------------|:--------:|:-------------:|:----:|:----------:|:----------:|');
  for (const s of darkVsBaseline) {
    const delta = (s.sideAWinRate - 50).toFixed(1);
    const assess = Math.abs(s.sideAWinRate - 50) <= 5 ? '✅ Balanced' :
      Math.abs(s.sideAWinRate - 50) <= 12 ? '⚖️ Moderate' : '⚠️ Unbalanced';
    lines.push(`| ${s.sideAName} | ${s.sideAWinRate}% | ${s.sideBWinRate}% | ${s.drawRate}% | ${delta}% | ${assess} |`);
  }
  lines.push('');

  // H2H matrix
  lines.push('## Cross-Combination Head-to-Head Matrix');
  lines.push('');
  lines.push('Win rates shown from the **Light combo** perspective (row = Light, column = Dark):');
  lines.push('');

  // Build matrix headers
  const darkNames = DARK_COMBOS.map(c => c.name.replace(' (Dark)', ''));
  lines.push('| Light \\ Dark | ' + darkNames.join(' | ') + ' |');
  lines.push('|:------------|' + darkNames.map(() => ':---:').join('|') + '|');

  for (let li = 0; li < LIGHT_COMBOS.length; li++) {
    const lightName = LIGHT_COMBOS[li].name.replace(' (Light)', '');
    const cells: string[] = [];
    for (let di = 0; di < DARK_COMBOS.length; di++) {
      const idx = li * DARK_COMBOS.length + di;
      const s = h2hResults[idx];
      const wr = s.sideAWinRate;
      const icon = Math.abs(wr - 50) <= 5 ? '✅' : (wr > 55 ? '🟢' : (wr < 45 ? '🔴' : '🟡'));
      cells.push(`${icon} ${wr}%`);
    }
    lines.push(`| ${lightName} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  // Overall balance summary
  lines.push('## Overall Balance Summary');
  lines.push('');

  // Compute statistics across all matchups
  const allWinRates = h2hResults.map(s => s.sideAWinRate);
  const allBaseline = [...lightVsBaseline, ...darkVsBaseline].map(s => s.sideAWinRate);
  const allRates = [...allWinRates, ...allBaseline];
  const mean = allRates.reduce((a, b) => a + b, 0) / allRates.length;
  const variance = allRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allRates.length;
  const stdDev = Math.sqrt(variance);
  const maxWR = Math.max(...allRates);
  const minWR = Math.min(...allRates);
  const range = maxWR - minWR;
  const balancedCount = allRates.filter(r => Math.abs(r - 50) <= 5).length;
  const moderateCount = allRates.filter(r => Math.abs(r - 50) > 5 && Math.abs(r - 50) <= 12).length;
  const unbalancedCount = allRates.filter(r => Math.abs(r - 50) > 12).length;

  lines.push(`| Metric | Value |`);
  lines.push(`|:-------|:-----:|`);
  lines.push(`| Total Matchups Tested | ${allRates.length} |`);
  lines.push(`| Mean Win Rate (from 50% ideal) | ${mean.toFixed(1)}% |`);
  lines.push(`| Standard Deviation | ${stdDev.toFixed(2)}% |`);
  lines.push(`| Win Rate Range | ${minWR}% - ${maxWR}% (${range.toFixed(1)}% spread) |`);
  lines.push(`| ✅ Balanced (±5%) | ${balancedCount} matchups |`);
  lines.push(`| ⚖️ Moderate (±5-12%) | ${moderateCount} matchups |`);
  lines.push(`| ⚠️ Unbalanced (>12%) | ${unbalancedCount} matchups |`);
  lines.push('');

  const overallAssessment = stdDev < 6 && unbalancedCount <= 2
    ? '> [!TIP]\n> ✅ **This variant is well-balanced.** The standard deviation across all tribal combinations is low, and the vast majority of matchups fall within acceptable balance ranges.'
    : stdDev < 10 && unbalancedCount <= 5
    ? '> [!NOTE]\n> ⚖️ **This variant is moderately balanced.** Some tribal combinations show advantages, but the overall spread is within reasonable limits.'
    : '> [!WARNING]\n> ⚠️ **This variant shows significant balance issues.** Several tribal combinations are heavily favored or disadvantaged. Card tuning is recommended.';

  lines.push(overallAssessment);
  lines.push('');

  // Find most and least balanced combos
  const allStats = [...lightVsBaseline, ...darkVsBaseline, ...h2hResults];
  const sortedByDeviation = allStats.sort((a, b) => Math.abs(a.sideAWinRate - 50) - Math.abs(b.sideAWinRate - 50));
  
  lines.push('### Most Balanced Matchups');
  lines.push('');
  for (const s of sortedByDeviation.slice(0, 5)) {
    lines.push(`- **${s.sideAName} vs ${s.sideBName}**: ${s.sideAWinRate}% / ${s.sideBWinRate}% (Δ${Math.abs(s.sideAWinRate - 50).toFixed(1)}%)`);
  }
  lines.push('');

  lines.push('### Least Balanced Matchups');
  lines.push('');
  for (const s of sortedByDeviation.slice(-5).reverse()) {
    lines.push(`- **${s.sideAName} vs ${s.sideBName}**: ${s.sideAWinRate}% / ${s.sideBWinRate}% (Δ${Math.abs(s.sideAWinRate - 50).toFixed(1)}%)`);
  }

  return lines.join('\n');
}

main().catch(console.error);
