/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QueuedAbility } from '../types';
import { cardArtUrl, CARD_BACK_PATH } from '../cardArtPaths';

interface AbilitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  abilities: QueuedAbility[];
  onUseAbility: (abilityId: string) => void;
}

export const AbilitiesDrawer: React.FC<AbilitiesDrawerProps> = ({
  isOpen,
  onClose,
  abilities,
  onUseAbility,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="abilities-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px]"
          />

          {/* Right Drawer */}
          <motion.div
            key="abilities-drawer-content"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[105] w-[min(320px,82vw)] md:w-[380px] bg-[#0a0a0c]/95 border-l border-white/10 shadow-2xl flex flex-col pt-[env(safe-area-inset-top,10px)] pb-[env(safe-area-inset-bottom,10px)] font-cinzel select-none"
          >
            <div className="px-3 py-2 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#00f2ff] text-lg">⚡</span>
                  <h2 className="text-[#00f2ff] text-[0.75rem] tracking-[0.2em] font-bold">
                    ABILITY STORAGE
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white p-1 text-base transition-colors"
                  aria-label="Close Abilities Storage"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="mb-3 glass-panel p-2 border border-[#00f2ff]/30 bg-[#00f2ff]/5 rounded-xl text-center space-y-1">
                <div className="text-[0.5rem] text-[#00f2ff] font-extrabold uppercase tracking-widest animate-pulse">
                  Game Paused for Ability Response
                </div>
                <div className="text-[0.55rem] text-gray-300 font-sans leading-tight">
                  Browse and cast queued abilities. Unpauses when drawer closes.
                </div>
              </div>

              {/* Abilities List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {abilities.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 glass-panel border border-white/10 rounded-xl">
                    <span className="text-2xl text-gray-600 mb-2">🛡️</span>
                    <div className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider">
                      No Stored Abilities Available
                    </div>
                    <div className="text-[0.55rem] text-gray-500 font-sans mt-1">
                      Pass on Activate or Limbo abilities during battle to store them here for later use.
                    </div>
                  </div>
                ) : (
                  abilities.map((item) => (
                    <div
                      key={item.id}
                      className="glass-panel p-2.5 border border-white/15 hover:border-[#00f2ff]/50 rounded-xl bg-black/40 flex gap-2.5 items-center transition-all shadow-md group"
                    >
                      {/* Card Art Thumbnail */}
                      <div className="w-12 h-16 rounded-md border border-white/20 overflow-hidden shrink-0 relative bg-black/60 shadow-inner">
                        <img
                          src={cardArtUrl(item.faceArtPath || CARD_BACK_PATH)}
                          alt={item.cardName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info & Action */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[0.65rem] font-bold text-white truncate">
                              {item.cardName}
                            </span>
                            <span
                              className={`text-[0.45rem] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider shrink-0 ${
                                item.requiredLocation === 'board'
                                  ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              }`}
                            >
                              {item.requiredLocation === 'board' ? 'On Board' : 'In Limbo'}
                            </span>
                          </div>
                          <div className="text-[0.52rem] text-gray-300 font-sans leading-snug line-clamp-2">
                            {item.description}
                          </div>
                        </div>

                        <button
                          onClick={() => onUseAbility(item.id)}
                          className="mt-2 w-full py-1 border border-[#00f2ff]/60 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/25 text-[#00f2ff] text-[0.55rem] font-bold uppercase tracking-widest rounded transition-all active:scale-95 shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                        >
                          Use Ability
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
