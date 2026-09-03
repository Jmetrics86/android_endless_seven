# HANDOFF — Explorer Rem 3: Simulator Engine Strategist

**Mission**: Formulate the exact fix strategy for Challenger 1's Obs 2 (Anakim the Wise, Mammon, Ulfric Thorne battle invulnerability) and Obs 4 (`syncBoardPresencePowerMarkers()` upon reveal) in `simulator/src/HeadlessGameEngine.ts`.  
**Target Scope**: `simulator/src/HeadlessGameEngine.ts`, `web/src/game/PhaseManager.ts`, `web/src/game/AbilityManager.ts`, `docs/card_phases_and_errata.md`, `docs/card_pairwise_matchup_matrix.md`, and `simulator/src/__tests__/mechanics_stress_challenger1.test.ts`.

---

## 1. Observation

### Observation A: Missing Battle Invulnerability for Anakim, Mammon, and Ulfric (Challenger 1 Obs 2)
1. **Simulator Engine Omission (`simulator/src/HeadlessGameEngine.ts:724-726`)**:
   ```typescript
   } else if (name === "Umbarax") {
     card.isInvincible = true;
   ```
   In `triggerFlipAbility()`, ONLY `Umbarax` is granted `card.isInvincible = true`.
2. **Web Engine Implementation (`web/src/game/PhaseManager.ts:592-595`)**:
   ```typescript
   // Invulnerability
   if (current.data.ability.toLowerCase().includes("invulnerability") || current.data.name === "Anakim The Wise" || current.data.name === "Anakim the Wise" || current.data.name === "Mammon" || current.data.name === "Ulfric Thorne" || current.data.name === "Umbarax") {
     current.data.isInvincible = true;
     this.controller.addLog(`${current.data.name} gains battle invulnerability this turn`);
   }
   ```
3. **Canonical Card Definitions (`simulator/src/constants.ts` & `web/src/constants.ts`)**:
   - `Anakim the Wise` (Line 115): `"ability": "Flip: Cannot be destroyed by battle this turn. Activate: Place a Ward Marker on any Vacant seal..."`
   - `Ulfric Thorne` (Line 218): `"ability": "Flip: Cannot be destroyed by battle this turn. Activate: Place a +2 Power Marker on any creature."`
   - `Mammon` (Line 359): `"ability": "Flip: Cannot be destroyed by battle this turn. Activate: Transfer all Power Markers in play to this creature."`
   - `Umbarax` (Line 259): `"ability": "Champion. Flip: Cannot be destroyed by battle this turn. After this creature destroys a creature in battle..."`
4. **Canonical Rule Contract (`docs/card_phases_and_errata.md:192`)**:
   - Section IV Step D.2 explicitly states: *"Combat Invulnerability: Cards protected by Flip invulnerability (Anakim the Wise, Mammon, Ulfric Thorne, Umbarax) cannot be destroyed by battle damage."*
5. **Pairwise Matchup Matrix Contract (`docs/card_pairwise_matchup_matrix.md`)**:
   - Matchup 3.2.3 (Line 645-647): `Step B Ability: Enemy Anakim the Wise gains combat invulnerability this turn. Step C Battle: Player Tarkidos (11 Battle PV) vs Enemy Anakim the Wise (3 Battle PV). Step C Combat: Enemy Anakim the Wise is Invincible. Attack is stymied!`
   - Over 108 stymied encounters in the matrix rely on Anakim, Mammon, Ulfric, and Umbarax surviving superior combat power.
6. **Empirical Defect Output (`simulator/src/__tests__/mechanics_stress_challenger1.test.ts:386`)**:
   ```
   [Simulator Defect Observed] Anakim isInvincible: false, in graveyard: true
   ```
   Anakim is destroyed in 3 vs 3 combat in the simulator when he must be invulnerable to battle damage.

---

### Observation B: Missed Dynamic Faction Power Sync Upon Reveal (Challenger 1 Obs 4)
1. **Simulator Resolution Phase Initialization (`simulator/src/HeadlessGameEngine.ts:265`)**:
   ```typescript
   private runResolutionPhase() {
     this.addLog(`--- Resolution Phase (Round ${this.currentRound}) ---`);
     this.cardsThatBattledThisRound = [];
     this.syncBoardPresencePowerMarkers();

     for (let i = 0; i < this.rules.laneCount; i++) {
       if (this.isGameOver) break;
       this.resolveSeal(i);
     }
   ```
   At line 265, newly placed battlefield cards have `faceUp: false`.
