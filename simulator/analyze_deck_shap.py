import csv
from collections import defaultdict

print("=== Deck-Specific SHAP & Card Dominance Comparison ===")

csv_file = "kaggle_dataset/card_level_dataset.csv"

# Separate samples by Deck Composition
# Light Deck: Celestial, Lycan, Avatars of light
# Dark Deck: Daemon, Vampyre, Darkness

light_factions = {"Celestial", "Lycan", "Avatars of light"}
dark_factions = {"Daemon", "Vampyre", "Darkness"}

light_card_outcomes = defaultdict(list)
dark_card_outcomes = defaultdict(list)

light_global_outcomes = []
dark_global_outcomes = []

with open(csv_file, "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        c_name = row['card_name']
        c_faction = row['card_faction']
        outcome = float(row['win_outcome'])
        
        if c_faction in light_factions:
            light_card_outcomes[c_name].append(outcome)
            light_global_outcomes.append(outcome)
        elif c_faction in dark_factions:
            dark_card_outcomes[c_name].append(outcome)
            dark_global_outcomes.append(outcome)

light_baseline = sum(light_global_outcomes) / len(light_global_outcomes) if light_global_outcomes else 0.0
dark_baseline = sum(dark_global_outcomes) / len(dark_global_outcomes) if dark_global_outcomes else 0.0

def process_deck_shap(outcomes_map, baseline):
    results = []
    for c_name, outcomes in outcomes_map.items():
        cnt = len(outcomes)
        win_rate = sum(1 for o in outcomes if o > 0) / cnt * 100
        avg_outcome = sum(outcomes) / cnt
        shap_impact = avg_outcome - baseline
        results.append({
            "name": c_name,
            "count": cnt,
            "win_rate": win_rate,
            "shap_impact": shap_impact,
            "avg_outcome": avg_outcome
        })
    results.sort(key=lambda x: x["shap_impact"], reverse=True)
    return results

light_results = process_deck_shap(light_card_outcomes, light_baseline)
dark_results = process_deck_shap(dark_card_outcomes, dark_baseline)

print(f"\n--- LIGHT DECK BASELINE WIN RATE: {((light_baseline + 1)/2 * 100):.1f}% ---")
print("Top 5 Positive Performers (Celestial / Werewolf / Avatars of Light):")
for i, c in enumerate(light_results[:5], 1):
    sign = "+" if c['shap_impact'] >= 0 else ""
    print(f" {i}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Relative SHAP Impact: {sign}{c['shap_impact']:.4f}")

print("\nBottom 5 Performers (Celestial / Werewolf / Avatars of Light):")
for i, c in enumerate(light_results[-5:], 1):
    sign = "+" if c['shap_impact'] >= 0 else ""
    print(f" {i}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Relative SHAP Impact: {sign}{c['shap_impact']:.4f}")

print(f"\n--- DARK DECK BASELINE WIN RATE: {((dark_baseline + 1)/2 * 100):.1f}% ---")
print("Top 5 Positive Performers (Daemon / Vampire / Darkness):")
for i, c in enumerate(dark_results[:5], 1):
    sign = "+" if c['shap_impact'] >= 0 else ""
    print(f" {i}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Relative SHAP Impact: {sign}{c['shap_impact']:.4f}")

print("\nBottom 5 Performers (Daemon / Vampire / Darkness):")
for i, c in enumerate(dark_results[-5:], 1):
    sign = "+" if c['shap_impact'] >= 0 else ""
    print(f" {i}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Relative SHAP Impact: {sign}{c['shap_impact']:.4f}")

print("\n=========================================================================================")
print("⚔️ SIDE-BY-SIDE DECK CARD DOMINANCE COMPARISON")
print("=========================================================================================")
print(f"{'LIGHT DECK (Celestial/Werewolf)':<42} | {'DARK DECK (Daemon/Vampire)':<42}")
print("-" * 88)
max_len = max(len(light_results), len(dark_results))
for i in range(max_len):
    l_str = f"{i+1:2d}. {light_results[i]['name']} ({light_results[i]['win_rate']:.1f}%)" if i < len(light_results) else ""
    d_str = f"{i+1:2d}. {dark_results[i]['name']} ({dark_results[i]['win_rate']:.1f}%)" if i < len(dark_results) else ""
    print(f"{l_str:<42} | {d_str:<42}")
print("=========================================================================================")
