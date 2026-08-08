/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QueuedAbility } from '../types';
import { AbilitiesDrawer } from './AbilitiesDrawer';
import { EventLogPanel } from './EventLogPanel';

interface RightSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  enemyAbilities: QueuedAbility[];
  playerAbilities: QueuedAbility[];
  onUsePlayerAbility?: (abilityId: string) => void;
  logs: string[];
  onSkip?: () => void;
  evaluationScore?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  setIsOpen,
  enemyAbilities,
  playerAbilities,
  onUsePlayerAbility,
  logs,
  onSkip,
  evaluationScore = 0.5
}) => {
  // Convert evaluation score to smooth win percentage via sigmoid (Math.tanh(score / 80))
  const playerWinPercent = Math.max(1, Math.min(99, 50 + 50 * Math.tanh(evaluationScore / 80)));
  const enemyWinPercent = 100 - playerWinPercent;

  return (
    <>
      <AnimatePresence>
        {/* Expanded Drawer */}
        {isOpen && (
          <motion.div
            key="right-sidebar"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[105] w-[min(260px,65vw)] md:w-[320px] bg-[#0a0a0c]/95 border-l border-white/10 shadow-2xl flex flex-col pt-[env(safe-area-inset-top,5px)] pb-[env(safe-area-inset-bottom,5px)] font-cinzel select-none"
          >

            
            <div className="flex flex-col flex-1 overflow-hidden p-1 gap-1">
              {/* Enemy Abilities Section */}
              <div className="flex-none h-[30%] min-h-[120px] max-h-[160px] bg-black/40 border border-[#ff0044]/20 rounded overflow-hidden">
                <AbilitiesDrawer 
                  theme="enemy" 
                  title="ENEMY STORED" 
                  abilities={enemyAbilities} 
                />
              </div>

              {/* Event Log Section */}
              <div className="flex-1 bg-black/40 border border-white/10 rounded overflow-hidden flex flex-col">
                <EventLogPanel 
                  logs={logs} 
                  onSkip={onSkip} 
                  evaluationScore={evaluationScore} 
                />
              </div>

              {/* Player Abilities Section */}
              <div className="flex-none h-[30%] min-h-[120px] max-h-[160px] bg-black/40 border border-[#00f2ff]/20 rounded overflow-hidden">
                <AbilitiesDrawer 
                  theme="player" 
                  title="MY ABILITIES" 
                  abilities={playerAbilities} 
                  onUseAbility={onUsePlayerAbility} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Vertical Eval Bar Edge */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="vertical-eval-edge"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            onClick={() => setIsOpen(true)}
            className="fixed right-0 top-[20vh] bottom-[20vh] z-[100] w-2 sm:w-3 cursor-pointer border-l border-white/20 shadow-[-2px_0_10px_rgba(0,0,0,0.8)] flex flex-col hover:w-4 transition-all"
            title="Open Battle HUD"
          >
            <div 
              className="w-full bg-[#ff0044]" 
              style={{ height: `${enemyWinPercent}%`, transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <div 
              className="w-full bg-[#00f2ff]" 
              style={{ height: `${playerWinPercent}%`, transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            
            {/* Notifications for stored abilities */}
            {(enemyAbilities.length > 0 || playerAbilities.length > 0) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse pointer-events-none" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
