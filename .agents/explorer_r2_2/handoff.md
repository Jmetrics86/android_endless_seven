# Handoff Report — Explorer 2 (Game Rules & Errata Auditor)

**Role**: Explorer 2 (Game Rules Auditor)  
**Working Directory**: `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2`  
**Task Objective**: Comprehensive audit of all 42 card abilities, stats, traits (Haste, Non-battler, Flip, Activate, Limbo, Passives) across `web/src/constants.ts`, `simulator/src/constants.ts`, `web/src/game/CombatManager.ts`, and `docs/card_phases_and_errata.md`.

---

## 1. Observation

Direct code observations across the repository:

1. **Card Constants Parity**:
   - `web/src/constants.ts` (lines 9–468) and `simulator/src/constants.ts` (lines 8–467) contain 42 identically defined cards across Light Pool (21) and Dark Pool (21). A direct diff confirmed 0 discrepancies in card names, powers, types, factions, or trait flags between web and simulator constants.

2. **Documentation Omissions (`docs/card_phases_and_errata.md`)**:
   - Running a cross-reference between `web/src/constants.ts` and `docs/card_phases_and_errata.md` revealed that exactly **31 cards are mentioned** and **11 cards are completely omitted**:
     - Light Pool: Tarkidos, Grelyn Zilkos, Remiel, Jophiel, Metatron, Luna, Varg Greyback, Kaelo.
     - Dark Pool: Belphegor, Elowen Thornver, Lord Alaric.

3. **Documentation Outdated Mechanics & Names**:
   - `docs/card_phases_and_errata.md:136`: Lists `Varg Fur-back (Lycan/Creature - 3 Power)` with `Activate: Sacrifice this creature and place a +3 Power Marker on any creature`. The canonical ruleset Variant-2026-08-13 (`web/src/constants.ts:178` and `simulator/src/constants.ts:178`) uses `Varg Greyback` with `During the Flip step, +5 Power. Flip: Place a +2 Power Marker on up to two creatures.`
   - `docs/card_phases_and_errata.md:128`: Lists `Anakim The Wise` with `Activate: Choose a Seal. Enemy may not Champion or Influence that Seal until the end of the round. Passive: Cannot be destroyed by battle this turn.` In `web/src/constants.ts:111`, Anakim has `Flip: Cannot be destroyed by battle this turn. Activate: Place a Ward Marker on any Vacant seal...`
   - `docs/card_phases_and_errata.md:97`: Lists `Dawn: Flip: Gain +1 Power Marker for each Oathbringer in play.` In `web/src/constants.ts:40`, Dawn gains `+2 Power Marker for each Oathbringer in play.`
   - `docs/card_phases_and_errata.md:95`: Lists `Bella: Flip: Destroy any Champion on any Seal.` In `web/src/constants.ts:49`, Bella has `Flip: Destroy any creature on any Seal.`
   - `docs/card_phases_and_errata.md:109`: Lists `Lycandor: Flip: Place a -2 Weakness Marker on all Enemy creatures for each Graveborn you have in play.` In `web/src/constants.ts:252`, Lycandor has `Flip: Place a -3 Weakness Marker on each enemy creature in play.`
   - `docs/card_phases_and_errata.md:115`: Lists `Zelus: Flip: Place a -3 Weakness Marker...` In `web/src/constants.ts:333`, Zelus has `markerWeakness: 2` (-2 Weakness Marker).

4. **Noble the Great Haste Discrepancy**:
   - `docs/card_phases_and_errata.md:159`: Noble the Great is listed under Step D (Battle), NOT under Step 0 (Haste).
   - `docs/new_card_details.md:89` (OCR): `Noble The Great 9 Oathbringer/Avatar of Light Champion. After destroying a creature in battle, you may destroy another creature or Marker type in play.` (No Haste).
   - `web/src/constants.ts:61` & `simulator/src/constants.ts:61`: `"hasHaste": true`, `"ability": "Champion. Haste: Resolve battle before Flip abilities. After destroying a creature in battle..."`

