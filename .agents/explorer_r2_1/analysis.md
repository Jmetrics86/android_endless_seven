# Card Visual Assets and Image Mappings Audit Report

**Date**: 2026-09-03  
**Auditor**: Explorer 1 (Asset Auditor)  
**Target Scope**: Endless Seven (Android WebView & Web Three.js Client)  
**Canonical Ruleset**: Variant-2026-08-13 (42 Named Cards)  

---

## Executive Summary

An exhaustive audit of all visual assets, texture paths, disk files, casing conventions, fallback behaviors, and rendering parameters was conducted across the Endless Seven repository.

### Key Audit Findings:
1. **100% Card Art Integrity**: All 42 canonical cards across Light (21) and Dark (21) pools have valid, high-resolution PNG face textures in `web/public/card-art/` matching their exact mapped paths in `web/src/cardArtPaths.ts`.
2. **Exact Casing Alignment**: Every single one of the 52 entries in `CARD_ART_PATHS` and the `CARD_BACK_PATH` matches the exact filesystem casing on Linux byte-for-byte. Zero casing mismatches exist on disk.
3. **Dimensional Uniformity**: All 42 card face textures and the shared card back texture (`endless seven card back.png`) share identical dimensions of **822 x 1122 pixels** (8-bit RGB PNG, ~0.733 aspect ratio, matching standard playing card proportions).
4. **10 Defensive Aliases**: `CARD_ART_PATHS` contains 10 alias entries mapping title-casing variations (e.g. `'Noble The Great'`, `'Anakim The Wise'`, `'Oriel The bold'`) and shortened/historical names (e.g. `'Fenris'`, `'Varg Fur-back'`, `'Varg'`, `'Ulfric'`, `'Lucian'`, `'Desiree'`, `'Alistar'`) to valid disk files.
5. **Zero Broken Image References**: Across all TypeScript and TSX source files in `web/src/`, all 53 hardcoded image references resolve to existing files on disk.
6. **Critical Asset Bloat / APK Overhead (111.17 MB)**: Six giant faction poster images (`Avatars of Light.png`, `Celestials.png`, `Daemon.png`, `Avatar of Darkness.png`, `Lycan.png`, `Vampyre.png`) reside in `web/public/card-art/`. Each is a **5754 x 3366 pixel uncut 7x3 card sheet** (16.05 MB to 20.82 MB). None of these posters are referenced anywhere in code, but because Vite copies all `public/` files into `app/src/main/assets/web/`, these unreferenced files bloat the Android APK/AAB build by **111.17 MB** (72.2% of total card art size).
7. **Cross-Platform Bug in `validate_card_art_paths.mjs`**: The validation script at repository root hardcodes Windows paths (`C:/Users/jsnbr/Projects/...`) on lines 4-6, causing immediate crashes (`ENOENT`) on Linux, macOS, and CI runners.
8. **Android Assets Build-Time Generation**: `app/src/main/assets/web/card-art/` does not exist in version control because it is generated at build time via `npm run build:android` and properly ignored in `.gitignore` (line 14).
9. **No Automated Vitest Guard**: While 15 game logic test suites exist in `web/src/game/__tests__/`, zero automated tests verify card art mappings or disk presence during `npm test`.

---

## 1. Complete 42-Card Visual Asset Inventory

The canonical Endless Seven ruleset defines 42 cards divided equally into Light (21) and Dark (21) pools. The table below catalogs every card, faction, type, base power, champion status, mapped art path, disk dimensions, and file size:

