# HANDOFF — Explorer Rem 2: Mutual Combat Destruction & Step E Ascension Fix Strategy

**Role**: Engine Mechanics Strategist  
**Working Directory**: `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_2`  
**Target Scope**: Formulate exact fix strategy for Challenger 1's Obs 1 (`laneAbilityDestruction` in mutual combat destruction) and Obs 3 (Step E Ascension on contested/stymied lanes) across Web and Simulator engines (`web/src/game/GameController.ts`, `web/src/game/PhaseManager.ts`, `simulator/src/HeadlessGameEngine.ts`, `web/src/game/__tests__/helpers/testHarness.ts`).

---

## 1. Observation

### Obs 1: Mutual Combat Destruction Falsely Sets `laneAbilityDestruction` and Awards Seal Influence

#### Web Engine Observation:
In `web/src/game/GameController.ts:1140-1147`:
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
`destroyCard()` accepts `killedBy?: { cardName: string; cause: 'combat' | 'ability' }` at line 1120. However, lines 1140-1147 completely ignore `killedBy?.cause` and unconditionally set `this.laneAbilityDestruction[idx]` to `'player'` (if `isEnemy` is true) or `'enemy'` (if `isEnemy` is false).

In `web/src/game/PhaseManager.ts:1396-1403`, when tied combat occurs:
```typescript
      if (!attacker.data.isInvincible && !isAProtected) {
        this.controller.abilityManager.handleFinalAct(attacker, defender);
        if (elderDefender) sendToDeckInstead(attacker);
        else this.controller.destroyCard(attacker, attacker.data.isEnemy, idx, false, { cardName: defender.data.name, cause: 'combat' });
      } ...
      if (!defender.data.isInvincible && !isDProtected) {
        this.controller.abilityManager.handleFinalAct(defender, attacker);
        if (elderAttacker) sendToDeckInstead(defender);
        else this.controller.destroyCard(defender, defender.data.isEnemy, idx, isAgainstChamp, { cardName: attacker.data.name, cause: 'combat' });
      }
```
When player is attacker and enemy is defender:
1. `attacker` (player) is destroyed first: `laneAbilityDestruction[idx] = 'enemy'`.
2. `defender` (enemy) is destroyed second: `laneAbilityDestruction[idx] = 'player'` (overwriting the first).

Then in Step D Siege (`web/src/game/PhaseManager.ts:1013-1023`):
```typescript
      } else if (!pCard && !eCard && this.controller.laneAbilityDestruction && this.controller.laneAbilityDestruction[idx]) {
        const claimingSide = this.controller.laneAbilityDestruction[idx];
        const isPlayerClaim = claimingSide === 'player';
        ...
        await this.controller.claimSeal(idx, targetAlign);
      }
```
Because both battlefield slots are empty (`!pCard && !eCard`) and `laneAbilityDestruction[idx] === 'player'`, Step D claims the seal for the player with the log message:
`Siege: Player influences Seal 1 towards Light (Defender Destroyed by Ability)`.

#### Simulator Engine Observation:
In `simulator/src/HeadlessGameEngine.ts:975-991`:
```typescript
  public destroyCard(card: HeadlessCard) {
    const idxP = this.playerBattlefield.indexOf(card);
    const idxE = this.enemyBattlefield.indexOf(card);
    const seal = this.seals.find(s => s.champion === card);

    if (seal) seal.champion = null;
    else if (idxP !== -1) {
      this.playerBattlefield[idxP] = null;
      this.laneAbilityDestruction[idxP] = 'enemy';
    } else if (idxE !== -1) {
      this.enemyBattlefield[idxE] = null;
      this.laneAbilityDestruction[idxE] = 'player';
    }

    const grave = card.isEnemy ? this.enemyGraveyard : this.playerGraveyard;
    grave.push(card);
  }
```
`destroyCard()` lacks a `cause` parameter entirely and unconditionally sets `laneAbilityDestruction`. In `handleBattle()` (`HeadlessGameEngine.ts:950-958`), tied combat destroys `cardA` (player) then `cardB` (enemy), leaving `this.laneAbilityDestruction[idx] = 'player'`. In Step D (`HeadlessGameEngine.ts:398-403`), this influences the seal to Light instead of remaining Neutral.

