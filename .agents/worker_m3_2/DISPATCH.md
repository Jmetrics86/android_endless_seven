# DISPATCH — Worker M3_2 (Matchup Matrix & Anomaly Generator)

## Identity
- Role: Data Analyst & Matchup Matrix Engineer
- Working Directory: /home/jasonbrewster/projects/android_endless_seven/.agents/worker_m3_2

## Task Objective
Implement `scripts/generate_pairwise_matrix.py` and generate the comprehensive, exhaustive `docs/card_pairwise_matchup_matrix.md` (1,764 matchups with victor, phase, math, rationale, 6x6 faction tables, and the R4 Anomaly & Edge Case Report).

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## CRITICAL PERFORMANCE WARNING
DO NOT execute `npm test card-combat-matrix.test.ts` — that test attempts to run 1,764 animated GSAP Three.js transitions in Vitest and hangs/times out.
Instead, use native `python3` to implement `scripts/generate_pairwise_matrix.py` and generate `docs/card_pairwise_matchup_matrix.md`. Python executes all 1,764 deterministic combat resolutions in < 0.1 seconds!

## File Ownership
Worker M3_2 has exclusive write access to:
- `scripts/generate_pairwise_matrix.py`
- `docs/card_pairwise_matchup_matrix.md`

## Input References
- `/home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_3/analysis.md` (Contains full resolution model, benchmark statistics, faction tables, anomaly analyses, and generator architecture)
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/analysis.md` (Card stats, traits, step bonuses)
- `web/src/constants.ts` and `simulator/src/constants.ts`

## Concrete Instructions
1. **Create `scripts/generate_pairwise_matrix.py`**:
   - Parse all 42 cards (Light 21, Dark 21) from `web/src/constants.ts` or embed the exact 42 canonical card specifications.
   - Implement the complete deterministic combat resolution logic:
     - Step 0: Haste Strike
     - Step A: Flip & Tie Rule
     - Step B: Flip/Activate Abilities in priority order (Nullify first, then descending flip power, Player initiative on tie)
     - Post-Step B Tie Rule
     - Step C: Combat (including battleStepBonusPower, temporary invulnerability, non-battler status)
     - End of Round: delayed marks (Fenris, Elowen)
   - Ensure it computes all 1,764 individual matchups accurately.

2. **Generate `docs/card_pairwise_matchup_matrix.md`**:
   - Must contain:
     - Document Header, Rules Summary, Phase Precedence.
     - Global Matchup Statistics (Win count, %, phase breakdown).
     - 6x6 Faction Summary Matrix (Avatars of Light, Celestial, Lycan, Darkness, Daemon, Vampyre).
     - All 1,764 Pairwise Matchups:
       - Victor (Player Card, Enemy Card, Tie / Mutual Destruction, Stymied / No Contest).
       - Winning Phase.
       - Step-by-step Math & Mechanical Rationale.
     - Dedicated R4 Anomaly, Edge Case & Errata Report:
       - Remiel Flip Nullify vs Step A Tie Rule.
       - Oriel & Cyprian non-battler status vs Step 0 Haste strikes.
       - Belphegor absolute battle immunity vs physical combat.
       - Zero-power destruction vs temporary battle invulnerability.
       - Dawn alternate win condition ownership leak (remediated in M2).
       - Noble the Great Haste ambiguity.
       - Simulator engine tied battle equality (remediated in M2).
       - Concrete errata recommendations.

3. **Verify Deliverable**:
   - Run `python3 scripts/generate_pairwise_matrix.py`.
   - Verify that `docs/card_pairwise_matchup_matrix.md` exists, is non-empty, and contains exactly 1,764 matchup records.

4. **Deliverable**:
   - Write comprehensive report to `/home/jasonbrewster/projects/android_endless_seven/.agents/worker_m3_2/handoff.md`.
   - Send completion message to parent.

## 2026-09-03T01:40:46Z
You are Worker M3_2 (Matrix Generator Worker). Your working directory is /home/jasonbrewster/projects/android_endless_seven/.agents/worker_m3_2. Read /home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md and /home/jasonbrewster/projects/android_endless_seven/.agents/worker_m3_2/DISPATCH.md.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INSTRUCTION: Do NOT run 'npm test card-combat-matrix.test.ts' because it hangs on 1,764 async Three.js delay animations.
Instead, use Python to implement scripts/generate_pairwise_matrix.py and execute it to generate docs/card_pairwise_matchup_matrix.md containing all 1,764 matchups with victor, phase, combat math, rationale, 6x6 faction tables, and the comprehensive R4 Anomaly & Edge Case Report. Verify the output file. Write handoff.md in your working directory and notify parent when done.