| # | Card Name | Faction | Type | Power | Champ | Mapped Relative Path (`web/public/`) | Dimensions | File Size |
|---|-----------|---------|------|-------|-------|--------------------------------------|------------|-----------|
| 1 | **Tarkidos** | Avatars of light | Oathbringer | 9 | Yes | `card-art/Avatars of light/tarkidos copy.png` | 822x1122 | 851.4 KB |
| 2 | **Grelyn Zilkos** | Avatars of light | Oathbringer | 9 | Yes | `card-art/Avatars of light/grelyn Zilkos copy.png` | 822x1122 | 855.3 KB |
| 3 | **Dawn** | Avatars of light | Oathbringer | 9 | Yes | `card-art/Avatars of light/Dawn copy.png` | 822x1122 | 821.9 KB |
| 4 | **Bella** | Avatars of light | Oathbringer | 9 | Yes | `card-art/Avatars of light/bella copy.png` | 822x1122 | 862.8 KB |
| 5 | **Noble the Great** | Avatars of light | Oathbringer | 9 | Yes | `card-art/Avatars of light/noble the Great copy.png` | 822x1122 | 977.2 KB |
| 6 | **Coal** | Avatars of light | Oathbringer | 10 | Yes | `card-art/Avatars of light/coal copy.png` | 822x1122 | 859.9 KB |
| 7 | **Calmadious** | Avatars of light | God | 15 | Yes | `card-art/Avatars of light/calmadious copy.png` | 822x1122 | 957.5 KB |
| 8 | **Oriel the Bold** | Celestial | Creature | 1 | No | `card-art/Celestial/oriel the bold copy.png` | 822x1122 | 1295.1 KB |
| 9 | **Remiel** | Celestial | Creature | 2 | No | `card-art/Celestial/remiel copy.png` | 822x1122 | 1175.7 KB |
| 10 | **Anakim the Wise** | Celestial | Creature | 3 | No | `card-art/Celestial/Anakim The Wise copy.png` | 822x1122 | 1233.7 KB |
| 11 | **Jophiel** | Celestial | Creature | 4 | No | `card-art/Celestial/jophiel copy.png` | 822x1122 | 1214.8 KB |
| 12 | **Cassiel Haggis** | Celestial | Creature | 5 | No | `card-art/Celestial/cassiel haggis copy.png` | 822x1122 | 1243.3 KB |
| 13 | **Samyaza** | Celestial | Creature | 6 | No | `card-art/Celestial/samyaza copy.png` | 822x1122 | 1188.7 KB |
| 14 | **Metatron** | Celestial | Creature | 7 | Yes | `card-art/Celestial/metattron copy.png` | 822x1122 | 1278.3 KB |
| 15 | **Fenris Lightfoot** | Lycan | Creature | 1 | No | `card-art/Lycan/Fenris copy.png` | 822x1122 | 1024.5 KB |
| 16 | **Luna** | Lycan | Creature | 2 | No | `card-art/Lycan/luna copy.png` | 822x1122 | 899.8 KB |
| 17 | **Varg Greyback** | Lycan | Creature | 3 | No | `card-art/Lycan/Varg copy.png` | 822x1122 | 911.0 KB |
| 18 | **Kaelo** | Lycan | Creature | 4 | No | `card-art/Lycan/kaelo copy.png` | 822x1122 | 918.7 KB |
| 19 | **Valtarious** | Lycan | Creature | 5 | No | `card-art/Lycan/Valtarious copy.png` | 822x1122 | 963.9 KB |
| 20 | **Ulfric Thorne** | Lycan | Creature | 6 | No | `card-art/Lycan/Ulfric copy.png` | 822x1122 | 963.1 KB |
| 21 | **Lucian Blackwood** | Lycan | Creature | 7 | Yes | `card-art/Lycan/Lucian copy.png` | 822x1122 | 1077.4 KB |
| 22 | **Golgothane** | Darkness | Graveborn | 9 | Yes | `card-art/Darkness/golgothane copy.png` | 822x1122 | 960.1 KB |
| 23 | **Lycandor** | Darkness | Graveborn | 9 | Yes | `card-art/Darkness/lycandor copy.png` | 822x1122 | 1032.0 KB |
| 24 | **Umbarax** | Darkness | Graveborn | 9 | Yes | `card-art/Darkness/umbarax copy.png` | 822x1122 | 1048.4 KB |
| 25 | **Nix** | Darkness | Graveborn | 9 | Yes | `card-art/Darkness/Nix copy.png` | 822x1122 | 780.7 KB |
| 26 | **Pazoo** | Darkness | Graveborn | 9 | Yes | `card-art/Darkness/pazoo copy.png` | 822x1122 | 926.8 KB |
| 27 | **Karlyah** | Darkness | Graveborn | 10 | Yes | `card-art/Darkness/Karlyah copy.png` | 822x1122 | 985.5 KB |
| 28 | **Skarados** | Darkness | God | 15 | Yes | `card-art/Darkness/Skarados copy.png` | 822x1122 | 1002.7 KB |
| 29 | **Bacchus** | Daemon | Creature | 1 | No | `card-art/Daemon/Bacchus copy.png` | 822x1122 | 943.1 KB |
| 30 | **Desire** | Daemon | Creature | 2 | No | `card-art/Daemon/Desiree copy.png` | 822x1122 | 1016.6 KB |
| 31 | **Zelus** | Daemon | Creature | 3 | No | `card-art/Daemon/zelus copy.png` | 822x1122 | 928.8 KB |
| 32 | **Belphegor** | Daemon | Creature | 4 | No | `card-art/Daemon/Belphegor copy.png` | 822x1122 | 992.5 KB |
| 33 | **Mammon** | Daemon | Creature | 5 | No | `card-art/Daemon/mammon copy.png` | 822x1122 | 924.9 KB |
| 34 | **Alistar Elren** | Daemon | Creature | 6 | No | `card-art/Daemon/Alistar copy.png` | 822x1122 | 1011.8 KB |
| 35 | **Bogva** | Daemon | Creature | 7 | Yes | `card-art/Daemon/BogVa copy.png` | 822x1122 | 1081.2 KB |
| 36 | **Cyprian** | Vampyre | Creature | 1 | No | `card-art/Vampyre/cyprian copy.png` | 822x1122 | 941.8 KB |
| 37 | **Valerius Nightshade** | Vampyre | Creature | 2 | No | `card-art/Vampyre/valerius nightshade copy.png` | 822x1122 | 974.8 KB |
| 38 | **Elowen Thornver** | Vampyre | Creature | 3 | No | `card-art/Vampyre/elowen thornver copy.png` | 822x1122 | 991.8 KB |
| 39 | **Kaelarion** | Vampyre | Creature | 4 | No | `card-art/Vampyre/kaelarion copy.png` | 822x1122 | 958.6 KB |
| 40 | **Sulvian Vane** | Vampyre | Creature | 5 | No | `card-art/Vampyre/sulvian vane copy.png` | 822x1122 | 1025.7 KB |
| 41 | **Duke Aren Drakos** | Vampyre | Creature | 6 | No | `card-art/Vampyre/duke aren drakos copy.png` | 822x1122 | 1020.4 KB |
| 42 | **Lord Alaric** | Vampyre | Creature | 7 | Yes | `card-art/Vampyre/lord Alaric copy.png` | 822x1122 | 1085.4 KB |
| — | **Card Back (Shared)** | Neutral | N/A | — | — | `card-art/endless seven card back.png` | 822x1122 | 1572.1 KB |