2. **Filtering by `faceUp` (`simulator/src/HeadlessGameEngine.ts:1059`)**:
   ```typescript
   private syncBoardPresencePowerMarkers() {
     const allInPlay = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter((c): c is HeadlessCard => c !== null && c.faceUp);
   ```
   Because `syncBoardPresencePowerMarkers()` filters strictly on `c.faceUp`, all 7 face-down cards are ignored at round start.
3. **Card Reveal Without Sync (`simulator/src/HeadlessGameEngine.ts:328-338`)**:
   ```typescript
   // Step A: The Flip
   if (pCard) pCard.faceUp = true;
   if (eCard) eCard.faceUp = true;

   // Step A Tie Rule Check: Equal effective power upon reveal = both cards destroyed immediately before abilities
   if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
     this.destroyCard(pCard);
     this.destroyCard(eCard);
     this.seals[idx].alignment = Alignment.NEUTRAL;
     return;
   }
   ```
   `pCard` and `eCard` transition to `faceUp = true`, but `this.syncBoardPresencePowerMarkers()` is **never called** in `resolveSeal()`!
4. **Web Engine Parity (`web/src/game/PhaseManager.ts:895-897`)**:
   ```typescript
   if (pCard) pCard.data.faceUp = true;
   if (eCard) eCard.data.faceUp = true;
   this.controller.abilityManager.syncBoardPresencePowerMarkers();
   ```
5. **Cards Affected by Dynamic Board Presence in `simulator/src/constants.ts`**:
   - `Oriel the Bold` (Line 93): `dynamicFactionPowerBonus: { faction: "Celestial", bonusPerCard: 2, excludeSelf: false }`
   - `Grelyn Zilkos` (Line 27): `dynamicFactionPowerBonus: { faction: "Avatars of light", bonusPerCard: 2, excludeSelf: true }`
   - `Valtarious` (Line 206): `dynamicFactionPowerBonus: { faction: "Lycan", bonusPerCard: 2, excludeSelf: true }`
   - `Pazoo` (Line 278): `dynamicFactionPowerBonus: { faction: "Darkness", bonusPerCard: 2, excludeSelf: true }`
   - `Lord Alaric` (Line 462): `dynamicFactionPowerBonus: { faction: "Vampyre", bonusPerCard: 2, excludeSelf: true }`
   - `Dawn` (`simulator/src/HeadlessGameEngine.ts:1067`): +2 Power Markers per Oathbringer in play
   - `Garmr` (`simulator/src/HeadlessGameEngine.ts:1069`): Lycan in play + Limbo
6. **Empirical Defect Output (`simulator/src/__tests__/mechanics_stress_challenger1.test.ts:82`)**:
   ```
   [Simulator Defect Observed] eOriel effectivePower: 1, survived: true
   ```
   `Oriel the Bold` remains at printed power 1 instead of scaling to power 3 (+2 for Celestial self). Because Oriel remains at power 1, `cannotBattleWhilePowerIs1` keeps Oriel combat-locked in Step C, causing combat to be erroneously stymied against `Noble the Great` (directly contradicting line 594 of `docs/card_pairwise_matchup_matrix.md`).

---

## 2. Logic Chain

