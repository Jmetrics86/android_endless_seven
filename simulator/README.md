# Endless Seven - Headless Balance Simulator (`endless_simulator`)

High-performance, zero-graphics headless simulation engine for **Endless Seven**, built to run hundreds or thousands of automated matches per second to determine game balance across faction matchups.

---

## ⚡ Features & Performance

- **Ultra-Fast Headless Engine**: Executes a full 3-to-4 round Endless Seven match in **~0.5 to 1.0 millisecond** (over 1,000 games in under 600 ms).
- **100% Mechanical Fidelity**: Implements full resolution pipeline (Haste strikes, Face-down flips, Flip abilities, Activate triggers, Combat, Post-combat effects, Siege alignment, Ascension, and Tie-breakers).
- **Faction Deck Building**: Includes standard pools and custom tribal deck builders for **Vampires & Demons** vs **Werewolves & Vampires**.
- **AI vs AI Strategic Evaluation**: Automated heuristic AI for both Player and Enemy sides for prep phase card placement, counter allocation, target selection, and win condition triggers.
- **Detailed Analytics & Balance Reports**: Reports win rates, draw rates, average rounds, seal control breakdown, win conditions (7-Seal Dominance, Majority, Five Champions, Special Avatars), and balance assessment.

---

## 🎮 Matchup Tested: Vampires & Demons vs Werewolves & Vampires

- **Side A (Vampires & Demons)**:
  - 21 Vampyre cards (3x Lord Alaric, Duke Aren Drakos, Sulvian Vane, Kaelarion, Elowen Thornver, Valerius Nightshade, Cyprian)
  - 21 Daemon cards (3x Bogva, Alistar Elren, Mammon, Belphegor, Zelus, Desire, Bacchus)
  - 7 Darkness cards (1x Nix, Golgothane, Lycandor, Umbarax, Karlyah, Pazoo, Skarados)
- **Side B (Werewolves & Vampires)**:
  - 21 Lycan / Werewolf cards (3x Lucian Blackwood, Ulfric Thorne, Garmr, Kaelo, Varg Fur-back, Luna, Fenris Lightfoot)
  - 21 Vampyre / Vampire cards (3x Lord Alaric, Duke Aren Drakos, Sulvian Vane, Kaelarion, Elowen Thornver, Valerius Nightshade, Cyprian)
  - 7 Avatars of Light cards (1x Dawn, Bella, Calmadious, Coal, Noble The Great, Tarkidos, Valtarious)

---

## 📊 Balance Simulation Results (1,000 Games)

| Metric | Side A (Vampires & Demons) | Side B (Werewolves & Vampires) |
|---|---|---|
| **Win Count** | **587 Wins** | **411 Wins** |
| **Win Rate** | **58.7%** | **41.1%** |
| **Avg Seals Controlled** | **3.99 / 7** | **2.95 / 7** |

- **Draw Rate**: 0.2% (2 games)
- **Average Rounds per Game**: 3.47 Rounds

### Win Condition Breakdown:
- **Majority of Seals (End of Round 3/4)**: 57.0% (570 games)
- **7-Seal Dominance**: 40.5% (405 games)
- **Special Win (Dawn / Nix / 5 Champions)**: ~2.3%

### ⚖️ Balance Conclusion:
> **Vampires & Demons** holds a **+17.6% win rate advantage** over **Werewolves & Vampires**.
> The combination of Daemon weakness debuffs (Bogva, Alistar Elren, Belphegor) and Darkness board wipes (Nix, Golgothane, Skarados) gives Vampires & Demons higher removal tempo during seal resolution compared to Lycan buff synergy.

---

## 🛠️ Usage & CLI

### Run 100 Games (Default)
```bash
npm run simulate
```

### Custom Options
```bash
# Run 1,000 games
npx tsx src/cli.ts --games 1000

# Matchup options: vampires-demons-vs-werewolves-vampires | light-vs-dark
npx tsx src/cli.ts --games 500 --matchup light-vs-dark

# Output JSON
npx tsx src/cli.ts --games 100 --json
```

### Build & Test
```bash
# Run Vitest test suite
npm test

# Compile TypeScript
npm run build
```

---

## 📁 Repository Structure

```
endless_simulator/
├── src/
│   ├── types.ts                # Data types, cards, seals & simulation interfaces
│   ├── constants.ts            # Card definitions (Light & Dark pools)
│   ├── deckBuilder.ts          # Faction deck building algorithms
│   ├── AI.ts                   # Strategic heuristics & target selection
│   ├── HeadlessGameEngine.ts   # Core headless resolution engine
│   ├── Simulator.ts            # Batch runner & report generator
│   ├── cli.ts                  # CLI runner
│   └── __tests__/
│       └── simulation.test.ts  # Vitest test suite
├── balance_report.md           # Saved output report
├── package.json
├── tsconfig.json
└── README.md
```
