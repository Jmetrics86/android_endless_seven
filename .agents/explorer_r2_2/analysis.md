# Comprehensive 42-Card Game Rules, Mechanics & Errata Audit

**Author**: Explorer 2 (Game Rules Auditor)  
**Date**: 2026-09-03  
**Working Directory**: `/home/jasonbrewster/projects/android_endless_seven/.agents/explorer_r2_2`  
**Sources Audited**:
- `docs/card_phases_and_errata.md` (Canonical Errata Documentation)
- `docs/new_card_details.json` & `docs/new_card_details.md` (Raw OCR Card Art Transcriptions)
- `web/src/constants.ts` & `simulator/src/constants.ts` (Card Definitions, Stats, Traits)
- `web/src/game/CombatManager.ts` (Effective Power Calculations)
- `web/src/game/PhaseManager.ts` & `web/src/game/AbilityManager.ts` (Web Game Engine & Resolution Loop)
- `web/src/game/GameController.ts` (Board State & Seal Claims)
- `simulator/src/HeadlessGameEngine.ts` & `simulator/src/types.ts` (Headless Simulation Engine)
- `simulator/VARIANT_2026_08_13_BALANCE_REPORT.md` (Variant-2026-08-13 Design Specifications)

---

## 1. Executive Summary

Endless Seven operates on a 42-card pool split evenly between Light and Dark (21 cards each), distributed across 6 factions (Avatars of Light, Celestial, Lycan, Darkness / Avatars of Darkness, Daemon, Vampyre — 7 cards per faction). The current game variant, **Variant-2026-08-13**, introduced significant mechanical evolutions:
1. **Step-specific power bonuses** (`flipStepBonusPower`, `battleStepBonusPower`, `championBattleBonusPower`).
2. **Dynamic tribal board presence scaling** (`dynamicFactionPowerBonus`).
3. **Ward Marker mitigation system** on vacant seals.
4. **Step A Tie Rule** (immediate mutual destruction on equal effective flip power prior to ability triggers).
5. **Zero-power enforcement** across all zones post-ability resolution.

This audit cross-referenced all 42 card definitions, mechanical traits, phase hooks, and combat formulas across the codebase and documentation. The audit identified **11 cards completely omitted from `docs/card_phases_and_errata.md`**, multiple outdated stat profiles and names in documentation, critical engine bugs in `web/` (such as Dawn counting enemy cards for alternate win and Valtarious retaining legacy corruption blocking), and major mechanical discrepancies in `simulator/src/HeadlessGameEngine.ts` (such as Desire sacrificing the wrong cards and tied combatants surviving mutual destruction).

---

## 2. Master 42-Card Exhaustive Audit Matrix

Below is the complete audit of all 42 cards across `web/src/constants.ts`, `simulator/src/constants.ts`, `docs/card_phases_and_errata.md`, and the game engines.

### Table Legend
- **PV**: Printed Power Value (Base Power).
- **Step Bonuses**: `F` = Flip Step Bonus (`flipStepBonusPower`), `B` = Battle Step Bonus (`battleStepBonusPower`), `C` = Champion Battle Bonus (`championBattleBonusPower`).
- **Doc Status**: Present in `docs/card_phases_and_errata.md` (✓), Outdated (⚠️), or Completely Missing (❌).
- **Engine Conformance**: Conformance across Web and Simulator engines (Match, Minor Gap, Major Bug).

