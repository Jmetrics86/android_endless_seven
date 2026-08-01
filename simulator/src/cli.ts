#!/usr/bin/env node

/**
 * CLI Entry point for Endless Seven Headless Simulator
 */

import { Simulator } from './Simulator.js';
import * as fs from 'fs';
import * as path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let games = 100;
  let matchup = 'vampires-demons-vs-werewolves-vampires';
  let verbose = false;
  let json = false;
  let reportPath = 'balance_report.md';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--games' || arg === '-g') {
      games = parseInt(args[++i], 10) || 100;
    } else if (arg === '--matchup' || arg === '-m') {
      matchup = args[++i] || matchup;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--json' || arg === '-j') {
      json = true;
    } else if (arg === '--report' || arg === '-r') {
      reportPath = args[++i] || reportPath;
    }
  }

  return { games, matchup, verbose, json, reportPath };
}

function main() {
  const { games, matchup, verbose, json, reportPath } = parseArgs();

  const simulator = new Simulator();
  console.log(`Starting headless simulation of ${games} games [Matchup: ${matchup}]...`);

  const stats = simulator.runSimulation(matchup, games);
  const reportText = simulator.generateReport(stats);

  if (json) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(reportText);
  }

  // Save report to file
  try {
    fs.writeFileSync(reportPath, reportText, 'utf-8');
    console.log(`\nBalance report saved to: ${path.resolve(reportPath)}`);
  } catch (err) {
    console.error('Could not save report file:', err);
  }
}

main();
