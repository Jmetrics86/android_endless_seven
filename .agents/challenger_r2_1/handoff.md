# HANDOFF — Challenger 1: Combat Mechanics Empirical Stress Testing

**Verdict**: **REJECT**  
**Role**: Empirical Adversarial Challenger (Mechanics Stress)  
**Target Scope**: Endless Seven Combat Mechanics, Phase Precedence (Step 0, Step A Tie Rule, Step B Abilities, Step C Combat & Mutual Destruction), `docs/card_pairwise_matchup_matrix.md`, and Dual Engine Implementations (`HeadlessGameEngine.ts`, `PhaseManager.ts`, `GameController.ts`).

---

## 1. Observation

### Obs 1: Mutual Combat Destruction Falsely Awards Seal Influence via `laneAbilityDestruction` (Both Engines)
In both the Web engine and the Simulator engine, whenever any card is destroyed, `destroyCard()` unconditionally records lane ability destruction:
- **`simulator/src/HeadlessGameEngine.ts:981-987`**:
```typescript
    if (seal) seal.champion = null;
    else if (idxP !== -1) {
      this.playerBattlefield[idxP] = null;
      this.laneAbilityDestruction[idxP] = 'enemy';
    } else if (idxE !== -1) {
      this.enemyBattlefield[idxE] = null;
      this.laneAbilityDestruction[idxE] = 'player';
    }
```
- **`web/src/game/GameController.ts:1140-1147`**:
```typescript
    if (isAgainstChamp) {
      this.seals[idx].champion = null;
    } else {
      if (isEnemy) {
        this.enemyBattlefield[idx] = null;
        this.laneAbilityDestruction[idx] = 'player';
      } else {
        this.playerBattlefield[idx] = null;
        this.laneAbilityDestruction[idx] = 'enemy';
      }
    }
```
In both engines, when two creatures destroy each other in combat during Step C (or Step 0):
- `cardA` (Player) is destroyed first: sets `laneAbilityDestruction[idx] = 'enemy'`.
- `cardB` (Enemy) is destroyed second: overwrites `laneAbilityDestruction[idx] = 'player'`.
Then in Step D (Siege Phase):
- **`simulator/src/HeadlessGameEngine.ts:398-403`**:
```typescript
      } else if (!pCard && !eCard && this.laneAbilityDestruction[idx]) {
        isPlayerClaim = this.laneAbilityDestruction[idx] === 'player';
        targetAlignment = isPlayerClaim ? this.playerAlignment : this.enemyAlignment;
        oppAlignment = isPlayerClaim ? this.enemyAlignment : this.playerAlignment;
      }
```
- **`web/src/game/PhaseManager.ts:1013-1023`**:
```typescript
      } else if (!pCard && !eCard && this.controller.laneAbilityDestruction && this.controller.laneAbilityDestruction[idx]) {
        const claimingSide = this.controller.laneAbilityDestruction[idx];
        const isPlayerClaim = claimingSide === 'player';
        const pAlign = this.controller.state.playerAlignment;
        const targetAlign = isPlayerClaim ? pAlign : (pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT);
        if (hasCards) {
          this.refreshInterstitialCards(`Siege: ${isPlayerClaim ? 'Player' : 'Enemy'} influences Seal ${idx + 1} towards ${targetAlign} (Defender Destroyed by Ability)`, 'done');
          await this.delay(1500);
        }
        await this.controller.handleSiege(idx, isPlayerClaim ? pCard : eCard, isPlayerClaim);
      }
```
**Empirical Run Result (`simulator/src/__tests__/mechanics_stress_challenger1.test.ts`)**:
```
[Simulator Defect Observed] laneAbilityDestruction[0]: player, seal[0].alignment: LIGHT
```
Both cards were destroyed by **combat damage**, yet the engine logged `Defender Destroyed by Ability` and influenced the Seal to `LIGHT`, directly violating the canonical rule that mutual combat destruction leaves the Seal **NEUTRAL**.