| # | Card Name | Faction | Type | PV | Champ | Traits & Step Bonuses | Primary Ability / Phase | Doc Status | Engine Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Tarkidos** | Avatars of light | Oathbringer | 9 | Yes | B: +2, C: +3, Limbo | Battle step bonus; Limbo Final Act purifies undefended seal | ❌ Missing | Match (Web & Sim) |
| 2 | **Grelyn Zilkos** | Avatars of light | Oathbringer | 9 | Yes | Dynamic (+2/Oathbringer) | Flip: Mill up to 3 cards from enemy Limbo to Graveyard | ❌ Missing | Match (Web & Sim) |
| 3 | **Dawn** | Avatars of light | Oathbringer | 9 | Yes | Activate | Flip: +2 Power Marker / Oathbringer; Activate: Win if 4 Oathbringers + Champ on Seal | ⚠️ Outdated (+1 in doc) | ⚠️ Web Bug (counts enemy cards) |
| 4 | **Bella** | Avatars of light | Oathbringer | 9 | Yes | Activate, Targeted | Flip: Destroy creature on Seal; Activate: Destroy 1 marker type | ⚠️ Outdated (Champ only in doc) | Match (Web & Sim) |
| 5 | **Noble the Great** | Avatars of light | Oathbringer | 9 | Yes | Haste | Haste Strike; Post-combat: Destroy another creature or marker type | ⚠️ Discrepancy (No Haste in doc/OCR) | Match in code |
| 6 | **Coal** | Avatars of light | Oathbringer | 10 | Yes | Activate, Limbo | Activate: Win if 5+ Champ Seals; Limbo: Prevent ascension | ✓ Present | Match (Web & Sim) |
| 7 | **Calmadious** | Avatars of light | God | 15 | Yes | Activate, Seal Target | Flip: Purify corrupted seal without champ; Activate: Destroy 1 marker type | ✓ Present | Match (Web & Sim) |
| 8 | **Oriel the Bold** | Celestial | Creature | 1 | No | Non-battler (PV 1), Dynamic (+2/Celestial), Seal Target | Cannot battle while PV 1; Dynamic +2/Celestial; Flip: Change influence of seal | ⚠️ Outdated (Omits PV 1 trait & passive) | Match (Web & Sim) |
| 9 | **Remiel** | Celestial | Creature | 2 | No | F: +3, Nullify | Flip step +3 Power; Flip: Reveal face-down card and nullify its Flip | ❌ Missing | ⚠️ Sim lacks priority sort |
| 10 | **Anakim the Wise** | Celestial | Creature | 3 | No | Activate | Flip: Battle invincible; Activate: Place Ward Marker on vacant seal | ⚠️ Outdated (Doc has old seal lock) | Match (Web & Sim) |
| 11 | **Jophiel** | Celestial | Creature | 4 | No | Targeted | Flip: Return creature in play to top of owner's deck | ❌ Missing | Match (Web & Sim) |
| 12 | **Cassiel Haggis** | Celestial | Creature | 5 | No | — | Flip: Reveal top deck card, gain markers equal to its PV | ✓ Present | Match (Web & Sim) |
| 13 | **Samyaza** | Celestial | Creature | 6 | No | Haste, Limbo | Haste Strike; Limbo Final Act: Nullify creature ability activation | ✓ Present | ⚠️ Web string mismatch |
| 14 | **Metatron** | Celestial | Creature | 7 | Yes | Activate | Champ Passive: Allied Celestials immune to abilities; Activate: Destroy 1 marker type | ❌ Missing | Match (Web & Sim) |
| 15 | **Fenris Lightfoot** | Lycan | Creature | 1 | No | Haste, Delayed Destroy | Haste Strike; End of Round: Destroy creature that battled Fenris | ✓ Present | Match (Web & Sim) |
| 16 | **Luna** | Lycan | Creature | 2 | No | B: +4, Limbo | Battle step +4 Power; Limbo Final Act: Nullify enemy seal influence change | ❌ Missing | Match (Web & Sim) |
| 17 | **Varg Greyback** | Lycan | Creature | 3 | No | F: +5, Allocation | Flip step +5 Power; Flip: Place +2 Power Marker on up to two creatures | ⚠️ Outdated (Named Fur-back with old activate) | Match (Web & Sim) |
| 18 | **Kaelo** | Lycan | Creature | 4 | No | Targeted | Flip: Choose card in Limbo, gain Power Markers equal to its PV | ❌ Missing | Match (Web & Sim) |
| 19 | **Valtarious** | Lycan | Creature | 5 | No | Dynamic (+2/Lycan), Limbo | Passive: +2/other Lycan; Limbo: +3 Power Marker to ally Lycan | ⚠️ Outdated (Doc lists old Avatar passive) | ⚠️ Web Bug (GameCtrl corruption block) |
| 20 | **Ulfric Thorne** | Lycan | Creature | 6 | No | Activate | Flip: Battle invincible; Activate: Place +2 Power Marker on creature | ⚠️ Outdated (Doc lists as Passive) | Match (Web & Sim) |
| 21 | **Lucian Blackwood** | Lycan | Creature | 7 | Yes | Haste | Haste Strike; Post-combat: +2 Power Marker on kill | ✓ Present | Match (Web & Sim) |
| 22 | **Golgothane** | Darkness | Graveborn | 9 | Yes | Targeted, Limbo | Flip: Destroy creature in play; Limbo: Shuffle enemy Limbo into deck | ⚠️ Outdated (Omits Flip in doc) | Match (Web & Sim) |
| 23 | **Lycandor** | Darkness | Graveborn | 9 | Yes | — | Flip: Place -3 Weakness Marker on each enemy creature in play | ⚠️ Outdated (Doc has -2/Graveborn) | Match (Web & Sim) |
| 24 | **Umbarax** | Darkness | Graveborn | 9 | Yes | — | Flip: Battle invincible; Post-combat: +2 Power Marker / Graveborn on kill | ✓ Present | Match (Web & Sim) |
| 25 | **Nix** | Darkness | Graveborn | 9 | Yes | Activate, Targeted | Flip: Choose creature type, destroy all in play; Activate: Win if 4 Graveborn + Champ | ✓ Present | Match (Web & Sim) |
| 26 | **Pazoo** | Darkness | Graveborn | 9 | Yes | Dynamic (+2/Darkness) | Passive: +2/other Graveborn; Flip: Place creature from Limbo on top of deck | ⚠️ Outdated (Doc has Flip bonus) | Match (Web & Sim) |
| 27 | **Karlyah** | Darkness | Graveborn | 10 | Yes | Activate, Limbo | Activate: Win if 5+ Champ Seals; Limbo: Destroy creature that battled | ⚠️ Outdated (Omits Limbo in doc) | Match (Web & Sim) |
| 28 | **Skarados** | Darkness | God | 15 | Yes | Activate, Global | Flip: Corrupt every purified seal without champ; Activate: Destroy 1 marker type | ✓ Present | Match (Web & Sim) |
| 29 | **Bacchus** | Daemon | Creature | 1 | No | F: +4, Global | Flip step +4 Power; Flip: Transfer all Power Markers in play to Bacchus | ⚠️ Outdated (Omits +4 Flip in doc) | Match (Web & Sim) |
| 30 | **Desire** | Daemon | Creature | 2 | No | F: +4, Seal Effect | Flip step +4 Power; Flip: Mutual sacrifice at lane & change seal influence | ⚠️ Outdated (Omits +4 Flip in doc) | 🚨 Sim Bug (Sacrifices wrong cards) |
| 31 | **Zelus** | Daemon | Creature | 3 | No | B: +3, Targeted | Battle step +3 Power; Flip: Place -2 Weakness Marker on creature with PV >= Zelus | ⚠️ Outdated (Doc has -3 Weakness) | Match (Web & Sim) |
| 32 | **Belphegor** | Daemon | Creature | 4 | No | Ability Immune, Targeted, Limbo | Unaffected by abilities; Flip: -2 Weakness on creature; Limbo: Nullify ability | ❌ Missing | Match (Web & Sim) |
| 33 | **Mammon** | Daemon | Creature | 5 | No | Activate | Flip: Battle invincible; Activate: Transfer all Power Markers in play to Mammon | ⚠️ Outdated (Doc lists as Passive) | Match (Web & Sim) |
| 34 | **Alistar Elren** | Daemon | Creature | 6 | No | Targeted, Limbo | Flip: -3 Weakness on creature; Limbo: -3 Weakness on creature | ⚠️ Outdated (Omits Flip in doc) | Match (Web & Sim) |
| 35 | **Bogva** | Daemon | Creature | 7 | Yes | Targeted | Flip: -1 Weakness on each enemy creature; Activate: Destroy creature with Weakness | ⚠️ Outdated (Omits Activate in doc) | ⚠️ Constants lack hasActivate |
| 36 | **Cyprian** | Vampyre | Creature | 1 | No | Non-battler, Targeted, Self-Sacrifice | Cannot battle or be battled; Flip: +3 Power Marker; End of Round: Sacrificed | ⚠️ Outdated (Only in Cleanup doc) | Match (Web & Sim) |
| 37 | **Valerius Nightshade** | Vampyre | Creature | 2 | No | Haste, B: +3 | Haste Strike; Battle step +3 Power; Nullifies battling creature's Flip; Steals 1 Power | ✓ Present | 🚨 Sim Bug (Lacks Nullify in sim) |
| 38 | **Elowen Thornver** | Vampyre | Creature | 3 | No | B: +2, Delayed Destroy | Battle step +2 Power; Any creature that battles Elowen destroyed at end of round | ❌ Missing | Match (Web & Sim) |
| 39 | **Kaelarion** | Vampyre | Creature | 4 | No | Targeted, Limbo | Flip: Destroy creature with PV <= 3; Limbo: Place Champion on top of owner's deck | ⚠️ Outdated (Omits Flip in doc) | Match (Web & Sim) |
| 40 | **Sulvian Vane** | Vampyre | Creature | 5 | No | Haste | Haste Strike; Any creature that battles Sulvian placed on top of owner's deck | ✓ Present | 🚨 Sim Bug (Bounce missing in sim) |
| 41 | **Duke Aren Drakos** | Vampyre | Creature | 6 | No | B: +1, Targeted | Battle step +1 Power; Flip: Bounce creature to deck; Passive: Allies count as Vampyre | ⚠️ Outdated (Omits +1 Battle in doc) | ⚠️ Sim lacks Vampyre passive |
| 42 | **Lord Alaric** | Vampyre | Creature | 7 | Yes | Dynamic (+2/Vampyre), Targeted | Passive: +2/other Vampyre; Flip: Return any Champion to top of owner's deck | ❌ Missing | ⚠️ Dead activate code in Web |

