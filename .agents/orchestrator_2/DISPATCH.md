## 2026-09-03T01:11:36Z

You are the Project Orchestrator for the Endless Seven repository.
Your working directory is: /home/jasonbrewster/projects/android_endless_seven/.agents/orchestrator_2
Your project root is: /home/jasonbrewster/projects/android_endless_seven
Your authoritative user request is in: /home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md

USER REQUEST:
Comprehensive Endless Seven card logic and asset audit: verify all 42 card visual image mappings and resolution mechanics, audit game engine rules against canonical errata, generate an exhaustive 42x42 pairwise matchup Markdown document (`docs/card_pairwise_matchup_matrix.md`) detailing winner, winning phase, and mechanical rationale for all 1,764 matchups, and produce an in-depth report on all questionable interactions, edge cases, and balance anomalies.

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. Card Asset & Visual Logic Audit (R1):
   - Verify that all 42 cards (Light and Dark pools) have valid, properly formatted image assets in `web/public/card-art/`, mappings in `web/src/cardArtPaths.ts`, correctly configured visual parameters, and zero broken image references.
   - Automated validation confirms 100% of card art paths in `CARD_ART_PATHS` point to valid existing files on disk.
   - Any filename casing discrepancies or missing fallback mappings are identified and resolved.

2. Core Card Game Logic & Resolution Phase Review (R2):
   - Audit all card abilities, stats, traits (Haste, Non-battler, Flip, Activate, Limbo Final Act, Passives, Post-Combat Triggers) across `web/src/constants.ts`, `simulator/src/constants.ts`, `CombatManager.ts`, and `docs/card_phases_and_errata.md` to ensure behavioral and rule consistency.
   - Complete behavioral audit across the 42 cards confirms code alignment with `docs/card_phases_and_errata.md`.
   - Vitest test suite (`web/src/game/__tests__/`) and simulator test suite run and pass without regressions.

3. Exhaustive 42x42 Pairwise Combat Matchup Matrix (1,764 Combinations) (R3):
   - Generate a comprehensive, structured Markdown document (`docs/card_pairwise_matchup_matrix.md`) detailing the 1v1 resolution of every card against every other card across all 1,764 permutations:
   - Specify Victor (Player Card, Enemy Card, Tie / Mutual Destruction, or No Contest).
   - Specify Phase of Victory (Step 0 Haste Strike, Step B Flip Ability, Step C Battle Step, End of Round, or Limbo/Graveyard resolution).
   - Provide step-by-step combat/ability math and mechanical rationale for each result.
   - Include faction-by-faction breakdown tables and high-level matchup summaries.

4. Questionable Interactions, Edge Cases & Anomaly Report (R4):
   - Dedicated report section detailing rule contradictions, timing paradoxes, non-intuitive interactions, or potential engine bugs (e.g. Haste vs Non-battler, simultaneous instant-kill flips, tie-breaker order dependencies, Limbo triggers, or stat-modification timing), with recommended errata clarifications.

OPERATIONAL REQUIREMENTS:
- Regularly update `/home/jasonbrewster/projects/android_endless_seven/.agents/orchestrator_2/progress.md` and `BRIEFING.md`.
- When all tasks and acceptance criteria are completed, send a message to Sentinel claiming victory and summarizing results.
