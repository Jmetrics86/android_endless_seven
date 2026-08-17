import matplotlib.pyplot as plt
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

matrix_data = np.array([
    [50.0, 58.0, 46.4, 64.0, 49.0, 67.1, 45.5, 53.7, 48.0, 60.8, 47.7, 71.2],
    [41.6, 50.0, 51.9, 46.2, 54.5, 48.1, 38.9, 46.1, 45.1, 47.2, 56.5, 47.3],
    [44.6, 48.5, 50.0, 55.3, 46.9, 59.9, 43.5, 45.6, 46.1, 53.1, 45.9, 61.6],
    [36.5, 43.9, 44.3, 50.0, 50.2, 45.3, 34.6, 43.0, 41.4, 45.2, 50.5, 45.3],
    [42.0, 45.2, 38.9, 49.5, 50.0, 55.2, 40.6, 40.1, 42.7, 50.4, 40.7, 58.4],
    [32.6, 41.0, 39.7, 39.2, 45.5, 50.0, 29.7, 39.8, 37.1, 40.2, 45.9, 40.3],
    [45.5, 60.7, 43.0, 65.2, 45.9, 70.8, 50.0, 56.1, 47.1, 65.2, 45.3, 73.8],
    [47.5, 45.3, 53.8, 44.4, 59.2, 46.6, 43.5, 50.0, 50.8, 45.6, 60.7, 45.0],
    [44.3, 55.0, 42.2, 59.4, 44.4, 62.3, 43.7, 49.1, 50.0, 57.4, 44.2, 66.5],
    [39.0, 44.2, 46.8, 42.6, 49.8, 43.4, 35.0, 42.9, 41.9, 50.0, 52.2, 44.0],
    [45.2, 42.2, 42.0, 50.0, 44.8, 53.9, 42.9, 39.9, 45.3, 47.5, 50.0, 55.8],
    [28.8, 43.6, 36.8, 41.7, 41.9, 42.5, 26.6, 42.6, 32.9, 43.5, 43.8, 50.0]
])

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
output_path2 = r"C:\Users\jsnbr\.gemini\antigravity\brain\3e496487-2501-4841-a924-95c121925303\endless_seven_matrix_python_10k.png"

plt.savefig(output_path1, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
plt.savefig(output_path2, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
print(f"Heatmap saved to:\n  - {output_path1}\n  - {output_path2}")