---

## 3. Phase-by-Phase Game Rules & Mechanics Audit

### Step 0: Haste Strike
- **Trigger**: Resolves immediately upon entering seal resolution if either combatant in lane possesses `hasHaste: true`.
- **Active Cards**:
  1. Fenris Lightfoot (1 PV, Lycan)
  2. Lucian Blackwood (7 PV, Lycan)
  3. Samyaza (6 PV, Celestial)
  4. Sulvian Vane (5 PV, Vampyre)
  5. Valerius Nightshade (2 PV, Vampyre)
  6. Noble the Great (9 PV, Avatars of light) — *Note: Card art lacks Haste, but code constants include it*.
- **Physical Flip & Reveal**: The defending card is immediately rotated face-up (`faceUp = true`) so that 3D visuals and 2D combat overlay accurately display both combatants.
- **Preemption & Flip Bypass**: If a defending card is destroyed by a Haste Strike, its Flip ability is completely bypassed and never triggers.
- **Survivor Caching**: Defending cards that survive Haste retain their initial face-down status (`pWasFaceDown` / `eWasFaceDown`) so that when Step B is reached, their Flip ability triggers normally.
- **Non-battler Interaction**: If either the Haste card or the opposing card cannot battle (Cyprian or Oriel at PV 1), Haste Strike is suppressed and combat does not occur.

