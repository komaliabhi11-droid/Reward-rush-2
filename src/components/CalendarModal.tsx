import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, X, Check, Clock, Award, Sparkles, Coins, Lock } from 'lucide-react';
import { UserState } from '../types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserState;
  onClaimDaily: () => void;
  themeMode?: 'oled' | 'cool-gray';
  inline?: boolean;
}

export default function CalendarModal({
  isOpen,
  onClose,
  user,
  onClaimDaily,
  themeMode = 'oled',
  inline = false
}: CalendarModalProps) {
  const isOled = themeMode === 'oled';
  
  // Calculate checked in & streak state based on 24/48 hr lapse
  let isCheckedInToday = false;
  let effectiveStreak = user.dailyStreak;

  if (user.lastCheckIn) {
    const lastCheckInTime = new Date(user.lastCheckIn).getTime();
    const elapsed = Date.now() - lastCheckInTime;
    if (elapsed < 24 * 60 * 60 * 1000) {
      isCheckedInToday = true;
    } else if (elapsed > 48 * 60 * 60 * 1000) {
      effectiveStreak = 0; // Reset streak if missed more than 48 hours
    }
  }

  // Countdown timer calculation
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      if (!user.lastCheckIn) {
        setCountdown('Available Now');
        return;
      }
      const lastCheckInTime = new Date(user.lastCheckIn).getTime();
      const nextClaimTime = lastCheckInTime + 24 * 60 * 60 * 1000;
      const diff = nextClaimTime - Date.now();

      if (diff <= 0) {
        setCountdown('Available Now');
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setCountdown(
        `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user.lastCheckIn]);

  // Streak rewards list representing the values in Rupees
  const streakRewards = [
    { day: 1, amount: 0.10, label: '₹0.10' },
    { day: 2, amount: 0.20, label: '₹0.20' },
    { day: 3, amount: 0.30, label: '₹0.30' },
    { day: 4, amount: 0.40, label: '₹0.40' },
    { day: 5, amount: 0.50, label: '₹0.50' }
  ];

  const handleClaim = () => {
    onClaimDaily();
    onClose();
  };

  const contentMarkup = (
    <div className={`w-full h-full flex flex-col ${inline ? 'p-1' : 'p-2'}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Daily Rewards
            </h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">In-App Claim Ledger</p>
          </div>
        </div>

        {!inline && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Countdown Timer Badge */}
      <div className="w-full flex justify-center mb-4">
        <div className={`border font-mono text-[10px] tracking-widest font-extrabold uppercase px-6 py-2 rounded-full text-center ${
          isCheckedInToday ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        }`}>
          {isCheckedInToday ? `Next claim in: ${countdown}` : 'Claim Bonus Available Now! 🔥'}
        </div>
      </div>

      {/* 5 Days Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {streakRewards.map((reward) => {
          const isCompleted = effectiveStreak >= reward.day;
          const isClaimableToday = !isCheckedInToday && (effectiveStreak + 1) === reward.day;
          
          return (
            <motion.div
              key={reward.day}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-between gap-2.5 transition-all duration-300 relative overflow-hidden ${
                isCompleted
                  ? 'bg-[#061c12] border-emerald-500/30 text-emerald-400'
                  : isClaimableToday
                  ? 'bg-gradient-to-tr from-amber-500/15 to-yellow-500/15 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,124,0,0.15)] animate-pulse'
                  : 'bg-zinc-950/80 border-white/5 text-zinc-500'
              } ${reward.day === 5 && 'col-span-2 sm:col-span-1'}`}
            >
              <div className="w-full flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider">Day {reward.day}</span>
                {reward.day === 5 && (
                  <span className="text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded-sm uppercase font-black tracking-widest leading-none">
                    MAX
                  </span>
                )}
              </div>

              {/* Status Graphic in the Center */}
              <div className="my-2">
                {isCompleted ? (
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Check className="w-5 h-5 stroke-[3.5]" />
                  </div>
                ) : isClaimableToday ? (
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-5 h-5 animate-spin-slow" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/5 text-zinc-600 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Display reward amount in Rupee label format */}
              <div className={`text-xs font-black tracking-wider ${isClaimableToday ? 'text-amber-300 font-extrabold' : ''}`}>
                {reward.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Button */}
      {!isCheckedInToday ? (
        <button
          onClick={handleClaim}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 transition-all duration-200 cursor-pointer text-center"
        >
          Claim Bonus
        </button>
      ) : (
        <div className="w-full py-4 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 text-xs font-black uppercase tracking-widest text-center">
          Claimed Today
        </div>
      )}

      {/* Bottom explanation text */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-zinc-600 uppercase font-black text-center">
        <Award className="w-3.5 h-3.5 text-amber-500/60" />
        <span>CONSECUTIVE 5-DAY MATRIX STREAK RESET LOCKS</span>
      </div>
    </div>
  );

  if (inline) {
    return contentMarkup;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl ${
              isOled ? 'bg-[#050505] border border-white/10' : 'bg-[#0f172a] border border-slate-800'
            } p-6 shadow-2xl relative overflow-hidden`}
          >
            {/* Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            {contentMarkup}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