This defect was empirically confirmed in `simulator/src/__tests__/mechanics_stress_challenger1.test.ts:339-341`:
```
[Simulator Defect Observed] laneAbilityDestruction[0]: player, seal[0].alignment: LIGHT
```

---

### Obs 2: Step A Tie Rule Leaves Lingering `laneAbilityDestruction`

In `web/src/game/PhaseManager.ts:485-490` and `924-929`:
```typescript
const killer = { cardName: 'Tie Rule', cause: 'ability' as const };
this.controller.destroyCard(pCard, false, idx, false, killer);
this.controller.destroyCard(eCard, true, idx, false, killer);
this.controller.playerBattlefield[idx] = null;
this.controller.enemyBattlefield[idx] = null;
await this.controller.claimSeal(idx, Alignment.NEUTRAL);
```
And in `simulator/src/HeadlessGameEngine.ts:333-337`:
```typescript
if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
  this.destroyCard(pCard);
  this.destroyCard(eCard);
  this.seals[idx].alignment = Alignment.NEUTRAL;
  return;
}
```
In both engines, Step A Tie Rule destroys `pCard` then `eCard`. Because `eCard` is destroyed second, `laneAbilityDestruction[idx]` is left set to `'player'`. Neither engine clears `laneAbilityDestruction[idx] = null` during Tie Rule resolution.

---

### Obs 3: Step E Ascension Prematurely Promotes Champions on Contested and Stymied Lanes

#### Web Engine Observation:
In `web/src/game/PhaseManager.ts:1026-1029`:
```typescript
    // Step E: Ascension
    this.controller.updateState({ phaseStep: "Step E: Ascension" });
    const survivor = this.controller.playerBattlefield[idx] || this.controller.enemyBattlefield[idx];
    if (survivor && survivor.data.isChampion && !seal.champion) {
```
`survivor` is chosen using `playerBattlefield[idx] || enemyBattlefield[idx]`.
When combat is stymied (e.g. `Noble the Great` [Player Champion] vs `Cyprian` [Enemy Non-battler], or vs an invulnerable enemy):
1. `pStymied` and `eStymied` are set to `true` in Step C (lines 960, 980).
2. Step D sets Seal to Neutral due to stymied combat (lines 990-996).
3. Both creatures remain alive on the board (`playerBattlefield[idx] !== null && enemyBattlefield[idx] !== null`).
4. Step E evaluates `survivor` to `playerBattlefield[idx]` (`Noble the Great`).
5. Step E does NOT check whether the lane is uncontested, nor does it check `pStymied || eStymied`.
6. Noble ascends to `seals[idx].champion`, removing Noble from `playerBattlefield[idx]` while `Cyprian` remains in `enemyBattlefield[idx]`. In round 4+, this prematurely triggers Sudden Death victory (`PhaseManager.ts:1782-1786`).

#### Simulator Engine Observation:
In `simulator/src/HeadlessGameEngine.ts:433-455`:
```typescript
    // Step E: Ascension Phase (Champion takes control of Seal)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && pCard.data.isChampion) {
        ...
        seal.champion = pCard;
        this.playerBattlefield[idx] = null;
      } else if (eCard && eCard.data.isChampion) {
        ...
        seal.champion = eCard;
        this.enemyBattlefield[idx] = null;
      }
    }
```
`if (pCard && pCard.data.isChampion)` does not check `!eCard`, and `else if (eCard && eCard.data.isChampion)` does not check `!pCard`. On contested lanes where both cards are alive, the player's Champion ascends unconditionally.

---

