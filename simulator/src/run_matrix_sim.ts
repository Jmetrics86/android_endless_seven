import { Simulator } from './Simulator.js';
import { resolveProfile } from './cardRegistry.js';
import { buildDualTribalDeck, DeckPools, TribalFaction } from './deckBuilder.js';
import { HeadlessGameEngine } from './HeadlessGameEngine.js';
import { createRuleConfig, RuleConfig } from './rules.js';
import { Alignment } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

const PROFILE_PATH = './profiles/variant-2026-08-13.json';
const MATCHES_PER_MATCHUP = 10000;
const AI_TYPE: 'easy' | 'smart' | 'neural' = 'smart';

interface TribalCombo {
  name: string;
  tribeA: TribalFaction;
  tribeB: TribalFaction;
  alignment: 'light' | 'dark';
}

const LIGHT_COMBOS: TribalCombo[] = [
  { name: 'Vampyre + Daemon (Light)', tribeA: 'Vampyre', tribeB: 'Daemon', alignment: 'light' },
  { name: 'Lycan + Vampyre (Light)', tribeA: 'Lycan', tribeB: 'Vampyre', alignment: 'light' },
  { name: 'Celestial + Lycan (Light)', tribeA: 'Celestial', tribeB: 'Lycan', alignment: 'light' },
  { name: 'Celestial + Vampyre (Light)', tribeA: 'Celestial', tribeB: 'Vampyre', alignment: 'light' },
  { name: 'Celestial + Daemon (Light)', tribeA: 'Celestial', tribeB: 'Daemon', alignment: 'light' },
  { name: 'Lycan + Daemon (Light)', tribeA: 'Lycan', tribeB: 'Daemon', alignment: 'light' },
];

const DARK_COMBOS: TribalCombo[] = [
  { name: 'Vampyre + Daemon (Dark)', tribeA: 'Vampyre', tribeB: 'Daemon', alignment: 'dark' },
  { name: 'Lycan + Vampyre (Dark)', tribeA: 'Lycan', tribeB: 'Vampyre', alignment: 'dark' },
  { name: 'Celestial + Lycan (Dark)', tribeA: 'Celestial', tribeB: 'Lycan', alignment: 'dark' },
  { name: 'Celestial + Vampyre (Dark)', tribeA: 'Celestial', tribeB: 'Vampyre', alignment: 'dark' },
  { name: 'Celestial + Daemon (Dark)', tribeA: 'Celestial', tribeB: 'Daemon', alignment: 'dark' },
  { name: 'Lycan + Daemon (Dark)', tribeA: 'Lycan', tribeB: 'Daemon', alignment: 'dark' },
];

const ALL_COMBOS = [...LIGHT_COMBOS, ...DARK_COMBOS];
// Sort exactly to match the python script's full_labels list
const LABEL_ORDER = [
  'Vampyre + Daemon (Light)',
  'Vampyre + Daemon (Dark)',
  'Lycan + Vampyre (Light)',
  'Lycan + Vampyre (Dark)',
  'Celestial + Lycan (Light)',
  'Celestial + Lycan (Dark)',
  'Celestial + Vampyre (Light)',
  'Celestial + Vampyre (Dark)',
  'Celestial + Daemon (Light)',
  'Celestial + Daemon (Dark)',
  'Lycan + Daemon (Light)',
  'Lycan + Daemon (Dark)'
];

ALL_COMBOS.sort((a, b) => LABEL_ORDER.indexOf(a.name) - LABEL_ORDER.indexOf(b.name));

function runH2HMatchup(
  comboA: TribalCombo,
  comboB: TribalCombo,
  pools: DeckPools,
  rules: RuleConfig,
  games: number
) {
  let sideAWins = 0;
  let sideBWins = 0;
  let draws = 0;

  for (let i = 0; i < games; i++) {
    const deckA = buildDualTribalDeck(comboA.tribeA, comboA.tribeB, comboA.alignment, pools);
    const deckB = buildDualTribalDeck(comboB.tribeA, comboB.tribeB, comboB.alignment, pools);
    
    const isPlayerA = (i % 2 === 0);
    const pDeck = isPlayerA ? deckA : deckB;
    const eDeck = isPlayerA ? deckB : deckA;
    const pName = isPlayerA ? comboA.name : comboB.name;
    const eName = isPlayerA ? comboB.name : comboA.name;
    const pAlign = isPlayerA ? (comboA.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK) : (comboB.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK);
    const eAlign = isPlayerA ? (comboB.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK) : (comboA.alignment === 'light' ? Alignment.LIGHT : Alignment.DARK);
    
    const engine = new HeadlessGameEngine(pDeck, eDeck, pName, eName, pAlign, eAlign, AI_TYPE, AI_TYPE);
    engine.rules = rules;
    const result = engine.runGame();

    if (result.winner === 'draw') {
      draws++;
    } else if (result.winner === 'player') {
      isPlayerA ? sideAWins++ : sideBWins++;
    } else {
      isPlayerA ? sideBWins++ : sideAWins++;
    }
  }

  return {
    sideAWinRate: Number(((sideAWins / games) * 100).toFixed(1)),
    sideBWinRate: Number(((sideBWins / games) * 100).toFixed(1))
  };
}

