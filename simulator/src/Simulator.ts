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
  TribalFaction,
  DeckPools
} from './deckBuilder.js';
import { CardData, MatchupStats, SimulationResult } from './types.js';
import { resolveProfile, ExperimentProfile } from './cardRegistry.js';
import { RuleConfig, createRuleConfig } from './rules.js';

export interface MatchupPreset {
  name: string;
  sideAName: string;
  sideBName: string;
  getSideADeck: (pools?: DeckPools) => CardData[];
  getSideBDeck: (pools?: DeckPools) => CardData[];
}

export const MATCHUP_PRESETS: Record<string, MatchupPreset> = {
  'vampires-demons-vs-werewolves-vampires': {
    name: 'Vampires & Demons (Dark Avatars) vs Werewolves & Vampires (Light Avatars)',
    sideAName: 'Vampires & Demons (Dark Avatars)',
    sideBName: 'Werewolves & Vampires (Light Avatars)',
    getSideADeck: (pools) => buildVampiresAndDemonsDeck('dark', pools),
    getSideBDeck: (pools) => buildWerewolvesAndVampiresDeck('light', pools)
  },
  'light-vs-dark': {
    name: 'Full Light Pool vs Full Dark Pool',
    sideAName: 'Light Pool (Avatars, Celestial, Lycan)',
    sideBName: 'Dark Pool (Darkness, Daemon, Vampyre)',
    getSideADeck: (pools) => buildStandardLightDeck(pools?.lightPool),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  // All 12 3-Way Blend Deck Permutations vs Baseline Pool
  'vampyre-daemon-light': {
    name: 'Vampyre + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Vampyre + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Vampyre', 'Daemon', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'vampyre-daemon-dark': {
    name: 'Vampyre + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Vampyre + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Vampyre', 'Daemon', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  },
  'lycan-vampyre-light': {
    name: 'Lycan + Vampyre (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Lycan + Vampyre (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Lycan', 'Vampyre', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'lycan-vampyre-dark': {
    name: 'Lycan + Vampyre (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Lycan + Vampyre (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Lycan', 'Vampyre', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  },
  'celestial-lycan-light': {
    name: 'Celestial + Lycan (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Lycan (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Lycan', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'celestial-lycan-dark': {
    name: 'Celestial + Lycan (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Lycan (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Lycan', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  },
  'celestial-vampyre-light': {
    name: 'Celestial + Vampyre (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Vampyre (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Vampyre', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'celestial-vampyre-dark': {
    name: 'Celestial + Vampyre (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Vampyre (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Vampyre', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  },
  'celestial-daemon-light': {
    name: 'Celestial + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Celestial + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Daemon', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'celestial-daemon-dark': {
    name: 'Celestial + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Celestial + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Celestial', 'Daemon', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  },
  'lycan-daemon-light': {
    name: 'Lycan + Daemon (Light Avatars) vs Dark Pool Baseline',
    sideAName: 'Lycan + Daemon (Light)',
    sideBName: 'Dark Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Lycan', 'Daemon', 'light', pools),
    getSideBDeck: (pools) => buildStandardDarkDeck(pools?.darkPool)
  },
  'lycan-daemon-dark': {
    name: 'Lycan + Daemon (Dark Avatars) vs Light Pool Baseline',
    sideAName: 'Lycan + Daemon (Dark)',
    sideBName: 'Light Pool Baseline',
    getSideADeck: (pools) => buildDualTribalDeck('Lycan', 'Daemon', 'dark', pools),
    getSideBDeck: (pools) => buildStandardLightDeck(pools?.lightPool)
  }
};

export class Simulator {
  public runSimulation(
    presetKey = 'vampires-demons-vs-werewolves-vampires',
    totalGames = 100,
    playerAIType: 'easy' | 'smart' | 'neural' = 'smart',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'smart',
    enableAbilityDeferral = true,
    profileOrPath?: ExperimentProfile | string
  ): MatchupStats {
    const preset = MATCHUP_PRESETS[presetKey] || MATCHUP_PRESETS['vampires-demons-vs-werewolves-vampires'];
    
    // Resolve experimental card pools and rules
    const resolved = resolveProfile(profileOrPath);
    const pools: DeckPools = {
      lightPool: resolved.lightPool,
      darkPool: resolved.darkPool,
      avatarCopies: resolved.rules.avatarCopies ?? 1
    };
    const rules: RuleConfig = {
      ...resolved.rules,
      enableAbilityDeferral
    };

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
      const deckA = preset.getSideADeck(pools);
      const deckB = preset.getSideBDeck(pools);

      const engine = new HeadlessGameEngine(
        deckA,
        deckB,
        preset.sideAName,
        preset.sideBName,
        undefined,
        undefined,
        playerAIType,
        enemyAIType,
        rules
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
      matchupName: `${preset.name} [Profile: ${resolved.profileName}]`,
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

  public compareProfiles(
    presetKey: string,
    profileA: ExperimentProfile | string | undefined,
    profileB: ExperimentProfile | string,
    totalGames = 200,
    playerAIType: 'easy' | 'smart' | 'neural' = 'smart',
    enemyAIType: 'easy' | 'smart' | 'neural' = 'smart'
  ): { statsA: MatchupStats; statsB: MatchupStats; report: string } {
    const statsA = this.runSimulation(presetKey, totalGames, playerAIType, enemyAIType, true, profileA);
    const statsB = this.runSimulation(presetKey, totalGames, playerAIType, enemyAIType, true, profileB);

    const deltaWinA = Number((statsB.sideAWinRate - statsA.sideAWinRate).toFixed(2));
    const deltaWinB = Number((statsB.sideBWinRate - statsA.sideBWinRate).toFixed(2));
    const deltaRounds = Number((statsB.avgRounds - statsA.avgRounds).toFixed(2));

    const lines: string[] = [];
    lines.push(`=======================================================`);
    lines.push(`     ENDLESS SEVEN A/B BALANCE EXPERIMENT COMPARISON    `);
    lines.push(`=======================================================`);
    lines.push(`Matchup: ${presetKey}`);
    lines.push(`Simulated Games per profile: ${totalGames}`);
    lines.push(``);
    lines.push(`| Metric | Profile A (${statsA.matchupName.split('[Profile: ')[1] || 'Baseline'} | Profile B (${statsB.matchupName.split('[Profile: ')[1] || 'Experiment'} | Delta (B - A) |`);
    lines.push(`| :--- | :---: | :---: | :---: |`);
    lines.push(`| **${statsA.sideAName} Win%** | ${statsA.sideAWinRate}% | ${statsB.sideAWinRate}% | ${deltaWinA >= 0 ? '+' : ''}${deltaWinA}% |`);
    lines.push(`| **${statsA.sideBName} Win%** | ${statsA.sideBWinRate}% | ${statsB.sideBWinRate}% | ${deltaWinB >= 0 ? '+' : ''}${deltaWinB}% |`);
    lines.push(`| **Draws%** | ${statsA.drawRate}% | ${statsB.drawRate}% | ${(statsB.drawRate - statsA.drawRate).toFixed(2)}% |`);
    lines.push(`| **Avg Rounds** | ${statsA.avgRounds} | ${statsB.avgRounds} | ${deltaRounds >= 0 ? '+' : ''}${deltaRounds} |`);
    lines.push(``);
    lines.push(`=======================================================`);

    return {
      statsA,
      statsB,
      report: lines.join('\n')
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
