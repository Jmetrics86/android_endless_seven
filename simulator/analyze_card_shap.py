import csv
from collections import defaultdict

print("=== SHAP Value / Marginal Impact Card Balance Analyzer ===")

csv_file = "kaggle_dataset/card_level_dataset.csv"

# Store win outcomes per card and per faction
card_outcomes = defaultdict(list)
faction_outcomes = defaultdict(list)
global_outcomes = []

with open(csv_file, "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        c_name = row['card_name']
        c_faction = row['card_faction']
        outcome = float(row['win_outcome'])
        
        card_outcomes[c_name].append(outcome)
        faction_outcomes[c_faction].append(outcome)
        global_outcomes.append(outcome)

global_avg = sum(global_outcomes) / len(global_outcomes) if global_outcomes else 0.0

card_shap_results = []

for c_name, outcomes in card_outcomes.items():
    cnt = len(outcomes)
    win_rate = sum(1 for o in outcomes if o > 0) / cnt * 100
    avg_outcome = sum(outcomes) / cnt
    shap_impact = avg_outcome - global_avg
    
    card_shap_results.append({
        "name": c_name,
        "count": cnt,
        "win_rate": win_rate,
        "shap_impact": shap_impact
    })

# Sort by SHAP Impact
card_shap_results.sort(key=lambda x: x["shap_impact"], reverse=True)

print(f"\nAnalyzed {len(card_shap_results)} cards across {len(global_outcomes)} card-play instances.")
print(f"Global Baseline Outcome Value: {global_avg:+.4f}\n")

print("=====================================================================")
print("🏆 TOP 10 MOST IMPACTFUL CARDS (Highest SHAP Value / Win Rate Boost)")
print("=====================================================================")
for i, card in enumerate(card_shap_results[:10], 1):
    sign = "+" if card['shap_impact'] >= 0 else ""
    print(f"{i:2d}. {card['name']:<22} | Games Played: {card['count']:4d} | Win Rate: {card['win_rate']:.1f}% | SHAP Impact: {sign}{card['shap_impact']:.4f}")

print("\n=====================================================================")
print("⚠️ 5 LEAST EFFECTIVE / LOWEST IMPACT CARDS (Rebalancing Candidates)")
print("=====================================================================")
for i, card in enumerate(card_shap_results[-5:], 1):
    sign = "+" if card['shap_impact'] >= 0 else ""
    print(f"{i:2d}. {card['name']:<22} | Games Played: {card['count']:4d} | Win Rate: {card['win_rate']:.1f}% | SHAP Impact: {sign}{card['shap_impact']:.4f}")

print("\n=====================================================================")
print("🛡️ FACTION SHAP IMPACT SUMMARY")
print("=====================================================================")
faction_results = []
for f_name, outcomes in faction_outcomes.items():
    cnt = len(outcomes)
    win_rate = sum(1 for o in outcomes if o > 0) / cnt * 100
    avg_outcome = sum(outcomes) / cnt
    shap_impact = avg_outcome - global_avg
    faction_results.append({
        "faction": f_name,
        "count": cnt,
        "win_rate": win_rate,
        "shap_impact": shap_impact
    })

faction_results.sort(key=lambda x: x["shap_impact"], reverse=True)
for f in faction_results:
    sign = "+" if f['shap_impact'] >= 0 else ""
    print(f"Faction: {f['faction']:<18} | Samples: {f['count']:5d} | Win Rate: {f['win_rate']:.1f}% | SHAP Impact: {sign}{f['shap_impact']:.4f}")

print("=====================================================================")