async function main() {
  console.log(`Starting matrix generation simulation with ${MATCHES_PER_MATCHUP} games per matchup...`);
  
  const resolved = resolveProfile(PROFILE_PATH);
  const pools: DeckPools = {
    lightPool: resolved.lightPool,
    darkPool: resolved.darkPool,
    avatarCopies: resolved.rules.avatarCopies ?? 1
  };
  const rules = createRuleConfig({ ...resolved.rules, enableAbilityDeferral: true });

  const matrix: number[][] = [];
  
  for (let i = 0; i < ALL_COMBOS.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < ALL_COMBOS.length; j++) {
      const comboA = ALL_COMBOS[i];
      const comboB = ALL_COMBOS[j];
      
      if (i === j) {
        row.push(50.0);
        console.log(`  ${comboA.name} vs ${comboB.name}: 50.0% (Mirror)`);
      } else {
        const stats = runH2HMatchup(comboA, comboB, pools, rules, MATCHES_PER_MATCHUP);
        row.push(stats.sideAWinRate);
        console.log(`  ${comboA.name} vs ${comboB.name}: ${stats.sideAWinRate}%`);
      }
    }
    matrix.push(row);
  }

  const matrixString = `[\n` + matrix.map(row => `    [${row.map(n => n.toFixed(1)).join(', ')}]`).join(',\n') + `\n]`;
  
  const pythonScript = `import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os

full_labels = [
    'Vampyre + Daemon (Light)',
    'Vampyre + Daemon (Dark)',
    'Lycan + Vampyre (Light)',
    'Lycan + Vampyre (Dark)',
    'Celestial + Lycan (Light)',
    'Celestial + Lycan (Dark)',
    'Celestial + Vampyre (Light)',
    'Celestial + Vampyre (Dark)',
    'Celestial + Daemon (Light)',
    'Celestial + Daemon (Dark)',
    'Lycan + Daemon (Light)',
    'Lycan + Daemon (Dark)'
]

matrix_data = np.array(\${matrixString})

reports_dir = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(reports_dir, exist_ok=True)

fig, ax = plt.subplots(figsize=(28, 22), dpi=300)
fig.patch.set_facecolor('#0b0c14')
ax.set_facecolor('#0b0c14')

cmap = sns.diverging_palette(12, 135, s=90, l=42, n=20, as_cmap=True)

sns.heatmap(
    matrix_data, 
    annot=True, 
    fmt=".1f", 
    cmap=cmap, 
    vmin=25.0, 
    vmax=70.0, 
    center=50.0,
    xticklabels=full_labels, 
    yticklabels=full_labels, 
    cbar_kws={
        'label': 'Attacker (Side A) Win Rate (%)',
        'shrink': 0.8
    },
    linewidths=3.0, 
    linecolor='#0b0c14',
    annot_kws={"size": 24, "weight": "bold", "color": "white"},
    ax=ax
)

plt.title("ENDLESS SEVEN — 12x12 HEAD-TO-HEAD MATCHUP MATRIX", fontsize=28, fontweight='bold', color='#ffffff', pad=35)
plt.suptitle("1,440,000 Total Matches Simulated (10,000 Matches Per Head-to-Head Pair)", fontsize=16, color='#a0aab8', y=0.97)

plt.xlabel("DEFENDER DECK COMPOSITION (SIDE B)", fontsize=18, labelpad=22, fontweight='bold', color='#4cc9f0')
plt.ylabel("ATTACKER DECK COMPOSITION (SIDE A)", fontsize=18, labelpad=22, fontweight='bold', color='#4cc9f0')

ax.set_xticklabels(full_labels, rotation=35, ha='right', fontsize=15, fontweight='bold', color='#ffffff')
ax.set_yticklabels(full_labels, rotation=0, fontsize=15, fontweight='bold', color='#ffffff')

cbar = ax.collections[0].colorbar
cbar.ax.yaxis.label.set_color('#ffffff')
cbar.ax.yaxis.label.set_size(16)
cbar.ax.yaxis.label.set_weight('bold')
cbar.ax.tick_params(labelsize=14, labelcolor='#ffffff')

plt.subplots_adjust(left=0.22, bottom=0.20, right=0.96, top=0.92)

output_path1 = os.path.join(reports_dir, "endless_seven_12x12_matrix_10k.png")
output_path2 = r"C:\\Users\\jsnbr\\.gemini\\antigravity\\brain\\3e496487-2501-4841-a924-95c121925303\\endless_seven_matrix_python_10k.png"

plt.savefig(output_path1, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
plt.savefig(output_path2, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
print(f"Heatmap saved to:\\n  - {output_path1}\\n  - {output_path2}")
`;

  fs.writeFileSync('./generate_matrix_10k.py', pythonScript);
  console.log('\nGenerated python script at generate_matrix_10k.py');
}

main().catch(console.error);
