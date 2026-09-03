# DISPATCH — Worker 2 (M3: 42x42 Pairwise Matchup Matrix & Anomaly Report)

## Identity
- Role: Data Analyst & Matchup Matrix Engineer
- Working Directory: /home/jasonbrewster/projects/android_endless_seven/.agents/worker_2

## Task Objective
Generate the exhaustive 42x42 (1,764 matchups) Pairwise Combat Matchup Matrix and the in-depth Questionable Interactions, Edge Cases & Anomaly Report in `docs/card_pairwise_matchup_matrix.md` in accordance with R3 and R4 of ORIGINAL_REQUEST.md.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership
Worker 2 has exclusive write access to:
- `scripts/generate_pairwise_matrix.py` (or helper generator script)
- `docs/card_pairwise_matchup_matrix.md`

## Input References
- `/home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/orchestrator_2/PROJECT.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_3/analysis.md` (Matrix benchmark, rules model, faction matrix, and anomaly catalog)
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/analysis.md` (Card stats, traits, step bonuses)
- `web/src/constants.ts` and `simulator/src/constants.ts`

## Concrete Instructions
1. **Develop Deterministic Matchup Generator (`scripts/generate_pairwise_matrix.py`)**:
   - Implement the complete Endless Seven combat resolution algorithm matching `web/src/game/PhaseManager.ts`:
     - Step 0: Haste Check (initiator attacks and resolves before flip, non-battlers cannot be attacked/attack)
     - Step A: The Flip & Step A Tie Rule (if initial effective flip powers are equal and neither card is non-battler, both cards are destroyed simultaneously before abilities trigger)
     - Step B: Flip Abilities in priority order (Nullify executes first; then descending effective flip power; player wins initiative on equal power). Instant destruction abilities (Bella, Golgothane, Bogva, Jophiel, Duke Aren Drakos) remove opponent before combat.
     - Post-Step B Tie Rule (if effective powers become equal after flip modifications)
     - Step C: Combat (both cards compare combat power + battleStepBonusPower; higher destroys lower; equal destroys both). Handle temporary invulnerability (Anakim, Belphegor against battle) and non-battlers (Oriel power 1, Cyprian).
     - End of Round: Delayed marks / poison / wolf marks (Fenris, Elowen).
   - Verify that all $42 \times 42 = 1,764$ combinations are simulated with exact mechanical rationale.

2. **Generate Deliverable (`docs/card_pairwise_matchup_matrix.md`)**:
   - The document MUST include:
     - Executive Summary and System Rules Architecture (Phase execution order, tie rules, notation).
     - Global Matchup Statistics (Win count, %, phase breakdown).
     - 6x6 Faction vs Faction Summary Tables (Avatars of Light, Celestial, Lycan, Darkness, Daemon, Vampyre) showing Head-to-Head win/loss/tie records.
     - Full Pairwise Matchup Catalog for all 1,764 Combinations:
       - Organized logically by Player Card (all 42 cards), with subsection for each enemy matchup (all 42 cards).
       - Explicit Victor: Player Card, Enemy Card, Tie / Mutual Destruction, or Stymied / No Contest.
       - Exact Winning Phase: Step 0 Haste Strike, Step A Flip Tie Rule, Step B Flip Ability, Step B Tie Rule, Step C Battle Step, or End of Round.
       - Step-by-step Math & Mechanical Rationale: initial power, markers applied, effective power comparison, and rule reference.
     - Dedicated R4 Report Section: **Questionable Interactions, Edge Cases & Anomaly Report**:
       - Detailed analysis of Remiel Flip Nullify vs Step A Tie Rule timing paradox.
       - Oriel the Bold & Cyprian non-battler status vs Step 0 Haste strikes.
       - Belphegor battle destruction immunity vs physical combat.
       - Zero-power destruction bypassing temporary battle invulnerability.
       - Simultaneous instant-kill flips and priority resolution.
       - Dawn alternate win condition ownership leak.
       - Noble the Great Haste ambiguity.
       - Simulator engine tied battle equality divergence.
       - Concrete errata recommendations for each anomaly.

3. **Verify Deliverable Integrity**:
   - Verify that `docs/card_pairwise_matchup_matrix.md` is complete, fully formatted, contains exactly 1,764 matchup records, and has no truncated sections or placeholder text.

4. ## Deliverable:
 - Write comprehensive report to `/home/jasonbrewster/projects/android_endless_seven/.agents/worker_2/handoff.md`.
 - Send completion message to parent.

## 2026-09-03T01:21:12Z
Received dispatch:
Implement M3 (generate the exhaustive 42x42 pairwise matchup matrix in docs/card_pairwise_matchup_matrix.md for all 1,764 permutations, complete with victor, winning phase, combat math, rationale, 6x6 faction tables, and the comprehensive R4 Anomaly & Edge Case Report). Develop scripts/generate_pairwise_matrix.py to simulate/format the matrix deterministically. Write handoff.md in your working directory and notify parent when done.
