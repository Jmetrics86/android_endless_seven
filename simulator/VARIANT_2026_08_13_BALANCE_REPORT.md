# Endless Seven: Variant (2026-08-13) Comprehensive Balance & Meta Report

## Executive Summary

The **Variant-2026-08-13** card set represents a massive balance and mechanical overhaul of the Endless Seven card pool. By introducing step-specific power bonuses (`flipStepBonusPower`, `battleStepBonusPower`), tribal scaling (`dynamicFactionPowerBonus`), Ward protection mechanics, repositioning **Valtarious** to Lycan PV 5, introducing **Grelyn Zilkos** to Light Avatars, and increasing Avatar copies to 2x per core set, the meta has dramatically shifted toward high-tempo, interactive gameplay.

---

## 📊 Comparative Simulation Results

All simulations were run with **1,000 matches per matchup** comparing the **Canonical Baseline** against **Variant-2026-08-13** using the headless heuristic AI engine.

| Matchup | Canonical Baseline Win% | Variant-2026-08-13 Win% | Delta (Variant vs Baseline) | Balance Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Vampires & Demons (Dark) vs Werewolves & Vampires (Light)** | 58.3% vs 41.5% | **46.3% vs 53.6%** | **+12.1% (Light)** | ⚖️ **Excellently Balanced** (within 50 ± 3.6%) |
| **Full Light Pool vs Full Dark Pool** | 28.7% vs 71.0% | **32.0% vs 67.8%** | **+3.3% (Light)** | ⚠️ Dark still favored in pure mono-pool |
| **Celestial + Lycan (Light) vs Dark Baseline** | 25.0% vs 74.6% | **59.0% vs 41.0%** | **+34.0% (Celestial/Lycan)** | 🚀 **Massive Viability Surge** |
| **Celestial + Vampyre (Light) vs Dark Baseline** | 38.8% vs 61.0% | **75.4% vs 24.4%** | **+36.6% (Celestial/Vampyre)** | 🔥 **Dominant Control Archetype** |
| **Vampyre + Daemon (Dark) vs Light Baseline** | 67.8% vs 31.8% | **83.6% vs 16.4%** | **+15.8% (Vampyre/Daemon)** | 💀 Aggressive Dark Midrange |

---

## 🔍 Detailed Analysis by Faction

### 1. 🐺 Lycan Faction (Werewolves)
- **Valtarious (PV 5)** *(Replaces Garmr in core set)*:
  - Moving Valtarious to Lycan PV 5 with `+2 Power for each other Lycan in play` and a `Final Act: +3 Power Marker to any Lycan` gives the Werewolf tribe an explosive mid-game power curve.
- **Luna (PV 2)**:
  - The `+3 Power during battle step` (effective 5 PV in battle) prevents Luna from being an easy kill on early seal contests.
- **Varg Greyback (PV 3)**:
  - Gaining `+4 Power during Flip step` (effective 7 PV on flip) ensures Varg wins flip ties and safely distributes +1 Power Markers to 3 allies.
- **Outcome**: Lycan is now an elite board-building synergy archetype capable of directly overpowering Daemon debuffs.

---

### 2. 👼 Celestial Faction
- **Oriel the Bold (PV 1)**:
  - The clause `While this creature has a Power Value of 1, it cannot battle or be battled` plus `+2 Power per Celestial in play` solves Oriel's previous weakness of dying instantly before abilities resolve.
- **Remiel (PV 2)**:
  - `+3 Power during Flip step` (effective 5 PV) guarantees survival against mid-tier flips while nullifying enemy flip triggers.
- **Anakim the Wise (PV 3)**:
  - Introducing **Ward Markers** on vacant seals provides crucial disruption against early seal corruption and rush strategies.
- **Outcome**: Celestial transformed from the weakest canonical faction (~25% win rate) into a top-tier control powerhouse (59%–75% win rate).

---

### 3. 🧛 Vampyre Faction
- **Elowen Thornver (PV 3)**:
  - Complete rework: `During battle step +3 Power. Any creature that battles this creature is destroyed at the end of the round.` Turns Elowen into a devastating mutual-destruction trade card.
- **Lord Alaric (PV 7)**:
  - Passive `+2 Power for each other Vampyre in play` paired with `Flip: Return Champion to deck` makes Alaric a monstrous late-game finisher that commands seals with 11+ Power.
- **Duke Aren Drakos (PV 6)**:
  - `+2 Power during battle step` (effective 8 PV) provides strong combat stats alongside creature bounce.

---

### 4. 😈 Daemon Faction
- **Belphegor (PV 4) & Zelus (PV 3)**:
  - Weakness debuffs reduced from `-3` to `-2`, preventing non-interactive early game stat obliteration.
- **Bacchus (PV 1) & Desire (PV 2)**:
  - Step bonuses (+4 and +3 in Flip) allow Daemons to contest flips even with low printed PV.
- **Desire**:
  - Global mutual sacrifice trigger keeps board sizes manageable.

---

### 5. 👑 Avatars of Light & Darkness
- **2x Copies per Core Set**:
  - Significantly improves deck consistency and allows strategic play around god-tier champions without relying on a 1-in-49 top-deck draw.
- **Grelyn Zilkos (PV 9, Oathbringer)**:
  - `+2 Power per other Oathbringer` and `Flip: Mill 3 from Limbo to Graveyard` acts as a direct hard-counter to Graveborn and Limbo-recursion strategies.
- **Tarkidos (PV 9, Oathbringer)**:
  - Reaches **11 PV in battle** (and **14 PV while championing a Seal**), making it virtually unassailable once ascended.
- **Bella (PV 9, Oathbringer)**:
  - Upgraded to destroy *any creature on any seal* (not just champions), punishing greedy board placement.

---

## 🎯 Strategic Recommendations for Final Rules & Errata

1. **Keep Celestial Buffs**: The Oriel immunity at PV 1 and Remiel Flip bonus are essential for Celestial viability.
2. **Watch Celestial + Vampyre Synergy**: At 75.4% win rate, the combination of Celestial seal protection (Ward, Nullify, Flip bounce) and Vampyre removal (Alaric, Kaelarion, Elowen) is currently extremely potent. If balancing further, consider tuning Elowen's battle bonus from +3 to +2.
3. **Core Flagship Matchup is Balanced**: The primary game box matchup (*Vampires & Demons vs Werewolves & Vampires*) sits at **46.3% vs 53.6%**, which is in the sweet spot for competitive asymmetry.