5. **Web Engine Implementation Flaws**:
   - `web/src/game/AbilityManager.ts:484-486`:
     ```typescript
     const lightCardsInPlay = [...this.controller.playerBattlefield, ...this.controller.enemyBattlefield, ...this.controller.seals.map(s => s.champion)]
       .filter(c => c !== null && (c as CardEntity).data.faceUp && c.data.faction === "Avatars of light") as CardEntity[];
     const count = lightCardsInPlay.length;
     ```
     Dawn's alternate win condition checks `count >= 4` across *both* players' battlefields, incorrectly granting victory if the player and enemy control 4 combined Oathbringers.
   - `web/src/game/GameController.ts:1251-1256`:
     ```typescript
     // Valtarious: Passive: Prevents Purified Seals from being Corrupted while in play.
     const hasValtarious = [...this.playerBattlefield, ...this.seals.map(s => s.champion)].some(c => c && c.data.name === "Valtarious");
     if (hasValtarious && this.seals[idx].alignment === Alignment.LIGHT && !isDesireChoice) return;
     ```
     Valtarious is now a Lycan Creature (PV 5) and no longer has this Avatar of Light passive, but `GameController.ts` still executes this legacy corruption-blocking check.
   - `web/src/constants.ts:380`: Bogva's text includes `Activate: Destroy any creature in play that has a Weakness Marker.`, but lacks `"hasActivate": true`.
   - `web/src/game/AbilityManager.ts:80`: SAMYAZA drawer string reads `"Samyaza (Limbo): Siphon Power Markers from enemy cards."`, contradicting its true Nullify ability in `AbilityManager.ts:1522`.

6. **Simulator (`HeadlessGameEngine.ts`) Rule Deviations**:
   - `simulator/src/HeadlessGameEngine.ts:751-764`:
     ```typescript
     } else if (name === "Desire") {
       if (card.data.ability?.includes("sacrifice a creature in Play")) {
         // AI picks weakest own creature to sacrifice
         ...
         if (pAll.length > 0) this.destroyCard(weakest);
         if (eAll.length > 0) this.destroyCard(weakest);
     ```
     In the simulator, Desire forces each side to sacrifice their weakest creature anywhere on board, Desire stays alive, and does not influence the seal. In `web/src/game/PhaseManager.ts:717-758`, Desire forces mutual sacrifice at the active lane slot and influences the seal.
   - `simulator/src/HeadlessGameEngine.ts:938-950`: `handleBattle` checks `powA > powB` and `powB > powA`. There is no `else` branch for `powA === powB`. In tied combat, neither combatant is destroyed in the simulator, whereas in `web/src/game/PhaseManager.ts:1369-1414`, tied combat triggers mutual destruction.
   - `simulator/src/HeadlessGameEngine.ts`: Sulvian Vane is not handled in `handleBattle`; defeated combatants are destroyed instead of returned to owner's deck.
   - `simulator/src/HeadlessGameEngine.ts:341`: Checks `card.data.hasNullify` for Step B suppression, which Valerius Nightshade lacks; Valerius does not suppress flip abilities in the simulator.
   - `simulator/src/HeadlessGameEngine.ts:344-349`: Flip abilities always trigger for `pCard` before `eCard`, ignoring descending effective power ordering.

---

## 2. Logic Chain

1. **Premise 1**: The canonical ruleset is Variant-2026-08-13, as declared in file headers of `web/src/constants.ts:4`, `simulator/src/constants.ts:3`, and `simulator/VARIANT_2026_08_13_BALANCE_REPORT.md`.
2. **Premise 2**: `web/src/constants.ts` and `simulator/src/constants.ts` were synchronized to Variant-2026-08-13 (Observation 1), but `docs/card_phases_and_errata.md` was only partially updated from a legacy branch (Observation 2 & 3).
3. **Inference 1**: Therefore, `docs/card_phases_and_errata.md` is incomplete (missing 11 cards) and contains obsolete rules (Varg Fur-back sacrifice, Anakim seal lock, Dawn +1 power marker, Lycandor scaling weakness, Zelus -3 weakness).
4. **Premise 3**: In `web/src/game/AbilityManager.ts`, Dawn counts Oathbringers without checking ownership (`c.data.isEnemy === source.data.isEnemy`), whereas in `HeadlessGameEngine.ts:837`, the simulator engine explicitly fixed this bug (Observation 5).
5. **Inference 2**: Therefore, the web implementation of Dawn contains an alternate win condition bug where enemy Oathbringers contribute toward the activating player's victory.
6. **Premise 4**: In `web/src/game/GameController.ts:1251-1256`, Valtarious's legacy Avatar passive ("Purified Seals cannot be Corrupted") remains active in code despite Valtarious being a Lycan creature in Variant-2026-08-13 (Observation 5).
7. **Inference 3**: Therefore, Valtarious produces an unintended ghost passive preventing Dark seal corruption in web play.
8. **Premise 5**: In `simulator/src/HeadlessGameEngine.ts`, `handleBattle` lacks an equality branch for tied effective power (Observation 6).
9. **Inference 4**: Therefore, headless simulations undercount casualties in tie matchups, allowing tied battlers to survive into Step D/E.
10. **Premise 6**: In `simulator/src/HeadlessGameEngine.ts:751`, Desire's ability triggers a board-wide sacrifice rather than a lane-specific sacrifice (Observation 6).
11. **Inference 5**: Therefore, Desire performs an illegal resolution in the simulator compared to both canonical errata (`docs/card_phases_and_errata.md:93`) and the web engine (`PhaseManager.ts:717`).

