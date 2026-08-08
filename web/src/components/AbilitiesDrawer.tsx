/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
        <div className={`flex items-center justify-between mb-1 border-b ${isEnemy ? 'border-[#ff0044]/20' : 'border-white/10'} pb-0.5`}>
          <div className="flex items-center gap-2">
            <span className={`text-[${colorHex}] text-lg`}>⚡</span>
            <h2 className={`text-[${colorHex}] text-[0.6rem] tracking-[0.2em] font-bold uppercase`}>
              {title}
            </h2>
          </div>
        </div>

        {/* Abilities Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-1 content-start custom-scrollbar">
          {abilities.length === 0 ? (
            <div className="col-span-full h-16 flex flex-col items-center justify-center text-center p-2 glass-panel border border-white/10 rounded-xl">
              <span className="text-xl text-gray-600 mb-0.5">🛡️</span>
              <div className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-wider">
                Empty
              </div>
            </div>
          ) : (
            abilities.map((item) => (
              <div
                key={item.id}
                className="group relative cursor-pointer aspect-[2.5/3.5] rounded border border-white/20 overflow-visible shadow-inner"
                onClick={() => !isEnemy && onUseAbility && onUseAbility(item.id)}
              >
                {/* Thumbnail Art */}
                <img
                  src={cardArtUrl(item.faceArtPath || CARD_BACK_PATH)}
                  alt={item.cardName}
                  className="w-full h-full object-cover rounded opacity-80 group-hover:opacity-100 transition-opacity"
                />

                {/* Tooltip Hover Bubble */}
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-[160px] p-2 bg-black/95 border border-white/20 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6rem] font-bold text-white truncate">{item.cardName}</span>
                    <span className={`text-[0.4rem] px-1 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                      item.requiredLocation === 'board'
                        ? `bg-[${colorHex}]/10 text-[${colorHex}] border border-[${colorHex}]/30`
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}>
                      {item.requiredLocation === 'board' ? 'Board' : 'Limbo'}
                    </span>
                  </div>
                  <div className="text-[0.5rem] text-gray-300 font-sans leading-tight">
                    {item.description}
                  </div>
                  {!isEnemy && (
                    <div className={`mt-1 w-full py-0.5 border border-[${colorHex}]/60 bg-[${colorHex}]/20 text-[${colorHex}] text-[0.45rem] font-bold uppercase tracking-widest text-center rounded`}>
                      Click to Cast
                    </div>
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
