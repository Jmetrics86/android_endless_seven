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

## 🧪 Experimentation & Balance Profiles

The simulator supports **non-destructive experimentation**, allowing you to test alternative card power values, abilities, and rule variants without mutating the canonical game rules or card pools.

### Creating an Experiment Profile (`profiles/*.json`)
Create a JSON file in `profiles/` (e.g. `profiles/my_experiment.json`):
```json
{
  "id": "celestial_rebalance",
  "name": "Celestial Rebalance & 5-Round Variant",
  "rules": {
    "maxRounds": 5,
    "errataFlags": {
      "valeriusStealPower": true
    }
  },
  "cardOverrides": [
    { "name": "Remiel", "power": 3 },
    { "name": "Anakim The Wise", "power": 4 }
  ]
}
```

### Running Simulations with an Experiment Profile
```bash
# Run 500 games with experimental balance profile
npx tsx src/cli.ts --games 500 --profile profiles/my_experiment.json
```

### Running Side-by-Side A/B Comparisons
Measure the exact win rate delta caused by your proposed card buffs/nerfs against the canonical baseline:
```bash
npx tsx src/cli.ts --games 500 --matchup light-vs-dark --compare profiles/my_experiment.json
```

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

# Matchup options: vampires-demons-vs-werewolves-vampires | light-vs-dark | celestial-lycan-light | ...
npx tsx src/cli.ts --games 500 --matchup light-vs-dark

# Run with experiment profile
npx tsx src/cli.ts --games 500 --profile profiles/example_experiment.json

# Compare baseline vs experimental profile
npx tsx src/cli.ts --games 500 --matchup light-vs-dark --compare profiles/example_experiment.json

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
├── profiles/                   # JSON balance experiment profiles
│   └── example_experiment.json # Sample card override & rule profile
├── src/
│   ├── types.ts                # Data types, cards, seals & simulation interfaces
│   ├── rules.ts                # RuleConfig, default rules & mechanical errata flags
│   ├── cardRegistry.ts         # Card override engine, profile loader & registry
│   ├── constants.ts            # Canonical card definitions (Light & Dark pools)
│   ├── deckBuilder.ts          # Faction deck building algorithms (supports custom pools)
│   ├── AI.ts                   # Strategic heuristics & target selection
│   ├── HeadlessGameEngine.ts   # Core headless resolution engine (parameterized by RuleConfig)
│   ├── Simulator.ts            # Batch runner, A/B comparator & report generator
│   ├── cli.ts                  # CLI runner with --profile and --compare support
│   └── __tests__/
│       ├── simulation.test.ts  # Canonical baseline regression suite
│       └── experimentation.test.ts # Experimentation & override unit tests
├── balance_report.md           # Saved output report
├── package.json
├── tsconfig.json
└── README.md
```
