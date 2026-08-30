# AGENTS.md

## Repository Overview

This repository is dedicated to the **Android** version of Endless Seven. It is an Android app that hosts a Three.js tactical card game within a `WebView`.

## Structure

- **Android Root**: The root directory is a standard Android project structure (`app/`, `gradle/`, `build.gradle.kts`, etc.).
- **Web Source**: Located in `web/`. This contains the TypeScript/React/Three.js source code for the game board.
- **Simulator & Balance Tooling**: Located in `simulator/`. Headless TypeScript game engine, automated AI self-play balance simulations, Kaggle dataset exporters, and Python ML/SHAP analysis tools.

## Building and Debugging

### Core Workflow
Most development happens in `web/` for game logic, `app/` for the Android shell, or `simulator/` for game balance testing and AI self-play dataset generation.

1. **Install Web Deps**: `cd web && npm install`
2. **Install Simulator Deps**: `cd simulator && npm install`
3. **Build & Debug Android**: `cd web && npm run android:debug`
   - This script builds the web assets into `app/src/main/assets/web` and then triggers `gradlew assembleDebug`.

### Commands (from `web/` directory)
- `npm run dev`: Start Vite dev server (for testing game logic in a desktop browser).
- `npm run build:android`: Build production assets for the Android app.
- `npm run android:debug`: Build assets and generate a debug APK.
- `npm run android:release`: Build assets and generate a release bundle (AAB).

### Commands (from `simulator/` directory)
- `npm test`: Run Vitest unit & simulation test suite.
- `npm run simulate`: Run headless balance simulation (e.g., `npm run simulate -- --matches 1000`).
- `npm run build`: Compile TypeScript sources to `dist/`.

### Commands (from root directory)
- `./gradlew assembleDebug`: Build the Android app (assumes web assets are already built).

## Environment
- **JDK 17** is required.
- **Android SDK** must be configured (see `local.properties`).
- Web builds require **Node.js 20+**.

## Release and Deployment

### GitHub Releases Workflow
- Android APK releases are published directly to **GitHub Releases**: `https://github.com/Jmetrics86/android_endless_seven/releases`.
- When finalizing changes and making a release, run the automated release tool:
  ```bash
  python release_to_github.py
  ```
- This automated workflow:
  1. Increments the version code and name (`increment_version.py`).
  2. Builds the production web assets into `app/src/main/assets/web`.
  3. Commits and creates a Git tag (e.g. `v0.0.42`).
  4. Pushes to GitHub, triggering the `.github/workflows/release.yml` GitHub Actions runner.
  5. GitHub Actions builds the Android APK and publishes it to GitHub Releases with the direct download link.