### Reasoning for Obs 2 (Combat Invulnerability)
1. **Premise 1**: All four cards (`Anakim the Wise`, `Mammon`, `Ulfric Thorne`, `Umbarax`) contain canonical Flip text: *"Flip: Cannot be destroyed by battle this turn."*
2. **Premise 2**: In `simulator/src/HeadlessGameEngine.ts:939, 945, 951, 954`, `handleBattle()` explicitly checks `!card.isInvincible` before executing destruction on losing or tied combatants.
3. **Premise 3**: In `simulator/src/HeadlessGameEngine.ts:1034`, `endRoundCleanup()` already iterates through all battlefield and seal cards to clear `c.isInvincible = false;`.
4. **Premise 4**: In `simulator/src/HeadlessGameEngine.ts:724-726`, only `Umbarax` is granted `card.isInvincible = true`. The other three cards were omitted from `triggerFlipAbility()`. Their `Activate:` abilities are processed in `triggerActivateAbility()`, but their Flip invulnerability was never set.
5. **Inference**: Adding `Anakim the Wise`, `Mammon`, and `Ulfric Thorne` to `HeadlessGameEngine.ts:724-726` grants them `card.isInvincible = true` during Step B Flip execution.
6. **Precedence Consistency Check**:
   - **Step 0 Haste strikes**: Step 0 runs before Step B. If facing a Haste creature (e.g. Noble 9 vs Anakim 3), `triggerFlipAbility()` has not executed yet, so `isInvincible` is `false`. Haste strikes kill them before flip abilities, matching canonical rules.
   - **Step A Tie Rule**: Step A Tie Rule runs before Step B. Equal flip power destroys both before abilities. Mammon vs Remiel (5 vs 5) correctly destroys both in Step A before invulnerability activates.
   - **Nullification**: If Remiel or Valerius is present, `pNullified` or `eNullified` is true, skipping `triggerFlipAbility()`, so invulnerability is suppressed.
   - **Step B Instant-Kill Abilities**: `destroyCard()` does not check `isInvincible`; only `handleBattle()` checks `!card.isInvincible`. Therefore, Bella or Golgothane still successfully destroys an invulnerable target in Step B.

### Reasoning for Obs 4 (`syncBoardPresencePowerMarkers()`)
1. **Premise 1**: `syncBoardPresencePowerMarkers()` calculates expected power markers for cards with `dynamicFactionPowerBonus` (Oriel, Lord Alaric, Grelyn, Valtarious, Pazoo), `Dawn`, and `Garmr` based on `faceUp` cards in play.
2. **Premise 2**: At the start of the round (`runResolutionPhase:265`), all cards placed on the battlefield are face-down (`faceUp = false`).
3. **Premise 3**: In `resolveSeal(idx)`, cards in lane `idx` are revealed at Step A (`pCard.faceUp = true; eCard.faceUp = true`).
4. **Premise 4**: Step A Tie Rule immediately follows card reveal (`effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip')`). If dynamic markers have not been synced, `effectivePower` is incorrect for cards like Oriel.
5. **Premise 5**: Step C Combat checks `cannotBattle(c)`. For Oriel, `c.data.cannotBattleWhilePowerIs1` checks `effectivePower(c) === 1`. Without sync, Oriel remains at 1 and combat is stymied.
6. **Inference**: Invoking `this.syncBoardPresencePowerMarkers()` immediately after card reveal in Step A (line 331) updates dynamic markers on `pCard`, `eCard`, and all existing face-up cards/champions prior to Step A Tie Rule and Step C combat.
7. **Post-Step B Sync Requirement**: If an ability in Step B destroys or bounces a card (e.g. Bella destroying a creature, or Jophiel returning a creature to deck), board presence must be re-synced before Step C combat. Invoking `this.syncBoardPresencePowerMarkers()` after Step B abilities (line 360) satisfies this invariant, matching `PhaseManager.ts:897`.
8. **Dawn Double-Count Prevention**:
   In `HeadlessGameEngine.ts:618-622`, Dawn manually added `card.powerMarkers += (oathbringers * multiplier)`.
   In `web/src/game/PhaseManager.ts:643-644`, Dawn's power markers are handled **exclusively** via `syncBoardPresencePowerMarkers()`.
   If `syncBoardPresencePowerMarkers()` runs on reveal, Dawn's markers must be computed in `syncBoardPresencePowerMarkers()`:
   ```typescript
   } else if (c.data.name === 'Dawn') {
     const count = allInPlay.filter(x => x.data.faction === 'Avatars of light').length;
     const multiplier = c.data.ability?.includes("+2 Power Marker") || c.data.type === 'Oathbringer' ? 2 : 1;
     expected = multiplier * count;
   ```
   and the redundant manual increment in `triggerFlipAbility()` (lines 618-622) must be removed or no-opped so Dawn does not double-count markers.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with the Explorer archetype and Key Constraints, no changes were applied directly to `simulator/src/HeadlessGameEngine.ts`. The implementation worker must apply the exact diffs provided in Section 4.
