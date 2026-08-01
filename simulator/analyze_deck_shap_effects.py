import csv
from collections import defaultdict

print("=== Redone SHAP Analysis: Positive & Negative Effects Breakdown ===")

csv_file = "kaggle_dataset/card_level_dataset.csv"

light_factions = {"Celestial", "Lycan", "Avatars of light"}
dark_factions = {"Daemon", "Vampyre", "Darkness"}

light_card_outcomes = defaultdict(list)
dark_card_outcomes = defaultdict(list)

light_outcomes_list = []
dark_outcomes_list = []

with open(csv_file, "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        c_name = row['card_name']
        c_faction = row['card_faction']
        outcome = float(row['win_outcome'])
        
        if c_faction in light_factions:
            light_card_outcomes[c_name].append(outcome)
            light_outcomes_list.append(outcome)
        elif c_faction in dark_factions:
            dark_card_outcomes[c_name].append(outcome)
            dark_outcomes_list.append(outcome)

light_baseline_winrate = sum(1 for o in light_outcomes_list if o > 0) / len(light_outcomes_list) * 100
dark_baseline_winrate = sum(1 for o in dark_outcomes_list if o > 0) / len(dark_outcomes_list) * 100

def analyze_effects(outcomes_map, baseline_winrate):
    positive_effects = []
    negative_effects = []
    
    for c_name, outcomes in outcomes_map.items():
        cnt = len(outcomes)
        win_rate = sum(1 for o in outcomes if o > 0) / cnt * 100
        delta_winrate = win_rate - baseline_winrate
        
        item = {
            "name": c_name,
            "count": cnt,
            "win_rate": win_rate,
            "delta_winrate": delta_winrate
        }
        
        if delta_winrate >= 0:
            positive_effects.append(item)
        else:
            negative_effects.append(item)
            
    positive_effects.sort(key=lambda x: x["delta_winrate"], reverse=True)
    negative_effects.sort(key=lambda x: x["delta_winrate"]) # most negative first
    return positive_effects, negative_effects

light_pos, light_neg = analyze_effects(light_card_outcomes, light_baseline_winrate)
dark_pos, dark_neg = analyze_effects(dark_card_outcomes, dark_baseline_winrate)

print(f"\n=========================================================================================")
print(f"☀️ LIGHT DECK (Celestial / Werewolf / Avatars of Light) | Baseline Win Rate: {light_baseline_winrate:.1f}%")
print(f"=========================================================================================")
print("➕ POSITIVE EFFECT CARDS (Increased Win Probability Above Deck Baseline):")
for i, c in enumerate(light_pos, 1):
    print(f" {i:2d}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Positive Effect: +{c['delta_winrate']:.2f}%")

print("\n➖ NEGATIVE EFFECT CARDS (Decreased Win Probability Below Deck Baseline):")
for i, c in enumerate(light_neg, 1):
    print(f" {i:2d}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Negative Effect: {c['delta_winrate']:.2f}%")

print(f"\n=========================================================================================")
print(f"🌙 DARK DECK (Daemon / Vampire / Darkness) | Baseline Win Rate: {dark_baseline_winrate:.1f}%")
print(f"=========================================================================================")
print("➕ POSITIVE EFFECT CARDS (Increased Win Probability Above Deck Baseline):")
for i, c in enumerate(dark_pos, 1):
    print(f" {i:2d}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Positive Effect: +{c['delta_winrate']:.2f}%")

print("\n➖ NEGATIVE EFFECT CARDS (Decreased Win Probability Below Deck Baseline):")
for i, c in enumerate(dark_neg, 1):
    print(f" {i:2d}. {c['name']:<22} | Win Rate: {c['win_rate']:.1f}% | Negative Effect: {c['delta_winrate']:.2f}%")
print("=========================================================================================")
