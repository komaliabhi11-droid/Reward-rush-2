import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { unityAds } from '../lib/unityAds';

interface UnityBannerAdProps {
  activeTab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile';
}

const SPONSORS_POOL = [
  {
    title: "Candy Crush Soda Saga",
    subtitle: "Slay puzzles with delicious sodas!",
    cta: "Play",
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "Raid: Shadow Legends",
    subtitle: "Collect 800+ Champions in this high-fantasy RPG.",
    cta: "Install",
    color: "from-zinc-800 to-amber-950"
  },
  {
    title: "Brawl Stars 3v3",
    subtitle: "Fast-paced multiplayer battle royale!",
    cta: "Join",
    color: "from-blue-600 to-cyan-500"
  },
  {
    title: "Monopoly GO!",
    subtitle: "Roll the dice, build, and smash houses!",
    cta: "Go",
    color: "from-red-600 to-orange-500"
  }
];

export const UnityBannerAd: React.FC<UnityBannerAdProps> = ({ activeTab }) => {
  const [sdkState, setSdkState] = useState(unityAds.getState());
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  // Validate if active tab supports displaying banner ads
  const shouldShow = activeTab === 'dashboard' || activeTab === 'redeem' || activeTab === 'profile';

  useEffect(() => {
    const unsub = unityAds.subscribe((stateStr) => {
      setSdkState(JSON.parse(stateStr));
    });
    return unsub;
  }, []);

  // Slowly rotate banner sponsor advertisements every 15 seconds for realistic engagement
  useEffect(() => {
    if (!shouldShow) return;
    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % SPONSORS_POOL.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const placementId = unityAds.PLACEMENT_BANNER;
  const isLoaded = sdkState.preloadedAds[placementId];
  const isLoading = sdkState.loadingAds[placementId];
  const retryCount = sdkState.retryAttempts[placementId];
  const activeSponsor = SPONSORS_POOL[currentSponsorIndex];

  const handleRetry = () => {
    unityAds.forceReload(placementId);
  };

  return (
    <div className="absolute bottom-20 left-0 right-0 h-16 bg-black/95 border-t border-white/5 z-30 flex items-center select-none overflow-hidden px-4">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center gap-2 text-zinc-500 font-mono text-[10px]"
          >
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            <span>LOADING UNITY AD BANNER...</span>
          </motion.div>
        ) : !isLoaded ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-between text-zinc-500 font-mono text-[9px]"
          >
            <div className="flex items-center gap-2 text-rose-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>UNITY BANNER FAILING (RETRIES: {retryCount})</span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RETRY</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full flex items-center justify-between"
          >
            {/* Visual Sponsor Card */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeSponsor.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md`}>
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase font-mono leading-none mb-0.5">
                  Sponsored by Unity Ads
                </span>
                <span className="text-xs text-zinc-100 font-black truncate leading-tight">
                  {activeSponsor.title}
                </span>
                <span className="text-[9px] text-zinc-500 truncate leading-none">
                  {activeSponsor.subtitle}
                </span>
              </div>
            </div>

            {/* Banner CTA Button */}
            <button className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shrink-0 ml-4 shadow-lg shadow-amber-500/10">
              <span>{activeSponsor.cta}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default UnityBannerAd;
