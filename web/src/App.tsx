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
  const [activeView, setActiveView] = useState<'combat' | 'starting' | 'hand' | 'board'>('starting');

  useEffect(() => {
    if (gameState?.combatInterstitial) {
      setActiveView('combat');
    } else {
      setActiveView('starting');
    }
  }, [!!gameState?.combatInterstitial]);

  useEffect(() => {
    if (gameState?.combatInterstitial) {
      if (activeView === 'combat') {
        gameRef.current?.setResolutionPaused(false);
      } else {
        gameRef.current?.setResolutionPaused(true);
      }
    } else {
      gameRef.current?.setResolutionPaused(false);
    }
    gameRef.current?.setCameraView(activeView);
  }, [activeView, !!gameState?.combatInterstitial]);

  const LOG_RECENT_COUNT = 30;
  const displayLogs =
    gameState?.currentPhase === Phase.GAME_OVER
      ? gameState.logs
      : (gameState?.logs ?? []).slice(-LOG_RECENT_COUNT);

  const isActionRequired = !!(
    gameState?.currentPhase === Phase.PREP ||
    gameState?.currentPhase === Phase.COUNTER_ALLOCATION ||
    gameState?.currentPhase === Phase.ABILITY_TARGETING ||
    gameState?.currentPhase === Phase.SEAL_TARGETING ||
    gameState?.currentPhase === Phase.DELTA_BUFF_TARGETING ||
    gameState?.decisionContext
  );

  const is3DTargetingActive = !!(
    gameState?.currentPhase === Phase.PREP ||
    gameState?.currentPhase === Phase.COUNTER_ALLOCATION ||
    gameState?.currentPhase === Phase.SEAL_TARGETING ||
    gameState?.currentPhase === Phase.DELTA_BUFF_TARGETING ||
    (gameState?.currentPhase === Phase.ABILITY_TARGETING && !gameState?.decisionContext)
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

  const handleDecision = (choice: 'yes' | 'skip' | 'hold' | boolean) => {
    if (gameRef.current) {
      (gameRef.current as any).nullifyCallback?.(choice);
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
                    ) : gameState.decisionContext === 'DEATH_CREATURE_TYPE' ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {gameState.creatureTypeOptions?.map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              if (gameRef.current) {
                                (gameRef.current as any).creatureTypeCallback?.(opt);
                                (gameRef.current as any).creatureTypeCallback = null;
                              }
                            }}
                            className="drawer-btn border-purple-500 text-purple-300 py-1 px-1.5 text-[0.5rem]"
                          >
                            {opt}
                          </button>
                        ))}
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
        {gameState?.combatInterstitial && !is3DTargetingActive && activeView === 'combat' && (
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
            <div className="relative my-2 w-full max-w-5xl px-2 flex flex-col items-center justify-center">
              <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-4 md:gap-10 w-full">
                
                {/* Left Column (Player Side) */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <CombatResolutionCard
                    card={gameState.combatInterstitial.leftCard}
                    isLeft={true}
                    step={gameState.combatInterstitial.step}
                    hasteActive={gameState.combatInterstitial.hasteActive === 'left' || gameState.combatInterstitial.hasteActive === 'both'}
                    glowActive={!!gameState.combatInterstitial.leftGlow}
                    damageFlash={!!gameState.combatInterstitial.leftDamageFlash}
                    powerText={gameState.combatInterstitial.leftPowerText}
                  />
                </div>

                {/* Center VS Column (Fixed Width & Height) */}
                <div className="flex flex-col items-center justify-center shrink-0 self-center">
                  <span className="text-xs sm:text-base md:text-2xl font-bold italic text-gray-500 tracking-wider font-cinzel select-none">
                    VS
                  </span>
                </div>

                {/* Right Column (Rival Side) */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <CombatResolutionCard
                    card={gameState.combatInterstitial.rightCard}
                    isLeft={false}
                    step={gameState.combatInterstitial.step}
                    hasteActive={gameState.combatInterstitial.hasteActive === 'right' || gameState.combatInterstitial.hasteActive === 'both'}
                    glowActive={!!gameState.combatInterstitial.rightGlow}
                    damageFlash={!!gameState.combatInterstitial.rightDamageFlash}
                    powerText={gameState.combatInterstitial.rightPowerText}
                  />
                </div>
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

      {/* Global Decision Prompt Overlay */}
      <AnimatePresence>
        {gameState?.decisionContext && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-[200] p-4 text-center"
          >
            <div className="bg-black/90 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full flex flex-col items-center justify-center space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-fade-in">
              <div className="text-[0.6rem] sm:text-[0.8rem] text-amber-400 font-bold uppercase tracking-[0.2em] font-mono leading-none">
                ⚠️ Action Required: {gameState.decisionContext.replace(/_/g, ' ')}
              </div>
              <div className="text-[0.7rem] sm:text-sm text-gray-200 font-sans leading-relaxed px-2">
                {gameState.decisionMessage ?? gameState.instructionText}
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center pt-2 w-full max-w-xs">
                {gameState.decisionContext === 'ALMIGHTY_MARKER_TYPE' || gameState.decisionContext === 'DESTROYER_MARKER_TYPE' ? (
                  <>
                    <button
                      onClick={() => handleMarkerTypeChoice('power')}
                      className="px-4 py-2 rounded-lg bg-[#00f2ff]/20 border border-[#00f2ff]/50 hover:bg-[#00f2ff]/40 text-[#00f2ff] text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Power
                    </button>
                    <button
                      onClick={() => handleMarkerTypeChoice('weakness')}
                      className="px-4 py-2 rounded-lg bg-[#ff0044]/20 border border-[#ff0044]/50 hover:bg-[#ff0044]/40 text-[#ff4466] text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Weakness
                    </button>
                  </>
                ) : gameState.decisionContext === 'LUST_SEAL_INFLUENCE' ? (
                  <>
                    <button
                      onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.LIGHT)}
                      className="px-4 py-2 rounded-lg bg-amber-400/20 border border-amber-400/50 hover:bg-amber-400/40 text-amber-300 text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Light
                    </button>
                    <button
                      onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.DARK)}
                      className="px-4 py-2 rounded-lg bg-purple-400/20 border border-purple-400/50 hover:bg-purple-400/40 text-purple-300 text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Dark
                    </button>
                  </>
                ) : gameState.decisionContext === 'DEATH_CREATURE_TYPE' ? (
                  <div className="flex flex-wrap gap-1.5 justify-center max-h-[120px] overflow-y-auto px-1 py-0.5">
                    {gameState.creatureTypeOptions?.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          if (gameRef.current) {
                            (gameRef.current as any).creatureTypeCallback?.(opt);
                            (gameRef.current as any).creatureTypeCallback = null;
                          }
                        }}
                        className="px-3 py-1 rounded bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/40 text-purple-300 text-[0.6rem] font-bold transition-all cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : gameState.decisionContext === 'LUNA_NULLIFY' || gameState.decisionContext === 'FALLEN_ONE' || gameState.decisionContext === 'COAL_BLOCK_ASCENSION' ? (
                  <>
                    <button
                      onClick={() => handleDecision('yes')}
                      className="px-5 py-2 rounded-lg bg-[#00f2ff]/20 border border-[#00f2ff]/50 hover:bg-[#00f2ff]/40 text-[#00f2ff] text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleDecision('skip')}
                      className="px-5 py-2 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 text-gray-300 text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => handleDecision('hold')}
                      className="px-5 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/40 text-amber-300 text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Hold
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDecision(true)}
                      className="px-5 py-2 rounded-lg bg-[#00f2ff]/20 border border-[#00f2ff]/50 hover:bg-[#00f2ff]/40 text-[#00f2ff] text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      className="px-5 py-2 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 text-gray-300 text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera & Resolution Control Interface in Bottom Right */}
      <div className="fixed bottom-4 right-4 z-[160] flex flex-col items-end gap-2.5">
        {/* Resume Button: Shown when combat is active but user is in board/hand view (so resolution is paused) */}
        {gameState?.combatInterstitial && activeView !== 'combat' && (
          <button
            onClick={() => setActiveView('combat')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400/50 text-white font-mono text-[0.6rem] sm:text-xs uppercase tracking-widest font-black shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:from-amber-600 hover:to-orange-700 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer select-none animate-bounce"
          >
            <span className="animate-pulse">▶</span> Resume Action
          </button>
        )}

        {/* Global camera view switching button */}
        <button
          onClick={() => {
            let nextView: 'combat' | 'starting' | 'hand' | 'board';
            if (gameState?.combatInterstitial) {
              if (activeView === 'combat') nextView = 'starting';
              else if (activeView === 'starting') nextView = 'hand';
              else if (activeView === 'hand') nextView = 'board';
              else nextView = 'combat';
            } else {
              if (activeView === 'starting') nextView = 'hand';
              else if (activeView === 'hand') nextView = 'board';
              else nextView = 'starting';
            }
            setActiveView(nextView);
          }}
          className="px-3.5 py-2.5 rounded-xl bg-black/90 border border-[#00f2ff]/40 text-white font-mono text-[0.55rem] sm:text-xs uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(0,242,255,0.25)] hover:border-[#00f2ff] hover:bg-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer select-none"
        >
          <span className="text-[#00f2ff] font-sans">📷</span>
          {activeView === 'combat' ? (
            <>View: Combat</>
          ) : activeView === 'starting' ? (
            <>View: Start</>
          ) : activeView === 'hand' ? (
            <>View: Hand</>
          ) : (
            <>View: Board</>
          )}
        </button>
      </div>

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

function CombatResolutionCard({
  card,
  isLeft,
  step,
  hasteActive,
  glowActive,
  damageFlash,
  powerText
}: {
  card: any;
  isLeft: boolean;
  step: string;
  hasteActive: boolean;
  glowActive: boolean;
  damageFlash: boolean;
  powerText?: string;
}) {
  if (!card) {
    return (
      <div className="w-28 h-42 sm:w-36 sm:h-54 md:w-64 md:h-[24rem] rounded-lg sm:rounded-2xl border border-dashed border-white/10 md:border-2 flex items-center justify-center text-[0.45rem] sm:text-xs md:text-sm text-gray-600 bg-white/5 uppercase tracking-widest shrink-0 select-none">
        No Card
      </div>
    );
  }

  // Calculate stats
  const base = card.power;
  const buffs = card.powerMarkers || 0;
  const weakness = card.weaknessMarkers || 0;
  const total = base + buffs - weakness;
  const isFaceDown = card.name === 'Face Down Card';

  // Rule checklist items logic
  const items = [
    { id: 'haste', label: 'Haste Strike', activeStep: 'haste', prevSteps: ['flip', 'ability', 'combat', 'done'] },
    { id: 'flip', label: 'Reveal & Flip', activeStep: 'flip', prevSteps: ['ability', 'combat', 'done'] },
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
            return '⚡ Fenris: Strikes immediately. Targets are destroyed at round end.';
          }
          return '⚡ Haste: Strikes immediately before Flip phase.';
        }
        return null;
      case 'flip':
        if (abilityLower.includes('flip:')) {
          const flipIdx = abilityLower.indexOf('flip:');
          return flipIdx !== -1 ? `✦ Flip: ${ability.slice(flipIdx + 5).trim()}` : `✦ Flip: ${ability}`;
        }
        if (card.hasNullify || name === 'Fallen One') {
          return `✦ Flip: Nullifies opponent's Flip ability.`;
        }
        return null;
      case 'ability':
        if (abilityLower.includes('activate:')) {
          const actIdx = abilityLower.indexOf('activate:');
          return actIdx !== -1 ? `✸ Activate: ${ability.slice(actIdx + 9).trim()}` : `✸ Activate: ${ability}`;
        }
        return null;
      case 'combat':
        if (name === 'Sulvian Vane') {
          return '⇄ Sulvian: Battled target placed on top of owner\'s deck.';
        }
        if (name === 'Valerius Nightshade') {
          return '⚡ Valerius: Steals 1 Power from opponent before damage.';
        }
        if (name === 'Noble The Great') {
          return '⚔ Noble: After victory, destroy another card/marker.';
        }
        if (card.cannotBattleOrBeBattled) {
          return 'Cannot battle or be battled.';
        }
        return null;
      case 'done':
        if (name === 'Coal') {
          return 'Limbo: Discard to block opponent ascension.';
        }
        if (name === 'Karlyah') {
          return 'Limbo: Discard to give killer +3 Weakness.';
        }
        if (name === 'Tarkidos') {
          return 'Limbo: Discard to Purify a Seal.';
        }
        if (name === 'Lucian Blackwood') {
          return 'Gains +2 Power Markers on victory.';
        }
        if (name === 'Umbarax') {
          return 'Gains +2 Power Markers per Graveborn on victory.';
        }
        if (card.isChampion || abilityLower.includes('champion.')) {
          return '👑 Champion: Eligible to claim the Seal.';
        }
        return null;
      default:
        return null;
    }
  };

  const activeItem = items.find(item => item.activeStep === step);
  
  let isNa = false;
  let detail: string | null = null;
  let statusText = 'Pending';
  let statusColor = 'text-gray-400';

  if (activeItem) {
    const hasHaste = card.ability?.toLowerCase().includes('haste') || card.hasHaste;
    const hasFlip = card.ability?.toLowerCase().includes('flip') || card.hasNullify || card.hasLustSealEffect;
    const hasActivate = card.ability?.toLowerCase().includes('activate') || card.hasActivate;
    const cannotBattle = card.cannotBattleOrBeBattled;

    if (activeItem.id === 'haste' && !hasHaste) isNa = true;
    if (activeItem.id === 'flip' && !hasFlip) isNa = true;
    if (activeItem.id === 'ability' && !hasActivate) isNa = true;
    if (activeItem.id === 'combat' && cannotBattle) isNa = true;

    detail = getStepDetail(card, activeItem.id);

    if (isNa) {
      statusText = 'N/A';
      statusColor = 'text-gray-500 line-through';
    } else {
      statusText = 'Active';
      statusColor = isLeft ? 'text-[#00f2ff] font-extrabold drop-shadow-[0_0_4px_rgba(0,242,255,0.4)]' : 'text-[#ff0044] font-extrabold drop-shadow-[0_0_4px_rgba(255,0,68,0.4)]';
    }
  }

  const faceSrc = card.faceArtPath ? cardArtUrl(card.faceArtPath) : undefined;

  return (
    <div
      className={`w-28 h-42 sm:w-36 sm:h-54 md:w-64 md:h-[24rem] rounded-lg sm:rounded-2xl overflow-hidden border border-white/20 md:border-2 bg-[#0d0d11] relative flex flex-col transition-all duration-300 shadow-2xl shrink-0 select-none
        ${hasteActive ? 'haste-glow-active' : ''}
        ${glowActive ? 'flip-glow-active' : ''}
        ${damageFlash ? 'card-shake-active' : ''}
      `}
    >
      {/* Background Image / Art */}
      <div className="absolute inset-0 z-0 bg-[#0d0d11]">
        {faceSrc ? (
          <img
            src={faceSrc}
            alt={card.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[0.45rem] sm:text-xs text-gray-500 p-2 text-center uppercase tracking-widest">
            {isFaceDown ? 'Face Down' : card.name}
          </div>
        )}
      </div>

      {damageFlash && (
        <div className="absolute inset-0 z-10 damage-flash-active pointer-events-none rounded-lg sm:rounded-2xl" />
      )}

      {/* Power/Weakness Markers Badges (positioned near the top since top overlay banner is removed) */}
      <div className="absolute top-1 sm:top-2 md:top-3 left-1 md:left-2 z-20 flex flex-col gap-0.5 pointer-events-none">
        {buffs > 0 && (
          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#00f2ff] text-[#00f2ff] text-[0.38rem] sm:text-[0.5rem] md:text-[0.65rem] font-bold shadow-[0_0_8px_rgba(0,242,255,0.5)] font-mono animate-pulse leading-none">
            ⚡+{buffs}
          </div>
        )}
        {weakness > 0 && (
          <div className="flex items-center gap-0.5 bg-black/85 px-1 py-0.2 md:px-2 md:py-1 rounded border border-[#ff0044] text-[#ff0044] text-[0.38rem] sm:text-[0.5rem] md:text-[0.65rem] font-bold shadow-[0_0_8px_rgba(255,0,68,0.5)] font-mono animate-pulse leading-none">
            💀-{weakness}
          </div>
        )}
      </div>

      {/* MIDDLE OVERLAY BANNER (Fading active rule checklist item) */}
      <div className="absolute inset-x-0 top-[40%] translate-y-[-50%] z-30 pointer-events-none">
        <AnimatePresence mode="wait">
          {activeItem && (
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-black/80 backdrop-blur-[2px] border-y border-white/10 w-full py-1 sm:py-1.5 px-1 md:px-2 flex flex-col justify-center items-center gap-0.5 shadow-lg min-h-[45px] sm:min-h-[55px] md:min-h-[70px]"
            >
              <div className="flex items-center gap-1 leading-none text-center">
                <span className={`text-[0.45rem] sm:text-[0.52rem] md:text-[0.7rem] uppercase tracking-wider font-mono font-bold ${statusColor}`}>
                  {activeItem.label} ({statusText})
                </span>
              </div>
              {detail && !isNa && (
                <div className={`text-[0.38rem] sm:text-[0.45rem] md:text-[0.6rem] font-sans normal-case leading-tight text-center text-white/95 px-1 max-w-[95%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}>
                  {detail}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM OVERLAY BANNER (Power Formula & Total Power) */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-1 sm:p-1.5 md:p-2.5 flex flex-col items-center pointer-events-none border-t border-white/5">
        {isFaceDown ? (
          <div className="text-gray-400 text-[0.45rem] sm:text-[0.55rem] md:text-[0.7rem] font-mono uppercase tracking-wide">
            Power: ?
          </div>
        ) : powerText && !powerText.includes('Base') ? (
          // Custom override text (like resolved messages)
          <div className="text-[#00f2ff] text-[0.45rem] sm:text-[0.55rem] md:text-[0.7rem] font-mono tracking-wide animate-pulse">
            {powerText}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-0.5">
            {/* Total Power Badge */}
            <div className="text-white text-[0.55rem] sm:text-[0.65rem] md:text-sm font-black font-mono leading-none tracking-wider flex items-center gap-1">
              TOTAL: <span className={`${isLeft ? 'text-[#00f2ff]' : 'text-[#ff0044]'} text-[0.75rem] sm:text-[0.85rem] md:text-base font-black drop-shadow-[0_0_4px_rgba(0,242,255,0.3)]`}>{total}</span>
            </div>
            {/* Breakdown Formula */}
            <div className="text-gray-400 text-[0.35rem] sm:text-[0.42rem] md:text-[0.58rem] font-mono tracking-wider leading-none">
              {base} Base
              {buffs > 0 && <span className="text-[#00f2ff]"> +{buffs}B</span>}
              {weakness > 0 && <span className="text-[#ff0044]"> -{weakness}W</span>}
            </div>
          </div>
        )}
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