### Obs 2: Missing Battle Invulnerability in `HeadlessGameEngine.ts` for Anakim, Mammon, and Ulfric
- In `web/src/game/PhaseManager.ts:592-595`, battle invulnerability is granted to four cards on flip:
```typescript
      if (current.data.ability.toLowerCase().includes("invulnerability") || current.data.name === "Anakim The Wise" || current.data.name === "Anakim the Wise" || current.data.name === "Mammon" || current.data.name === "Ulfric Thorne" || current.data.name === "Umbarax") {
        current.data.isInvincible = true;
        this.controller.addLog(`${current.data.name} gains battle invulnerability this turn`);
      }
```
- In `simulator/src/HeadlessGameEngine.ts:724-726`, ONLY `Umbarax` is granted `card.isInvincible = true`:
```typescript
    } else if (name === "Umbarax") {
      card.isInvincible = true;
```
`Anakim the Wise` (PV 3), `Mammon` (PV 5), and `Ulfric Thorne` (PV 6) are completely omitted from `isInvincible` assignment in `HeadlessGameEngine.ts`.
**Empirical Run Result (`simulator/src/__tests__/mechanics_stress_challenger1.test.ts`)**:
```
[Simulator Defect Observed] Anakim isInvincible: false, in graveyard: true
```
Anakim is destroyed in 3 vs 3 combat in the simulator when he should be invulnerable to battle damage.

### Obs 3: Step E Ascension Prematurely Ascends Champions on Contested/Stymied Lanes
In `web/src/game/PhaseManager.ts:1028-1029`:
```typescript
    // Step E: Ascension
    this.controller.updateState({ phaseStep: "Step E: Ascension" });
    const survivor = this.controller.playerBattlefield[idx] || this.controller.enemyBattlefield[idx];
    if (survivor && survivor.data.isChampion && !seal.champion) {
```
The selection of `survivor` uses logical OR (`playerBattlefield[idx] || enemyBattlefield[idx]`) without checking if the lane is uncontested (`!enemyBattlefield[idx]`) or if combat was stymied.
When an allied Champion faces a Non-battler (e.g. `Noble the Great` vs `Cyprian`) or a combat-invulnerable enemy:
- Combat is skipped / stymied.
- Both creatures remain alive in the lane.
- `PhaseManager.ts` unconditionally selects the player's Champion, ascends it to `seals[idx].champion`, and removes it from `playerBattlefield[idx]` while the enemy creature is still occupying the opposing slot.
Similarly, in `simulator/src/HeadlessGameEngine.ts:434-444`:
```typescript
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && pCard.data.isChampion) {
        ...
        seal.champion = pCard;
        this.playerBattlefield[idx] = null;
      }
    }
```
The simulator promotes `pCard` without checking `!eCard`.

### Obs 4: `syncBoardPresencePowerMarkers()` Omitted on Card Reveal in `HeadlessGameEngine.ts`
- In `simulator/src/HeadlessGameEngine.ts:265`, `this.syncBoardPresencePowerMarkers()` is called once at the start of `runResolutionPhase()` before any cards are revealed (when all cards have `faceUp = false`).
- In `HeadlessGameEngine.ts:328-331`, cards are revealed:
```typescript
    // Step A: The Flip
    if (pCard) pCard.faceUp = true;
    if (eCard) eCard.faceUp = true;
```
- `syncBoardPresencePowerMarkers()` is **never called** after reveal in `resolveSeal()`.
- Consequently, cards with `dynamicFactionPowerBonus` (such as `Oriel the Bold`, `Dawn`, `Lord Alaric`) never receive their board presence power markers during seal resolution when revealed from face-down.
**Empirical Run Result (`simulator/src/__tests__/mechanics_stress_challenger1.test.ts`)**:
```
[Simulator Defect Observed] eOriel effectivePower: 1, survived: true
```
Oriel remains at power 1 instead of scaling to power 3 (+2 for Celestial in play). Because Oriel remains at power 1, `cannotBattleWhilePowerIs1` keeps Oriel combat-locked in Step C, causing combat to be erroneously stymied against `Noble the Great`.

