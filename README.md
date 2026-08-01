# Endless Seven

Strategic Tactical Card Game for Android

**Endless Seven** is a deep, tactical card game built for Android. It combines traditional card game mechanics with a dynamic 3D game board, challenging players to control seven mystic **Seals** through strategic placement, alignment choices, and unit abilities.

---

## 🌟 Key Features

- **3D Immersive Board:** A dynamic Three.js environment rendered seamlessly within a native Android shell.
- **Alignment System:** Choose between **Light** (Purification) or **Darkness** (Corruption).
- **Deep Strategy:** Seven Seals to conquer, three rounds to win. Every card placement matters.
- **Unique Unit Abilities:** Haste, Flip abilities, and powerful Activate triggers that can swing the tide of battle.
- **Modern Tech Stack:** Built with Kotlin, Jetpack Compose, React, Three.js, and TypeScript.

---

## 🏗️ Project Structure

The project is organized into three main components:

- **`/app` (Android):** The native Android application wrapper using **Kotlin** and **Jetpack Compose**. It hosts the game engine via a high-performance `WebView`.
- **`/web` (Game Engine):** The core game logic and 3D environment built with **React**, **Three.js**, and **TypeScript**. Assets are compiled and bundled into the Android project's assets folder.
- **`/simulator` (Balance & AI Tooling):** Fast headless **TypeScript** game engine simulator for balance reporting, automated AI self-play, dataset export, and Python ML/SHAP balance analysis.

---

## 🛠️ Development Setup

### Prerequisites

- **JDK 17**
- **Android SDK** (API 34+)
- **Node.js 20+** (for compiling game assets and running simulator)

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/endless-seven.git
   cd endless-seven
   ```

2. Install dependencies:
   ```bash
   # Install Web dependencies
   cd web && npm install

   # Install Simulator dependencies
   cd ../simulator && npm install
   ```

### Building & Running

#### Android & Web Application
The easiest way to build and run the game is using the provided `npm` scripts from the `web/` directory:

- **Build Game Assets & Run Debug APK:**
  ```bash
  npm run android:debug
  ```
- **Build Release Bundle (AAB):**
  ```bash
  npm run android:release
  ```

Alternatively, you can build the Android app from the root directory using Gradle (after building web assets):
```bash
./gradlew assembleDebug
```

#### Simulator & Balance Tooling
From the `simulator/` directory:

- **Run Unit & Balance Tests:**
  ```bash
  npm test
  ```
- **Run Headless Balance Simulation:**
  ```bash
  npm run simulate -- --matches 1000
  ```
- **Compile TypeScript Build:**
  ```bash
  npm run build
  ```

---

## 🎮 Game Rules

### Objective
Control the majority of the seven **Seals** by the end of **three rounds**. A match ends immediately if a player controls **all seven** Seals.

### Resolution Phase
Seals are resolved sequentially (1 to 7):

1. **Haste:** Units with Haste strike before the flip.
2. **The Flip:** Face-down units are revealed, triggering "Flip" abilities.
3. **Abilities:** Powerful "Activate" abilities trigger based on unit power values.
4. **Combat:** Units battle opposing creatures or the enemy Champion.
5. **Siege:** Surviving units influence the Seal's alignment (Purify or Corrupt).
6. **Ascension:** Victorious Champions ascend onto the Seal to guard it.

---

## 📄 License

Copyright © 2024 Endless Seven Team.  
Licensed under the [Apache License, Version 2.0](LICENSE).
