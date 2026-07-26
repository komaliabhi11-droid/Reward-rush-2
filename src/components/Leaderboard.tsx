import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, CheckCircle2, Coins, AlertCircle, Loader2, X, ExternalLink
} from 'lucide-react';
import { UserState } from '../types';
import { auth } from '../lib/firebase';

interface LeaderboardProps {
  user: UserState;
  onCompleteTask: (id: string, reward: number, title: string, status?: 'pending' | 'completed') => void;
  themeMode?: 'oled' | 'cool-gray';
  onSetActiveTab?: (tab: string) => void;
  onRefreshUserData?: (creditedSurvey?: boolean) => Promise<void>;
}

interface SurveyPartner {
  id: string;
  name: string;
  logoText: string;
  logoColor: string;
  tagline: string;
  isComingSoon: boolean;
  reward: number;
}

const SURVEY_PARTNERS: SurveyPartner[] = [
  {
    id: 'cpx',
    name: 'CPX Research',
    logoText: 'CPX',
    logoColor: 'text-emerald-400',
    tagline: 'Premium surveys & offers',
    isComingSoon: false,
    reward: 280
  },
  {
    id: 'bitlabs',
    name: 'BitLabs',
    logoText: 'BL',
    logoColor: 'text-blue-500',
    tagline: 'Crypto rewards surveys',
    isComingSoon: true,
    reward: 0
  },
  {
    id: 'timewall',
    name: 'TimeWall',
    logoText: 'TW',
    logoColor: 'text-teal-400',
    tagline: 'Earn while you browse',
    isComingSoon: true,
    reward: 0
  },
  {
    id: 'realopinion',
    name: 'RealOpinion',
    logoText: 'RO',
    logoColor: 'text-amber-500',
    tagline: 'Share your opinions',
    isComingSoon: true,
    reward: 0
  },
  {
    id: 'theoremreach',
    name: 'TheoremReach',
    logoText: 'TR',
    logoColor: 'text-pink-400',
    tagline: 'Research surveys',
    isComingSoon: true,
    reward: 0
  }
];