---

## 2. Alias Mapping Audit in `web/src/cardArtPaths.ts`

`CARD_ART_PATHS` defines 52 key-value pairs. 42 correspond to the canonical names, and 10 provide defense against casing variances and legacy naming:

| Alias Key | Target Path | Target File Exists? | Rationale / Category |
|-----------|-------------|---------------------|----------------------|
| `'Noble The Great'` | `card-art/Avatars of light/noble the Great copy.png` | Yes | Casing tolerance: Capital `'The'` vs canonical lowercase `'the'`. |
| `'Anakim The Wise'` | `card-art/Celestial/Anakim The Wise copy.png` | Yes | Casing tolerance: Capital `'The'` vs canonical lowercase `'the'`. |
| `'Oriel The bold'` | `card-art/Celestial/oriel the bold copy.png` | Yes | Casing tolerance: Capital `'The'` and lowercase `'bold'`. |
| `'Fenris'` | `card-art/Lycan/Fenris copy.png` | Yes | Shortened name: Matches disk filename `Fenris copy.png`. |
| `'Varg Fur-back'` | `card-art/Lycan/Varg copy.png` | Yes | Legacy name: Earlier variant naming before `Varg Greyback`. |
| `'Varg'` | `card-art/Lycan/Varg copy.png` | Yes | Shortened name: Matches disk filename `Varg copy.png`. |
| `'Ulfric'` | `card-art/Lycan/Ulfric copy.png` | Yes | Shortened name: Matches disk filename `Ulfric copy.png`. |
| `'Lucian'` | `card-art/Lycan/Lucian copy.png` | Yes | Shortened name: Matches disk filename `Lucian copy.png`. |
| `'Desiree'` | `card-art/Daemon/Desiree copy.png` | Yes | Alternate spelling: Matches disk filename `Desiree copy.png`. |
| `'Alistar'` | `card-art/Daemon/Alistar copy.png` | Yes | Shortened name: Matches disk filename `Alistar copy.png`. |