### Step A: The Flip & Step A Tie Rule
- **Simultaneous Reveal**: All remaining face-down cards on the active seal lane rotate face-up.
- **Step A Tie Rule Check**:
  - If both cards have equal effective power (`effectivePower(card, 'flip')`), both cards are destroyed immediately.
  - The seal remains/becomes Neutral.
  - Step B flip and activate abilities for both cards are skipped.
  - Non-battler exemption: If either card has `cannotBattleOrBeBattled`, Step A Tie Rule does not destroy them.

### Step B: Abilities (Flip and Activate)
- **Execution Order**: Abilities execute in descending order of effective flip power (`effectivePower(card, 'flip')`).
- **Nullify Precedence**: If a card has `hasNullify: true` (Remiel) and was face-down, it takes absolute execution priority over higher-power opponents, revealing and suppressing the opponent before they can act.
- **Immunity Checks**: Cards with `abilityImmune: true` (Belphegor) or protected by Metatron's aura cannot be targeted or suppressed by opponent abilities.
- **Ability Storage (Abilities Drawer)**: Face-up cards with `hasActivate: true` that are passed during seal resolution are saved to Ability Storage and can be triggered during active turn windows later in the round.
- **Zero-Power Enforcement**: After all Step B abilities resolve, `enforceZeroPowerDestruction()` destroys any Creature whose effective power was reduced to 0 or less by Weakness Markers, even if the creature has combat invincibility.