### Obs 4: Unit Test Mock Discrepancy in `testHarness.ts`
In `web/src/game/__tests__/helpers/testHarness.ts:160-180`:
The test mock `destroyCard()` cleared battlefield arrays but did not touch `controller.laneAbilityDestruction`. Consequently, `web/src/game/__tests__/mechanics-stress-challenger1.test.ts:151-152` logged `laneAbilityDestruction: null` only because the mock bypassed the faulty `GameController.destroyCard` logic.

---

## 2. Logic Chain

1. **Premise 1 (Canonical Errata Contract)**:
   `docs/card_phases_and_errata.md:177` defines the **Ability Defender Removal Rule**:
   *"If an ability destroys, exiles, or moves an opponent defender to Graveyard or Limbo, that player claims the Seal alignment during Step C, even if their lane slot is empty. Bounce to hand or deck does NOT grant alignment influence."*
   `docs/card_phases_and_errata.md:193` defines **Tied Combat Mutual Destruction**:
   *"If both combatants have equal effective battle power (`powA === powB`), both combatants are destroyed simultaneously unless protected by invulnerability... lane remains neutral."*
   `docs/card_phases_and_errata.md:205` defines **Step E Ascension**:
   *"If the lane is uncontested or the defender was defeated, and the victorious card is a Champion, it ascends to occupy the Seal as its Champion."*

2. **Deduction on Obs 1 (`laneAbilityDestruction`)**:
   `laneAbilityDestruction` exists strictly to carry the "Ability Defender Removal Rule" forward into Step D when the attacker's slot is empty. It must ONLY be populated when a card is destroyed by an **ability** (`killedBy?.cause === 'ability'`). When a card is destroyed by combat (`killedBy?.cause === 'combat'`), tied combat, or cleanup sacrifice, `laneAbilityDestruction[idx]` must be `null`. Therefore, unconditionally assigning `'player'` or `'enemy'` in `destroyCard()` violates the canonical errata.

3. **Deduction on Obs 3 (Step E Ascension)**:
   A lane is only eligible for Ascension if it is **uncontested** (`(pCard && !eCard) || (eCard && !pCard)`) AND combat was not stymied (`!pStymied && !eStymied`). If both slots are occupied, or if combat was stymied (e.g. against Cyprian or an invulnerable defender), the defender was not defeated. Therefore, selecting `survivor = playerBattlefield[idx] || enemyBattlefield[idx]` without checking `!enemyBattlefield[idx]` and `!stymied` violates Step E rules.

4. **Conclusion**:
   The fix requires:
   - Setting `laneAbilityDestruction[idx]` conditionally based on `cause === 'ability'` and clearing it on combat and tie destruction.
   - Restricting Step E Ascension to strictly uncontested, non-stymied lanes.

---

## 3. Caveats

1. **Defect Proof Test Assertion Update in Simulator**:
   In `simulator/src/__tests__/mechanics_stress_challenger1.test.ts:340-341`, Challenger 1 wrote assertions demonstrating the defect:
   ```typescript
   expect(engine.laneAbilityDestruction[0]).toBe('player');
   expect(engine.seals[0].alignment).toBe(Alignment.LIGHT);
   ```
   When the fix is applied, `laneAbilityDestruction[0]` will correctly be `null` and `seal[0].alignment` will correctly be `NEUTRAL`. The test assertions must be updated to assert the fixed canonical behavior (`toBeNull()` and `toBe(Alignment.NEUTRAL)`).
2. **Obs 2 & Obs 4 from Challenger 1**:
   Challenger 1 also noted Obs 2 (missing Anakim, Mammon, Ulfric invulnerability in simulator) and Obs 4 (missing `syncBoardPresencePowerMarkers()` on reveal in simulator). While this report focuses strictly on Obs 1 and Obs 3 per the mission dispatch, the patch and engine updates are fully compatible with any parallel fixes for Obs 2 and Obs 4.
3. **Read-Only Explorer Discipline**:
   Per project rules, no source code files in `web/` or `simulator/` were modified by this agent. All proposed code changes are provided as exact before/after snippets below and in `.agents/explorer_rem_2/proposed_fixes.patch`.

