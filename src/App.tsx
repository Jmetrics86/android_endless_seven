/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameController } from './game/GameController';
import { GAME_VERSION } from './constants';
import { Alignment, Phase, GameState, HoveredCardInfo } from './types';
import { cardArtUrl } from './cardArtPaths';
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

  useEffect(() => {
    if (displayLogs.length && logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [displayLogs.length, isDrawerOpen]);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      const game = new GameController(containerRef.current);
      game.onStateChange = (state) => setGameState({ ...state });
      gameRef.current = game;
    }

    return () => {
      gameRef.current?.dispose();
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

      {/* Drawer Toggle Button */}
      {gameState && !showSelection && gameState.currentPhase !== Phase.GAME_OVER && (
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-[110] min-h-12 min-w-12 rounded-full glass-panel border border-white/20 flex items-center justify-center transition-all hover:border-[#00f2ff]/60 active:scale-90"
          aria-label="Toggle Menu"
        >
          <span className="text-2xl text-[#00f2ff]">{isDrawerOpen ? '✕' : '☰'}</span>
        </button>
      )}

      {/* Top Center Prompt / Instructions */}
      {gameState && !showSelection && gameState.currentPhase !== Phase.GAME_OVER && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full max-w-md px-4 text-center">
          <div className="glass-panel px-4 py-2 rounded-lg border border-[#00f2ff]/20 bg-black/60 backdrop-blur-md shadow-[0_0_20px_rgba(0,242,255,0.15)]">
            <p className="text-sm text-[#00f2ff] font-semibold tracking-wide drop-shadow-md">
              {gameState.instructionText}
            </p>
          </div>
        </div>
      )}

      {/* Counter Overlay */}
      <AnimatePresence>
        {gameState?.currentPhase === Phase.COUNTER_ALLOCATION && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-panel pointer-events-auto fixed top-1/2 left-1/2 z-50 w-64 -translate-x-1/2 -translate-y-1/2 space-y-3 rounded-xl border border-[#00f2ff]/40 bg-black/80 p-5 text-center shadow-2xl"
          >
            <div className="text-[0.7rem] tracking-[0.2em] uppercase text-gray-400">Allocate Counters</div>
            <div className="flex justify-around items-center py-2">
              <div className="flex flex-col">
                <span className="text-[0.6rem] text-gray-500 uppercase">Power</span>
                <span className="text-2xl text-[#00f2ff] font-bold">{gameState.powerPool}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.6rem] text-gray-500 uppercase">Weakness</span>
                <span className="text-2xl text-[#ff0044] font-bold">{gameState.weaknessPool}</span>
              </div>
            </div>
            <button
              onClick={handleFinishCounters}
              className="w-full py-2 rounded border border-[#00f2ff]/30 bg-[#00f2ff]/10 text-[0.7rem] font-bold uppercase tracking-widest hover:bg-[#00f2ff]/20 transition-all"
            >
              Confirm
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flyout Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[105] w-[min(320px,85vw)] bg-[#0a0a0c] border-l border-white/10 shadow-2xl flex flex-col pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]"
            >
              <div className="p-5 flex flex-col h-full overflow-hidden">
                <h2 className="text-[#00f2ff] text-lg tracking-[0.2em] mb-6 border-b border-white/10 pb-2">COMMAND CENTER</h2>

                {/* Scores & Phase */}
                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-panel p-3 border-l-4 border-[#ff0044]">
                      <div className="text-[0.55rem] text-gray-500 uppercase">Enemy</div>
                      <div className="text-xl font-bold">{gameState?.enemyScore} / 7</div>
                    </div>
                    <div className="glass-panel p-3 border-l-4 border-[#00f2ff]">
                      <div className="text-[0.55rem] text-gray-500 uppercase">You</div>
                      <div className="text-xl font-bold">{gameState?.playerScore} / 7</div>
                    </div>
                  </div>
                  <div className="text-center p-3 glass-panel">
                    <div className="text-xs text-gray-400 uppercase tracking-widest">Round {gameState?.currentRound}</div>
                    <div className="text-sm font-bold text-white uppercase mt-1">{gameState?.currentPhase.replace('_', ' ')}</div>
                    <div className="text-[0.6rem] text-[#00f2ff] mt-0.5">{gameState?.phaseStep}</div>
                  </div>
                </div>

                {/* Search Buttons */}
                <div className="grid grid-cols-1 gap-2 mb-8">
                   <button onClick={() => setZoneSearchModal('limbo')} className="drawer-btn">Search Limbo</button>
                   <button onClick={() => setZoneSearchModal('graveyard')} className="drawer-btn">Search Graveyard</button>
                   <button onClick={() => setZoneSearchModal('deck')} className="drawer-btn">Browse Deck</button>
                </div>

                {/* Prep Actions */}
                {gameState?.currentPhase === Phase.PREP && (
                  <div className="grid grid-cols-2 gap-2 mb-8">
                    <button
                      onClick={handlePrepBack}
                      disabled={!gameRef.current?.canUndoPrep()}
                      className="drawer-btn-secondary disabled:opacity-30"
                    >
                      Undo
                    </button>
                    <button onClick={handleEndPrep} className="drawer-btn-primary">
                      End Prep
                    </button>
                  </div>
                )}

                {/* Log */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest mb-2 px-1">Recent Intel</div>
                  <div ref={logScrollRef} className="flex-1 overflow-y-auto space-y-2 p-2 bg-black/30 rounded border border-white/5 font-mono text-[0.65rem] scrollbar-thin">
                    {displayLogs.map((log, i) => (
                      <div key={i} className="text-gray-400 border-l border-white/10 pl-2 leading-relaxed">
                        <span className="text-[#00f2ff] mr-1">»</span>{log}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleForceSkip} className="mt-4 w-full py-2 border border-[#ff0044]/30 text-[#ff0044] text-[0.6rem] uppercase tracking-tighter hover:bg-[#ff0044]/10 transition-all">
                    Skip Current Animation
                  </button>
                </div>

                {/* Theme Toggle in Drawer Footer */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                   <button onClick={toggleEnvironmentTheme} className="text-[0.65rem] text-gray-500 uppercase hover:text-white transition-colors">
                     {environmentTheme === 'dark' ? '☀ Light Mode' : '☽ Dark Mode'}
                   </button>
                   <span className="text-[0.5rem] text-gray-700">v{GAME_VERSION}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Selection Overlay */}
      <AnimatePresence>
        {showSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4 text-white"
          >
            <h1 className="mb-2 text-4xl tracking-[0.3em] font-bold">ENDLESS SEVEN</h1>
            <p className="mb-10 text-xs italic text-gray-500">&quot;Choose your side. Seal the heartbeat of the world.&quot;</p>
            
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

      {/* Dragging Preview */}
      <AnimatePresence>
        {gameState?.draggingCard && gameState.dragPosition && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1.1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 20 }}
            className="fixed pointer-events-none z-[200]"
            style={{
              left: gameState.dragPosition.x,
              top: gameState.dragPosition.y,
              transform: 'translate(-50%, -115%)'
            }}
          >
            <div className="relative">
              {/* Added a subtle glow behind the dragging card */}
              <div className="absolute inset-0 bg-[#00f2ff]/20 blur-2xl rounded-full" />
              <CardPreview card={gameState.draggingCard} size="large" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Preview (Small side version when not dragging) */}
      <AnimatePresence>
        {gameState?.hoveredCard && !gameState.draggingCard && !isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-4 bottom-24 z-[90] pointer-events-none"
          >
            <CardPreview card={gameState.hoveredCard} size="small" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Dialogs */}
      <AnimatePresence>
        {gameState?.decisionContext && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[min(300px,90vw)] glass-panel p-5 border border-[#00f2ff]/30 text-center space-y-4"
          >
            <div className="text-[0.6rem] text-[#00f2ff] uppercase tracking-widest font-bold">
              {gameState.decisionContext.replace('_', ' ')}
            </div>
            <div className="text-xs text-white leading-relaxed">
              {gameState.decisionMessage ?? gameState.instructionText}
            </div>

            {/* Context Specific Buttons */}
            {gameState.decisionContext === 'ALMIGHTY_MARKER_TYPE' || gameState.decisionContext === 'DESTROYER_MARKER_TYPE' ? (
              <div className="flex gap-2">
                 <button onClick={() => handleMarkerTypeChoice('power')} className="decision-btn border-[#00f2ff] text-[#00f2ff]">Power</button>
                 <button onClick={() => handleMarkerTypeChoice('weakness')} className="decision-btn border-[#ff0044] text-[#ff4466]">Weakness</button>
              </div>
            ) : gameState.decisionContext === 'LUST_SEAL_INFLUENCE' ? (
              <div className="flex gap-2">
                 <button onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.LIGHT)} className="decision-btn border-amber-400 text-amber-300">Light</button>
                 <button onClick={() => (gameRef.current as any)?.alignmentChoiceCallback?.(Alignment.DARK)} className="decision-btn border-purple-400 text-purple-300">Dark</button>
              </div>
            ) : (
              <div className="flex gap-2">
                 <button onClick={() => handleDecision(true)} className="decision-btn border-[#00f2ff] text-[#00f2ff]">Yes</button>
                 <button onClick={() => handleDecision(false)} className="decision-btn border-white/20 text-gray-400">Skip</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {gameState?.currentPhase === Phase.GAME_OVER && (
          <motion.div
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

      <style>{`
        .drawer-btn {
          width: 100%;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ccc;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          transition: all 0.2s;
        }
        .drawer-btn:hover {
          border-color: #00f2ff;
          color: #00f2ff;
          background: rgba(0,242,255,0.05);
        }
        .drawer-btn-primary {
          width: 100%;
          padding: 12px;
          background: rgba(0,242,255,0.1);
          border: 1px solid rgba(0,242,255,0.4);
          color: #00f2ff;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
        }
        .drawer-btn-secondary {
          width: 100%;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: #888;
          text-transform: uppercase;
          font-size: 0.7rem;
        }
        .decision-btn {
          flex: 1;
          padding: 10px;
          border: 1px solid;
          background: rgba(255,255,255,0.05);
          text-transform: uppercase;
          font-size: 0.65rem;
          font-weight: bold;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}

function CardPreview({ card, size = 'small' }: { card: HoveredCardInfo, size?: 'small' | 'large' }) {
  const effectivePower = card.power + card.powerMarkers - card.weaknessMarkers;
  const faceSrc = card.faceArtPath ? cardArtUrl(card.faceArtPath) : undefined;

  const width = size === 'large' ? 'w-48' : 'w-36';
  const height = size === 'large' ? 'h-72' : 'h-54';

  return (
    <div className={`${width} ${height} rounded-xl overflow-hidden border-2 border-white/20 bg-black/95 shadow-2xl flex flex-col`}>
      <div className="flex-1 relative bg-black/60 overflow-hidden">
        {faceSrc ? (
          <img src={faceSrc} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-600 p-4 text-center">{card.name}</div>
        )}
      </div>
      <div className="p-2 bg-black/80 border-t border-white/10">
        <div className="text-[0.65rem] font-bold text-white uppercase truncate mb-0.5">{card.name}</div>
        <div className="flex justify-between items-center text-[0.6rem] mb-1">
          <span className="text-[#00f2ff] font-bold">PWR {effectivePower}</span>
          <span className="text-gray-500 uppercase">{card.faction}</span>
        </div>
        <div className="text-[0.5rem] text-gray-400 leading-tight line-clamp-3 italic">
          {card.ability}
        </div>
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