All 10 aliases resolve to valid files. No dead aliases or broken pointers exist.

---

## 3. Casing & Platform Portability Analysis

Because Linux and Android filesystems are strictly case-sensitive, any discrepancy between the TypeScript mapping string and the physical filename will cause 404/file not found errors at runtime.

### Verification Results:
- **Filesystem Verification**: Tested each directory and filename component against `os.listdir()` byte-for-byte.
- **Result**: **0 casing mismatches**. All 52 mapped paths match exact disk casing.
- **Naming Idiosyncrasies Cataloged**:
  - `web/public/card-art/Avatars of light/`: Directory has lowercase `'l'` in `light`. Matches `constants.ts` line 12 (`"faction": "Avatars of light"`).
  - `Celestial/metattron copy.png`: Contains a double `'t'` in the disk filename, while card name is `Metatron`. Mapped properly in `cardArtPaths.ts` line 33.
  - `Daemon/BogVa copy.png`: Contains camelCase `'BogVa'` with a capital `'V'`. Mapped properly in `cardArtPaths.ts` line 73.
  - `Daemon/Desiree copy.png`: Contains trailing `'e'` in filename, while card name is `Desire`. Mapped properly in `cardArtPaths.ts` line 66.
  - All 42 card face files end with `' copy.png'` (with leading space), reflecting Photoshop export origin.

---

## 4. Asset Bloat & Android Packaging Analysis

### Disk Footprint Breakdown (`web/public/card-art/`):
- **Total Directory Size**: 153.92 MB (50 files)
- **42 Card Face Textures**: 41.18 MB (avg 1.00 MB / card)
- **1 Card Back Texture**: 1.57 MB (`endless seven card back.png`)
- **Documentation**: 1.07 KB (`README.md`)
- **6 Faction Posters**: **111.17 MB** (72.2% of total size!)

### Unreferenced Faction Posters:
1. `card-art/Avatars of light/Avatars of Light.png` — 16.87 MB (5754 x 3366)
2. `card-art/Celestial/Celestials.png` — 20.82 MB (5754 x 3366)
3. `card-art/Daemon/Daemon.png` — 18.41 MB (5754 x 3366)
4. `card-art/Darkness/Avatar of Darkness.png` — 19.30 MB (5754 x 3366)
5. `card-art/Lycan/Lycan.png` — 19.71 MB (5754 x 3366)
6. `card-art/Vampyre/Vampyre.png` — 16.05 MB (5754 x 3366)

### Impact on Android Build:
- Each poster is an uncut print sheet of 21 cards (7 cards wide x 3 cards high = 7 * 822 x 3 * 1122 = 5754 x 3366).
- `package.json` script `build:android` runs:
  `cross-env VITE_BASE=./ vite build --outDir ../app/src/main/assets/web`
- Vite automatically copies the entire `public/` directory into `app/src/main/assets/web/`.
- Consequently, these 111.17 MB of unused posters are bundled into the Android APK / AAB, tripling the application download size unnecessarily.
- **Recommendation**: Move the 6 faction sheets out of `web/public/card-art/` into a non-packaged directory (such as `docs/art/` or `assets/posters/`), reducing APK bundle size by over 111 MB.

---

## 5. Visual Parameters & Rendering Architecture

### Three.js 3D Rendering (`web/src/entities/CardEntity.ts`)
- **Card Geometry**:
  - `GAME_CONSTANTS.CARD_W = 2.2`, `GAME_CONSTANTS.CARD_H = 3.2`
  - Face Mesh: `PlaneGeometry(2.2 * 0.95, 3.2 * 0.95)` = 2.09 x 3.04 Three.js units.
  - Position: `position.y = 0.08`, `rotation.x = -Math.PI / 2`.
  - Back Mesh: `PlaneGeometry(2.2 * 0.95, 3.2 * 0.95)`, `position.y = -0.08`, `rotation.x = Math.PI / 2`.