---

## 4. Conclusion & Exact Fix Strategy

### File-by-File Code Changes

#### 1. `web/src/game/GameController.ts` (Lines 1140–1147)

**Before**:
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

**After**:
```typescript
    if (isAgainstChamp) {
      this.seals[idx].champion = null;
    } else {
      if (isEnemy) {
        this.enemyBattlefield[idx] = null;
      } else {
        this.playerBattlefield[idx] = null;
      }
      if (killedBy?.cause === 'ability') {
        this.laneAbilityDestruction[idx] = isEnemy ? 'player' : 'enemy';
      } else {
        this.laneAbilityDestruction[idx] = null;
      }
    }
```

---

#### 2. `web/src/game/PhaseManager.ts`

##### Change 2A: Step A Tie Rule Reset (Lines 485–491 and 924–930)
**Before (Line 488)**:
```typescript
        this.controller.playerBattlefield[idx] = null;
        this.controller.enemyBattlefield[idx] = null;
        await this.controller.claimSeal(idx, Alignment.NEUTRAL);
```
**After (Line 488)**:
```typescript
        this.controller.playerBattlefield[idx] = null;
        this.controller.enemyBattlefield[idx] = null;
        this.controller.laneAbilityDestruction[idx] = null;
        await this.controller.claimSeal(idx, Alignment.NEUTRAL);
```

**Before (Line 927)**:
```typescript
        this.controller.playerBattlefield[idx] = null;
        this.controller.enemyBattlefield[idx] = null;
        await this.controller.claimSeal(idx, Alignment.NEUTRAL);
```
**After (Line 927)**:
```typescript
        this.controller.playerBattlefield[idx] = null;
        this.controller.enemyBattlefield[idx] = null;
        this.controller.laneAbilityDestruction[idx] = null;
        await this.controller.claimSeal(idx, Alignment.NEUTRAL);
```

##### Change 2B: Step D Siege Cleanup (Line 1022)
**Before**:
```typescript
        await this.controller.claimSeal(idx, targetAlign);
      }
```
**After**:
```typescript
        await this.controller.claimSeal(idx, targetAlign);
        this.controller.laneAbilityDestruction[idx] = null;
      }
```

##### Change 2C: Step E Ascension Contested/Stymied Guard (Lines 1026–1030)
**Before**:
```typescript
    // Step E: Ascension
    this.controller.updateState({ phaseStep: "Step E: Ascension" });
    const survivor = this.controller.playerBattlefield[idx] || this.controller.enemyBattlefield[idx];
    if (survivor && survivor.data.isChampion && !seal.champion) {
```
**After**:
```typescript
    // Step E: Ascension
    this.controller.updateState({ phaseStep: "Step E: Ascension" });
    pCard = this.controller.playerBattlefield[idx];
    eCard = this.controller.enemyBattlefield[idx];
    const isUncontested = (pCard && !eCard) || (eCard && !pCard);
    const survivor = isUncontested && !pStymied && !eStymied ? (pCard || eCard) : null;
    if (survivor && survivor.data.isChampion && !seal.champion) {
```

---

#### 3. `simulator/src/HeadlessGameEngine.ts`

##### Change 3A: `destroyCard` Signature and Implementation (Lines 975–991)
**Before**:
```typescript
  public destroyCard(card: HeadlessCard) {
    const idxP = this.playerBattlefield.indexOf(card);
    const idxE = this.enemyBattlefield.indexOf(card);
    const seal = this.seals.find(s => s.champion === card);

    if (seal) seal.champion = null;
    else if (idxP !== -1) {
      this.playerBattlefield[idxP] = null;
      this.laneAbilityDestruction[idxP] = 'enemy';
    } else if (idxE !== -1) {
      this.enemyBattlefield[idxE] = null;
      this.laneAbilityDestruction[idxE] = 'player';
    }

    const grave = card.isEnemy ? this.enemyGraveyard : this.playerGraveyard;
    grave.push(card);
  }
```

