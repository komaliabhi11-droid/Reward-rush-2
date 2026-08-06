import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Settings, Sparkles, Coins, X, Loader2, AlertCircle, ExternalLink, RefreshCw, Search, Filter, ArrowDownUp, Clock, ThumbsUp, ChevronLeft, Building2, Landmark, Play, LayoutGrid, Gamepad2 } from 'lucide-react';
import { UserState } from '../types';
import { auth } from '../lib/firebase';

interface DashboardProps {
  user: UserState;
  uid?: string;
  onClaimDaily: () => void;
  onOpenCalendar?: () => void;
  onOpenAiDesk?: () => void;
  onOpenFaq?: () => void;
  themeMode?: 'oled' | 'cool-gray';
  onTabChange?: (tab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile') => void;
  onRefreshUserData?: (creditedSurvey?: boolean) => Promise<void>;
}

const TABS = ["Prime Surveys", "Survey Rewards", "Playtime", "Play & Earn"];

const PARTNERS = [
  { id: "pubscale", name: "PubScale", logoUrl: "https://pubscale.com/favicon.ico", initial: "P", color: "bg-amber-500/10 text-amber-500" },
  { id: "growdeck", name: "grow.deck", logoUrl: "https://growdeck.com/favicon.ico", initial: "G", color: "bg-amber-500/10 text-amber-500" },
  { id: "mychips", name: "myChips", logoUrl: "https://mychips.com/favicon.ico", initial: "M", color: "bg-amber-500/10 text-amber-500" },
  { id: "adscend", name: "AdscendMedia", logoUrl: "https://adscendmedia.com/favicon.ico", initial: "A", color: "bg-amber-500/10 text-amber-500" },
  { id: "gemiad", name: "GemiAd", logoUrl: "https://gemiad.com/favicon.ico", initial: "G", color: "bg-amber-500/10 text-amber-500" },
  { id: "playtime", name: "Playtime", logoUrl: "", initial: "P", color: "bg-amber-500/10 text-amber-500" },
];

const OFFERS = [
  { 
    id: "lordsmobile", 
    title: "Lords Mobile: Kingdom Wars", 
    logoUrl: "https://play-lh.googleusercontent.com/9R7aV1Gj1F8d1dG3fN_6d2G6H8l4Lz3Tz1_9k8QZ7_3R2w2e-Xv4gG4f2G5D8Z9x3w=s180-rw", 
    category: "Game", 
    reward: "12,450", 
    time: "2 hrs", 
    likes: "5K+", 
    bg: "bg-orange-950" 
  },
  { 
    id: "familyisland", 
    title: "Family Island™ — Farming game", 
    logoUrl: "https://play-lh.googleusercontent.com/4J1D1n8U8k1_5d6A3R2R5F2_R1T4K_3V_9X9T8B6W3q4L2s4y8G_9Y_8W7c2r6V2_3w=s180-rw", 
    category: "Game", 
    reward: "8,920", 
    time: "45 mins", 
    likes: "1.2K", 
    bg: "bg-amber-950" 
  },
  { 
    id: "raid", 
    title: "RAID: Shadow Legends", 
    logoUrl: "https://play-lh.googleusercontent.com/bK-TkhB194yA6B6eP_Q3f5D23S14q6eYFvD_bY8R2Q=s180-rw", 
    category: "Game", 
    reward: "15,000", 
    time: "1 day", 
    likes: "10K+", 
    bg: "bg-orange-950" 
  },
  { 
    id: "monopolygo", 
    title: "Monopoly GO!", 
    logoUrl: "https://images.unsplash.com/photo-1585504198199-20277593b94f?auto=format&fit=crop&w=200&h=200&q=80", 
    category: "Game", 
    reward: "18,500", 
    time: "1.5 hrs", 
    likes: "15K+", 
    bg: "bg-amber-950" 
  },
  { 
    id: "braintest", 
    title: "Brain Test: Tricky Puzzles", 
    logoUrl: "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=200&h=200&q=80", 
    category: "Game", 
    reward: "6,800", 
    time: "30 mins", 
    likes: "8.2K", 
    bg: "bg-orange-950" 
  },
  { 
    id: "coinmaster", 
    title: "Coin Master", 
    logoUrl: "https://play-lh.googleusercontent.com/N6gQ0z_xH3D4gC2K9a3Q8Y7T_9W7T_9R_9V_9c_8X_3Y_9W_9R_9V_9c_8X=s180-rw", 
    category: "Game", 
    reward: "14,200", 
    time: "1 hr", 
    likes: "12K+", 
    bg: "bg-amber-950" 
  },
  { 
    id: "matchmasters", 
    title: "Match Masters", 
    logoUrl: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&w=200&h=200&q=80", 
    category: "Game", 
    reward: "9,600", 
    time: "40 mins", 
    likes: "7.5K", 
    bg: "bg-orange-950" 
  },
  { 
    id: "cashgiraffe", 
    title: "Cash Giraffe — Play & Earn", 
    logoUrl: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=200&h=200&q=80", 
    category: "Game", 
    reward: "11,500", 
    time: "25 mins", 
    likes: "6.1K", 
    bg: "bg-amber-950" 
  }
];

// Memory cache to prevent image flickering during UI re-renders
const imageCache: Record<string, string> = {};

interface OfferImageProps {
  src?: string;
  alt: string;
  fallbackIcon?: React.ComponentType<any>;
}

export function OfferImage({ src, alt, fallbackIcon: FallbackIcon = Gamepad2 }: OfferImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() => {
    if (!src) return 'error';
    if (imageCache[src]) return 'loaded';
    return 'loading';
  });

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }
    if (imageCache[src]) {
      setStatus('loaded');
      return;
    }

    setStatus('loading');
    const img = new Image();
    img.src = src;
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      imageCache[src] = src;
      setStatus('loaded');
    };
    img.onerror = () => {
      setStatus('error');
    };
  }, [src]);

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 animate-pulse rounded-xl">
        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 rounded-xl">
        <FallbackIcon className="w-6 h-6 text-zinc-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="w-full h-full object-contain p-1 rounded-xl"
    />
  );
}

