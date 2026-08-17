import * as fs from 'fs';

const logFile = 'C:/Users/jsnbr/.gemini/antigravity/brain/3e496487-2501-4841-a924-95c121925303/.system_generated/tasks/task-1734.log';
const log = fs.readFileSync(logFile, 'utf-8');

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

const matrix: number[][] = [];
for (let i = 0; i < 12; i++) {
  matrix.push(new Array(12).fill(0));
}

const regex = /^\s*(.+?) vs (.+?): ([\d\.]+)%/gm;
let match;
while ((match = regex.exec(log)) !== null) {
  const pA = match[1].trim();
  const pB = match[2].trim();
  const wr = parseFloat(match[3]);
  const i = LABEL_ORDER.indexOf(pA);
  const j = LABEL_ORDER.indexOf(pB);
  if (i !== -1 && j !== -1) {
    matrix[i][j] = wr;
  }
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

matrix_data = np.array(${matrixString})

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
`

fs.writeFileSync('./generate_matrix_10k.py', pythonScript);
