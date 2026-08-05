import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, VolumeX, X, SquarePlay, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { unityAds } from '../lib/unityAds';

interface UnityAdsContextType {
  isInitialized: boolean;
  isAdActive: boolean;
  surveyCount: number;
  navigationCount: number;
  totalRewardedAds: number;
  incrementSurveyCount: () => void;
  incrementNavigationCount: () => void;
  setIsFillingSurvey: (active: boolean) => void;
  setIsWithdrawing: (active: boolean) => void;
  showInterstitialAd: (forced?: boolean) => Promise<boolean>;
  showRewardedAd: (onRewarded: () => void) => Promise<boolean>;
}

const UnityAdsContext = createContext<UnityAdsContextType | undefined>(undefined);

export const useUnityAds = () => {
  const context = useContext(UnityAdsContext);
  if (!context) {
    throw new Error('useUnityAds must be used within a UnityAdsProvider');
  }
  return context;
};

// Selection of highly engaging fake video-game advertisements for high visual fidelity
const AD_PLAYERS_POOL = [
  {
    title: "Genshin Impact 5.0",
    description: "Explore the brand new fantasy region Natlan! Embark on an epic open-world adventure with legendary heroes and unlock raw elemental powers.",
    cta: "Install & Get 50 Free Pulls",
    rating: "4.8 ★",
    accent: "from-blue-600 to-cyan-500",
  },
  {
    title: "Clash of Clans: Clan Capital",
    description: "Assemble your friends, upgrade your Capital Hall, and defeat rival clans in massive weekend raids! Build the ultimate village defence.",
    cta: "Download Free Now",
    rating: "4.7 ★",
    accent: "from-amber-600 to-yellow-500",
  },
  {
    title: "Subway Surfers: World Tour",
    description: "Dash as fast as you can! Dodge the oncoming trains, help Jake, Tricky & Fresh escape from the grumpy Inspector and his dog.",
    cta: "Play Free in Sandbox",
    rating: "4.6 ★",
    accent: "from-pink-600 to-rose-500",
  },
  {
    title: "Ludo Empire Pro",
    description: "India's highest rated skill-based board game. Roll the dice, strategy-check your opponents, and withdraw real cash rewards securely.",
    cta: "Claim 1000 Coins Signup Bonus",
    rating: "4.9 ★",
    accent: "from-emerald-600 to-teal-500",
  }
];

