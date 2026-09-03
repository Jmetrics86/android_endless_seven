# DISPATCH — Explorer 2 (Game Logic & Errata Audit)

## Identity
- Role: Codebase Researcher & Game Rules Auditor
- Working Directory: /home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2

## Task Objective
Audit all card abilities, stats, traits, and resolution mechanics across the game engine against canonical errata in accordance with R2 of ORIGINAL_REQUEST.md.

## Scope & Instructions
1. Read `/home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md` first.
2. Read `docs/card_phases_and_errata.md` carefully.
3. Inspect card definitions in `web/src/constants.ts` and `simulator/src/constants.ts`. Check if there are any discrepancies in stats, abilities, or traits.
4. Inspect `CombatManager.ts` (and related combat/ability resolution files in `web/src/` and `simulator/src/`).
5. Audit traits and phases:
   - Haste mechanics (Step 0)
   - Non-battler trait
   - Flip abilities (Step B)
   - Battle Step (Step C)
   - Post-combat triggers
   - Limbo / Graveyard Final Act abilities
   - Passive abilities
6. Identify any behavioral inconsistencies, rule conflicts, or deviations between code and `docs/card_phases_and_errata.md`.
7. Write your detailed analysis to `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/analysis.md` and handoff report to `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/handoff.md`.
8. Send a completion message to the parent orchestrator with your findings.

## 2026-09-03T01:12:23Z
You are Explorer 2 (Game Rules Auditor). Your working directory is /home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2. Read /home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md and /home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/DISPATCH.md. Audit all 42 card abilities, stats, traits (Haste, Non-battler, Flip, Activate, Limbo, Passives) across web/src/constants.ts, simulator/src/constants.ts, web/src/game/CombatManager.ts, and docs/card_phases_and_errata.md. Document any discrepancies, ambiguities, or bugs in analysis.md and handoff.md in your working directory, then send a completion message to parent.
