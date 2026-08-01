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

### Google Cloud Storage (GCS) Integration
- **gcloud CLI** and **GCS** access are configured on this environment.
- The GCS bucket location used for builds is: `gs://ai-studio-bucket-236764767416-us-west1/antigravity_projects/`
- When finalizing changes and making a commit, follow this deployment workflow:
  1. Increment the version code and name: `python3 increment_version.py`
  2. Build the web game assets: `node ./node_modules/cross-env/src/bin/cross-env.js VITE_BASE=./ node ./node_modules/vite/bin/vite.js build --outDir ../app/src/main/assets/web` inside the `web/` folder.
  3. Compile the Android app: `./gradlew assembleDebug` in the root folder.
  4. Copy the compiled APK to root: `cp app/build/outputs/apk/debug/app-debug.apk ./app-debug-v<version>.apk`
  5. Upload the compiled APK to GCS: `gcloud storage cp app-debug-v<version>.apk gs://ai-studio-bucket-236764767416-us-west1/antigravity_projects/`