export const UnityAdsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sdkState, setSdkState] = useState(unityAds.getState());
  const [isAdActive, setIsAdActive] = useState(false);
  const [surveyCount, setSurveyCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('unity_survey_count') || '0', 10);
  });
  const [navigationCount, setNavigationCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('unity_navigation_count') || '0', 10);
  });
  const [totalRewardedAds, setTotalRewardedAds] = useState<number>(() => {
    return parseInt(localStorage.getItem('unity_total_rewarded_ads') || '0', 10);
  });

  // Flow safety constraints
  const [isFillingSurvey, setIsFillingSurveyState] = useState(false);
  const [isWithdrawing, setIsWithdrawingState] = useState(false);

  // Active full screen ad parameters
  const [adType, setAdType] = useState<'interstitial' | 'rewarded' | null>(null);
  const [adTheme, setAdTheme] = useState(AD_PLAYERS_POOL[0]);
  const [countdown, setCountdown] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  // Callbacks
  const rewardCallbackRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const unsub = unityAds.subscribe((stateStr) => {
      setSdkState(JSON.parse(stateStr));
    });
    return unsub;
  }, []);

  useEffect(() => {
    localStorage.setItem('unity_survey_count', surveyCount.toString());
  }, [surveyCount]);

  useEffect(() => {
    localStorage.setItem('unity_navigation_count', navigationCount.toString());
  }, [navigationCount]);

  const incrementSurveyCount = () => {
    setSurveyCount((prev) => {
      const next = prev + 1;
      console.log(`[Unity Ads Tracker] Survey completed count: ${next}/3 (Interstitial Triggers temporarily disabled)`);
      return next;
    });
  };

  const incrementNavigationCount = () => {
    setNavigationCount((prev) => {
      const next = prev + 1;
      console.log(`[Unity Ads Tracker] Page navigation count: ${next}/5 (Interstitial Triggers temporarily disabled)`);
      return next;
    });
  };

  const setIsFillingSurvey = (active: boolean) => {
    console.log(`[Unity Ads Safety] Survey active status toggled to:`, active);
    setIsFillingSurveyState(active);
  };

  const setIsWithdrawing = (active: boolean) => {
    console.log(`[Unity Ads Safety] Withdrawal active status toggled to:`, active);
    setIsWithdrawingState(active);
  };

  // Web Audio Synth sounds for ad player immersion
  const playAdChime = (type: 'beep' | 'success' | 'warn') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else if (type === 'warn') {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Ignore audio synthesis errors
    }
  };

  /**
   * Triggers the fullscreen Interstitial Ad
   */
  const showInterstitialAd = async (forced = false): Promise<boolean> => {
    if (isAdActive) return false;

    // Check strict restrictions:
    // "Never interrupt users while filling surveys. Never show during withdrawals or login."
    if (!forced) {
      if (isFillingSurvey) {
        console.log("[Unity Ads] Interstitial deferred: User is currently completing a survey.");
        return false;
      }
      if (isWithdrawing) {
        console.log("[Unity Ads] Interstitial deferred: User is on the withdrawal screen / processing payout.");
        return false;
      }
    }

    console.log("[Unity Ads] Launching Interstitial Ad sequence...");
    setAdLoading(true);

    // Simulated SDK load/cache validation
    const placementId = unityAds.PLACEMENT_INTERSTITIAL;
    const preloaded = sdkState.preloadedAds[placementId];

    if (!preloaded) {
      console.log("[Unity Ads] Ad is not cached. Attempting to reload with automatic retry...");
      const loaded = await unityAds.preloadAd(placementId);
      if (!loaded) {
        console.warn("[Unity Ads] Failed to load interstitial ad. Skipping gracefully to avoid crash.");
        setAdLoading(false);
        return false;
      }
    }

    // Ad loaded successfully! Show overlay
    setAdLoading(false);
    setAdType('interstitial');
    setAdTheme(AD_PLAYERS_POOL[Math.floor(Math.random() * AD_PLAYERS_POOL.length)]);
    setCountdown(5); // 5s Interstitial
    setIsAdActive(true);
    setShowExitWarning(false);
    playAdChime('beep');

    // Reset interstitial count triggers
    setNavigationCount(0);
    setSurveyCount(0);

    return true;
  };

  /**
   * Triggers the fullscreen Rewarded Ad
   */
  const showRewardedAd = async (onRewarded: () => void): Promise<boolean> => {
    if (isAdActive) return false;

    console.log("[Unity Ads] Initiating Rewarded Ad session...");
    setAdLoading(true);

    const placementId = unityAds.PLACEMENT_REWARDED;
    const preloaded = sdkState.preloadedAds[placementId];

    if (!preloaded) {
      console.log("[Unity Ads] Rewarded ad not cached. Preloading immediately...");
      const loaded = await unityAds.preloadAd(placementId);
      if (!loaded) {
        console.warn("[Unity Ads] Rewarded ad failed to load. Resuming app gracefully.");
        setAdLoading(false);
        alert("Unity Ads Reward Server is currently busy. Auto-retrying background cache...");
        return false;
      }
    }

    // Setup reward callback & launch
    rewardCallbackRef.current = onRewarded;
    setAdLoading(false);
    setAdType('rewarded');
    setAdTheme(AD_PLAYERS_POOL[Math.floor(Math.random() * AD_PLAYERS_POOL.length)]);
    setCountdown(15); // 15s Rewarded Ad countdown
    setIsAdActive(true);
    setShowExitWarning(false);
    playAdChime('beep');

    return true;
  };

  // Timer loop for active ad countdowns
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdActive && countdown > 0 && !showExitWarning) {
      timer = setTimeout(() => {
        setCountdown((c) => {
          const next = c - 1;
          if (next > 0) {
            playAdChime('beep');
          } else {
            playAdChime('success');
          }
          return next;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isAdActive, countdown, showExitWarning]);

  const handleCloseAd = () => {
    if (adType === 'rewarded' && countdown > 0) {
      // Show warning before losing reward
      playAdChime('warn');
      setShowExitWarning(true);
      return;
    }

    // Close and complete
    setIsAdActive(false);
    const completedPlacement = adType === 'interstitial' ? unityAds.PLACEMENT_INTERSTITIAL : unityAds.PLACEMENT_REWARDED;
    
    if (adType === 'rewarded' && countdown === 0 && rewardCallbackRef.current) {
      console.log("[Unity Ads] Rewarded ad completed successfully. Awarding credit!");
      setTotalRewardedAds((prev) => {
        const next = prev + 1;
        localStorage.setItem('unity_total_rewarded_ads', next.toString());
        return next;
      });
      rewardCallbackRef.current();
    }

    // Recycle preloads
    unityAds.consumeAd(completedPlacement);
    setAdType(null);
    rewardCallbackRef.current = null;
  };

  const handleConfirmExitAd = (confirm: boolean) => {
    if (confirm) {
      // Exit early, no reward
      setIsAdActive(false);
      unityAds.consumeAd(unityAds.PLACEMENT_REWARDED);
      setAdType(null);
      rewardCallbackRef.current = null;
    }
    setShowExitWarning(false);
  };

  return (
    <UnityAdsContext.Provider
      value={{
        isInitialized: sdkState.isInitialized,
        isAdActive,
        surveyCount,
        navigationCount,
        totalRewardedAds,
        incrementSurveyCount,
        incrementNavigationCount,
        setIsFillingSurvey,
        setIsWithdrawing,
        showInterstitialAd,
        showRewardedAd,
      }}
    >
      {children}

      {/* Fullscreen Ads Loading Animation Overlay */}
      <AnimatePresence>
        {adLoading && (
          <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative mb-5">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest font-mono">
                Loading Unity Ad
              </h3>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-wider">
                Connecting to Unity Ads Server...
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immersive Fullscreen Ad Player Overlay */}
      <AnimatePresence>
        {isAdActive && adType && (
          <div className="fixed inset-0 z-[999] bg-black flex flex-col justify-between select-none">
            
            {/* Header Toolbar */}
            <div className="h-14 px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black font-sans uppercase tracking-widest">
                  Unity Ads
                </span>
                <span className="text-[9px] text-zinc-500 font-mono tracking-wider truncate max-w-[120px]">
                  {adType === 'interstitial' ? 'Interstitial_Android' : 'Rewarded_Android'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 rounded-full bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Close/Skip Trigger */}
                {countdown > 0 ? (
                  <div className="px-3 py-1 bg-black/50 border border-white/10 rounded-full text-xs font-mono font-bold text-zinc-300">
                    {countdown}s
                  </div>
                ) : (
                  <button
                    onClick={handleCloseAd}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase tracking-widest rounded-full transition-all active:scale-95"
                  >
                    <span>{adType === 'rewarded' ? 'Claim Reward' : 'Skip Ad'}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Simulated Animated Gameplay Video Body */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
              {/* Animated Glowing Radial Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${adTheme.accent} opacity-10 filter blur-3xl`} />

              {/* Central Player Board */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-xs bg-zinc-950/80 border border-white/10 rounded-[28px] p-6 text-center shadow-2xl relative z-10 backdrop-blur-md"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${adTheme.accent} mx-auto mb-5 flex items-center justify-center shadow-xl`}>
                  <SquarePlay className="w-7 h-7 text-white" />
                </div>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <h4 className="text-md font-black text-white">{adTheme.title}</h4>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-black text-yellow-500">
                    {adTheme.rating}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
                  {adTheme.description}
                </p>

                {/* CTA Button */}
                <button className="w-full py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-100 transition-all active:scale-95 shadow-lg">
                  {adTheme.cta}
                </button>
              </motion.div>

              {/* Live Progress Bar indicator */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2 z-10">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>PLAYING SPONSORED MEDIA</span>
                  <span>{adType === 'rewarded' ? '100 COINS REWARD SECURED' : 'AD SPONSORSHIP'}</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: adType === 'interstitial' ? 5 : 15, ease: 'linear' }}
                    className="h-full bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer Area with Unity logo */}
            <div className="h-16 px-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center text-center z-10">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono font-bold">
                Sponsored by Unity Ads Premium Network
              </span>
            </div>

            {/* Warn Dialogue Overlay on Premature Exit */}
            <AnimatePresence>
              {showExitWarning && (
                <div className="absolute inset-0 bg-black/95 z-[1000] flex items-center justify-center p-6 text-center">
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="w-full max-w-xs rounded-3xl bg-zinc-900 border border-white/10 p-6 shadow-2xl"
                  >
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                      Skip Reward?
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
                      If you close this advertisement now, you will lose your chance to earn <b>100 Coins</b>. Are you sure?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleConfirmExitAd(true)}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"
                      >
                        Skip Reward
                      </button>
                      <button
                        onClick={() => handleConfirmExitAd(false)}
                        className="flex-1 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl"
                      >
                        Keep Watching
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}
      </AnimatePresence>
    </UnityAdsContext.Provider>
  );
};