**After**:
```typescript
  public destroyCard(card: HeadlessCard, cause: 'combat' | 'ability' = 'ability') {
    const idxP = this.playerBattlefield.indexOf(card);
    const idxE = this.enemyBattlefield.indexOf(card);
    const seal = this.seals.find(s => s.champion === card);

    if (seal) seal.champion = null;
    else if (idxP !== -1) {
      this.playerBattlefield[idxP] = null;
      this.laneAbilityDestruction[idxP] = cause === 'ability' ? 'enemy' : null;
    } else if (idxE !== -1) {
      this.enemyBattlefield[idxE] = null;
      this.laneAbilityDestruction[idxE] = cause === 'ability' ? 'player' : null;
    }

    const grave = card.isEnemy ? this.enemyGraveyard : this.playerGraveyard;
    grave.push(card);
  }
```

##### Change 3B: Step A Tie Rule (Lines 333–338)
**Before**:
```typescript
    if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
      this.destroyCard(pCard);
      this.destroyCard(eCard);
      this.seals[idx].alignment = Alignment.NEUTRAL;
      return;
    }
```
**After**:
```typescript
    if (pCard && eCard && effectivePower(pCard, 'flip') === effectivePower(eCard, 'flip') && !this.cannotBattle(pCard) && !this.cannotBattle(eCard)) {
      this.destroyCard(pCard, 'combat');
      this.destroyCard(eCard, 'combat');
      this.laneAbilityDestruction[idx] = null;
      this.seals[idx].alignment = Alignment.NEUTRAL;
      return;
    }
```

##### Change 3C: Step D Siege Cleanup (Line 402)
**After Line 402**:
```typescript
        oppAlignment = isPlayerClaim ? this.enemyAlignment : this.playerAlignment;
        this.laneAbilityDestruction[idx] = null;
```

##### Change 3D: Step E Ascension Guard (Lines 433–455)
**Before**:
```typescript
    // Step E: Ascension Phase (Champion takes control of Seal)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && pCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(false, pCard, idx);
          if (!coalBlocked) {
            seal.champion = pCard;
            this.playerBattlefield[idx] = null;
          }
        }
      } else if (eCard && eCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(true, eCard, idx);
          if (!coalBlocked) {
            seal.champion = eCard;
            this.enemyBattlefield[idx] = null;
          }
        }
      }
    }
```
**After**:
```typescript
    // Step E: Ascension Phase (Champion takes control of Seal)
    if (!seal.champion && idx !== this.lockedSealIndex) {
      if (pCard && !eCard && pCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(false, pCard, idx);
          if (!coalBlocked) {
            seal.champion = pCard;
            this.playerBattlefield[idx] = null;
          }
        }
      } else if (eCard && !pCard && eCard.data.isChampion) {
        if (seal.hasWard) {
          seal.hasWard = false; // Ward absorbs the championing attempt!
        } else {
          // Final Act: Coal - Prevent championing
          const coalBlocked = this.tryCoalFinalAct(true, eCard, idx);
          if (!coalBlocked) {
            seal.champion = eCard;
            this.enemyBattlefield[idx] = null;
          }
        }
      }
    }
```

