# DISPATCH — Worker Rem All (Comprehensive Remediation Implementation)

## Identity
- Role: Software Engineer & Mechanics Fix Implementer
- Working Directory: /home/jasonbrewster/projects/android_endless_seven/.agents/worker_rem_all

## Task Objective
Apply the complete remediation strategy formulated by Explorer Rem 1, Explorer Rem 2, and Explorer Rem 3 to resolve all defects identified by Challenger 1 and Challenger 2 across both engines and the matrix generator deliverable.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Input References
- `/home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/orchestrator_2/PROJECT.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_1/handoff.md` and `.agents/explorer_rem_1/cyprian_mirror_fix.patch`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_2/handoff.md` and `.agents/explorer_rem_2/proposed_fixes.patch`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_3/handoff.md`
- `scripts/verify_pairwise_matrix.py`

## Instructions
1. **Apply Cyprian Mirror Self-Sacrifice Fix (Explorer Rem 1)**:
   - Apply patch `.agents/explorer_rem_1/cyprian_mirror_fix.patch` to `scripts/generate_pairwise_matrix.py` (or update lines 802–810 for mutual self-sacrifice: `if p.sacrifice_end_of_turn and e.sacrifice_end_of_turn:`).
   - Re-run `python3 scripts/generate_pairwise_matrix.py` to regenerate `docs/card_pairwise_matchup_matrix.md`.
   - Run `python3 scripts/verify_pairwise_matrix.py` to ensure it passes with 0 errors and 0 warnings.

2. **Apply Mutual Combat Siege & Ascension Fixes (Explorer Rem 2)**:
   - Apply `.agents/explorer_rem_2/proposed_fixes.patch` (or manually apply the changes documented in `explorer_rem_2/handoff.md`):
     - `web/src/game/GameController.ts:1140-1147`: Set `laneAbilityDestruction` only when `killedBy?.cause === 'ability'`, otherwise `null`.
     - `web/src/game/PhaseManager.ts`: Clear `laneAbilityDestruction` in Step A Tie Rule, Step D Siege, and guard Step E Ascension so it only promotes Champions when the lane is uncontested (`pCard && !eCard` or `eCard && !pCard`) and combat was not stymied.
     - `simulator/src/HeadlessGameEngine.ts`: Accept `cause: 'combat' | 'ability'` in `destroyCard()`, clear `laneAbilityDestruction` on combat mutual destruction, and guard Step E Ascension for uncontested champions.
     - `web/src/game/interfaces.ts` and `web/src/game/__tests__/helpers/testHarness.ts`.

3. **Apply Simulator Invulnerability & Board Presence Sync (Explorer Rem 3)**:
   - In `simulator/src/HeadlessGameEngine.ts:724-726`: Add `Anakim the Wise`, `Mammon`, and `Ulfric Thorne` to flip battle invulnerability (`card.isInvincible = true`).
   - In `simulator/src/HeadlessGameEngine.ts`: Call `this.syncBoardPresencePowerMarkers()` in Step A immediately following reveal, and after Step B before combat; de-duplicate and align Dawn's scaling in `syncBoardPresencePowerMarkers()`.
   - Update assertions in `simulator/src/__tests__/mechanics_stress_challenger1.test.ts` (lines 60, 340-341, 364) to assert the canonical passing behavior.

4. **Execute Verification**:
   - Run `python3 scripts/verify_pairwise_matrix.py` — must exit 0 with 0 errors.
   - Run `npm --prefix simulator test` — must pass 100% with 0 failures.
   - Run `npm --prefix web test` — must pass 100% with 0 failures.
   - Run `node validate_card_art_paths.mjs` — must exit 0.

5. **Deliverable**:
   - Write comprehensive report to `/home/jasonbrewster/projects/android_endless_seven/.agents/worker_rem_all/handoff.md`.
   - Notify parent when done.

## 2026-09-03T02:06:24Z - Invocation Prompt
You are Worker Rem All (Comprehensive Remediation Implementer). Your working directory is /home/jasonbrewster/projects/android_endless_seven/.agents/worker_rem_all. Read /home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md and /home/jasonbrewster/projects/android_endless_seven/.agents/worker_rem_all/DISPATCH.md.
MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
Your task is to apply the complete remediation package across scripts/generate_pairwise_matrix.py, docs/card_pairwise_matchup_matrix.md, web/src/game/GameController.ts, PhaseManager.ts, simulator/src/HeadlessGameEngine.ts, and test files as formulated by Explorer Rem 1, 2, and 3. Verify that python3 scripts/verify_pairwise_matrix.py passes with 0 errors, npm test in web/ and simulator/ pass 100%, write handoff.md, and notify parent.