### Step C: Combat & Battle Step
- **Step Bonuses**: `battleStepBonusPower` and `championBattleBonusPower` are calculated.
- **Valerius Nightshade Pre-Combat Steal**: Valerius steals 1 Power (+1 Power Marker to Valerius, +1 Weakness Marker to opponent) before combat damage is calculated.
- **Combat Resolution**:
  - `aPow > dPow`: Attacker destroys defender (unless defender is invincible or protected). Winner triggers post-combat abilities (Lucian +2, Umbarax +2/Graveborn, Noble destroy follow-up).
  - `dPow > aPow`: Defender destroys attacker.
  - `aPow === dPow`: Mutual destruction. Both combatants are destroyed and sent to their respective graveyards. *(Note: Simulator engine currently lacks this branch)*.
- **Bounce Override**: If Sulvian Vane is in combat, any card battling Sulvian is returned to the top of its owner's deck instead of going to the graveyard, regardless of the battle outcome.
- **Combat Immunity / Non-battler**: If either combatant cannot battle (Cyprian, Oriel at PV 1), combat is stymied and no damage is dealt.

### Step D: Alignment Influence (Siege)
- **Lane Dominance**: The surviving card on an uncontested seal lane claims/influences the seal (Purify for Light, Corrupt for Dark).
- **Stymied Combat**: If combat was stymied (e.g. Non-battler present), the seal remains/becomes Neutral.
- **Defender Removal by Ability**: If a player destroyed or exiled an enemy defender using an ability during Step B, that player influences the seal even if their own lane slot is empty (`laneAbilityDestruction`).
- **Bounce Exception**: Bouncing an opponent defender to Hand or Deck (e.g., via Sulvian Vane, Jophiel, Duke Aren Drakos) does *not* grant seal alignment change if the attacker's lane slot is empty.
- **Ward Absorption**: If a seal has a Ward Marker (`hasWard: true`), the Ward Marker absorbs the influence attempt and is removed; seal alignment does not change.
- **Luna Limbo Interruption**: If an enemy changes the influence of an un-championed seal, Luna in Limbo can move to Graveyard to nullify that influence change.

### Step E: Ascension
- **Champion Ascension**: An un-championed seal is occupied by a surviving Champion in that lane.
- **Ward Absorption**: If the seal has a Ward Marker, the Ward absorbs the ascension attempt and is removed; the Champion remains on the battlefield.
- **Coal Limbo Interruption**: Opponent can discard Coal from Limbo to the Graveyard to block the Champion from ascending.

### Cleanup Phase (End of Round)
- **Duplicate Enforce**: Enforces single unique card copy rules if duplicates exist on a side.
- **End-of-Round Sacrifices**: Cyprian (`sacrificeEndOfTurn: true`) is destroyed and moved to Graveyard.
- **Delayed Battle Destructions**: Creatures marked by Fenris Lightfoot or Elowen Thornver during battle are destroyed.
- **7-Seal Dominance Check**: If either player controls all 7 seals, immediate victory is declared.

---

## 4. Comprehensive Discrepancy, Ambiguity & Bug Registry

### Category A: Documentation Omissions in `docs/card_phases_and_errata.md`
1. **11 Missing Cards**: Tarkidos, Grelyn Zilkos, Remiel, Jophiel, Metatron, Luna, Varg Greyback, Kaelo, Belphegor, Elowen Thornver, Lord Alaric are completely omitted.
2. **Outdated Names & Legacy Mechanics**:
   - `Varg Fur-back`: Documented as PV 3 with an activate sacrifice ability. In canonical Variant-2026-08-13, the card is named `Varg Greyback` with `During the Flip step, +5 Power. Flip: Place a +2 Power Marker on up to two creatures.`
   - `Anakim the Wise`: Documented with legacy seal lockout. Redesigned to place Ward Markers.
   - `Mammon` & `Ulfric Thorne`: Documented as having passive battle invulnerability. In code, it is a Flip ability.
   - `Dawn`: Documented as +1 Power Marker per Oathbringer. In code, it is +2 Power Markers per Oathbringer.
   - `Bella`: Documented as destroying champions only. In code, it destroys any creature on any seal.
   - `Lycandor`: Documented as -2 Weakness per Graveborn. In code, it is a flat -3 Weakness to all enemies.
   - `Zelus`: Documented as -3 Weakness. In code, it is -2 Weakness.
   - `Noble the Great`: Documented without Haste, but code assigns `hasHaste: true`.