- **Texture Handling**:
  - Texture loader cross-origin: `anonymous`.
  - Color space: `THREE.SRGBColorSpace`.
  - Anisotropy: `16` (highest quality filtering at oblique angles).
  - Asynchronous deduplicated loading via `faceTexturePromiseCache` and `faceTextureResolvedCache`.
  - Liveness safeguard: `applyFaceTextureIfReady()` re-checks cache during update loop to eliminate gray-card race conditions.
- **Procedural Canvas Fallback**:
  - If image art fails to load or is unmapped, `CardEntity` generates a dynamic 256 x 350 canvas texture with faction theme color gradient, card name, power value, and champion header.

### 2D HUD & Overlay Rendering (`web/src/App.tsx`, `AbilitiesDrawer.tsx`)
- **Abilities Drawer Thumbnail**:
  - Dimensions: `w-7 h-9` (28 x 36 px) with rounded corners and border.
  - Multi-tier Fallback: `item.faceArtPath || CARD_ART_PATHS[item.cardName] || CARD_BACK_PATH`.
- **Compact Combat Preview (Action Box)**:
  - Dimensions: `w-8 h-12` (32 x 48 px).
  - Fallback: `gameState.combatInterstitial.leftCard.faceArtPath || CARD_BACK_PATH`.
- **Inspect Card Preview**:
  - Large: `w-72 h-[27rem]` (288 x 432 px).
  - Small: `w-56 h-84` (224 x 336 px).
  - Object fit: `object-cover object-center`.
- **Combat Interstitial (`CombatCardView`)**:
  - Dimensions: `w-28 h-42` (mobile) up to `md:w-64 md:h-[24rem]` (desktop).
  - Overlays: Status badges (Buffs/Weakness), Haste aura glow (`#ff5000`), Flip aura glow (`#00f2ff`), Damage shake animation.

---

## 6. Identified Defects & Proposed Fixes

### Defect 1: Hardcoded Windows Paths in `validate_card_art_paths.mjs`
**Location**: `/home/jasonbrewster/projects/android_endless_seven/validate_card_art_paths.mjs:4-6`  
**Problem**:
```javascript
const webConstantsFile = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/constants.ts';
const cardArtPathsFile = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/cardArtPaths.ts';
const publicDir = 'C:/Users/jsnbr/Projects/android_endless_seven/web/public';
```
**Fix**:
```javascript
const rootDir = process.cwd();
const webConstantsFile = path.resolve(rootDir, 'web/src/constants.ts');
const cardArtPathsFile = path.resolve(rootDir, 'web/src/cardArtPaths.ts');
const publicDir = path.resolve(rootDir, 'web/public');
```

### Defect 2: Inconsistent Fallback in `PhaseManager.ts` for Face-Down Cards
**Location**: `/home/jasonbrewster/projects/android_endless_seven/web/src/game/PhaseManager.ts:84`  
**Problem**: Sets `faceArtPath: undefined` for enemy face-down cards, whereas `GameController.ts:1416` sets `faceArtPath: CARD_BACK_PATH`.  
**Impact**: In `App.tsx:1085`, `CombatCardView` shows a gray text box `[Face Down]` instead of the textured card back.  
**Fix**: In `PhaseManager.ts:84`, import and assign `faceArtPath: CARD_BACK_PATH`.

### Defect 3: Missing Unit Test for Asset Verification
**Location**: `web/src/game/__tests__/`  
**Problem**: Zero tests in `npm test` check that `CARD_ART_PATHS` maps to existing disk files.  
**Recommendation**: Add a dedicated Vitest test suite `web/src/game/__tests__/card-art-assets.test.ts` to assert:
- `CANONICAL_ALL_CARDS` length is 42.
- Every card name has a non-null entry in `CARD_ART_PATHS`.
- Every entry in `CARD_ART_PATHS` and `CARD_BACK_PATH` exists on disk with identical casing.

---

## 7. Audit Verification Methodology

1. **Python Script Parsing**: Verified `web/src/constants.ts` vs `simulator/src/constants.ts` vs `web/src/cardArtPaths.ts`.
2. **Binary PNG Header Inspection**: Checked magic bytes, IHDR chunks, bit depths, and dimensions across all 50 files.
3. **Exact Casing Audit**: Verified that `os.listdir()` match strings byte-for-byte on Linux filesystem.
4. **Codebase Grep**: Confirmed zero broken image references across all `.ts` and `.tsx` source files.
