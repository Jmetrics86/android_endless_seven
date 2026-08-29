/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QueuedAbility } from '../types';
import { cardArtUrl, CARD_ART_PATHS, CARD_BACK_PATH } from '../cardArtPaths';

interface AbilitiesDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  abilities: QueuedAbility[];
  onUseAbility?: (abilityId: string) => void;
  position?: 'top' | 'bottom';
  theme?: 'player' | 'enemy';
  title?: string;
}

export const AbilitiesDrawer: React.FC<AbilitiesDrawerProps> = ({
  abilities,
  onUseAbility,
  theme = 'player',
  title = 'ABILITY STORAGE',
}) => {
  const isEnemy = theme === 'enemy';
  const colorHex = isEnemy ? '#ff0044' : '#00f2ff';

  return (
    <div className="w-full h-full bg-transparent flex flex-col font-cinzel select-none">
      <div className="px-2 py-1.5 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between mb-1 border-b ${isEnemy ? 'border-[#ff0044]/30' : 'border-[#00f2ff]/30'} pb-1`}>
          <div className="flex items-center gap-1.5">
            <span className={isEnemy ? 'text-[#ff0044] text-sm' : 'text-[#00f2ff] text-sm'}>⚡</span>
            <h2 className={`${isEnemy ? 'text-[#ff0044]' : 'text-[#00f2ff]'} text-[0.65rem] tracking-[0.18em] font-bold uppercase`}>
              {title}
            </h2>
          </div>
          {abilities.length > 0 && (
            <span className={`text-[0.5rem] px-1.5 py-0.2 rounded-full font-bold ${
              isEnemy ? 'bg-[#ff0044]/20 text-[#ff4466] border border-[#ff0044]/40' : 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40'
            }`}>
              {abilities.length}
            </span>
          )}
        </div>

        {/* Abilities List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-0.5 custom-scrollbar">
          {abilities.length === 0 ? (
            <div className="h-full min-h-[60px] flex flex-col items-center justify-center text-center p-2 bg-black/20 border border-white/5 rounded">
              <span className="text-sm opacity-40 mb-0.5">🛡️</span>
              <div className="text-[0.55rem] text-gray-500 font-bold uppercase tracking-wider">
                No Stored Abilities
              </div>
            </div>
          ) : (
            abilities.map((item) => {
              const artPath = item.faceArtPath || CARD_ART_PATHS[item.cardName] || CARD_BACK_PATH;
              return (
                <div
                  key={item.id}
                  className={`relative p-1.5 rounded bg-black/60 border ${
                    isEnemy ? 'border-[#ff0044]/30 hover:border-[#ff0044]/60' : 'border-[#00f2ff]/30 hover:border-[#00f2ff]/70'
                  } transition-all flex flex-col gap-1 shadow-md`}
                >
                  {/* Top Bar: Card Thumbnail, Name & Location */}
                  <div className="flex items-center gap-2">
                    <img
                      src={cardArtUrl(artPath)}
                      alt={item.cardName}
                      className="w-7 h-9 object-cover rounded border border-white/20 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[0.65rem] font-bold text-white truncate">
                          {item.cardName}
                        </span>
                        <span
                          className={`text-[0.42rem] px-1 py-0.2 rounded font-extrabold uppercase shrink-0 ${
                            item.requiredLocation === 'board'
                              ? isEnemy 
                                ? 'bg-[#ff0044]/20 text-[#ff4466] border border-[#ff0044]/40'
                                : 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40'
                              : 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                          }`}
                        >
                          {item.requiredLocation === 'board' ? 'Board' : 'Limbo'}
                        </span>
                      </div>
                      <span className="text-[0.45rem] text-gray-400 font-sans uppercase tracking-wider">
                        {item.abilityType === 'limbo' ? 'Final Act' : 'Activate'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[0.55rem] text-gray-300 font-sans leading-snug line-clamp-3 pl-0.5">
                    {item.description}
                  </p>

                  {/* Action Button for Player */}
                  {!isEnemy && onUseAbility && (
                    <button
                      onClick={() => onUseAbility(item.id)}
                      className="mt-0.5 w-full py-1 bg-[#00f2ff]/15 hover:bg-[#00f2ff]/30 active:bg-[#00f2ff]/40 text-[#00f2ff] hover:text-white border border-[#00f2ff]/60 rounded text-[0.55rem] font-bold tracking-widest uppercase transition-all shadow-[0_0_8px_rgba(0,242,255,0.15)] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>⚡ Play Ability</span>
                    </button>
                  )}

                  {isEnemy && (
                    <div className="mt-0.5 py-0.5 px-1 bg-[#ff0044]/10 border border-[#ff0044]/20 text-[#ff6688] text-[0.48rem] font-bold uppercase tracking-wider text-center rounded">
                      Enemy Ready
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
