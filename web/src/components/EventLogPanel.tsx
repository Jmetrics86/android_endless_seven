/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EventLogPanelProps {
  logs: string[];
  isOpen: boolean;
  onSkip?: () => void;
  // A mock evaluation for now, e.g., +1.2 or -0.5
  evaluationScore?: number;
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({ logs, isOpen, onSkip, evaluationScore = 0.5 }) => {
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length && logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Convert evaluation score to smooth win percentage via sigmoid (Math.tanh(score / 80))
  // Range: 1.0% to 99.0%
  const playerWinPercent = Math.max(1, Math.min(99, 50 + 50 * Math.tanh(evaluationScore / 80)));
  const enemyWinPercent = 100 - playerWinPercent;

  // Format chess engine numeric eval score (e.g. +1.5, -0.8, 0.0)
  const normEval = (evaluationScore / 20).toFixed(1);
  const evalBadgeText = evaluationScore > 0 ? `+${normEval}` : `${normEval}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-[max(0.35rem,env(safe-area-inset-right))] top-1/2 -translate-y-1/2 z-[90] w-[min(210px,28vw)] sm:w-[250px] md:w-[280px] max-h-[38vh] bg-[#0a0a0c]/85 border border-white/15 shadow-[0_0_25px_rgba(0,0,0,0.85)] flex flex-col font-cinzel rounded-xl backdrop-blur-md"
        >
          <div className="p-2 flex flex-col h-full overflow-hidden">
            <div className="text-[0.58rem] sm:text-[0.62rem] font-bold text-gray-300 uppercase tracking-widest mb-1 px-0.5 flex justify-between items-center">
              <span>Intel Log</span>
              <span className="text-[#00f2ff] text-[0.52rem] px-1 py-0.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 font-mono tracking-normal">LIVE</span>
            </div>
            
            <div ref={logScrollRef} className="flex-1 overflow-y-auto min-h-[50px] space-y-1 p-1.5 bg-black/60 rounded-lg border border-white/10 font-mono text-[0.6rem] sm:text-[0.65rem] scrollbar-thin">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-200 border-l-2 border-[#00f2ff]/40 pl-1.5 py-0.5 leading-tight bg-white/[0.02] rounded-r">
                  <span className="text-[#00f2ff] font-bold mr-1 select-none">»</span>{log}
                </div>
              ))}
            </div>

            {onSkip && (
              <button onClick={onSkip} className="mt-1.5 w-full py-1 border border-[#ff0044]/40 bg-[#ff0044]/10 hover:bg-[#ff0044]/20 text-[#ff0044] text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wider transition-all rounded active:scale-95 shadow-sm">
                Skip Current Interaction
              </button>
            )}

            {/* AI Evaluation Bar */}
            <div className="mt-2 pt-1.5 border-t border-white/10">
              <div className="flex justify-between items-center text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wide mb-1 px-0.5 font-mono">
                <span className="text-[#00f2ff]">PLAYER {playerWinPercent.toFixed(1)}%</span>
                <span className="text-white bg-white/10 px-1.5 py-0.5 rounded text-[0.55rem] border border-white/20 shadow-inner font-mono font-extrabold">
                  {evalBadgeText}
                </span>
                <span className="text-[#ff0044]">ENEMY {enemyWinPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-[#ff0044]/40 rounded-full overflow-hidden flex border border-white/15 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-[#00f2ff] via-[#00c8ff] to-[#0090ff] transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,242,255,0.7)]"
                  style={{ width: `${playerWinPercent}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