##### Change 3E: `handleBattle` Combat Destruction Call Sites (Lines 938–959)
**Before**:
```typescript
    if (powA > powB) {
      if (!cardB.isInvincible) {
        this.destroyCard(cardB);
        if (isAgainstChampion) this.seals[sealIdx].champion = null;
      }
      this.handlePostCombatWin(cardA);
    } else if (powB > powA) {
      if (!cardA.isInvincible) {
        this.destroyCard(cardA);
      }
      this.handlePostCombatWin(cardB);
    } else {
      // Tied effective power: mutual destruction unless protected by invulnerability
      if (!cardA.isInvincible) {
        this.destroyCard(cardA);
      }
      if (!cardB.isInvincible) {
        this.destroyCard(cardB);
        if (isAgainstChampion) this.seals[sealIdx].champion = null;
      }
    }
```
**After**:
```typescript
    if (powA > powB) {
      if (!cardB.isInvincible) {
        this.destroyCard(cardB, 'combat');
        if (isAgainstChampion) this.seals[sealIdx].champion = null;
      }
      this.handlePostCombatWin(cardA);
    } else if (powB > powA) {
      if (!cardA.isInvincible) {
        this.destroyCard(cardA, 'combat');
      }
      this.handlePostCombatWin(cardB);
    } else {
      // Tied effective power: mutual destruction unless protected by invulnerability
      if (!cardA.isInvincible) {
        this.destroyCard(cardA, 'combat');
      }
      if (!cardB.isInvincible) {
        this.destroyCard(cardB, 'combat');
        if (isAgainstChampion) this.seals[sealIdx].champion = null;
      }
      this.laneAbilityDestruction[sealIdx] = null;
    }
```

---

#### 4. `web/src/game/interfaces.ts` and `web/src/game/__tests__/helpers/testHarness.ts`

##### `web/src/game/interfaces.ts` (Line 38):
Add `laneAbilityDestruction`:
```typescript
  sealSelectionCallback: ((idx: number) => void) | null;
  laneAbilityDestruction: ('player' | 'enemy' | null)[];
  updateState(patch: Partial<GameState>): void;
```

##### `web/src/game/__tests__/helpers/testHarness.ts` (Lines 160–178):
Update mock `destroyCard` to maintain `controller.laneAbilityDestruction`:
```typescript
      if (isChampion) {
        if (seals[idx] && seals[idx].champion === card) {
          seals[idx].champion = null;
        }
      } else {
        if (isEnemy) {
          if (enemyBattlefield[idx] === card) {
            enemyBattlefield[idx] = null;
          }
        } else {
          if (playerBattlefield[idx] === card) {
            playerBattlefield[idx] = null;
          }
        }
        controller.laneAbilityDestruction[idx] = killedBy?.cause === 'ability' ? (isEnemy ? 'player' : 'enemy') : null;
      }
```

---

## 5. Verification Method

### 1. Patch Application
The unified patch is saved at:
`/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_2/proposed_fixes.patch`

To apply the patch:
```bash
git apply /home/jasonbrewster/projects/android_endless_seven/.agents/explorer_rem_2/proposed_fixes.patch
```

### 2. Independent Test Verification Commands

1. **Verify Mutual Combat Neutrality in Simulator (`mechanics_stress_challenger1.test.ts`)**:
   After updating lines 340-341 in `simulator/src/__tests__/mechanics_stress_challenger1.test.ts`:
   ```bash
   npm --prefix simulator test -- src/__tests__/mechanics_stress_challenger1.test.ts
   ```
   *Expected Result*: 15 passed tests, zero illegal Light influences on mutual combat destruction (`laneAbilityDestruction[0]` is `null` and `seal[0].alignment` is `NEUTRAL`).

2. **Verify Stymied Combat Non-Ascension in Web Engine**:
   Run the web test suite to verify that `Noble the Great` vs `Cyprian` leaves `seals[0].champion` as `null` while Cyprian is on the board:
   ```bash
   npm --prefix web test -- src/game/__tests__/mechanics-stress-challenger1.test.ts
   ```
   *Expected Result*: All tests pass; Noble remains on `playerBattlefield[0]` during Step E, and Cyprian remains on `enemyBattlefield[0]` until end-of-round cleanup.

3. **Full Regression Validation**:
   ```bash
   npm --prefix simulator test
   npm --prefix web test
   ```
   *Expected Result*: 100% pass rate across all 42 simulator tests and 357 web tests.

### 3. Invalidation Conditions
- If any mutual combat destruction (`powA === powB`) leaves `laneAbilityDestruction[idx]` non-null or changes seal alignment away from Neutral in Step D.
- If a Champion ascends to `seal.champion` while an opposing creature remains alive in the same lane (`pCard && eCard`), or when combat was stymied (`pStymied || eStymied`).
