/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { QueuedAbility } from '../types';
import { cardArtUrl, CARD_BACK_PATH } from '../cardArtPaths';

interface AbilitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  abilities: QueuedAbility[];
  onUseAbility?: (abilityId: string) => void;
  position?: 'top' | 'bottom';
  theme?: 'player' | 'enemy';
  title?: string;
}

export const AbilitiesDrawer: React.FC<AbilitiesDrawerProps> = ({
  isOpen,
  onClose,
  abilities,
  onUseAbility,
  position = 'bottom',
  theme = 'player',
  title = 'ABILITY STORAGE',
}) => {
  const isEnemy = theme === 'enemy';
  const colorHex = isEnemy ? '#ff0044' : '#00f2ff';
  
  return (
    <div className={`w-full h-full bg-transparent flex flex-col font-cinzel select-none`}>
      <div className="px-2 py-1 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className={`flex items-center justify-between mb-2 border-b ${isEnemy ? 'border-[#ff0044]/20' : 'border-white/10'} pb-1.5`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[${colorHex}] text-lg`}>⚡</span>
                  <h2 className={`text-[${colorHex}] text-[0.75rem] tracking-[0.2em] font-bold uppercase`}>
                    {title}
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
              <div className={`mb-2 glass-panel p-1.5 border bg-black/40 rounded-xl text-center space-y-0.5 ${isEnemy ? 'border-[#ff0044]/30' : 'border-[#00f2ff]/30'}`}>
                <div className={`text-[0.45rem] font-extrabold uppercase tracking-widest ${isEnemy ? 'text-[#ff0044]' : 'text-[#00f2ff]'}`}>
                  Game Paused for Ability Response
                </div>
                <div className="text-[0.55rem] text-gray-300 font-sans leading-tight">
                  {isEnemy ? "Opponent's queued abilities" : "Browse and cast queued abilities"}
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
                      className={`glass-panel p-2 border ${isEnemy ? 'border-white/10 hover:border-[#ff0044]/50' : 'border-white/15 hover:border-[#00f2ff]/50'} rounded-xl bg-black/40 flex gap-2.5 items-center transition-all shadow-md group`}
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
                              className={`text-[0.4rem] px-1 py-0.5 rounded font-extrabold uppercase tracking-wider shrink-0 ${
                                item.requiredLocation === 'board'
                                  ? `bg-[${colorHex}]/10 text-[${colorHex}] border border-[${colorHex}]/30`
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

                        {!isEnemy && onUseAbility && (
                          <button
                            onClick={() => onUseAbility(item.id)}
                            className={`mt-1.5 w-full py-1 border border-[${colorHex}]/60 bg-[${colorHex}]/10 hover:bg-[${colorHex}]/25 text-[${colorHex}] text-[0.5rem] font-bold uppercase tracking-widest rounded transition-all active:scale-95 shadow-[0_0_10px_rgba(0,242,255,0.2)]`}
                          >
                            Use Ability
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
        </div>
      </div>
  );
};