### Obs 5: Verified Passing Mechanics
Empirical test suites in both `simulator` and `web` confirmed that:
1. **Step 0 Haste strikes vs Non-battlers**: Haste does NOT bypass `cannotBattleOrBeBattled` (Cyprian) or `cannotBattleWhilePowerIs1` (Oriel at power 1). Both engines successfully skip Step 0 Haste Strike when facing non-battlers.
2. **Step A Tie Rule**: Equal effective flip power upon reveal immediately destroys both combatants before Step B abilities (`Bella` vs `Golgothane` at 9 vs 9; `Remiel` vs `Mammon`/`Bacchus` at 5 vs 5). Non-battlers (`Cyprian`) are correctly exempt from Step A tie destruction.
3. **Step B Abilities Precedence**: `hasNullify` triggers before non-nullifiers regardless of flip power; descending flip power correctly executes higher power abilities before lower power abilities.
4. **Step C Combat Power Calculations**: `battleStepBonusPower` correctly adds to combat power for `Tarkidos` (11 base battler, 14 as champion), `Zelus` (6), `Luna` (6), `Duke Aren Drakos` (7).

---

## 2. Logic Chain

1. **Premise 1 (Canonical Rule Contract)**:
   `docs/card_phases_and_errata.md` (Step C & Step D) explicitly specifies that the **Ability Defender Removal Rule** applies *only* when an **ability** destroys or removes an opponent defender. Tied combat mutual destruction specifies: *"both combatants are destroyed simultaneously... lane remains neutral"*. Furthermore, `docs/card_pairwise_matchup_matrix.md` lists 391 encounters (22.2% of the pool) where equal combat power results in mutual destruction and the lane remains Neutral.
2. **Premise 2 (Obs 1)**:
   `HeadlessGameEngine.ts:983-986` and `GameController.ts:1142-1145` set `laneAbilityDestruction` unconditionally upon card destruction. In mutual combat destruction, the defender is destroyed second, setting `laneAbilityDestruction[idx] = 'player'`. In Step D, both engines observe empty slots with `laneAbilityDestruction === 'player'` and execute a Siege for the player, corrupting or purifying the seal.
3. **Inference 1**:
   In any mutual combat destruction where the player is attacker and enemy is defender, the game engine incorrectly alters seal influence to the player rather than maintaining Neutral alignment. This corrupts 391 matchup outcomes and distorts self-play balance simulations.
4. **Premise 3 (Obs 2)**:
   `docs/card_phases_and_errata.md` (Step D.2) specifies combat invulnerability for Anakim the Wise, Mammon, Ulfric Thorne, and Umbarax. Web `PhaseManager.ts:592-595` implements all four. `HeadlessGameEngine.ts:724-726` implements only Umbarax.
5. **Inference 2**:
   The headless simulator diverges significantly from the web game client and canonical card rules: Anakim, Mammon, and Ulfric suffer illegal combat deaths in simulation self-play.
6. **Premise 4 (Obs 3)**:
   `PhaseManager.ts:1028` assumes any card present in `playerBattlefield[idx] || enemyBattlefield[idx]` is the uncontested "survivor", ignoring whether the opposing lane slot is still occupied.
7. **Inference 3**:
   A Champion ascends and claims the seal while an enemy creature is still alive in the lane (e.g. against Cyprian or invulnerable enemies).
8. **Premise 5 (Obs 4)**:
   `HeadlessGameEngine.ts` omits `syncBoardPresencePowerMarkers()` during card reveal in `resolveSeal()`.
9. **Inference 4**:
   Oriel the Bold never attains power 3 on reveal, causing combat to be stymied against all non-haste cards in the simulator, directly contradicting line 594 of `docs/card_pairwise_matchup_matrix.md` (Noble destroys Oriel 3 in Step C).
10. **Conclusion**:
    The presence of these four mechanical discrepancies and bugs across the web and simulator engines requires a **REJECT** verdict until remediation is implemented.

---

## 3. Caveats

