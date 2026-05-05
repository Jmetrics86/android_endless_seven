# AGENTS.md

## Repository Overview

This repository is dedicated to the **Android** version of Endless Seven. It is an Android app that hosts a Three.js tactical card game within a `WebView`.

## Structure

- **Android Root**: The root directory is a standard Android project structure (`app/`, `gradle/`, `build.gradle.kts`, etc.).
- **Web Source**: Located in `web/`. This contains the TypeScript/React/Three.js source code for the game board.

## Building and Debugging

### Core Workflow
Most development happens in `web/` for game logic or `app/` for the Android shell.

1. **Install Web Deps**: `cd web && npm install`
2. **Build & Debug Android**: `cd web && npm run android:debug`
   - This script builds the web assets into `app/src/main/assets/web` and then triggers `gradlew assembleDebug`.

### Commands (from `web/` directory)
- `npm run dev`: Start Vite dev server (for testing game logic in a desktop browser).
- `npm run build:android`: Build production assets for the Android app.
- `npm run android:debug`: Build assets and generate a debug APK.
- `npm run android:release`: Build assets and generate a release bundle (AAB).

### Commands (from root directory)
- `./gradlew assembleDebug`: Build the Android app (assumes web assets are already built).

## Environment
- **JDK 17** is required.
- **Android SDK** must be configured (see `local.properties`).
- Web builds require **Node.js 20+**.
