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
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] w-[min(300px,75vw)] md:w-[360px] max-h-[30vh] bg-[#0a0a0c]/80 border-y border-l border-white/10 shadow-2xl flex flex-col font-cinzel rounded-l-2xl backdrop-blur-sm"
        >
          <div className="p-2 flex flex-col h-full overflow-hidden">
            <div className="text-[0.5rem] text-gray-400 uppercase tracking-widest mb-1 px-1 flex justify-between">
              <span>Intel Log</span>
              <span className="text-[#00f2ff]">Live</span>
            </div>
            
            <div ref={logScrollRef} className="flex-1 overflow-y-auto space-y-1 p-1 bg-black/40 rounded border border-white/5 font-mono text-[0.45rem] scrollbar-thin">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-300 border-l border-white/10 pl-1.5 leading-tight mb-1">
                  <span className="text-[#00f2ff] mr-1">»</span>{log}
                </div>
              ))}
            </div>

            {onSkip && (
              <button onClick={onSkip} className="mt-1.5 w-full py-1 border border-[#ff0044]/30 text-[#ff0044] text-[0.45rem] uppercase tracking-tighter hover:bg-[#ff0044]/10 transition-all rounded">
                Skip Current Interaction
              </button>
            )}

            {/* AI Evaluation Bar */}
            <div className="mt-2 pt-1.5 border-t border-white/10">
              <div className="flex justify-between items-center text-[0.45rem] font-bold uppercase tracking-widest mb-1 px-0.5 font-mono">
                <span className="text-[#00f2ff]">PLAYER {playerWinPercent.toFixed(1)}%</span>
                <span className="text-gray-200 bg-white/10 px-1.5 py-0.5 rounded text-[0.45rem] border border-white/15 shadow-inner">
                  {evalBadgeText}
                </span>
                <span className="text-[#ff0044]">ENEMY {enemyWinPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-[#ff0044]/40 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-[#00f2ff] to-[#00a8ff] transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,242,255,0.6)]"
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