---

## 3. Caveats

- **Noble the Great Haste Intention**: It is unclear whether Noble the Great was intentionally given Haste as a deliberate balance buff in Variant-2026-08-13 (as reflected in both `web/src/constants.ts`, `simulator/src/constants.ts`, and `simulator/profiles/variant-2026-08-13.json`), or whether it was an accidental carryover from an earlier experiment.
- **Valerius Nightshade Power Steal**: The 1-power steal is implemented in both game engines and documented in `docs/card_phases_and_errata.md:156`, but is not printed in the card's `ability` string in `constants.ts` or on the physical card art.
- **No Source Code Modifications**: Under read-only Explorer rules, no source files outside of `.agents/explorer_r2_2/` were modified.

---

## 4. Conclusion

1. **Card Constants & Archetypes**: The 42 cards are structurally sound in `web/src/constants.ts` and `simulator/src/constants.ts`. All 42 cards have distinct identities, factions, and power values conforming to Variant-2026-08-13.
2. **Canonical Errata Documentation (`docs/card_phases_and_errata.md`) Requires Overhaul**:
   - 11 cards must be added.
   - 8 cards with legacy stats/abilities must be updated.
   - Step bonuses (`flipStepBonusPower`, `battleStepBonusPower`) must be formally cataloged.
3. **Engine Fixes Required for Downstream Teams**:
   - Fix Dawn alternate win condition ownership filter in `AbilityManager.ts:484`.
   - Remove legacy Valtarious corruption-blocking code in `GameController.ts:1251-1256`.
   - Fix Desire same-lane sacrifice in `HeadlessGameEngine.ts:751`.
   - Add tied battle mutual destruction branch to `HeadlessGameEngine.ts:938`.
   - Implement Sulvian Vane deck bounce and Valerius Nightshade flip suppression in `HeadlessGameEngine.ts`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Missing Cards in Errata**:
   Inspect `docs/card_phases_and_errata.md` for any mention of `Tarkidos`, `Grelyn Zilkos`, `Remiel`, `Jophiel`, `Metatron`, `Luna`, `Kaelo`, `Belphegor`, `Elowen Thornver`, or `Lord Alaric`. None will be found.
2. **Verify Dawn Win Condition Ownership Bug**:
   Inspect `web/src/game/AbilityManager.ts` line 484–486. Note that `lightCardsInPlay` filters `c.data.faction === "Avatars of light"` without checking `c.data.isEnemy`. Compare with `simulator/src/HeadlessGameEngine.ts` line 837, which includes `c.isEnemy === isEnemy`.
3. **Verify Valtarious Ghost Passive**:
   Inspect `web/src/game/GameController.ts` lines 1251–1256. Observe that `hasValtarious` prevents Dark corruption on Light seals despite Valtarious being a Lycan creature in `web/src/constants.ts:200`.
4. **Verify Simulator Tied Battle & Desire Bugs**:
   Inspect `simulator/src/HeadlessGameEngine.ts` lines 751–764 (Desire board-wide sacrifice) and lines 938–950 (`handleBattle` lacking an equality branch). Compare with `web/src/game/PhaseManager.ts` lines 717–758 (Desire lane sacrifice) and lines 1369–1414 (tied combat mutual destruction).
5. **Detailed Documentation**:
   Review the exhaustive card-by-card breakdown in `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2/analysis.md`.