1. **Scope of Testing**: Testing focused exhaustively on isolated 1v1 combat interactions on Seal 0, phase step ordering (0, A, B, C, D, E), and cleanup. Full 7-seal multi-lane game progression was tested via the existing simulator test suite (`npm --prefix simulator test`), which passes.
2. **Review-Only Constraint**: In strict adherence to Key Constraints ("Review-only — do NOT modify implementation code"), no engine bug fixes were committed. Instead, empirical test suites were created to cleanly prove and document the exact failure modes.

---

## 4. Conclusion

**Verdict: REJECT**

While Step 0 Haste vs Non-battler prevention, Step A Tie Rule reveal destruction, Step B descending priority, and Step C `battleStepBonusPower` calculations behave consistently with the rules, empirical stress testing surfaced **4 critical engine defects**:
1. **Critical**: Mutual combat destruction sets `laneAbilityDestruction` in both engines (`HeadlessGameEngine.ts:986`, `GameController.ts:1142`), erroneously triggering Step D Siege and giving the player seal ownership instead of leaving it Neutral.
2. **High**: `HeadlessGameEngine.ts` omits battle invulnerability for `Anakim the Wise`, `Mammon`, and `Ulfric Thorne` (only `Umbarax` is protected).
3. **High**: `PhaseManager.ts:1028` and `HeadlessGameEngine.ts:434` trigger Step E Champion Ascension on contested/stymied lanes because `survivor` checks `playerBattlefield[idx] || enemyBattlefield[idx]` without checking `!enemyBattlefield[idx]`.
4. **Medium**: `HeadlessGameEngine.ts` omits `syncBoardPresencePowerMarkers()` upon card reveal in `resolveSeal()`, preventing `Oriel the Bold`, `Dawn`, and `Lord Alaric` from calculating dynamic faction power before Step C combat.

### Required Remediation for Implementation Worker:
1. In `web/src/game/GameController.ts:1140-1147`, only set `this.laneAbilityDestruction[idx]` if `killedBy?.cause === 'ability'`. If `killedBy?.cause === 'combat'`, set `this.laneAbilityDestruction[idx] = null`.
2. In `simulator/src/HeadlessGameEngine.ts:975-991`, add a `cause?: 'combat' | 'ability'` parameter to `destroyCard()`, and only set `laneAbilityDestruction` when `cause === 'ability'`. In `handleBattle()`, pass `cause: 'combat'` and ensure `laneAbilityDestruction[idx] = null` on mutual destruction.
3. In `simulator/src/HeadlessGameEngine.ts:724-726`, add `Anakim the Wise`, `Mammon`, and `Ulfric Thorne` to flip battle invulnerability (`card.isInvincible = true`).
4. In `web/src/game/PhaseManager.ts:1028` and `simulator/src/HeadlessGameEngine.ts:434`, verify that the lane is uncontested (`pCard && !eCard` or `eCard && !pCard`) and that combat was not stymied (`!pStymied && !eStymied`) before executing Step E Ascension.
5. In `simulator/src/HeadlessGameEngine.ts:331`, invoke `this.syncBoardPresencePowerMarkers()` after revealing `pCard` and `eCard` in Step A.

---

## 5. Verification Method

To independently execute and verify the empirical findings:

1. **Simulator Empirical Test Suite**:
   ```bash
   npm --prefix simulator test -- src/__tests__/mechanics_stress_challenger1.test.ts
   ```
   *Expected Result*: 15 passed tests, with console outputs directly logging the observed defects for `laneAbilityDestruction`, missing Anakim invulnerability, and missed Oriel power sync.

2. **Web Engine Empirical Test Suite**:
   ```bash
   npm --prefix web test -- src/game/__tests__/mechanics-stress-challenger1.test.ts
   ```
   *Expected Result*: 7 passed tests validating Step 0, Step A, Step B, Step C bonuses, and mutual destruction mechanics.

3. **Full Regression Validation**:
   ```bash
   npm --prefix simulator test
   npm --prefix web test
   ```
   *Expected Result*: Both suites compile and pass with 0 failures across all existing tests.
