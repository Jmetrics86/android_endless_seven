/**
 * Batch Simulator and Balance Analyzer for Endless Seven
 */

import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import {
  buildVampiresAndDemonsDeck,
  buildWerewolvesAndVampiresDeck,
  buildStandardLightDeck,
  buildStandardDarkDeck
} from './deckBuilder.js';
import { CardData, MatchupStats, SimulationResult } from './types.js';

export interface MatchupPreset {
  name: string;
  sideAName: string;
  sideBName: string;
  getSideADeck: () => CardData[];
  getSideBDeck: () => CardData[];
}

export const MATCHUP_PRESETS: Record<string, MatchupPreset> = {
  'vampires-demons-vs-werewolves-vampires': {
    name: 'Vampires & Demons (Dark Avatars) vs Werewolves & Vampires (Light Avatars)',
    sideAName: 'Vampires & Demons (Dark Avatars)',
    sideBName: 'Werewolves & Vampires (Light Avatars)',
    getSideADeck: () => buildVampiresAndDemonsDeck('dark'),
    getSideBDeck: () => buildWerewolvesAndVampiresDeck('light')
  },
  'vd-light-vs-wv-dark': {
    name: 'Vampires & Demons (Light Avatars) vs Werewolves & Vampires (Dark Avatars)',
    sideAName: 'Vampires & Demons (Light Avatars)',
    sideBName: 'Werewolves & Vampires (Dark Avatars)',
    getSideADeck: () => buildVampiresAndDemonsDeck('light'),
    getSideBDeck: () => buildWerewolvesAndVampiresDeck('dark')
  },
  'both-light-avatars': {
    name: 'Vampires & Demons (Light Avatars) vs Werewolves & Vampires (Light Avatars)',
    sideAName: 'Vampires & Demons (Light Avatars)',
    sideBName: 'Werewolves & Vampires (Light Avatars)',
    getSideADeck: () => buildVampiresAndDemonsDeck('light'),
    getSideBDeck: () => buildWerewolvesAndVampiresDeck('light')
  },
  'both-dark-avatars': {
    name: 'Vampires & Demons (Dark Avatars) vs Werewolves & Vampires (Dark Avatars)',
    sideAName: 'Vampires & Demons (Dark Avatars)',
    sideBName: 'Werewolves & Vampires (Dark Avatars)',
    getSideADeck: () => buildVampiresAndDemonsDeck('dark'),
    getSideBDeck: () => buildWerewolvesAndVampiresDeck('dark')
  },
  'light-vs-dark': {
    name: 'Full Light Pool vs Full Dark Pool',
    sideAName: 'Light Pool (Avatars, Celestial, Lycan)',
    sideBName: 'Dark Pool (Darkness, Daemon, Vampyre)',
    getSideADeck: () => buildStandardLightDeck(),
    getSideBDeck: () => buildStandardDarkDeck()
  }
};

