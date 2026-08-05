import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Download, CheckSquare, Dices, Layers, Loader2, Sparkles } from 'lucide-react';
import { TaskItem, UserState } from '../types';
import SpinWheel from './SpinWheel';
import { formatINR } from '../lib/currency';
import { useUnityAds } from './UnityAdsProvider';

interface EarnProps {
  tasks: TaskItem[];
  onCompleteTask: (taskId: string, reward: number, taskTitle: string, status?: 'pending' | 'completed', spinsChange?: number) => void;
  user: UserState;
  triggerToast: (message: string, reward?: number) => void;
}

export default function Earn({ tasks, onCompleteTask, user, triggerToast }: EarnProps) {
  const [showWheel, setShowWheel] = useState(false);
  const { showRewardedAd, setIsFillingSurvey, totalRewardedAds } = useUnityAds();

  // Milestone checks for total Unity Rewarded Ads watched
  useEffect(() => {
    if (totalRewardedAds >= 15) {
      const claimed15 = localStorage.getItem('unity_milestone_15_claimed') === 'true';
      if (!claimed15) {
        localStorage.setItem('unity_milestone_15_claimed', 'true');
        const txId = `tx-unity-milestone-15-${Date.now()}`;
        onCompleteTask(txId, 0, '15 Unity Ads Milestone Bonus', 'completed', 1);
        triggerToast('Successfully! You got 1 Lucky Spin for watching 15 ads!', 0);
      }
    }
    if (totalRewardedAds >= 30) {
      const claimed30 = localStorage.getItem('unity_milestone_30_claimed') === 'true';
      if (!claimed30) {
        localStorage.setItem('unity_milestone_30_claimed', 'true');
        const txId = `tx-unity-milestone-30-${Date.now()}`;
        onCompleteTask(txId, 0, '30 Unity Ads Milestone Bonus', 'completed', 2);
        triggerToast('Successfully! You got 2 Lucky Spins for watching 30 ads!', 0);
      }
    }
  }, [totalRewardedAds, onCompleteTask, triggerToast]);

  // Weekly Challenge states for watching 25 ads to get record (weekly twice limit)
  const [weeklyAdsWatched, setWeeklyAdsWatched] = useState<number>(() => {
    return parseInt(localStorage.getItem('weekly_challenge_ads_watched') || '0', 10);
  });
  const [weeklyCompletions, setWeeklyCompletions] = useState<number>(() => {
    return parseInt(localStorage.getItem('weekly_challenge_completions') || '0', 10);
  });
  const [lastResetTime, setLastResetTime] = useState<number>(() => {
    const saved = localStorage.getItem('weekly_challenge_last_reset');
    if (!saved) {
      const now = Date.now();
      localStorage.setItem('weekly_challenge_last_reset', now.toString());
      return now;
    }
    return parseInt(saved, 10);
  });

  // Reset weekly limits automatically after 7 days
  useEffect(() => {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - lastResetTime >= oneWeekMs) {
      setWeeklyCompletions(0);
      setWeeklyAdsWatched(0);
      setLastResetTime(now);
      localStorage.setItem('weekly_challenge_completions', '0');
      localStorage.setItem('weekly_challenge_ads_watched', '0');
      localStorage.setItem('weekly_challenge_last_reset', now.toString());
    }
  }, [lastResetTime]);

  const handleWatchChallengeAd = () => {
    if (weeklyCompletions >= 2) {
      triggerToast('Weekly limit reached! You can complete this challenge twice a week.');
      return;
    }

    showRewardedAd(() => {
      setWeeklyAdsWatched((prev) => {
        const next = Math.min(prev + 1, 25);
        localStorage.setItem('weekly_challenge_ads_watched', next.toString());
        triggerToast(`Successfully watched ad! Progress: ${next}/25`, 0);
        return next;
      });
    });
  };

  const handleClaimWeeklyRecord = () => {
    if (weeklyAdsWatched < 25) {
      triggerToast('Please watch 25 ads first to claim your record!');
      return;
    }
    if (weeklyCompletions >= 2) {
      triggerToast('Weekly limit reached! Maximum 2 times per week.');
      return;
    }

    const rewardCash = 25; // 25 Coins = ₹25
    const bonusSpins = 2;
    const completionNumber = weeklyCompletions + 1;
    const txId = `tx-weekly-challenge-${completionNumber}-${Date.now()}`;

    onCompleteTask(
      txId, 
      rewardCash, 
      `Weekly Ads Milestone Record [${completionNumber}/2]`, 
      'completed', 
      bonusSpins
    );

    const nextCompletions = weeklyCompletions + 1;
    setWeeklyCompletions(nextCompletions);
    setWeeklyAdsWatched(0);
    localStorage.setItem('weekly_challenge_completions', nextCompletions.toString());
    localStorage.setItem('weekly_challenge_ads_watched', '0');

    triggerToast(`Successfully! Unlocked Weekly Record #${completionNumber}: +₹${formatINR(rewardCash)} & +${bonusSpins} Spins!`, rewardCash);
  };

  const getRemainingTimeStr = () => {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastResetTime;
    const remainingMs = Math.max(0, oneWeekMs - elapsed);
    
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
  };
  
  // Local states for offer completions
  const [adCompleted, setAdCompleted] = useState(() => localStorage.getItem('adreward_offer_ad_done') === 'true');
  const [appCompleted, setAppCompleted] = useState(() => localStorage.getItem('adreward_offer_app_done') === 'true');
  const [surveyCompleted, setSurveyCompleted] = useState(() => localStorage.getItem('adreward_offer_survey_done') === 'true');

  // Simulation overlay states
  const [activeAdSim, setActiveAdSim] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  
  const [activeAppSim, setActiveAppSim] = useState(false);
  const [appProgress, setAppProgress] = useState(0);

  const [activeSurveySim, setActiveSurveySim] = useState(false);
  const [surveyStep, setSurveyStep] = useState(1);

  // Sync survey active status with Unity Ads safety controller
  useEffect(() => {
    setIsFillingSurvey(activeSurveySim);
  }, [activeSurveySim, setIsFillingSurvey]);

  // Custom Alert Modal
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [pendingSpinsAward, setPendingSpinsAward] = useState<number>(0);
  const [pendingCompletionAction, setPendingCompletionAction] = useState<(() => void) | null>(null);

  // Ad simulation timer
  useEffect(() => {
    let interval: any;
    if (activeAdSim && adCountdown > 0) {
      interval = setInterval(() => {
        setAdCountdown((prev) => prev - 1);
      }, 1000);
    } else if (activeAdSim && adCountdown === 0) {
      setActiveAdSim(false);
      setPendingSpinsAward(2); // In the video, spins went from 9 to 11 (+2 spins!)
      setAlertMessage('Offer completed! You earned 1 spin.'); // Text on alert in the video
      setPendingCompletionAction(() => () => {
        setAdCompleted(true);
        localStorage.setItem('adreward_offer_ad_done', 'true');
      });
    }
    return () => clearInterval(interval);
  }, [activeAdSim, adCountdown]);

  // App install simulation timer
  useEffect(() => {
    let interval: any;
    if (activeAppSim && appProgress < 100) {
      interval = setInterval(() => {
        setAppProgress((prev) => {
          const next = prev + 20;
          if (next >= 100) {
            clearInterval(interval);
            setActiveAppSim(false);
            setPendingSpinsAward(2);
            setAlertMessage('Offer completed! You earned 1 spin.');
            setPendingCompletionAction(() => () => {
              setAppCompleted(true);
              localStorage.setItem('adreward_offer_app_done', 'true');
            });
            return 100;
          }
          return next;
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [activeAppSim, appProgress]);

  const handleStartAd = () => {
    if (adCompleted) return;
    setAdCountdown(5);
    setActiveAdSim(true);
  };

  const handleStartApp = () => {
    if (appCompleted) return;
    setAppProgress(0);
    setActiveAppSim(true);
  };

  const handleStartSurvey = () => {
    if (surveyCompleted) return;
    setSurveyStep(1);
    setActiveSurveySim(true);
  };

  const handleSurveyAnswer = (step: number) => {
    if (step === 1) {
      setSurveyStep(2);
    } else {
      setActiveSurveySim(false);
      setPendingSpinsAward(2);
      setAlertMessage('Offer completed! You earned 1 spin.');
      setPendingCompletionAction(() => () => {
        setSurveyCompleted(true);
        localStorage.setItem('adreward_offer_survey_done', 'true');
      });
    }
  };

  const handleAlertConfirm = () => {
    if (pendingCompletionAction) {
      pendingCompletionAction();
    }
    // Record +0 coins transaction but award the spins!
    onCompleteTask('tx-offer-' + Date.now(), 0, 'Completed offer', 'completed', pendingSpinsAward);
    setAlertMessage(null);
    setPendingCompletionAction(null);
    setPendingSpinsAward(0);
  };

  const handleSpinResult = (rewardCoins: number) => {
    // Deduct 1 spin and award the coins!
    onCompleteTask('tx-spin-reward-' + Date.now(), rewardCoins, `Spin wheel reward - ${rewardCoins}`, 'completed', -1);
    triggerToast(`Won ₹${formatINR(rewardCoins)} from spin!`, rewardCoins);
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-white">
      {/* Styles for red marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 12s linear infinite;
        }
      `}</style>

      {/* Available Offers Header exactly matching Screenshot 1 */}
      <div className="flex items-center justify-between pt-4 px-1">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-white tracking-tight">
            Available Offers
          </h2>
          <p className="text-xs text-zinc-400 font-medium">
            Complete offers to earn spins
          </p>
        </div>

        {/* Spins Badge Card matching top-right pill */}
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl">
          <Dices className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-black text-white font-mono">
            {user.spins !== undefined ? user.spins : 9}
          </span>
        </div>
      </div>

      {/* Offers Card List */}
      <div className="flex flex-col gap-3.5">
        {/* Weekly Ad Challenge Card (Watch 25 Ads, Weekly Twice Limit) */}
        <div className="p-5 rounded-[24px] bg-gradient-to-br from-zinc-900/95 via-zinc-950/98 to-zinc-900/95 border border-amber-500/20 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-1 px-3 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-white/5">
            Weekly Challenge
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="text-[14px] font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              Special Weekly Ad Challenge
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Watch a total of 25 short video ads to claim a premium record reward of <span className="text-amber-500 font-extrabold">₹25.00 cash + 2 Lucky Spins</span>. This challenge can be completed only twice a week!
            </p>

            {/* Completion Count Badges */}
            <div className="flex gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${weeklyCompletions >= 1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' : 'bg-white/5 border-white/10 text-zinc-500 font-medium'}`}>
                Record 1: {weeklyCompletions >= 1 ? 'Claimed ✓' : 'Available'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${weeklyCompletions >= 2 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' : 'bg-white/5 border-white/10 text-zinc-500 font-medium'}`}>
                Record 2: {weeklyCompletions >= 2 ? 'Claimed ✓' : 'Available'}
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="space-y-2 mt-1">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500">
                <span>PROGRESS: <span className="text-amber-500 font-black">{weeklyAdsWatched}/25 ADS</span></span>
                <span>{getRemainingTimeStr()}</span>
              </div>
              
              <div className="w-full h-3 bg-zinc-900/80 border border-white/5 rounded-full overflow-hidden relative p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weeklyAdsWatched / 25) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
              {weeklyCompletions >= 2 ? (
                <div className="w-full py-3 rounded-xl bg-zinc-800/40 border border-white/5 text-center text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                  Limit Reached: Completed 2/2 This Week
                </div>
              ) : (
                <>
                  <button
                    onClick={handleWatchChallengeAd}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all shadow-md shadow-amber-500/10"
                  >
                    Watch Ad (+1 Progress)
                  </button>
                  <button
                    onClick={handleClaimWeeklyRecord}
                    disabled={weeklyAdsWatched < 25}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-center transition-all ${
                      weeklyAdsWatched >= 25 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Claim ₹25.00 Record
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ad Offer */}
        <div className="p-5 rounded-[24px] bg-zinc-900/60 backdrop-blur-xl border border-white/5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h4 className="text-[15px] font-black text-zinc-100">
              Watch a 30s ad
            </h4>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
              Earn 1 spin
            </p>
          </div>
          {adCompleted ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 text-zinc-500 font-black text-[11px] uppercase tracking-widest text-center cursor-not-allowed"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleStartAd}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[11px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all"
            >
              Complete
            </button>
          )}
        </div>

        {/* Install Offer */}
        <div className="p-5 rounded-[24px] bg-zinc-900/60 backdrop-blur-xl border border-white/5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h4 className="text-[15px] font-black text-zinc-100">
              Install an app
            </h4>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
              Earn 1 spin
            </p>
          </div>
          {appCompleted ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 text-zinc-500 font-black text-[11px] uppercase tracking-widest text-center cursor-not-allowed"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleStartApp}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[11px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all"
            >
              Complete
            </button>
          )}
        </div>

        {/* Survey Offer */}
        <div className="p-5 rounded-[24px] bg-zinc-900/60 backdrop-blur-xl border border-white/5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h4 className="text-[15px] font-black text-zinc-100">
              Complete a survey
            </h4>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
              Earn 1 spin
            </p>
          </div>
          {surveyCompleted ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 text-zinc-500 font-black text-[11px] uppercase tracking-widest text-center cursor-not-allowed"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleStartSurvey}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[11px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Red Marquee Capsule */}
      <div className="w-full bg-red-600 rounded-[28px] overflow-hidden border border-red-500/20 shadow-lg shadow-red-600/10 py-3 px-4 flex items-center">
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee text-[11px] font-black uppercase tracking-wider text-white">
            ⚡ Dynamic real-time execution node synchronization completely active. ⚡
          </div>
        </div>
      </div>

      {/* Show/Hide Spin Wheel Toggle Button */}
      <button
        onClick={() => setShowWheel(!showWheel)}
        className="w-full py-4 rounded-[24px] bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
      >
        <Dices className="w-4 h-4" />
        {showWheel ? 'Hide Wheel' : 'Show Spin Wheel'}
      </button>

      {/* Spin Wheel Component shown dynamically */}
      <AnimatePresence>
        {showWheel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SpinWheel
              userSpins={user.spins !== undefined ? user.spins : 9}
              onSpinResult={handleSpinResult}
              triggerToast={(msg) => triggerToast(msg)}
              spinCount={user.history.filter(tx => tx.id.startsWith('tx-spin-reward-')).length}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Simulation Modal */}
      <AnimatePresence>
        {activeAdSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-6 text-center shadow-2xl relative">
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-sm uppercase font-black tracking-widest mb-4 inline-block">
                Sponsored Video Simulation
              </span>
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Simulating Video Ad Stream
              </h3>
              <p className="text-[11px] text-zinc-400 mb-6">
                Please wait {adCountdown}s to complete the monetization loop securely.
              </p>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* App Install Simulation Modal */}
      <AnimatePresence>
        {activeAppSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-6 text-center shadow-2xl relative">
              <span className="text-[10px] bg-orange-500 text-black px-2 py-0.5 rounded-sm uppercase font-black tracking-widest mb-4 inline-block">
                Interactive Install Simulation
              </span>
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Downloading Sponsor App
              </h3>
              <p className="text-[11px] text-zinc-400 mb-6">
                Verifying virtual installation status ({appProgress}%).
              </p>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${appProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Survey Simulation Modal */}
      <AnimatePresence>
        {activeSurveySim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-sm uppercase font-black tracking-widest">
                  Quick Survey
                </span>
                <span className="text-xs text-zinc-500 font-bold">Step {surveyStep} of 2</span>
              </div>

              {surveyStep === 1 ? (
                <div>
                  <h4 className="text-[13px] font-black text-zinc-100 leading-snug mb-4">
                    Which reward type do you complete most often in the simulator?
                  </h4>
                  <div className="space-y-2">
                    {['Lucky Spins', 'Instant UPI Withdrawals', 'Referral Bonuses', 'Ad Placements'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => handleSurveyAnswer(1)}
                        className="w-full p-3 bg-zinc-900 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 text-left hover:border-amber-500/30 active:scale-98 transition-all cursor-pointer"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-[13px] font-black text-zinc-100 leading-snug mb-4">
                    Do you recommend adding more dynamic wheel configurations?
                  </h4>
                  <div className="space-y-2">
                    {['Yes, absolutely', 'Maybe in next release', 'Prefer direct cashouts'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => handleSurveyAnswer(2)}
                        className="w-full p-3 bg-zinc-900 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 text-left hover:border-amber-500/30 active:scale-98 transition-all cursor-pointer"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Classic Alert Modal mimicking screenshot exactly */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-zinc-900 rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col"
            >
              {/* Alert Content */}
              <div className="p-6 text-center flex flex-col gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Alert
                </h3>
                <p className="text-[13px] text-zinc-300 font-medium leading-relaxed">
                  {alertMessage}
                </p>
              </div>

              {/* Thick divider and centered OK button */}
              <div className="w-full border-t border-white/10">
                <button
                  onClick={handleAlertConfirm}
                  className="w-full py-4 text-center text-sm font-black text-orange-400 hover:text-orange-300 hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer uppercase tracking-widest"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