### Category B: Web Engine Bugs & Inconsistencies
1. **Dawn Alternate Win Condition Flaw (`AbilityManager.ts:484-486`)**:
   - Dawn's win check counts all `Avatars of light` in play across *both* players' battlefields (`[...playerBattlefield, ...enemyBattlefield]`).
   - If player has 2 Oathbringers and enemy has 2 Oathbringers, Dawn falsely triggers a win.
   - *Fix needed*: Filter by `c.data.isEnemy === source.data.isEnemy`.
2. **Valtarious Legacy Ghost Corruption Block (`GameController.ts:1251-1256`)**:
   - In `GameController.ts`, lines 1251-1256 contain a check: `if (hasValtarious && this.seals[idx].alignment === Alignment.LIGHT) return;`.
   - In Variant-2026-08-13, Valtarious was moved to Lycan and lost this passive. However, this code block was never removed, so having Valtarious in play still erroneously prevents Light seals from being corrupted.
3. **Bogva Missing `hasActivate: true` (`web/src/constants.ts:380`)**:
   - Bogva's text includes an Activate action, but `hasActivate: true` is missing from its JSON definition. The web engine works around this by hardcoding a special trigger in `PhaseManager.ts:876`.
4. **Lord Alaric Dead Activate Code (`AbilityManager.ts:685`)**:
   - Legacy activate logic remains in `AbilityManager.ts` even though Lord Alaric was converted to passive `dynamicFactionPowerBonus`.
5. **Samyaza Ability Storage Description Mismatch (`AbilityManager.ts:80`)**:
   - Tooltip reads `"Siphon Power Markers from enemy cards"`, which was an old ability. Actual ability is Nullify.

### Category C: Simulator (`HeadlessGameEngine.ts`) Deviations
1. **Desire Implementation Divergence (`HeadlessGameEngine.ts:751-764`)**:
   - In simulator, Desire causes each player to sacrifice their weakest creature anywhere on the board, leaves Desire alive, and does not alter seal influence.
   - In web and canonical errata, Desire forces mutual sacrifice *at the lane* and claims/changes seal influence.
2. **Tied Combat Mutual Destruction Omitted (`HeadlessGameEngine.ts:938-950`)**:
   - `handleBattle` in simulator only checks `powA > powB` and `powB > powA`. If `powA === powB`, neither card is destroyed. Both survive.
   - In web engine, equal power in battle results in mutual destruction.
3. **Sulvian Vane Bounce-to-Deck Missing (`HeadlessGameEngine.ts`)**:
   - Simulator does not check for Sulvian Vane in `handleBattle`. Cards defeated by Sulvian go to the graveyard rather than the owner's deck.
4. **Valerius Nightshade Nullify Missing (`HeadlessGameEngine.ts:341`)**:
   - Simulator checks `card.data.hasNullify`, which Valerius does not have. Valerius's combat-triggered Flip suppression is never executed in the simulator.
5. **Flip Ability Execution Order (`HeadlessGameEngine.ts:344-349`)**:
   - Simulator always triggers player flip abilities before enemy flip abilities, ignoring effective power ordering.

---

## 5. Critical Edge Cases & Timing Paradox Analysis

### 1. Haste vs Non-Battler (e.g. Fenris / Lucian vs Cyprian / Oriel at PV 1)
- **Paradox**: Haste says "Battles immediately before Flip abilities." Cyprian says "Cannot battle or be battled."
- **Resolution**: Combat cannot be initiated. Step 0 is stymied.
- **Timeline**:
  1. Step 0: Engine checks `!cannotBattle(attacker) && !cannotBattle(defender)`. Fails. Step 0 ends with 0 combat.
  2. Step A: Cards flip face-up.
  3. Step B: Flip abilities resolve. Cyprian places +3 Power Marker.
  4. Step C: Combat checked again. Stymied again.
  5. Step D: Seal remains Neutral due to stymied combat.
  6. Cleanup: Cyprian self-sacrifices; Haste card survives.

