# Project: android_endless_seven

## Architecture
- **Simulator Engine (`simulator/`)**: Headless TypeScript game engine, Monte Carlo balance simulator, AI heuristics, Vitest test suite.
- **Web Application (`web/`)**: React, Three.js, GSAP 3D card board interface, interaction engines, Vitest test suite, Vite Android asset bundler.
- **Android Shell (`app/`)**: Native Android WebView container hosting static web assets at `app/src/main/assets/web/`.
- **Root Utilities & Scripts**: `update_constants.mjs`, `validate_card_art_paths.mjs`, `copy_images.mjs`, `copy_images.ts`, `increment_version.py`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Simulator Test Suite (R1) | 15/15 tests passing across 3 test suites covering rules, balance, and variant-2026-08-13 | M1 | Survey Explorer 1 | DONE |
| 2 | Web Test Suite (R1) | 104/104 tests passing across 7 test suites covering interactions, alternate win conditions, storage | M1 | Survey Explorer 2 | DONE |
| 3 | Web Android Asset Build (R2) | Clean compilation of web bundle targeting `app/src/main/assets/web` | M2 | Survey Explorer 2 | DONE |
| 4 | Card Art Asset Verification (R2) | 100% of 42 canonical cards mapped in `cardArtPaths.ts` with textures present on disk | M2 | Survey Explorer 2 & 3 | DONE |
| 5 | Version Control Staging & Git Ignore (R3) | Add `*.tsdb` to `.gitignore`, stage modified/new assets, constants, tests, and scripts | M3 | Survey Explorer 3 | DONE |
| 6 | Git Commit & Remote Synchronization (R3) | Commit with descriptive message and push to GitHub remote (`origin/main`) | M3 | Survey Explorer 3 | DONE |
| 7 | Forensic Integrity Audit & Acceptance | Independent multi-agent review, adversarial challenge, and forensic integrity audit | M4 | Project Standard | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Suite Execution & Remediation | Full test suite runs across `simulator/` and `web/` | none | DONE |
| 2 | Web Asset & Android Build Generation | Build web bundle and verify assets in `app/src/main/assets/web` | M1 | DONE |
| 3 | Version Control, Git Stage, Commit & Push | Ignore `.tsdb`, stage modified/untracked files, commit, and push | M2 | DONE |
| 4 | Final Multi-Agent Gate & Forensic Audit | Reviewers, Challengers, and Forensic Auditor verification | M3 | DONE |

## Interface Contracts
- `simulator/src/constants.ts` ↔ `web/src/constants.ts`: Identical 42 canonical cards across 6 factions (Light & Dark pools of 21 each).
- `web/` ↔ `app/src/main/assets/web`: Web build artifacts (`index.html`, `assets/index-*.js`, `assets/index-*.css`, `card-art/`).

## Code Layout
- `simulator/src/`: Core engine, types, rules, balance test suites.
- `web/src/`: Game board, UI components, entity systems, art mappings, test suites.
- `web/public/card-art/`: Raw source card art PNGs and composite deck sheets.
- `app/src/main/assets/web/`: Compiled static bundle for Android WebView.
- `.gitignore`: Root Git ignore definitions.
