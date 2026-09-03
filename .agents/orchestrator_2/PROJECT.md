# Project: Endless Seven — Comprehensive Logic & Asset Audit

## Architecture
- **Simulator Engine (`simulator/`)**: Headless TypeScript game engine, AI balance simulator, Vitest test suite (`experimentation.test.ts`, `simulation.test.ts`, `variant-2026-08-13.test.ts`, `mechanics_stress_challenger1.test.ts`).
- **Web Application (`web/`)**: Three.js/React game board, `PhaseManager.ts`, `AbilityManager.ts`, `CombatManager.ts`, `GameController.ts`, `cardArtPaths.ts`, Vitest test suite (`web/src/game/__tests__/`).
- **Documentation & Errata (`docs/`)**: `docs/card_phases_and_errata.md` (canonical rule/phase reference), `docs/card_pairwise_matchup_matrix.md` (1,764 pairwise matchup matrix and anomaly report).
- **Scripts & Tools (`scripts/`, repo root)**: `validate_card_art_paths.mjs`, `scripts/generate_pairwise_matrix.py`, `scripts/verify_pairwise_matrix.py`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Card Asset & Casing Validation | Verify 100% of 42 cards in `CARD_ART_PATHS` map to valid disk textures with exact casing | M1 | Survey Explorer 1 | DONE |
| 2 | R1: Cross-Platform Path Script Fix | Fix hardcoded Windows paths in `validate_card_art_paths.mjs` to support Linux/CI | M1 | Worker 1 | DONE |
| 3 | R1: Automated Asset Regression Test | Add `web/src/game/__tests__/card-art-assets.test.ts` to Vitest suite (4/4 pass) | M1 | Worker 1 | DONE |
| 4 | R2: Canonical Errata Synchronization | Overhaul `docs/card_phases_and_errata.md` to add 11 missing cards and update 8 legacy card profiles | M2 | Worker 1 | DONE |
| 5 | R2: Web Engine Bug Remediation | Fix Dawn alternate win condition ownership leak, Dawn +2 power markers, Bogva `hasActivate`, and remove Valtarious ghost passive | M2 | Worker 1 | DONE |
| 6 | R2: Simulator Engine Bug Remediation | Add equal-power tied battle mutual destruction in `HeadlessGameEngine.ts` | M2 | Worker 1 | DONE |
| 7 | R2: Full Test Suite Validation | Run and pass 100% of tests in `web/` (357/357) and `simulator/` (42/42) with zero regressions | M2 | Worker 1 | DONE |
| 8 | R3: Deterministic Pairwise Matrix Generator | Implement script (`scripts/generate_pairwise_matrix.py`) to simulate/compute all 1,764 pairwise matchups with exact phases, math, and rationale | M3 | Worker M3_2 | DONE |
| 9 | R3: 42x42 Pairwise Matchup Matrix Document | Generate `docs/card_pairwise_matchup_matrix.md` containing all 1,764 combinations, faction tables, and stats (18,570 lines, 1.24 MB) | M3 | Worker M3_2 | DONE |
| 10 | R4: Edge Case & Anomaly Report | Complete report in `docs/card_pairwise_matchup_matrix.md` Part IV analyzing 11 paradoxes, engine bugs, and errata recommendations | M3 | Worker M3_2 | DONE |
| 11 | Multi-Agent Verification Gate | Reviewer 1, Reviewer 2, Challenger 1, Challenger 2, and Forensic Auditor verification | M4 | Project Standard | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Asset Script & Automated Test | Fix `validate_card_art_paths.mjs`, create `card-art-assets.test.ts` | none | DONE |
| M2 | Core Logic, Errata Doc & Engine Fixes | Overhaul `docs/card_phases_and_errata.md`, fix engine bugs, run full test suites | none | DONE |
| M3 | 42x42 Matrix & Anomaly Deliverable | Generate `docs/card_pairwise_matchup_matrix.md` (1,764 matchups + R4 report) | M2 | DONE |
| M4 | Final Multi-Agent Verification Gate | Independent Reviewers (2), Challengers (2), and Forensic Auditor verification | M1, M2, M3 | DONE |

## Interface Contracts
- `web/src/cardArtPaths.ts` ↔ `web/public/card-art/`: 100% of keys in `CARD_ART_PATHS` map to existing 822x1122 px PNG files.
- `docs/card_phases_and_errata.md` ↔ `web/src/constants.ts` & `simulator/src/constants.ts`: All 42 canonical cards described with exact Variant-2026-08-13 stats, abilities, and step timings.
- `docs/card_pairwise_matchup_matrix.md`: Standard markdown format with 1,764 matchup sections, victor, winning phase, combat math, and anomaly section. Verified 100% symmetric ($P=632, E=632, T=392, S=108$).

## Code Layout
- `web/src/constants.ts`, `simulator/src/constants.ts`: Source of truth for card definitions.
- `web/src/game/`: Web Three.js combat, ability, and phase management.
- `web/src/game/__tests__/`: Web Vitest test suites.
- `simulator/src/`: Simulator headless engine and Vitest test suites.
- `docs/`: Canonical errata documentation and pairwise matchup matrix deliverable.
- `validate_card_art_paths.mjs`: Script validating card art files on disk.
- `scripts/generate_pairwise_matrix.py`: Pairwise matrix generator.
- `scripts/verify_pairwise_matrix.py`: Adversarial pairwise matrix verification tool.