2. **Challenger 1 Stress Test Assertion Inversion**:
   In `simulator/src/__tests__/mechanics_stress_challenger1.test.ts`, tests at line 60 and line 364 were authored to assert the **defect state** (e.g. `expect(effectivePower(eOriel)).toBe(1); expect(pAnakim.isInvincible).toBe(false);`).
   When the implementation worker applies the fixes in `HeadlessGameEngine.ts`, those two test assertions in `mechanics_stress_challenger1.test.ts` must be updated to assert the **canonical corrected behavior**:
   - `expect(effectivePower(eOriel)).toBe(3);`
   - `expect(engine.enemyBattlefield[0]).toBeNull();`
   - `expect(engine.enemyGraveyard).toContain(eOriel);`
   - `expect(pAnakim.isInvincible).toBe(true);`
   - `expect(engine.playerGraveyard).not.toContain(pAnakim);`
3. **Obs 1 and Obs 3 Dependency**: Obs 1 (`laneAbilityDestruction` in combat) and Obs 3 (Step E Ascension on stymied lanes) are tracked separately under Challenger 1's findings and do not conflict with Obs 2 and Obs 4.

---

## 4. Conclusion & Concrete Strategy

### Summary of Changes in `simulator/src/HeadlessGameEngine.ts`

| Issue | Target Lines | Modification | Impact |
|---|---|---|---|
| **Obs 2** | `HeadlessGameEngine.ts:724-726` | Expand `name === "Umbarax"` to include `Anakim the Wise`, `Anakim The Wise`, `Mammon`, `Ulfric Thorne`, and `Cannot be destroyed by battle` | Prevents illegal battle destruction for all 4 canonical invulnerable cards |
| **Obs 4 (Step A Reveal)** | `HeadlessGameEngine.ts:328-333` | Invoke `this.syncBoardPresencePowerMarkers()` immediately after flipping `pCard` and `eCard` face up | Corrects power markers before Step A Tie Rule and enables Oriel to scale to 3 PV |
| **Obs 4 (Step B Cleanup)** | `HeadlessGameEngine.ts:358-362` | Invoke `this.syncBoardPresencePowerMarkers()` after Step B activate abilities before Step C combat | Re-evaluates dynamic bonuses if Step B abilities destroyed or bounced creatures |
| **Obs 4 (Dawn Parity)** | `HeadlessGameEngine.ts:618-622` & `1067-1068` | Align Dawn's +2 Oathbringer scaling in `syncBoardPresencePowerMarkers()` and prevent duplicate stacking in `triggerFlipAbility()` | Matches `AbilityManager.ts:385-388` and prevents double-counting |

---

### Code Patch 1: Obs 2 (Flip Battle Invulnerability)
**File**: `simulator/src/HeadlessGameEngine.ts`  
**Location**: Lines 724–726

#### Before:
```typescript
    } else if (name === "Umbarax") {
      card.isInvincible = true;
    } else if (name === "Pazoo") {
```

#### After:
```typescript
    } else if (
      name === "Umbarax" ||
      name === "Anakim the Wise" ||
      name === "Anakim The Wise" ||
      name === "Mammon" ||
      name === "Ulfric Thorne" ||
      card.data.ability?.toLowerCase().includes("invulnerability") ||
      card.data.ability?.includes("Cannot be destroyed by battle")
    ) {
      card.isInvincible = true;
    } else if (name === "Pazoo") {
```

---

### Code Patch 2: Obs 4 (Sync Board Presence Power Markers in Step A & Step B)
**File**: `simulator/src/HeadlessGameEngine.ts`  
**Location**: Lines 328–333 and Lines 357–364

#### Step A (The Flip):
```typescript
    // Step A: The Flip
    if (pCard) pCard.faceUp = true;
    if (eCard) eCard.faceUp = true;
    this.syncBoardPresencePowerMarkers();

    // Step A Tie Rule Check: Equal effective power upon reveal = both cards destroyed immediately before abilities
    if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
      this.destroyCard(pCard);
      this.destroyCard(eCard);
      this.seals[idx].alignment = Alignment.NEUTRAL;
      return;
    }
```