### 2. Oriel the Bold PV 1 Boundary Paradox
- **Rule**: Oriel cannot battle while effective power is 1, but has `dynamicFactionPowerBonus: +2 per Celestial in play (excludeSelf: false)`.
- **Paradox**: Does Oriel count itself upon reveal and instantly jump to 3 power?
- **Resolution**:
  - In Step 0 (face-down): Oriel is not yet face-up on board, so board presence markers are 0. Effective power is 1. Haste cannot strike Oriel.
  - In Step A: Oriel is flipped face-up. `syncBoardPresencePowerMarkers()` calculates 1 Celestial (Oriel) -> +2 Power Markers. Effective power becomes 3.
  - In Step C: Oriel now has effective power 3, so Oriel CAN battle normally, unless an opponent placed -2 Weakness on Oriel (e.g. Zelus/Belphegor) reducing effective power back to 1.

### 3. Step A Tie Rule vs Step B Flip Abilities
- **Rule**: Equal effective power upon reveal triggers immediate mutual destruction in Step A.
- **Interaction**: Remiel (base 2 + 3 Flip step = 5) vs Cassiel Haggis (base 5).
- **Resolution**: Both cards hit effective power 5 simultaneously. Both are destroyed and the seal becomes Neutral. Remiel does NOT get to nullify Cassiel, and Cassiel does NOT get to reveal deck for markers.

### 4. Simultaneous Removal Flips (Golgothane vs Duke Aren Drakos)
- **Interaction**: Golgothane (Flip: Destroy creature) vs Duke Aren Drakos (Flip: Return creature to deck).
- **Resolution**:
  - Golgothane effective flip power: 9.
  - Duke Aren Drakos effective flip power: 6.
  - Golgothane acts first due to higher effective power. Golgothane destroys Duke.
  - Duke is dead when its turn to trigger arrives; ability is aborted. Golgothane survives and ascends in Step E.

### 5. Remiel Nullify Priority vs Higher Power Cards
- **Interaction**: Remiel (effective power 5) vs Golgothane (effective power 9).
- **Resolution**: Remiel has `hasNullify: true`. `PhaseManager.ts:514` forces Remiel's execution first despite having lower power than Golgothane. Golgothane is revealed and suppressed (`isSuppressed = true`). Golgothane's destroy flip ability is completely nullified. In Step C, Golgothane (Power 9) battles Remiel (Power 2, since flip bonus expired) and destroys Remiel.

### 6. Zero-Power Destruction vs Combat Invincibility
- **Rule**: A creature with effective power <= 0 is destroyed at the end of Step B.
- **Interaction**: Mammon or Umbarax triggers Flip "Cannot be destroyed by battle this turn". Opponent stacks Weakness Markers reducing effective power to 0 or negative.
- **Resolution**: Invincibility protects only against *battle damage* in Step C. It does NOT protect against zero-power marker death. The card is destroyed in Step B and sent to the graveyard before combat occurs.

---

## 6. Recommendations for Codebase & Documentation Alignment

1. **Update `docs/card_phases_and_errata.md`**:
   - Add all 11 missing cards with their Variant-2026-08-13 stats, step bonuses, and phase hooks.
   - Update Varg Greyback, Anakim the Wise, Mammon, Ulfric Thorne, Dawn, Bella, Pazoo, and Lycandor to match code constants.
   - Document Noble the Great's Haste trait and Valerius Nightshade's 1-Power steal.
2. **Fix Web Engine Bugs**:
   - `AbilityManager.ts`: Fix Dawn win condition to only count allied Oathbringers.
   - `GameController.ts`: Remove the legacy `hasValtarious` corruption block.
   - `AbilityManager.ts`: Correct Samyaza's drawer description string.
   - `constants.ts`: Add `hasActivate: true` to Bogva.
3. **Align Simulator Engine (`HeadlessGameEngine.ts`)**:
   - Align Desire to perform same-lane mutual sacrifice and seal influence.
   - Add tied battle mutual destruction branch to `handleBattle`.
   - Implement Sulvian Vane deck bounce on combat.
   - Implement Valerius Nightshade Flip nullification.
   - Sort Flip abilities by descending effective power.
