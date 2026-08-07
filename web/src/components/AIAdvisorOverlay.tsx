/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SealTrackerData {
  isClaimed: boolean;
  isPlayerClaimed: boolean;
  isEnemyClaimed: boolean;
  isChampioned: boolean;
  isEnemyChampion?: boolean;
}

interface AIAdvisorOverlayProps {
  isVisible: boolean;
  recommendation: string;
  sealsData?: SealTrackerData[];
  onApplySuggestion?: () => void;
}

const AIAnimationIcon = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" className="drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]">
    <circle cx="50" cy="50" r="42" fill="none" stroke="#00f2ff" strokeWidth="3" strokeDasharray="40 20" className="animate-[spin_4s_linear_infinite]" opacity="0.5"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="20 20" className="animate-[spin_2s_linear_infinite_reverse]" opacity="0.7"/>
    <path d="M50 15 L56 44 L85 50 L56 56 L50 85 L44 56 L15 50 L44 44 Z" fill="#00f2ff" className="animate-pulse" />
  </svg>
);

const SealTracker: React.FC<{ seals: SealTrackerData[] }> = ({ seals }) => {
  if (!seals || seals.length === 0) return null;
  return (
    <div className="flex justify-center items-center gap-2 mb-2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.6)]">
      {seals.map((seal, i) => {
        let bgColor = "bg-gray-600/40 border border-gray-500/30";
        let glowColor = "";
        let crownColor = "";
        
        if (seal.isPlayerClaimed) {
          bgColor = "bg-[#00f2ff] border-none";
          glowColor = "shadow-[0_0_10px_rgba(0,242,255,0.8)]";
          crownColor = "border-[#00f2ff]";
        } else if (seal.isEnemyClaimed) {
          bgColor = "bg-[#ff0044] border-none";
          glowColor = "shadow-[0_0_10px_rgba(255,0,68,0.8)]";
          crownColor = "border-[#ff0044]";
        }

        return (
          <div key={i} className="relative flex justify-center items-center w-5 h-5">
            {seal.isChampioned && (
              <div className={`absolute w-5 h-5 rounded-full border-[1.5px] ${crownColor} animate-ping opacity-75`} style={{ animationDuration: '2s' }} />
            )}
            {seal.isChampioned && (
              <div className={`absolute w-4 h-4 rounded-full border-[1.5px] ${crownColor} opacity-90`} />
            )}
            <div className={`w-2.5 h-2.5 rotate-45 transition-all duration-700 ${bgColor} ${glowColor}`} />
          </div>
        );
      })}
    </div>
  );
};

export const AIAdvisorOverlay: React.FC<AIAdvisorOverlayProps> = ({ 
  isVisible, 
  recommendation,
  sealsData = [],
  onApplySuggestion
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center">
      
      {/* Dynamic Seal Tracker */}
      <SealTracker seals={sealsData} />

      {/* Trigger Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`min-h-10 px-4 rounded-full glass-panel border flex items-center gap-2 transition-all active:scale-95 shadow-xl
          ${isExpanded 
            ? 'border-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_20px_rgba(0,242,255,0.5)]' 
            : 'border-white/20 hover:border-[#00f2ff]/60 bg-black/50 hover:bg-[#00f2ff]/5'
          }`}
        aria-label="Toggle AI Advisor"
      >
        <AIAnimationIcon />
        <span className="text-[0.65rem] font-bold text-[#00f2ff] tracking-[0.15em] uppercase drop-shadow-md">
          {isExpanded ? 'Hide Intel' : 'AI Advisor'}
        </span>
      </button>

      {/* Expandable Panel (Opens Downward) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 250 }}
            className="mt-3 w-[min(300px,85vw)] glass-panel bg-[#0a0a0c]/95 border border-[#00f2ff]/40 rounded-2xl shadow-[0_15px_35px_rgba(0,242,255,0.2)] overflow-hidden flex flex-col origin-top"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00f2ff]/20 to-transparent p-2.5 border-b border-[#00f2ff]/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AIAnimationIcon />
                <span className="text-[#00f2ff] text-[0.6rem] font-bold uppercase tracking-widest font-cinzel drop-shadow-md">Strategic Intel</span>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-[#00f2ff]/60 hover:text-[#00f2ff] p-1 text-xs transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-3">
              <p className="text-[0.65rem] text-gray-200 leading-relaxed font-sans mb-3 text-center">
                {recommendation}
              </p>
              
              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => {
                    if (onApplySuggestion) onApplySuggestion();
                    setIsExpanded(false);
                  }}
                  className="px-6 py-1.5 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/25 border border-[#00f2ff]/50 text-[#00f2ff] text-[0.55rem] font-bold uppercase tracking-widest rounded transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                >
                  Apply Strategy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
