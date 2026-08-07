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
    [50.4, 52.3, 55.4, 54.1, 63.0, 67.0, 50.3, 51.2, 60.9, 61.7, 66.8, 66.4],
    [52.0, 48.7, 52.6, 53.3, 64.1, 67.4, 49.1, 51.1, 60.0, 63.9, 61.4, 62.5],
    [48.1, 47.5, 53.8, 52.9, 60.4, 63.6, 49.7, 49.2, 57.0, 58.2, 57.2, 60.1],
    [47.4, 48.4, 48.1, 51.2, 58.4, 61.9, 47.4, 49.0, 54.7, 58.4, 54.4, 57.9],
    [33.0, 33.3, 35.3, 34.9, 44.8, 52.9, 32.5, 35.3, 43.6, 44.3, 40.8, 43.4],
    [28.5, 30.3, 27.1, 33.3, 42.7, 46.3, 29.2, 32.4, 35.8, 39.2, 37.0, 38.5],
    [45.9, 49.0, 52.2, 52.5, 59.1, 64.4, 45.5, 49.5, 53.9, 54.7, 55.9, 59.0],
    [47.3, 46.2, 49.3, 49.2, 61.1, 60.7, 47.7, 45.4, 57.5, 58.4, 52.6, 57.8],
    [35.5, 38.7, 41.9, 43.9, 54.2, 58.3, 40.2, 41.6, 43.1, 50.7, 46.8, 48.7],
    [33.0, 37.2, 35.4, 40.5, 46.7, 53.4, 37.7, 39.3, 45.1, 47.2, 42.9, 47.3],
    [39.2, 43.9, 44.4, 47.3, 54.8, 58.5, 46.2, 46.5, 49.8, 56.3, 50.3, 56.1],
    [36.5, 41.5, 42.4, 43.9, 53.1, 57.6, 42.7, 46.1, 45.8, 48.1, 45.5, 51.6]
])

# Create reports directory if it doesn't exist
reports_dir = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(reports_dir, exist_ok=True)

# Set massive high-res canvas (28 x 22 inches)
fig, ax = plt.subplots(figsize=(28, 22), dpi=300)
fig.patch.set_facecolor('#0b0c14')
ax.set_facecolor('#0b0c14')

# Custom diverging colormap
cmap = sns.diverging_palette(12, 135, s=90, l=42, n=20, as_cmap=True)

# Heatmap with 3x larger text annotations (fontsize=25)
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

# Customize title and labels
plt.title("ENDLESS SEVEN — 12x12 HEAD-TO-HEAD MATCHUP MATRIX", fontsize=28, fontweight='bold', color='#ffffff', pad=35)
plt.suptitle("144,000 Total Matches Simulated (1,000 Matches Per Head-to-Head Pair)", fontsize=16, color='#a0aab8', y=0.97)

plt.xlabel("DEFENDER DECK COMPOSITION (SIDE B)", fontsize=18, labelpad=22, fontweight='bold', color='#4cc9f0')
plt.ylabel("ATTACKER DECK COMPOSITION (SIDE A)", fontsize=18, labelpad=22, fontweight='bold', color='#4cc9f0')

# Format ticks with larger font size (fontsize=15)
ax.set_xticklabels(full_labels, rotation=35, ha='right', fontsize=15, fontweight='bold', color='#ffffff')
ax.set_yticklabels(full_labels, rotation=0, fontsize=15, fontweight='bold', color='#ffffff')

# Format colorbar
cbar = ax.collections[0].colorbar
cbar.ax.yaxis.label.set_color('#ffffff')
cbar.ax.yaxis.label.set_size(16)
cbar.ax.yaxis.label.set_weight('bold')
cbar.ax.tick_params(labelsize=14, labelcolor='#ffffff')

plt.subplots_adjust(left=0.22, bottom=0.20, right=0.96, top=0.92)

output_path1 = os.path.join(reports_dir, "endless_seven_12x12_matrix.png")
output_path2 = r"C:\Users\jsnbr\.gemini\antigravity\brain\624035a2-9b3c-41b4-ba31-d1ceaf39cb08\endless_seven_matrix_python.png"

plt.savefig(output_path1, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
plt.savefig(output_path2, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
print(f"Heatmap with 3x larger text saved to:\n  - {output_path1}\n  - {output_path2}")