export class Simulator {
  public runSimulation(
    presetKey = 'vampires-demons-vs-werewolves-vampires',
    totalGames = 100,
    playerAIType: 'easy' | 'smart' | 'neural' = 'easy',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'easy'
  ): MatchupStats {
    const preset = MATCHUP_PRESETS[presetKey] || MATCHUP_PRESETS['vampires-demons-vs-werewolves-vampires'];
    
    let sideAWins = 0;
    let sideBWins = 0;
    let draws = 0;
    let totalRounds = 0;

    let sideASealsSum = 0;
    let sideBSealsSum = 0;
    let neutralSealsSum = 0;

    const winConditionsBreakdown: Record<string, number> = {};

    const startTime = Date.now();

    for (let i = 0; i < totalGames; i++) {
      const deckA = preset.getSideADeck();
      const deckB = preset.getSideBDeck();

      const engine = new HeadlessGameEngine(
        deckA,
        deckB,
        preset.sideAName,
        preset.sideBName,
        undefined,
        undefined,
        playerAIType,
        enemyAIType
      );
      const res: SimulationResult = engine.runGame();

      if (res.winner === 'player') sideAWins++;
      else if (res.winner === 'enemy') sideBWins++;
      else draws++;

      totalRounds += res.rounds;
      sideASealsSum += res.playerSeals;
      sideBSealsSum += res.enemySeals;
      neutralSealsSum += res.neutralSeals;

      const cond = res.winCondition || 'Unknown';
      winConditionsBreakdown[cond] = (winConditionsBreakdown[cond] || 0) + 1;
    }

    const duration = Date.now() - startTime;

    return {
      matchupName: preset.name,
      sideAName: preset.sideAName,
      sideBName: preset.sideBName,
      totalGames,
      sideAWins,
      sideBWins,
      draws,
      sideAWinRate: Number(((sideAWins / totalGames) * 100).toFixed(2)),
      sideBWinRate: Number(((sideBWins / totalGames) * 100).toFixed(2)),
      drawRate: Number(((draws / totalGames) * 100).toFixed(2)),
      avgRounds: Number((totalRounds / totalGames).toFixed(2)),
      winConditionsBreakdown,
      avgSealsControlled: {
        sideA: Number((sideASealsSum / totalGames).toFixed(2)),
        sideB: Number((sideBSealsSum / totalGames).toFixed(2)),
        neutral: Number((neutralSealsSum / totalGames).toFixed(2))
      },
      totalDurationMs: duration
    };
  }

  public generateReport(stats: MatchupStats): string {
    const lines: string[] = [];
    lines.push(`=======================================================`);
    lines.push(`     ENDLESS SEVEN HEADLESS SIMULATOR BALANCE REPORT    `);
    lines.push(`=======================================================`);
    lines.push(`Matchup: ${stats.matchupName}`);
    lines.push(`Simulated Games: ${stats.totalGames}`);
    lines.push(`Execution Time: ${stats.totalDurationMs} ms (${(stats.totalDurationMs / stats.totalGames).toFixed(2)} ms/game)`);
    lines.push(``);
    lines.push(`--- WIN / LOSS RESULTS ---`);
    lines.push(`🏆 ${stats.sideAName}: ${stats.sideAWins} wins (${stats.sideAWinRate}%)`);
    lines.push(`🏆 ${stats.sideBName}: ${stats.sideBWins} wins (${stats.sideBWinRate}%)`);
    lines.push(`🤝 Draws: ${stats.draws} (${stats.drawRate}%)`);
    lines.push(``);
    lines.push(`--- GAMEPLAY STATISTICS ---`);
    lines.push(`Average Rounds per Game: ${stats.avgRounds}`);
    lines.push(`Average Seals Controlled:`);
    lines.push(`  - ${stats.sideAName}: ${stats.avgSealsControlled.sideA} / 7`);
    lines.push(`  - ${stats.sideBName}: ${stats.avgSealsControlled.sideB} / 7`);
    lines.push(`  - Unclaimed/Neutral: ${stats.avgSealsControlled.neutral} / 7`);
    lines.push(``);
    lines.push(`--- WIN CONDITION BREAKDOWN ---`);
    for (const [cond, count] of Object.entries(stats.winConditionsBreakdown)) {
      const pct = ((count / stats.totalGames) * 100).toFixed(1);
      lines.push(`  - ${cond}: ${count} games (${pct}%)`);
    }
    lines.push(``);
    lines.push(`--- BALANCE ASSESSMENT ---`);
    const diff = Math.abs(stats.sideAWinRate - stats.sideBWinRate);
    if (diff <= 5.0) {
      lines.push(`✅ VERY BALANCED: Matchup win rate gap is only ${diff.toFixed(1)}%.`);
    } else if (diff <= 12.0) {
      lines.push(`⚖️ MODERATELY BALANCED: Minor advantage to ${stats.sideAWinRate > stats.sideBWinRate ? stats.sideAName : stats.sideBName} (+${diff.toFixed(1)}%).`);
    } else {
      lines.push(`⚠️ UNBALANCED: Significant advantage to ${stats.sideAWinRate > stats.sideBWinRate ? stats.sideAName : stats.sideBName} (+${diff.toFixed(1)}%). Rebalancing recommended.`);
    }
    lines.push(`=======================================================`);

    return lines.join('\n');
  }
}
