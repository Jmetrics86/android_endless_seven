# Original User Request

## Initial Request — 2026-08-29T04:00:14Z

Verify that the newly adopted game variant, simulation rules, and card art assets are functioning end-to-end across both web and simulator test suites, and ensure the repository changes are properly committed and pushed to GitHub.

Working directory: c:\Users\jsnbr\Projects\android_endless_seven
Integrity mode: development

## Requirements

### R1. Comprehensive Test Suite Validation
Execute full test suites across both the simulator/ engine and the web/ application to ensure 100% pass rates and that no regressions exist in the new balance mechanics, card interactions, or win conditions.

### R2. Web Asset & Android Build Verification
Ensure the web bundle compiles cleanly without bundling errors and that the production assets are properly generated into the Android assets directory (app/src/main/assets/web).

### R3. Version Control & Git Push
Inspect repository status, ensure all modified/added files (assets, constants, test updates) are staged with a descriptive commit message, and push the commit to the remote GitHub repository.

## Acceptance Criteria

### Test & Build Verification
- [ ] npm --prefix simulator test passes with 0 failures.
- [ ] npm --prefix web test passes with 0 failures.
- [ ] npm --prefix web run build:android completes successfully with assets built to app/src/main/assets/web.

### Git Synchronization
- [ ] git status shows a clean working tree after commit.
- [ ] All changes are pushed to the remote branch on GitHub.

## 2026-09-03T01:10:53Z

Comprehensive Endless Seven card logic and asset audit: verify all 42 card visual image mappings and resolution mechanics, audit game engine rules against canonical errata, generate an exhaustive 42x42 pairwise matchup Markdown document (`docs/card_pairwise_matchup_matrix.md`) detailing winner, winning phase, and mechanical rationale for all 1,764 matchups, and produce an in-depth report on all questionable interactions, edge cases, and balance anomalies.

Working directory: /home/jasonbrewster/projects/android_endless_seven
Integrity mode: development

## Requirements

### R1. Card Asset & Visual Logic Audit
Verify that all 42 cards (Light and Dark pools) have valid, properly formatted image assets in `web/public/card-art/`, mappings in `web/src/cardArtPaths.ts`, correctly configured visual parameters, and zero broken image references.

### R2. Core Card Game Logic & Resolution Phase Review
Audit all card abilities, stats, traits (Haste, Non-battler, Flip, Activate, Limbo Final Act, Passives, Post-Combat Triggers) across `web/src/constants.ts`, `simulator/src/constants.ts`, `CombatManager.ts`, and `docs/card_phases_and_errata.md` to ensure behavioral and rule consistency.

### R3. Exhaustive 42x42 Pairwise Combat Matchup Matrix (1,764 Combinations)
Generate a comprehensive, structured Markdown document (`docs/card_pairwise_matchup_matrix.md`) detailing the 1v1 resolution of every card against every other card across all 1,764 permutations:
1. Specify Victor (Player Card, Enemy Card, Tie / Mutual Destruction, or No Contest).
2. Specify Phase of Victory (Step 0 Haste Strike, Step B Flip Ability, Step C Battle Step, End of Round, or Limbo/Graveyard resolution).
3. Provide step-by-step combat/ability math and mechanical rationale for each result.
4. Include faction-by-faction breakdown tables and high-level matchup summaries.

### R4. Questionable Interactions, Edge Cases & Anomaly Report
Identify and thoroughly document any rule contradictions, timing paradoxes, non-intuitive interactions, or potential engine bugs (e.g. Haste vs Non-battler, simultaneous instant-kill flips, tie-breaker order dependencies, Limbo triggers, or stat-modification timing).

## Acceptance Criteria

### Asset Verification
- [ ] Automated validation confirms 100% of card art paths in `CARD_ART_PATHS` point to valid existing files on disk.
- [ ] Any filename casing discrepancies or missing fallback mappings are identified and resolved.

### Rule & Logic Conformance
- [ ] Complete behavioral audit across the 42 cards confirms code alignment with `docs/card_phases_and_errata.md`.
- [ ] Vitest test suite (`web/src/game/__tests__/`) and simulator test suite run and pass without regressions.

### Pairwise Matchup Matrix Deliverable
- [ ] The generated `docs/card_pairwise_matchup_matrix.md` contains exhaustive analysis for all 1,764 card matchups (42 cards x 42 cards).
- [ ] Each matchup specifies victor, winning phase (Step 0, Step B, Step C, End of Round), and mechanical explanation.
- [ ] High-level summary tables grouped by faction (Avatars of Light, Celestial, Lycan, Darkness, Vampyre, Daemon) are included.

### Anomaly & Edge Case Report
- [ ] A dedicated report section details all identified questionable interactions, rule ambiguities, timing conflicts, and recommended errata clarifications.
