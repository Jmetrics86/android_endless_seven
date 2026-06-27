/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameController } from './game/GameController';
import { GAME_VERSION } from './constants';
import { Alignment, Phase, GameState, HoveredCardInfo } from './types';
import { cardArtUrl, CARD_BACK_PATH } from './cardArtPaths';
import type { EnvironmentTheme } from './theme';
import { THEME_STORAGE_KEY } from './theme';
import { GameOverAchievements } from './components/GameOverAchievements';

function loadStoredTheme(): EnvironmentTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameController | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSelection, setShowSelection] = useState(true);
  const [zoneSearchModal, setZoneSearchModal] = useState<'limbo' | 'graveyard' | 'deck' | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [environmentTheme, setEnvironmentTheme] = useState<EnvironmentTheme>(loadStoredTheme);

  const LOG_RECENT_COUNT = 30;
  const displayLogs =
    gameState?.currentPhase === Phase.GAME_OVER
      ? gameState.logs
      : (gameState?.logs ?? []).slice(-LOG_RECENT_COUNT);

  const isActionRequired = !!(
    gameState?.currentPhase === Phase.PREP ||
    gameState?.currentPhase === Phase.COUNTER_ALLOCATION ||
    gameState?.decisionContext
  );

  useEffect(() => {
    if (displayLogs.length && logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [displayLogs.length, isDrawerOpen]);

  useEffect(() => {
    let gameInstance: GameController | null = null;
    if (containerRef.current && !gameRef.current) {
      gameInstance = new GameController(containerRef.current);
      gameInstance.onStateChange = (state) => setGameState({ ...state });
      gameRef.current = gameInstance;
    }

    return () => {
      if (gameInstance) {
        gameInstance.dispose();
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = environmentTheme;
    gameRef.current?.setEnvironmentTheme(environmentTheme);
  }, [environmentTheme]);

  const toggleEnvironmentTheme = () => {
    setEnvironmentTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSelectAlignment = (side: Alignment) => {
    setShowSelection(false);
    gameRef.current?.selectAlignment(side);
  };

  const handleEndPrep = () => {
    gameRef.current?.endPrep();
  };

  const handlePrepBack = () => {
    gameRef.current?.undoLastPrepAction();
  };

  const handleFinishCounters = () => {
    gameRef.current?.finishCounters();
  };

  const handleDecision = (confirmed: boolean) => {
    if (gameRef.current) {
      (gameRef.current as any).nullifyCallback?.(confirmed);
      (gameRef.current as any).nullifyCallback = null;
    }
  };

  const handleMarkerTypeChoice = (type: 'power' | 'weakness') => {
    if (gameRef.current) {
      (gameRef.current as any).markerTypeCallback?.(type);
      (gameRef.current as any).markerTypeCallback = null;
    }
  };

  const handleForceSkip = () => {
    gameRef.current?.forceSkip();
  };

  return (
    <div className="relative w-full min-h-dvh overflow-hidden font-cinzel box-border pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] bg-black">
      {/* Three.js Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Tactical Control Toggle Button (Left Side) */}
      {gameState && !showSelection && gameState.currentPhase !== Phase.GAME_OVER && (
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] z-[110] min-h-12 min-w-12 rounded-full glass-panel border flex items-center justify-center transition-all active:scale-90 ${
            isActionRequired && !isDrawerOpen ? 'border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.5)] animate-pulse' : 'border-white/20 hover:border-[#00f2ff]/60'
          }`}
          aria-label="Toggle Tactical Menu"
        >
          <span className={`text-2xl ${isActionRequired && !isDrawerOpen ? 'text-[#00f2ff]' : 'text-white'}`}>
            {isDrawerOpen ? '✕' : isActionRequired ? '!' : '☰'}
          </span>
        </button>
      )}

      {/* Tactical Control Left Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          />
        )}
        {isDrawerOpen && (
          <motion.div
            key="drawer-content"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-[105] w-[min(280px,75vw)] md:w-[340px] bg-[#0a0a0c]/95 border-r border-white/10 shadow-2xl flex flex-col pt-[env(safe-area-inset-top,10px)] pb-[env(safe-area-inset-bottom,10px)]"
          >
            <div className="px-3 py-2 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-1.5">
                <h2 className="text-[#00f2ff] text-[0.7rem] tracking-[0.2em] font-bold">TACTICAL CONTROL</h2>
                <button onClick={() => setIsDrawerOpen(false)} className="text-white/60 hover:text-white p-1">✕</button>
              </div>

              {/* Active Instructions / Objective */}
              {isActionRequired && (
                <div className="mb-3 glass-panel p-2.5 border border-[#00f2ff]/30 bg-[#00f2ff]/5 rounded-xl text-center space-y-1.5 shadow-[0_0_15px_rgba(0,242,255,0.05)]">
                  <div className="text-[0.5rem] text-[#00f2ff] font-extrabold uppercase tracking-widest animate-pulse">Tactical Objective</div>
                  <div className="text-[0.6rem] text-gray-200 leading-normal font-sans">
                    {gameState?.decisionMessage ?? gameState?.instructionText}
                  </div>

                  {/* Compact Combat Preview inside Action Box if combat is active */}
                  {gameState?.combatInterstitial?.active && (
                    <div className="flex items-center justify-center gap-1.5 bg-black/50 p-1.5 rounded-lg border border-white/5 mt-1 select-none">
                      {/* Compact Left Card */}
                      {gameState.combatInterstitial.leftCard && (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-12 rounded border border-white/10 overflow-hidden relative">
                            <img
                              src={cardArtUrl(gameState.combatInterstitial.leftCard.faceArtPath || CARD_BACK_PATH)}
                              alt={gameState.combatInterstitial.leftCard.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-[0.4rem] text-gray-400 font-bold truncate max-w-[50px] leading-none mt-0.5">{gameState.combatInterstitial.leftCard.name}</div>
                        </div>
                      )}
                      <span className="text-[0.4rem] text-gray-600 font-bold">VS</span>
                      {/* Compact Right Card */}
                      {gameState.combatInterstitial.rightCard && (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-12 rounded border border-white/10 overflow-hidden relative">
                            <img
                              src={gameState.combatInterstitial.rightCard.faceArtPath ? cardArtUrl(gameState.combatInterstitial.rightCard.faceArtPath) : cardArtUrl(CARD_BACK_PATH)}
                              alt={gameState.combatInterstitial.rightCard.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-[0.4rem] text-gray-400 font-bold truncate max-w-[50px] leading-none mt-0.5">{gameState.combatInterstitial.rightCard.name}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Active Controls Section */}
              <div className="mb-3 space-y-2">
                <div className="text-[0.5rem] text-gray-500 uppercase tracking-widest px-1">Tactical Status</div>

                {/* Phase Control: Prep */}
                {gameState?.currentPhase === Phase.PREP && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handlePrepBack}
                      disabled={!gameRef.current?.canUndoPrep()}
                      className="drawer-btn-secondary py-1 text-[0.55rem] disabled:opacity-30"
                    >
                      Undo
                    </button>
                    <button onClick={handleEndPrep} className="drawer-btn-primary py-1 text-[0.55rem]">
                      End Prep
                    </button>
                  </div>
                )}

                {/* Phase Control: Counter Allocation */}
                {gameState?.currentPhase === Phase.COUNTER_ALLOCATION && (
                  <div className="glass-panel p-2 border border-[#00f2ff]/30 space-y-2">
                    <div className="flex justify-around items-center">
                      <div className="text-center">
                        <div className="text-[0.45rem] text-gray-500 uppercase">Power</div>
                        <div className="text-base font-bold text-[#00f2ff]">{gameState.powerPool}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[0.45rem] text-gray-500 uppercase">Weakness</div>
                        <div className="text-base font-bold text-[#ff0044]">{gameState.weaknessPool}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={handleFinishCounters} className="drawer-btn-secondary py-1 text-[0.55rem]">
                        Skip
                      </button>
                      <button onClick={handleFinishCounters} className="drawer-btn-primary py-1 text-[0.55rem] font-bold">
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                {/* Decision Controls */}
                {gameState?.decisionContext && (
                  <div className="glass-panel p-2 border border-amber-500/30 space-y-1.5 text-center">
                    <div className="text-[0.5rem] text-amber-500 font-bold uppercase tracking-widest">
                      {gameState.decisionContext.replace('_', ' ')}
                    </div>
                    <div className="text-[0.55rem] text-gray-300 leading-tight">
                      {gameState.decisionMessage ?? gameState.instructionText}
                    </div>

                    {gameState.decisionContext === 'ALMIGHTY_MARKER_TYPE' || gameState.decisionContext === 'DESTROYER_MARKER_TYPE' ? (
                      <div className="flex gap-1">
                         <button onClick={() => handleMarkerTypeChoice('power')} className="drawer-btn border-[#00f2ff] text-[#00f2ff] py-1 text-[0.5rem]">Power</button>
                         <button onClick={() => handleMarkerTypeChoice('weakness')} className="drawer-btn border-[#ff0044] text-[#ff4466] py-1 text-[0.5rem]">Weakness</button>
                      </div>
                    ) : gameState.decisionContext === 'LUST_SEAL_INFLUENCE' ? (
                      <div className="flex gap-1">
                         <button onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.LIGHT)} className="drawer-btn border-amber-400 text-amber-300 py-1 text-[0.5rem]">Light</button>
                         <button onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.DARK)} className="drawer-btn border-purple-400 text-purple-300 py-1 text-[0.5rem]">Dark</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                         <button onClick={() => handleDecision(true)} className="drawer-btn border-[#00f2ff] text-[#00f2ff] py-1 text-[0.5rem]">Yes</button>
                         <button onClick={() => handleDecision(false)} className="drawer-btn border-white/20 text-gray-400 py-1 text-[0.5rem]">Skip</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pass Button for Targeting Phases */}
                {(gameState?.currentPhase === Phase.ABILITY_TARGETING ||
                  gameState?.currentPhase === Phase.SEAL_TARGETING ||
                  gameState?.currentPhase === Phase.DELTA_BUFF_TARGETING) && (
                  <button
                    onClick={handleForceSkip}
                    className="w-full py-1.5 border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[0.55rem] uppercase tracking-widest font-bold rounded hover:bg-amber-500/10 transition-all"
                  >
                    Pass / Skip Action
                  </button>
                )}

                {!isActionRequired && (
                  <div className="text-center p-1.5 glass-panel border-white/5 italic text-[0.55rem] text-gray-500">
                    Waiting for sequence...
                  </div>
                )}
              </div>

              {/* Scores & Details */}
              <div className="space-y-1.5 mb-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="glass-panel px-2 py-1 border-l-2 border-[#ff0044] bg-white/[0.02]">
                    <div className="text-[0.4rem] text-gray-500 uppercase">Enemy</div>
                    <div className="text-sm font-bold leading-none">{gameState?.enemyScore} / 7</div>
                  </div>
                  <div className="glass-panel px-2 py-1 border-l-2 border-[#00f2ff] bg-white/[0.02]">
                    <div className="text-[0.4rem] text-gray-500 uppercase">You</div>
                    <div className="text-sm font-bold leading-none">{gameState?.playerScore} / 7</div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 py-1 glass-panel border-white/5 bg-white/[0.01]">
                  <div className="text-center mr-2 border-r border-white/10 pr-2">
                    <div className="text-[0.4rem] text-gray-500 uppercase leading-none">Rnd</div>
                    <div className="text-xs font-bold text-white leading-none">{gameState?.currentRound}</div>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-[0.5rem] font-bold text-white uppercase truncate">{gameState?.currentPhase.replace('_', ' ')}</div>
                    <div className="text-[0.4rem] text-[#00f2ff] uppercase truncate">{gameState?.phaseStep}</div>
                  </div>
                </div>
              </div>

              {/* Search Buttons */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                 <button onClick={() => setZoneSearchModal('limbo')} className="drawer-btn-icon py-1" title="Limbo">L</button>
                 <button onClick={() => setZoneSearchModal('graveyard')} className="drawer-btn-icon py-1" title="Graveyard">G</button>
                 <button onClick={() => setZoneSearchModal('deck')} className="drawer-btn-icon py-1" title="Deck">D</button>
              </div>

              {/* Log */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-[0.5rem] text-gray-500 uppercase tracking-widest mb-1 px-1">Intel Log</div>
                <div ref={logScrollRef} className="flex-1 overflow-y-auto space-y-1 p-1.5 bg-black/30 rounded border border-white/5 font-mono text-[0.5rem] scrollbar-thin">
                  {displayLogs.map((log, i) => (
                    <div key={i} className="text-gray-400 border-l border-white/10 pl-1.5 leading-tight mb-1">
                      <span className="text-[#00f2ff] mr-1">»</span>{log}
                    </div>
                  ))}
                </div>
                <button onClick={handleForceSkip} className="mt-2 w-full py-1 border border-[#ff0044]/30 text-[#ff0044] text-[0.5rem] uppercase tracking-tighter hover:bg-[#ff0044]/10 transition-all">
                  Skip Current Interaction
                </button>
              </div>

              {/* Theme Toggle & Version in Drawer Footer */}
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-2">
                 <div className="flex items-center justify-between">
                   <span className="text-[0.6rem] text-[#00f2ff] font-medium animate-pulse-subtle">🐢 Slow Play Mode Active</span>
                   <span className="text-[0.5rem] text-gray-700">v{GAME_VERSION}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <button onClick={toggleEnvironmentTheme} className="text-[0.6rem] text-gray-500 uppercase hover:text-white transition-colors">
                     {environmentTheme === 'dark' ? '☀ Light Mode' : '☽ Dark Mode'}
                   </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Overlay */}
      <AnimatePresence>
        {showSelection && (
          <motion.div
            key="selection-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4 text-white"
          >
            <h1 className="mb-2 text-4xl tracking-[0.3em] font-bold text-center">ENDLESS SEVEN</h1>
            <p className="mb-10 text-xs italic text-gray-500 text-center">&quot;Choose your side. Seal the heartbeat of the world.&quot;</p>
            
            <div className="flex flex-col gap-6 sm:flex-row">
              <AlignmentCard
                side={Alignment.LIGHT}
                title="LIGHT"
                description="Command Celestials and Lycans. Purify the Seals."
                icon="☼"
                color="#00f2ff"
                onClick={() => handleSelectAlignment(Alignment.LIGHT)}
              />
              <AlignmentCard
                side={Alignment.DARK}
                title="DARKNESS"
                description="Lead Daemons and Vampyres. Corrupt the Seals."
                icon="☾"
                color="#ff0044"
                onClick={() => handleSelectAlignment(Alignment.DARK)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left-aligned Preview (Hover/Drag) */}
      <AnimatePresence>
        {(gameState?.draggingCard || (gameState?.hoveredCard && !isDrawerOpen)) && (
          <motion.div
            key="hover-drag-preview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-[90] pointer-events-none"
          >
            <CardPreview card={gameState.draggingCard || gameState.hoveredCard} size="large" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {gameState?.currentPhase === Phase.GAME_OVER && (
          <motion.div
            key="game-over-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md p-6 overflow-y-auto"
          >
            <header className="text-center mb-10">
              <h1 className="text-4xl tracking-widest font-bold mb-2">THE CYCLE ENDS</h1>
              <div className={`text-xl font-bold uppercase tracking-[0.4em] ${
                gameState.gameOverResult === 'player' ? 'text-[#00f2ff]' : gameState.gameOverResult === 'enemy' ? 'text-[#ff0044]' : 'text-gray-400'
              }`}>
                {gameState.gameOverResult}
              </div>
              <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">{gameState.instructionText}</p>
            </header>

            <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <aside className="border-r border-white/10 pr-8">
                {gameState.gameOverResult && (
                  <GameOverAchievements
                    result={gameState.gameOverResult}
                    gameOverStats={gameState.gameOverStats}
                    newThisSession={gameState.gameOverNewAchievements ?? []}
                  />
                )}
              </aside>
              <section className="space-y-4">
                <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">Chronicle of Events</div>
                <div className="h-[300px] overflow-y-auto bg-black/50 p-4 border border-white/5 rounded font-mono text-xs space-y-2">
                  {gameState.logs.map((log, i) => (
                    <div key={i} className="text-gray-400 border-l-2 border-[#00f2ff]/20 pl-2">{log}</div>
                  ))}
                </div>
              </section>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mx-auto px-12 py-3 border border-[#00f2ff] text-[#00f2ff] font-bold tracking-widest hover:bg-[#00f2ff]/10 transition-all uppercase"
            >
              New Cycle
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {gameState && zoneSearchModal && (
          <ZoneSearchModal
            key="zone-search-modal"
            zone={zoneSearchModal}
            playerCards={
              zoneSearchModal === 'limbo' ? (gameState.playerLimboCards ?? [])
              : zoneSearchModal === 'graveyard' ? (gameState.playerGraveyardCards ?? [])
              : (gameState.playerDeckCards ?? [])
            }
            enemyCards={
              zoneSearchModal === 'limbo' ? (gameState.enemyLimboCards ?? [])
              : zoneSearchModal === 'graveyard' ? (gameState.enemyGraveyardCards ?? [])
              : (gameState.enemyDeckCards ?? [])
            }
            isSelectingTarget={gameState.isSelectingLimboTarget === true && zoneSearchModal === 'limbo'}
            onClose={() => setZoneSearchModal(null)}
            onSelectLimboCard={(zone, index) => {
gameRef.current?.selectLimboCardForAbility(zone, index);
              setZoneSearchModal(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {gameState?.combatInterstitial?.active && !isActionRequired && (
          <motion.div
            key="combat-interstitial-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-3 md:p-8 text-white font-cinzel overflow-y-auto"
          >
            {/* Header with Seal Index and Step Status (Fixed Height to avoid layout shifts) */}
            <div className="text-center mb-2 max-w-2xl px-4 select-none shrink-0 h-14 md:h-20 flex flex-col justify-center items-center">
              <h2 className="text-[#00f2ff] text-[0.65rem] sm:text-xs md:text-base tracking-[0.25em] md:tracking-[0.3em] font-bold uppercase mb-0.5 md:mb-1">
                SEAL {gameState.combatInterstitial.sealIndex + 1} RESOLUTION
              </h2>
              <div className="h-0.5 w-24 md:w-48 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent mx-auto mb-1 md:mb-1.5" />
              <p className="text-[0.6rem] sm:text-sm md:text-lg font-semibold tracking-wider text-gray-100 truncate w-full animate-pulse leading-none">
                {gameState.combatInterstitial.description}
              </p>
            </div>

            {/* Main Content Area (Side-by-Side Player vs Rival) */}
            <div className="flex flex-row items-stretch justify-center gap-1.5 sm:gap-4 md:gap-10 my-2 w-full max-w-5xl px-2">
              
              {/* Left Column (Player Side) */}
              <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 max-w-[160px] sm:max-w-[200px] md:max-w-none">
                <div className="text-[0.45rem] md:text-xs uppercase tracking-widest text-[#00f2ff]/80 font-bold shrink-0">Player</div>
                
                {/* Left Card Container */}
                <div className="shrink-0 flex items-center justify-center h-28 sm:h-36 md:h-[21rem]">
                  {gameState.combatInterstitial.leftCard ? (
                    <div
                      className={`w-18 h-27 sm:w-24 sm:h-36 md:w-56 md:h-[21rem] rounded-lg sm:rounded-2xl overflow-hidden border border-white/20 md:border-2 bg-black relative flex flex-col transition-all duration-300 shadow-2xl shrink-0
                        ${(gameState.combatInterstitial.hasteActive === 'left' || gameState.combatInterstitial.hasteActive === 'both') ? 'haste-glow-active' : ''}
                        ${gameState.combatInterstitial.leftGlow ? 'flip-glow-active' : ''}
                        ${gameState.combatInterstitial.leftDamageFlash ? 'card-shake-active' : ''}
                      `}
                    >
                      <img
                        src={cardArtUrl(gameState.combatInterstitial.leftCard.faceArtPath || CARD_BACK_PATH)}
                        alt={gameState.combatInterstitial.leftCard.name}
                        className="w-full h-full object-cover object-center"
                      />
                      {gameState.combatInterstitial.leftDamageFlash && (
                        <div className="absolute inset-0 z-10 damage-flash-active pointer-events-none rounded-lg sm:rounded-2xl" />
                      )}
                      
                      {/* Power/Weakness Markers Badges on Left Card */}
                      <div className="absolute top-0.5 left-0.5 md:top-2 md:left-2 z-20 flex flex-col gap-0.5 pointer-events-none">
                        {gameState.combatInterstitial.leftCard.powerMarkers > 0 && (
                          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#00f2ff] text-[#00f2ff] text-[0.4rem] sm:text-[0.55rem] md:text-xs font-bold shadow-[0_0_8px_rgba(0,242,255,0.5)] font-mono animate-pulse leading-none">
                            ⚡+{gameState.combatInterstitial.leftCard.powerMarkers}
                          </div>
                        )}
                        {gameState.combatInterstitial.leftCard.weaknessMarkers > 0 && (
                          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#ff0044] text-[#ff0044] text-[0.4rem] sm:text-[0.55rem] md:text-xs font-bold shadow-[0_0_8px_rgba(255,0,68,0.5)] font-mono animate-pulse leading-none">
                            💀-{gameState.combatInterstitial.leftCard.weaknessMarkers}
                          </div>
                        )}
                      </div>

                      {/* Final Power Badge on Left Card */}
                      {gameState.combatInterstitial.leftCard.name !== 'Face Down Card' && (
                        <div className="absolute bottom-0.5 right-0.5 md:bottom-3 md:right-3 z-20 bg-black/95 border border-[#00f2ff] md:border-2 text-[#00f2ff] px-1 py-0.2 md:px-3 md:py-1 rounded-md md:rounded-lg text-[0.55rem] sm:text-[0.8rem] md:text-lg font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.6)] tracking-wider font-mono leading-none">
                          {gameState.combatInterstitial.leftCard.power + gameState.combatInterstitial.leftCard.powerMarkers - gameState.combatInterstitial.leftCard.weaknessMarkers}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-18 h-27 sm:w-24 sm:h-36 md:w-56 md:h-[21rem] rounded-lg sm:rounded-2xl border border-dashed border-white/10 md:border-2 flex items-center justify-center text-[0.45rem] sm:text-xs md:text-sm text-gray-600 bg-white/5 uppercase tracking-widest shrink-0">
                      No Card
                    </div>
                  )}
                </div>

                {/* Left Card Info Header (Fixed Height to prevent shifts) */}
                <div className="w-full text-center h-12 sm:h-16 flex flex-col justify-center items-center overflow-hidden select-none shrink-0">
                  {gameState.combatInterstitial.leftCard && (
                    <>
                      <div className="text-[0.48rem] sm:text-xs md:text-sm font-bold text-white tracking-widest truncate w-full px-1">
                        {gameState.combatInterstitial.leftCard.name}
                      </div>
                      <PowerFormulaDisplay card={gameState.combatInterstitial.leftCard} overrideText={gameState.combatInterstitial.leftPowerText} />
                    </>
                  )}
                </div>

                {/* Left Rules Checklist (Visible on all screens now!) */}
                <CardResolutionChecklist step={gameState.combatInterstitial.step} isLeft={true} card={gameState.combatInterstitial.leftCard} />
              </div>

              {/* Center VS Column (Fixed Width & Height) */}
              <div className="flex flex-col items-center justify-center shrink-0 self-center">
                <span className="text-xs sm:text-base md:text-2xl font-bold italic text-gray-500 tracking-wider font-cinzel select-none">
                  VS
                </span>
              </div>

              {/* Right Column (Rival Side) */}
              <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 max-w-[160px] sm:max-w-[200px] md:max-w-none">
                <div className="text-[0.45rem] md:text-xs uppercase tracking-widest text-[#ff0044]/80 font-bold shrink-0">Rival</div>
                
                {/* Right Card Container */}
                <div className="shrink-0 flex items-center justify-center h-28 sm:h-36 md:h-[21rem]">
                  {gameState.combatInterstitial.rightCard ? (
                    <div
                      className={`w-18 h-27 sm:w-24 sm:h-36 md:w-56 md:h-[21rem] rounded-lg sm:rounded-2xl overflow-hidden border border-white/20 md:border-2 bg-black relative flex flex-col transition-all duration-300 shadow-2xl shrink-0
                        ${(gameState.combatInterstitial.rightCard.name === 'Face Down Card') ? '' : ''}
                        ${(gameState.combatInterstitial.hasteActive === 'right' || gameState.combatInterstitial.hasteActive === 'both') ? 'haste-glow-active' : ''}
                        ${gameState.combatInterstitial.rightGlow ? 'flip-glow-active' : ''}
                        ${gameState.combatInterstitial.rightDamageFlash ? 'card-shake-active' : ''}
                      `}
                    >
                      <img
                        src={gameState.combatInterstitial.rightCard.faceArtPath ? cardArtUrl(gameState.combatInterstitial.rightCard.faceArtPath) : cardArtUrl(CARD_BACK_PATH)}
                        alt={gameState.combatInterstitial.rightCard.name}
                        className="w-full h-full object-cover object-center"
                      />
                      {gameState.combatInterstitial.rightDamageFlash && (
                        <div className="absolute inset-0 z-10 damage-flash-active pointer-events-none rounded-lg sm:rounded-2xl" />
                      )}
                      
                      {/* Power/Weakness Markers Badges on Right Card */}
                      <div className="absolute top-0.5 left-0.5 md:top-2 md:left-2 z-20 flex flex-col gap-0.5 pointer-events-none">
                        {gameState.combatInterstitial.rightCard.powerMarkers > 0 && (
                          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#00f2ff] text-[#00f2ff] text-[0.4rem] sm:text-[0.55rem] md:text-xs font-bold shadow-[0_0_8px_rgba(0,242,255,0.5)] font-mono animate-pulse leading-none">
                            ⚡+{gameState.combatInterstitial.rightCard.powerMarkers}
                          </div>
                        )}
                        {gameState.combatInterstitial.rightCard.weaknessMarkers > 0 && (
                          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#ff0044] text-[#ff0044] text-[0.4rem] sm:text-[0.55rem] md:text-xs font-bold shadow-[0_0_8px_rgba(255,0,68,0.5)] font-mono animate-pulse leading-none">
                            💀-{gameState.combatInterstitial.rightCard.weaknessMarkers}
                          </div>
                        )}
                      </div>

                      {/* Final Power Badge on Right Card */}
                      {gameState.combatInterstitial.rightCard.name !== 'Face Down Card' && (
                        <div className="absolute bottom-0.5 right-0.5 md:bottom-3 md:right-3 z-20 bg-black/95 border border-[#00f2ff] md:border-2 text-[#00f2ff] px-1 py-0.2 md:px-3 md:py-1 rounded-md md:rounded-lg text-[0.55rem] sm:text-[0.8rem] md:text-lg font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.6)] tracking-wider font-mono leading-none">
                          {gameState.combatInterstitial.rightCard.power + gameState.combatInterstitial.rightCard.powerMarkers - gameState.combatInterstitial.rightCard.weaknessMarkers}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-18 h-27 sm:w-24 sm:h-36 md:w-56 md:h-[21rem] rounded-lg sm:rounded-2xl border border-dashed border-white/10 md:border-2 flex items-center justify-center text-[0.45rem] sm:text-xs md:text-sm text-gray-600 bg-white/5 uppercase tracking-widest shrink-0">
                      No Card
                    </div>
                  )}
                </div>

                {/* Right Card Info Header (Fixed Height to prevent shifts) */}
                <div className="w-full text-center h-12 sm:h-16 flex flex-col justify-center items-center overflow-hidden select-none shrink-0">
                  {gameState.combatInterstitial.rightCard && (
                    <>
                      <div className="text-[0.48rem] sm:text-xs md:text-sm font-bold text-white tracking-widest truncate w-full px-1">
                        {gameState.combatInterstitial.rightCard.name}
                      </div>
                      <PowerFormulaDisplay card={gameState.combatInterstitial.rightCard} overrideText={gameState.combatInterstitial.rightPowerText} />
                    </>
                  )}
                </div>

                {/* Right Rules Checklist (Visible on all screens now!) */}
                <CardResolutionChecklist step={gameState.combatInterstitial.step} isLeft={false} card={gameState.combatInterstitial.rightCard} />
              </div>

            </div>

            {/* Step Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-4 my-2 md:my-5 text-[0.45rem] sm:text-[0.55rem] md:text-xs uppercase tracking-wider text-gray-500 font-mono">
              <span className={gameState.combatInterstitial.step === 'haste' ? 'text-[#ff5000] font-bold shadow-pulse' : ''}>Haste Step</span>
              <span>•</span>
              <span className={gameState.combatInterstitial.step === 'flip' ? 'text-[#00f2ff] font-bold shadow-pulse' : ''}>Flip Step</span>
              <span>•</span>
              <span className={gameState.combatInterstitial.step === 'ability' ? 'text-purple-400 font-bold shadow-pulse' : ''}>Ability Step</span>
              <span>•</span>
              <span className={gameState.combatInterstitial.step === 'combat' ? 'text-red-500 font-bold shadow-pulse' : ''}>Combat Step</span>
              <span>•</span>
              <span className={gameState.combatInterstitial.step === 'done' ? 'text-green-400 font-bold shadow-pulse' : ''}>Resolved</span>
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-1 md:mt-3">
              <button
                onClick={handleForceSkip}
                className="px-3 py-1 sm:px-4 sm:py-1.5 md:px-6 md:py-2.5 border border-[#ff0044]/30 text-[#ff0044] text-[0.5rem] sm:text-[0.6rem] md:text-sm uppercase tracking-widest hover:bg-[#ff0044]/10 transition-all font-bold"
              >
                Skip Interaction
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .drawer-btn {
          width: 100%;
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ccc;
          text-transform: uppercase;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          transition: all 0.2s;
        }
        .drawer-btn:hover {
          border-color: #00f2ff;
          color: #00f2ff;
        }
        .drawer-btn-primary {
          width: 100%;
          padding: 10px;
          background: rgba(0,242,255,0.1);
          border: 1px solid rgba(0,242,255,0.4);
          color: #00f2ff;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
        }
        .drawer-btn-secondary {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: #888;
          text-transform: uppercase;
          font-size: 0.65rem;
        }
        .drawer-btn-icon {
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #00f2ff;
          font-weight: bold;
          font-size: 0.8rem;
          text-align: center;
        }

        @keyframes haste-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 69, 0, 0.6), inset 0 0 10px rgba(255, 69, 0, 0.4);
            border-color: rgba(255, 80, 0, 0.8);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 120, 0, 0.9), inset 0 0 20px rgba(255, 120, 0, 0.6);
            border-color: rgba(255, 140, 0, 1);
          }
        }
        .haste-glow-active {
          animation: haste-glow 1.5s infinite ease-in-out;
          border-width: 3px !important;
        }

        @keyframes flip-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.6), inset 0 0 10px rgba(0, 242, 255, 0.4);
            border-color: rgba(0, 242, 255, 0.8);
          }
          50% {
            box-shadow: 0 0 35px rgba(0, 242, 255, 1), inset 0 0 20px rgba(0, 242, 255, 0.7);
            border-color: rgba(0, 242, 255, 1);
          }
        }
        .flip-glow-active {
          animation: flip-glow 1.5s infinite ease-in-out;
          border-width: 3px !important;
        }

        @keyframes damage-flash {
          0%, 100% { background-color: rgba(255, 0, 68, 0); }
          50% { background-color: rgba(255, 0, 68, 0.55); }
        }
        @keyframes card-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-8px, 5px) rotate(-3deg); }
          40% { transform: translate(6px, -5px) rotate(3deg); }
          60% { transform: translate(-5px, 2px) rotate(-1deg); }
          80% { transform: translate(4px, 1px) rotate(2deg); }
        }
        .damage-flash-active {
          animation: damage-flash 0.3s ease-in-out 3;
        }
        .card-shake-active {
          animation: card-shake 0.3s ease-in-out;
        }
        .shadow-pulse {
          text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
        }
      `}</style>
    </div>
  );
}

function PowerFormulaDisplay({ card, overrideText }: { card: HoveredCardInfo; overrideText?: string }) {
  if (card.name === 'Face Down Card') {
    return (
      <div className="mt-1 px-3 py-1 md:px-4 md:py-1.5 bg-white/5 border border-white/10 rounded-lg text-[0.55rem] md:text-xs font-mono tracking-wide text-gray-400">
        Power: ?
      </div>
    );
  }

  // If there's an override text that is not a standard formula, we can show it (e.g. custom messages)
  if (overrideText && !overrideText.includes('Base')) {
    return (
      <div className="mt-1 px-3 py-1 md:px-4 md:py-1.5 bg-white/5 border border-white/10 rounded-lg text-[0.55rem] md:text-xs font-mono tracking-wide text-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.1)]">
        {overrideText}
      </div>
    );
  }

  const base = card.power;
  const buffs = card.powerMarkers || 0;
  const weakness = card.weaknessMarkers || 0;
  const total = base + buffs - weakness;

  return (
    <div className="mt-1 px-2.5 py-1.5 md:px-3 md:py-2 bg-black/60 border border-white/10 rounded-xl text-[0.55rem] md:text-xs font-mono tracking-wide text-gray-300 shadow-md flex flex-col items-center gap-0.5 max-w-[155px] md:max-w-[220px]">
      <div className="flex items-center gap-0.5 flex-wrap justify-center text-gray-400 text-[0.52rem] leading-none">
        <span>{base}</span>
        <span className="text-gray-500 text-[0.45rem] mr-1">Base</span>
        {buffs > 0 && (
          <>
            <span className="text-[#00f2ff] font-bold">+</span>
            <span className="text-[#00f2ff] font-bold">{buffs}</span>
            <span className="text-[#00f2ff]/70 text-[0.45rem] mr-1">Buff</span>
          </>
        )}
        {weakness > 0 && (
          <>
            <span className="text-[#ff0044] font-bold">-</span>
            <span className="text-[#ff0044] font-bold">{weakness}</span>
            <span className="text-[#ff0044]/70 text-[0.45rem] mr-1">Weak</span>
          </>
        )}
      </div>
      <div className="w-full h-[1px] bg-white/10 my-0.5" />
      <div className="text-[0.6rem] md:text-sm font-bold text-white leading-none">
        Total: <span className="text-[#00f2ff] font-extrabold text-[0.65rem] md:text-base">{total}</span> Power
      </div>
    </div>
  );
}

function CardResolutionChecklist({ step, isLeft, card }: { step: string; isLeft: boolean; card: any }) {
  if (!card) return null;

  const items = [
    { id: 'haste', label: 'Haste Strike Check', activeStep: 'haste', prevSteps: ['flip', 'ability', 'combat', 'done'] },
    { id: 'flip', label: 'Reveal & Flip Ability', activeStep: 'flip', prevSteps: ['ability', 'combat', 'done'] },
    { id: 'ability', label: 'Activation Ability', activeStep: 'ability', prevSteps: ['combat', 'done'] },
    { id: 'combat', label: 'Combat Resolution', activeStep: 'combat', prevSteps: ['done'] },
    { id: 'done', label: 'Post-Combat / Ascension', activeStep: 'done', prevSteps: [] }
  ];

  const getStepDetail = (card: any, itemId: string): string | null => {
    const name = card.name;
    const ability = card.ability || '';
    const abilityLower = ability.toLowerCase();
    
    if (name === 'Face Down Card') return null;

    switch (itemId) {
      case 'haste':
        if (abilityLower.includes('haste') || card.hasHaste || name === 'Fenris Lightfoot' || name === 'Zelus' || name === 'Lucian Blackwood' || name === 'Samyaza') {
          if (name === 'Fenris Lightfoot') {
            return '⚡ Fenris: Strikes immediately. Battles targets are destroyed at round end.';
          }
          return '⚡ Haste: Strikes immediately in Step 0 before Flip phase.';
        }
        return null;
      case 'flip':
        if (abilityLower.includes('flip:')) {
          const flipIdx = abilityLower.indexOf('flip:');
          const text = flipIdx !== -1 ? ability.slice(flipIdx + 5).trim() : ability;
          return `✦ Flip: ${text}`;
        }
        if (card.hasNullify || name === 'Fallen One') {
          return `✦ Flip: Nullifies opponent's Flip ability.`;
        }
        return null;
      case 'ability':
        if (abilityLower.includes('activate:')) {
          const actIdx = abilityLower.indexOf('activate:');
          const text = actIdx !== -1 ? ability.slice(actIdx + 9).trim() : ability;
          return `✸ Activate: ${text}`;
        }
        return null;
      case 'combat':
        if (name === 'Sulvian Vane') {
          return '⇄ Sulvian: Battled target is placed on top of owner\'s deck.';
        }
        if (name === 'Valerius Nightshade') {
          return '⚡ Valerius: Steals 1 Power from opponent before damage calculation.';
        }
        if (name === 'Noble The Great') {
          return '⚔ Noble: After winning battle, destroy another card or marker.';
        }
        if (card.cannotBattleOrBeBattled) {
          return 'Cannot battle or be battled.';
        }
        return null;
      case 'done':
        if (name === 'Coal') {
          return 'Graveyard: Discard from Limbo to block opponent ascension.';
        }
        if (name === 'Karlyah') {
          return 'Graveyard: Discard from Limbo to give killer +3 Weakness.';
        }
        if (name === 'Tarkidos') {
          return 'Graveyard: Discard from Limbo to Purify a Seal.';
        }
        if (name === 'Lucian Blackwood') {
          return 'Gains +2 Power Markers on victory.';
        }
        if (name === 'Umbarax') {
          return 'Gains +2 Power Markers per Graveborn on victory.';
        }
        if (card.isChampion || abilityLower.includes('champion.')) {
          return '👑 Champion: Eligible to ascend and claim the Seal.';
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-1 p-1.5 md:p-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl backdrop-blur-sm w-full md:w-52 h-[105px] md:h-auto font-mono text-[0.45rem] md:text-xs uppercase tracking-wider text-left select-none shrink-0">
      <div className="text-[0.48rem] md:text-xs font-bold text-gray-400 border-b border-white/5 pb-0.5 mb-0.5 shrink-0">
        {isLeft ? 'Player Rules' : 'Rival Rules'}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-none">
        {items.map((item) => {
          let status: 'pending' | 'active' | 'done' | 'na' = 'pending';
          if (step === item.activeStep) {
            status = 'active';
          } else if (item.prevSteps.includes(step)) {
            status = 'done';
          }

          const hasHaste = card.ability?.toLowerCase().includes('haste') || card.hasHaste;
          const hasFlip = card.ability?.toLowerCase().includes('flip') || card.hasNullify || card.hasLustSealEffect;
          const hasActivate = card.ability?.toLowerCase().includes('activate') || card.hasActivate;
          const cannotBattle = card.cannotBattleOrBeBattled;

          if (item.id === 'haste' && !hasHaste && status !== 'done') status = 'na';
          if (item.id === 'flip' && !hasFlip && status !== 'done') status = 'na';
          if (item.id === 'ability' && !hasActivate && status !== 'done') status = 'na';
          if (item.id === 'combat' && cannotBattle && status !== 'done') status = 'na';

          let icon = '○';
          let textClass = 'text-gray-600';
          if (status === 'active') {
            icon = '●';
            textClass = isLeft ? 'text-[#00f2ff] font-bold shadow-pulse' : 'text-[#ff0044] font-bold shadow-pulse';
          } else if (status === 'done') {
            icon = '✓';
            textClass = 'text-green-500';
          } else if (status === 'na') {
            icon = '—';
            textClass = 'line-through text-gray-700';
          }

          const detail = getStepDetail(card, item.id);
          const isCurrentActive = status === 'active';

          return (
            <div key={item.id} className="flex flex-col gap-0.5 shrink-0">
              <div className={`flex items-center gap-1 leading-none ${textClass}`}>
                <span className="text-[0.5rem] md:text-xs font-bold w-2 md:w-3">{icon}</span>
                <span>{item.label}</span>
              </div>
              {detail && isCurrentActive && (
                <div className={`pl-2.5 md:pl-4 text-[0.43rem] md:text-[0.6rem] leading-tight font-sans normal-case ${isLeft ? 'text-[#00f2ff]/80' : 'text-[#ff0044]/80'}`}>
                  {detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardPreview({ card, size = 'large' }: { card: HoveredCardInfo, size?: 'small' | 'large' }) {
  const faceSrc = card.faceArtPath ? cardArtUrl(card.faceArtPath) : undefined;

  const width = size === 'large' ? 'w-56 md:w-72' : 'w-44 md:w-56';
  const height = size === 'large' ? 'h-84 md:h-[27rem]' : 'h-66 md:h-84';

  return (
    <div className={`${width} ${height} rounded-2xl overflow-hidden border-2 border-white/30 bg-black shadow-[0_0_25px_rgba(0,0,0,0.8),0_0_15px_rgba(0,242,255,0.15)] relative flex flex-col`}>
      {/* Full Card Art background */}
      <div className="absolute inset-0 z-0 bg-[#0d0d11]">
        {faceSrc ? (
          <img src={faceSrc} alt={card.name} className="w-full h-full object-cover object-center" />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 p-4 text-center">{card.name}</div>
        )}
      </div>
    </div>
  );
}

function ZoneSearchModal({
  zone,
  playerCards,
  enemyCards,
  isSelectingTarget,
  onClose,
  onSelectLimboCard
}: {
  key?: string;
  zone: 'limbo' | 'graveyard' | 'deck';
  playerCards: HoveredCardInfo[];
  enemyCards: HoveredCardInfo[];
  isSelectingTarget: boolean;
  onClose: () => void;
  onSelectLimboCard: (zone: 'player' | 'enemy', index: number) => void;
}) {
  const [filter, setFilter] = useState('');
  const zoneLabel = zone === 'limbo' ? 'Limbo' : zone === 'graveyard' ? 'Graveyard' : 'Deck';

  const filterCards = (cards: HoveredCardInfo[]) =>
    cards
      .map((card, index) => ({ card, index }))
      .filter(
        ({ card: c }) =>
          !filter.trim() ||
          c.name.toLowerCase().includes(filter.toLowerCase()) ||
          c.type.toLowerCase().includes(filter.toLowerCase()) ||
          c.faction.toLowerCase().includes(filter.toLowerCase())
      );

  const playerFiltered = filterCards(playerCards);
  const enemyFiltered = filterCards(enemyCards);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel border border-[#00f2ff]/30 bg-black/90 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-sm tracking-widest uppercase text-[#00f2ff] font-bold">Search {zoneLabel}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-3 border-b border-white/5 bg-white/5">
          <input
            type="text"
            placeholder="Search cards..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder-gray-600 focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           <section>
             <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest mb-3">Ally {zoneLabel}</div>
             <div className="grid grid-cols-1 gap-2">
                {playerFiltered.map(({card, index}) => (
                  <div key={index}
                    onClick={() => isSelectingTarget && onSelectLimboCard('player', index)}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:border-[#00f2ff]/50 transition-all cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="text-[0.7rem] font-bold text-white">{card.name}</div>
                      <div className="text-[0.55rem] text-gray-500">{card.faction} · {card.type}</div>
                    </div>
                    <div className="text-xs font-bold text-[#00f2ff]">P{card.power}</div>
                  </div>
                ))}
             </div>
           </section>
            {zone !== 'deck' && (
              <section>
                <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest mb-3">Rival {zoneLabel}</div>
                <div className="grid grid-cols-1 gap-2">
                   {enemyFiltered.map(({card, index}) => (
                     <div key={index}
                       onClick={() => isSelectingTarget && onSelectLimboCard('enemy', index)}
                       className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:border-[#ff0044]/50 transition-all cursor-pointer"
                     >
                       <div className="flex-1">
                         <div className="text-[0.7rem] font-bold text-white">{card.name}</div>
                         <div className="text-[0.55rem] text-gray-500">{card.faction} · {card.type}</div>
                       </div>
                       <div className="text-xs font-bold text-[#ff0044]">P{card.power}</div>
                     </div>
                   ))}
                </div>
              </section>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AlignmentCard({ title, description, icon, color, onClick }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, borderColor: color }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-white/10 bg-white/5 w-64 cursor-pointer transition-all"
    >
      <div className="text-6xl mb-4" style={{ color }}>{icon}</div>
      <h2 className="text-2xl font-bold tracking-widest mb-2" style={{ color }}>{title}</h2>
      <p className="text-[0.65rem] text-gray-500 italic leading-relaxed">{description}</p>
    </motion.div>
  );
}