export default function Dashboard({
  user,
  uid,
  onOpenFaq,
  themeMode = "oled",
  onTabChange,
  onRefreshUserData
}: DashboardProps) {
  const [showPubScaleModal, setShowPubScaleModal] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Return/Focus listener to refresh user data automatically when they return
  useEffect(() => {
    const handleReturnToApp = async () => {
      if (onRefreshUserData) {
        await onRefreshUserData(false); // Silent check on returning focus
      }
    };
    window.addEventListener('focus', handleReturnToApp);

    return () => {
      window.removeEventListener('focus', handleReturnToApp);
    };
  }, [onRefreshUserData]);

  const handleStartTask = () => {
    const userId = uid || '';
    if (!userId) {
      alert("Please log in to complete tasks.");
      return;
    }
    
    // In a real app, this would get the actual app_id from environment or config
    setIframeLoading(true);
    setIframeError(false);
    setShowPubScaleModal(true);
  };

  const handleCloseModal = async () => {
    setShowPubScaleModal(false);
    if (onRefreshUserData) {
      await onRefreshUserData(true); // Sync coins immediately upon returning
    }
  };

  const handleReloadIframe = () => {
    setIframeLoading(true);
    setIframeError(false);
    setIframeKey(prev => prev + 1);
  };

  const appId = '20973478';
  const resolvedUid = uid || auth.currentUser?.uid || '';
  const targetUrl = `https://wow.pubscale.com?app_id=${appId}&user_id=${resolvedUid}`;

  useEffect(() => {
    if (showPubScaleModal) {
      console.log(`[PubScale URL Debug] Opening Offerwall. Target URL: ${targetUrl}`);
    }
  }, [showPubScaleModal, targetUrl]);

  return (
    <div className="h-full min-h-[500px] flex flex-col items-center justify-start text-center relative px-4 select-none pb-20">
      
      {/* Top Tabs */}
      <div className="w-full flex overflow-x-auto gap-4 py-4 px-1 mt-2 scrollbar-hide snap-x">
        {TABS.map((tab, idx) => (
          <button key={tab} className={`shrink-0 snap-start text-sm font-black whitespace-nowrap ${idx === 0 ? 'text-white border-b-2 border-white pb-1' : 'text-zinc-500 hover:text-zinc-300'} transition-all`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col gap-4 mt-6 px-1">
        {/* Task Partners Section */}
        <div className="text-left w-full">
          <div className="flex items-center gap-2 mb-3">
            <button className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-white">Task Partners</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {PARTNERS.map(p => (
              <div key={p.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-white/10 transition-all cursor-pointer relative group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black overflow-hidden bg-zinc-800 ${p.color}`}>
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover p-2" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = p.initial; }} />
                  ) : (
                    p.initial
                  )}
                </div>
                <span className="text-[11px] font-bold text-zinc-300 text-center leading-tight h-8 flex items-center justify-center">{p.name}</span>
                <button onClick={handleStartTask} className="mt-1 bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full group-hover:bg-amber-500 group-hover:text-black transition-all w-full">
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Offer Cards */}
        <div className="flex flex-col gap-4 mt-2">
          {OFFERS.map(offer => (
            <div key={offer.id} onClick={handleStartTask} className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col cursor-pointer hover:border-amber-500/20 active:scale-[0.98] transition-all duration-300">
              <div className="p-4 flex gap-4 text-white">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-zinc-950 border border-white/5 shadow-inner overflow-hidden relative">
                  <OfferImage src={offer.logoUrl} alt={offer.title} />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="text-sm font-black text-white leading-tight mb-3 text-left">{offer.title}</h4>
                  <div className="flex items-center justify-between mt-auto">
                    <button className="border border-white/10 text-zinc-400 text-[11px] font-black uppercase tracking-wider py-1.5 px-3 rounded-full hover:bg-white/5 hover:text-white transition-all pointer-events-none">
                      Register and Earn
                    </button>
                    <button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black text-xs font-black py-1.5 px-4 rounded-xl shadow-md shadow-amber-500/10 flex items-center gap-1.5 transition-all pointer-events-none">
                      <Coins className="w-4 h-4 text-black" />
                      {offer.reward}
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-amber-500/10 border-t border-white/5 px-4 py-2 flex items-center justify-between text-amber-500 text-xs font-bold">
                <div className="flex items-center gap-1.5 opacity-90">
                  <Clock className="w-3.5 h-3.5" />
                  {offer.time}
                </div>
                <div className="flex items-center gap-1.5 opacity-90">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {offer.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onOpenFaq}
        className="mt-8 flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-black uppercase tracking-wider"
      >
        <AlertCircle className="w-4 h-4" />
        How do rewards work?
      </button>

      {/* Full-Screen Iframe Modal for PubScale */}
      <AnimatePresence>
        {showPubScaleModal && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="h-14 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <span className="font-black text-sm">P</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold leading-tight">PubScale Offerwall</span>
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider">Earn Coins</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleReloadIframe}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                  title="Reload"
                >
                  <RefreshCw className={`w-4 h-4 ${iframeLoading ? 'animate-spin text-amber-500' : ''}`} />
                </button>
                <button 
                  onClick={handleCloseModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe Container */}
            <div className="flex-1 bg-zinc-950 relative w-full h-full">
              {iframeLoading && !iframeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                  <span className="text-zinc-400 text-sm font-bold animate-pulse">Connecting to PubScale...</span>
                  <span className="text-zinc-600 text-xs mt-2 font-mono">{appId}</span>
                </div>
              )}
              
              {iframeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-zinc-950 p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                  <h3 className="text-white text-lg font-black mb-2">Connection Failed</h3>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed mb-6">
                    We couldn't connect to the PubScale offerwall. Please check your internet connection or try again later.
                  </p>
                  <button 
                    onClick={handleReloadIframe}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-full font-black text-sm transition-all active:scale-95"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              <iframe 
                key={iframeKey}
                src={targetUrl}
                className={`w-full h-full border-0 transition-opacity duration-500 ${iframeLoading ? 'opacity-0' : 'opacity-100'}`}
                allow="camera; microphone; geolocation"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => {
                  console.log("Iframe loaded successfully");
                  setIframeLoading(false);
                  setIframeError(false);
                }}
                onError={() => {
                  console.error("Iframe failed to load");
                  setIframeLoading(false);
                  setIframeError(true);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