#### Step B Post-Ability Sync:
```typescript
    // Step B: Activate Abilities
    if (pCard && pCard.data.hasActivate) {
      this.triggerActivateAbility(pCard);
    }
    if (eCard && eCard.data.hasActivate) {
      this.triggerActivateAbility(eCard);
    }

    if (this.isGameOver) return;

    this.syncBoardPresencePowerMarkers();

    // Refresh slots
    pCard = this.playerBattlefield[idx];
    eCard = this.enemyBattlefield[idx];
```

---

### Code Patch 3: Dawn Power Marker Alignment & De-duplication
**File**: `simulator/src/HeadlessGameEngine.ts`  
**Location**: Lines 618–622 and Lines 1067–1068

#### `triggerFlipAbility()` for Dawn (Lines 618–622):
```typescript
    if (name === "Dawn") {
      // Board-presence Power Markers for Dawn (+2 per Oathbringer in play)
      // are managed dynamically via syncBoardPresencePowerMarkers() matching web AbilityManager.ts:385-388
    } else if (name === "Bella") {
```

#### `syncBoardPresencePowerMarkers()` for Dawn (Lines 1067–1068):
```typescript
      } else if (c.data.name === 'Dawn') {
        const count = allInPlay.filter(x => x.data.faction === 'Avatars of light').length;
        const multiplier = c.data.ability?.includes("+2 Power Marker") || c.data.type === 'Oathbringer' ? 2 : 1;
        expected = multiplier * count;
      } else if (c.data.name === 'Garmr') {
```

---

## 5. Verification Method

### Step 1: Update Test Assertions in `mechanics_stress_challenger1.test.ts`
In `simulator/src/__tests__/mechanics_stress_challenger1.test.ts`:
1. **Oriel Dynamic Sync Test (Line 60)**:
   ```typescript
   // Before fix:
   expect(effectivePower(eOriel)).toBe(1);
   expect(engine.enemyBattlefield[0]).toBe(eOriel);

   // After fix:
   expect(effectivePower(eOriel)).toBe(3);
   expect(engine.enemyBattlefield[0]).toBeNull();
   expect(engine.enemyGraveyard).toContain(eOriel);
   expect(engine.seals[0].champion).toBe(pNoble);
   ```
2. **Anakim Battle Invulnerability Test (Line 364)**:
   ```typescript
   // Before fix:
   expect(pAnakim.isInvincible).toBe(false);
   expect(engine.playerGraveyard).toContain(pAnakim);

   // After fix:
   expect(pAnakim.isInvincible).toBe(true);
   expect(engine.playerGraveyard).not.toContain(pAnakim);
   expect(engine.playerBattlefield[0]).toBe(pAnakim);
   ```

### Step 2: Independent Command Execution
1. Run target simulator stress suite:
   ```bash
   npm --prefix simulator test -- src/__tests__/mechanics_stress_challenger1.test.ts
   ```
   *Expected Output*: 15 passed tests, with Oriel reaching power 3 and Anakim surviving tied 3v3 combat via invulnerability.
2. Run full simulator test suite:
   ```bash
   npm --prefix simulator test
   ```
   *Expected Output*: 5 test files, 42 passed tests with 0 failures.
3. Run full web test suite:
   ```bash
   npm --prefix web test
   ```
   *Expected Output*: 18 test files, 357 passed tests with 0 failures.
4. Run balance simulation smoke test:
   ```bash
   npm --prefix simulator run simulate -- --matches 50
   ```
   *Expected Output*: Clean simulation completion with valid balance telemetry.

### Invalidation Conditions
- If `Oriel the Bold` remains at power 1 when revealed against non-haste cards.
- If `Anakim the Wise`, `Mammon`, or `Ulfric Thorne` are sent to the graveyard by combat damage after revealing.
- If `Remiel` or `Valerius Nightshade` nullify fail to suppress battle invulnerability.
- If `Dawn` stacks redundant power markers exceeding +2 per Oathbringer in play.