export default function Leaderboard({ 
  user, 
  onCompleteTask, 
  themeMode = 'oled', 
  onSetActiveTab,
  onRefreshUserData
}: LeaderboardProps) {
  const isOled = themeMode === 'oled';
  const cardBg = isOled ? 'bg-zinc-950/60 backdrop-blur-xl border-white/10' : 'bg-[#0f172a]/60 backdrop-blur-xl border-slate-800';

  // State for active survey simulation
  const [activeSurvey, setActiveSurvey] = useState<SurveyPartner | null>(null);
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [showSurveyCompletion, setShowSurveyCompletion] = useState(false);

  // CPX Real Offerwall States
  const [showCpxOfferwall, setShowCpxOfferwall] = useState(false);
  const [cpxLoading, setCpxLoading] = useState(true);
  const [cpxError, setCpxError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [cpxUrl, setCpxUrl] = useState<string>('');
  const [openInNewTabMode, setOpenInNewTabMode] = useState<boolean>(false);

  // Handle opening CPX in a new tab helper
  const handleOpenCpxInNewTab = (urlToOpen?: string) => {
    const targetUrl = urlToOpen || cpxUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  // Safety loading timeout for CPX Research. If iframe load fails/hangs, prompt or open in new tab
  useEffect(() => {
    let timer: any;
    if (showCpxOfferwall && cpxLoading && cpxUrl && !openInNewTabMode) {
      timer = setTimeout(() => {
        // If still loading in iframe after 8 seconds, trigger graceful fallback to new tab
        console.warn("CPX iframe load timed out. Falling back to secure new tab.");
        setCpxLoading(false);
        setCpxError(true);
        handleOpenCpxInNewTab();
      }, 8000);
    }
    return () => clearTimeout(timer);
  }, [showCpxOfferwall, cpxLoading, iframeKey, cpxUrl, openInNewTabMode]);

  // Return/Focus listener to refresh wallet & return user to dashboard when they return from CPX Offerwall
  useEffect(() => {
    const handleReturnToApp = async () => {
      if (showCpxOfferwall && cpxUrl) {
        // Close overlay
        setShowCpxOfferwall(false);
        
        // Reset URL
        setCpxUrl('');
        
        // Navigate back to the Reward Rush dashboard
        if (onSetActiveTab) {
          onSetActiveTab('dashboard');
        }
        
        // Refresh balance, rewards, history immediately with simulated credits
        if (onRefreshUserData) {
          await onRefreshUserData(true);
        }
      }
    };

    window.addEventListener('focus', handleReturnToApp);
    return () => {
      window.removeEventListener('focus', handleReturnToApp);
    };
  }, [showCpxOfferwall, cpxUrl, onSetActiveTab, onRefreshUserData]);

  const handleStartSurvey = async (partner: SurveyPartner) => {
    if (partner.id === 'cpx') {
      setCpxLoading(true);
      setCpxError(false);
      setShowCpxOfferwall(true);

      try {
        const uid = auth.currentUser?.uid || 'guest_user';
        
        // Fetch the MD5 secure hash dynamically generated from our backend logic
        const response = await fetch(`/api/cpx-hash?uid=${encodeURIComponent(uid)}`);
        if (!response.ok) {
          throw new Error('Backend failed to generate secure hash signature');
        }
        const data = await response.json();
        
        if (data.success && data.secure_hash) {
          // Build the CPX URL dynamically using: app_id = 34409, ext_user_id = Firebase UID, and secure_hash
          const dynamicUrl = `https://offers.cpx-research.com/index.php?app_id=34409&ext_user_id=${encodeURIComponent(uid)}&secure_hash=${data.secure_hash}`;
          setCpxUrl(dynamicUrl);
          
          if (openInNewTabMode) {
            // Automatically open in new tab if toggled
            window.open(dynamicUrl, '_blank');
          }
        } else {
          throw new Error('Invalid backend hash structure');
        }
      } catch (err) {
        console.error('Failed to construct dynamic CPX URL:', err);
        setCpxError(true);
        setCpxLoading(false);
      }
    } else {
      setActiveSurvey(partner);
      setSurveyStep(1);
      setSurveyAnswers([]);
    }
  };

  const handleAnswerSurvey = (answer: string) => {
    const nextAnswers = [...surveyAnswers, answer];
    setSurveyAnswers(nextAnswers);

    if (surveyStep < 3) {
      setSurveyStep(surveyStep + 1);
    } else {
      // Completed!
      const currentReward = activeSurvey ? activeSurvey.reward : 150;
      const currentName = activeSurvey ? activeSurvey.name : 'Partner Survey';
      
      onCompleteTask(`tx-survey-${Date.now()}`, currentReward, `Completed Survey: ${currentName}`);
      setShowSurveyCompletion(true);
      setActiveSurvey(null);
      setSurveyStep(0);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-white">
      {/* Title Header exactly matching the screenshot */}
      <div className="flex flex-col gap-1.5 pt-4">
        <h2 className="text-3xl font-black text-white tracking-tight">
          Survey Partners
        </h2>
        <p className="text-xs text-zinc-400 font-medium tracking-wide">
          Complete surveys from trusted partners
        </p>
      </div>

      {/* Grid of cards exactly matching the screenshot */}
      <div className="grid grid-cols-2 gap-3.5">
        {SURVEY_PARTNERS.map((partner) => {
          return (
            <div
              key={partner.id}
              className={`p-5 rounded-[32px] border ${cardBg} flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 ${
                partner.isComingSoon ? 'opacity-70' : 'hover:border-amber-500/20'
              }`}
            >
              {/* Optional Coming Soon badge */}
              {partner.isComingSoon && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] text-zinc-500 font-black uppercase tracking-wider whitespace-nowrap">
                  Coming Soon
                </div>
              )}

              {/* Logo Area */}
              <div className={`w-24 h-24 rounded-[28px] bg-zinc-900/40 border border-white/5 flex items-center justify-center shrink-0 relative ${
                partner.isComingSoon ? 'mt-4 mb-4' : 'mb-4'
              }`}>
                <span className={`text-2xl font-black tracking-wide ${partner.logoColor}`}>
                  {partner.logoText}
                </span>
              </div>

              {/* Title & Tagline */}
              <h4 className="text-xs font-black text-zinc-100 uppercase tracking-wide truncate max-w-full">
                {partner.name}
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mt-1 mb-4 h-7 line-clamp-2">
                {partner.tagline}
              </p>

              {/* Button */}
              {partner.isComingSoon ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/5 text-zinc-500 font-extrabold text-[10px] uppercase tracking-wider text-center cursor-not-allowed"
                >
                  Coming Soon
                </button>
              ) : (
                <button
                  onClick={() => handleStartSurvey(partner)}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-[11px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/10"
                >
                  Open
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive 3-step Survey Modal simulation overlay */}
      <AnimatePresence>
        {activeSurvey && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-3xl ${
                isOled ? 'bg-[#050505] border border-white/10' : 'bg-[#0f172a] border border-slate-800'
              } p-6 shadow-2xl relative overflow-hidden`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] bg-orange-500 text-black px-1.5 py-0.5 rounded-sm uppercase font-black tracking-widest">
                  Live Survey
                </span>
                <span className="text-[10px] text-zinc-500 font-bold">Step {surveyStep} of 3</span>
              </div>

              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">
                {activeSurvey.name}
              </h4>

              {/* Dynamic question steps */}
              {surveyStep === 1 && (
                <div>
                  <p className="text-[13px] font-bold text-zinc-100 leading-snug mb-4">
                    What is your primary operating system for extracting research rewards?
                  </p>
                  <div className="space-y-2">
                    {['Android Mobile Node', 'Apple iOS Device', 'Desktop Linux/Unix', 'Windows PC Simulator'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => handleAnswerSurvey(ans)}
                        className="w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-[11px] font-bold text-zinc-300 hover:border-orange-500/30 text-left transition-all active:scale-98 cursor-pointer"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {surveyStep === 2 && (
                <div>
                  <p className="text-[13px] font-bold text-zinc-100 leading-snug mb-4">
                    How many interactive placements do you test on average every single week?
                  </p>
                  <div className="space-y-2">
                    {['1 - 5 Placements', '6 - 20 Placements', 'More than 20 Placements', 'Only check-in daily'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => handleAnswerSurvey(ans)}
                        className="w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-[11px] font-bold text-zinc-300 hover:border-orange-500/30 text-left transition-all active:scale-98 cursor-pointer"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {surveyStep === 3 && (
                <div>
                  <p className="text-[13px] font-bold text-zinc-100 leading-snug mb-4">
                    Would you recommend this simulated sandbox layout to other app developers?
                  </p>
                  <div className="space-y-2">
                    {['Yes, absolutely premium', 'It has high potential', 'Needs minor polish', 'Prefer full-stack integrations'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => handleAnswerSurvey(ans)}
                        className="w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-[11px] font-bold text-zinc-300 hover:border-orange-500/30 text-left transition-all active:scale-98 cursor-pointer"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quit trigger */}
              <button
                onClick={() => {
                  setActiveSurvey(null);
                  setSurveyStep(0);
                }}
                className="mt-5 w-full text-center text-[10px] text-zinc-500 uppercase tracking-widest font-black hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Quit Survey
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Survey success complete modal */}
      <AnimatePresence>
        {showSurveyCompletion && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-linear-to-b from-zinc-900 to-black border border-white/10 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-black uppercase text-white tracking-wide">Research Panel Finished</h3>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                Thank you for submitting feedback. Your sandbox account balance has been successfully credited!
              </p>

              <button
                onClick={() => setShowSurveyCompletion(false)}
                className="mt-5 w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Accept Rewards
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real CPX Research Offerwall Modal Overlay */}
      <AnimatePresence>
        {showCpxOfferwall && (
          <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 p-4">
            {/* Header with Back/Close and Mode toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 mb-4 gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-md uppercase font-black tracking-widest leading-none">
                  LIVE
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  CPX Research Offerwall
                </h3>
              </div>
              
              {/* Controls inside header */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Embedded vs New Tab Mode Selector */}
                <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => {
                      setOpenInNewTabMode(false);
                      setIframeKey(prev => prev + 1);
                      setCpxLoading(true);
                      setCpxError(false);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${!openInNewTabMode ? 'bg-zinc-800 text-white border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Embedded
                  </button>
                  <button
                    onClick={() => {
                      setOpenInNewTabMode(true);
                      handleOpenCpxInNewTab();
                    }}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${openInNewTabMode ? 'bg-zinc-800 text-white border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    New Tab
                  </button>
                </div>

                {/* Close button */}
                <button
                  onClick={async () => {
                    setShowCpxOfferwall(false);
                    setCpxUrl('');
                    if (onSetActiveTab) {
                      onSetActiveTab('dashboard');
                    }
                    if (onRefreshUserData) {
                      await onRefreshUserData(false); // Silent check on close
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Stage Wrapper */}
            <div className="flex-1 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 relative flex flex-col items-center justify-center">
              {openInNewTabMode ? (
                /* Beautiful dashboard view for New Tab Mode */
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto gap-5">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <ExternalLink className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Offerwall Active in New Tab
                    </h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Complete surveys and high-paying offers in the secure CPX Research browser tab.
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                      Once you finish or switch back, your Reward Rush coins balance, surveys, and transactions ledger will automatically refresh!
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      onClick={() => handleOpenCpxInNewTab()}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Offerwall Now
                    </button>
                    
                    <button
                      onClick={async () => {
                        setShowCpxOfferwall(false);
                        setCpxUrl('');
                        if (onSetActiveTab) {
                          onSetActiveTab('dashboard');
                        }
                        if (onRefreshUserData) {
                          await onRefreshUserData(true); // Manually trigger return refresh
                        }
                      }}
                      className="w-full py-2.5 bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer border border-white/5"
                    >
                      I returned, sync my balance!
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Embedded Iframe Mode */
                <>
                  {cpxLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-3.5 z-10">
                      <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse">
                        Connecting to CPX survey engine...
                      </span>
                    </div>
                  )}

                  {cpxError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center gap-4 z-20">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col gap-1 max-w-[260px]">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">
                          Iframe Connection Blocked
                        </h3>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          CPX security headers or browser protections are blocking embedded iframe loading on this domain.
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs mt-2">
                        <button
                          onClick={() => {
                            setOpenInNewTabMode(true);
                            handleOpenCpxInNewTab();
                          }}
                          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in Tab Instead
                        </button>
                        <button
                          onClick={() => {
                            setCpxError(false);
                            setCpxLoading(true);
                            setIframeKey(prev => prev + 1);
                          }}
                          className="flex-1 py-2.5 bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-750 active:scale-95 transition-all cursor-pointer border border-white/5"
                        >
                          Retry Iframe
                        </button>
                      </div>
                    </div>
                  )}

                  {cpxUrl && (
                    <iframe
                      key={iframeKey}
                      src={cpxUrl}
                      className={`w-full h-full border-none bg-zinc-950 ${cpxLoading || cpxError ? 'hidden' : 'block'}`}
                      onLoad={() => setCpxLoading(false)}
                      onError={() => {
                        setCpxLoading(false);
                        setCpxError(true);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
