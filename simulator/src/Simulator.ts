/**
 * Batch Simulator and Balance Analyzer for Endless Seven
 */

import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import {
  buildVampiresAndDemonsDeck,
  buildWerewolvesAndVampiresDeck,
  buildStandardLightDeck,
  buildStandardDarkDeck,
  buildDualTribalDeck,
  TribalFaction
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
  'light-vs-dark': {
    name: 'Full Light Pool vs Full Dark Pool',
    sideAName: 'Light Pool (Avatars, Celestial, Lycan)',
    sideBName: 'Dark Pool (Darkness, Daemon, Vampyre)',
    getSideADeck: () => buildStandardLightDeck(),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  // All 12 3-Way Blend Deck Permutations vs Baseline Pool
  'vampyre-daemon-light': {
    name: 'Vampyre + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Vampyre + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Vampyre', 'Daemon', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'vampyre-daemon-dark': {
    name: 'Vampyre + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Vampyre + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Vampyre', 'Daemon', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  },
  'lycan-vampyre-light': {
    name: 'Lycan + Vampyre (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Lycan + Vampyre (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Lycan', 'Vampyre', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'lycan-vampyre-dark': {
    name: 'Lycan + Vampyre (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Lycan + Vampyre (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Lycan', 'Vampyre', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  },
  'celestial-lycan-light': {
    name: 'Celestial + Lycan (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Lycan (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Lycan', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'celestial-lycan-dark': {
    name: 'Celestial + Lycan (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Lycan (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Lycan', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  },
  'celestial-vampyre-light': {
    name: 'Celestial + Vampyre (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Vampyre (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Vampyre', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'celestial-vampyre-dark': {
    name: 'Celestial + Vampyre (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Vampyre (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Vampyre', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  },
  'celestial-daemon-light': {
    name: 'Celestial + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Daemon', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'celestial-daemon-dark': {
    name: 'Celestial + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Celestial', 'Daemon', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  },
  'lycan-daemon-light': {
    name: 'Lycan + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Lycan + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Lycan', 'Daemon', 'light'),
    getSideBDeck: () => buildStandardDarkDeck()
  },
  'lycan-daemon-dark': {
    name: 'Lycan + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Lycan + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: () => buildDualTribalDeck('Lycan', 'Daemon', 'dark'),
    getSideBDeck: () => buildStandardLightDeck()
  }
};

export class Simulator {
  public runSimulation(
    presetKey = 'vampires-demons-vs-werewolves-vampires',
    totalGames = 100,
    playerAIType: 'easy' | 'smart' | 'neural' = 'smart',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'smart',
    enableAbilityDeferral = true
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
      engine.enableAbilityDeferral = enableAbilityDeferral;
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
