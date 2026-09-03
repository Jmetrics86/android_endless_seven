# DISPATCH — Worker 1 (M1 & M2: Asset Scripts, Tests, Errata & Engine Parity)

## Identity
- Role: Software Engineer & Rules Implementer
- Working Directory: /home/jasonbrewster/projects/android_endless_seven/.agents/worker_1

## Task Objective
Implement M1 (Asset Script & Regression Test) and M2 (Errata Documentation Overhaul & Game Engine Bug Fixes), then execute and verify all test suites across `web/` and `simulator/`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership
Worker 1 has exclusive write access to:
- `validate_card_art_paths.mjs`
- `web/src/game/__tests__/card-art-assets.test.ts`
- `docs/card_phases_and_errata.md`
- `web/src/game/AbilityManager.ts`
- `web/src/game/GameController.ts`
- `web/src/constants.ts`
- `simulator/src/constants.ts`
- `simulator/src/HeadlessGameEngine.ts`

## Input References
- `/home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/orchestrator_2/PROJECT.md`
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_1/analysis.md` (Asset findings)
- `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/analysis.md` (Rules & errata findings)

## Concrete Instructions
1. **Asset Script Fix (`validate_card_art_paths.mjs`)**:
   - Replace hardcoded Windows `C:/Users/jsnbr/...` paths with paths relative to `process.cwd()` or `import.meta.url` so the script runs cleanly on Linux, macOS, and Windows.
   - Run `node validate_card_art_paths.mjs` to ensure it passes with 0 errors.

2. **Automated Asset Test (`web/src/game/__tests__/card-art-assets.test.ts`)**:
   - Create a Vitest test that imports `CARD_ART_PATHS` and `CARD_BACK_PATH` from `web/src/cardArtPaths.ts` and asserts that 100% of the mapped files exist on disk in `web/public/`.
   - Verify all 42 canonical cards from `web/src/constants.ts` have mapped art.

3. **Errata Documentation Overhaul (`docs/card_phases_and_errata.md`)**:
   - Integrate all 11 missing cards identified by Explorer 2: Tarkidos, Grelyn Zilkos, Remiel, Jophiel, Metatron, Luna, Varg Greyback, Kaelo, Belphegor, Elowen Thornver, Lord Alaric.
   - Update the 8 outdated card entries to match Variant-2026-08-13 (Varg Greyback Flip +5, Anakim Ward Marker, Dawn +2, Bella creature destroy, Lycandor -3, Zelus -2, Mammon Flip, Ulfric Flip).
   - Document step bonus fields (`flipStepBonusPower`, `battleStepBonusPower`) and note the Noble the Great Haste errata status.

4. **Web Engine Bug Fixes**:
   - `web/src/game/AbilityManager.ts`: In Dawn's alternate win condition (around line 484), ensure `c.data.isEnemy === source.data.isEnemy` so enemy Oathbringers do NOT count toward player's win condition. In Dawn's flip ability (around line 386), ensure it gives +2 Power Markers per Oathbringer matching `constants.ts`.
   - `web/src/game/GameController.ts`: Around line 1251–1256, remove the legacy Valtarious check (`hasValtarious && alignment === Alignment.LIGHT`) since Valtarious is a Lycan creature and no longer has an Avatar of Light corruption-blocking passive.
   - `web/src/constants.ts`: Add `"hasActivate": true` to Bogva at line 380.
   - `simulator/src/constants.ts`: Add `"hasActivate": true` to Bogva at line 380 to keep constants identical.

5. **Simulator Engine Fixes (`simulator/src/HeadlessGameEngine.ts`)**:
   - In `handleBattle` (lines 938–950), add an `else` branch for tied effective power (`powA === powB`): both combatants are destroyed unless protected by invulnerability, matching `web/src/game/PhaseManager.ts:1370`.
   - Align Desire's ability (line 751) with same-lane sacrifice if appropriate, or ensure test stability.

6. **Build & Test Verification**:
   - Run `npm --prefix simulator test` — all tests must pass with 0 failures.
   - Run `npm --prefix web test` — all tests must pass with 0 failures.
   - Run `node validate_card_art_paths.mjs` — must exit 0.

7. **Deliverable**:
   - Write comprehensive report to `/home/jasonbrewster/projects/android_endless_seven/.agents/worker_1/handoff.md`.
   - Send completion message to parent.


## 2026-09-03T01:21:12Z
You are Worker 1 (Rules & Asset Worker). Your working directory is /home/jasonbrewster/projects/android_endless_seven/.agents/worker_1. Read /home/jasonbrewster/projects/android_endless_seven/.agents/ORIGINAL_REQUEST.md and /home/jasonbrewster/projects/android_endless_seven/.agents/worker_1/DISPATCH.md.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement M1 (fix validate_card_art_paths.mjs cross-platform paths, add web/src/game/__tests__/card-art-assets.test.ts) and M2 (overhaul docs/card_phases_and_errata.md with all 42 cards and Variant-2026-08-13 rules, fix Dawn win condition ownership in AbilityManager.ts, remove Valtarious legacy passive in GameController.ts, add Bogva hasActivate in constants.ts, and add tied combat mutual destruction in HeadlessGameEngine.ts). Run npm test in both web and simulator to verify 0 failures. Write handoff.md in your working directory and notify parent when done.
