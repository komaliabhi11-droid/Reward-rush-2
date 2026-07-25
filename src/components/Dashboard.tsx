import React from 'react';
import { CheckCircle2, Settings } from 'lucide-react';
import { UserState } from '../types';

interface DashboardProps {
  user: UserState;
  onClaimDaily: () => void;
  onOpenCalendar?: () => void;
  onOpenAiDesk?: () => void;
  onOpenFaq?: () => void;
  themeMode?: 'oled' | 'cool-gray';
  onTabChange?: (tab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile') => void;
}

export default function Dashboard({ 
  user,
  onClaimDaily,
  onOpenCalendar,
  onOpenAiDesk,
  onOpenFaq,
  themeMode = 'oled',
  onTabChange
}: DashboardProps) {
  return (
    <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center relative px-4 select-none">
      {/* Centered Check Circle icon matching screenshot */}
      <div className="flex flex-col items-center justify-center flex-1">
        <CheckCircle2 className="w-20 h-20 text-zinc-700 stroke-[1.25]" />
        
        {/* Title exactly matching screenshot */}
        <h2 className="text-3xl font-black text-white tracking-tight mt-6">
          Tasks Section
        </h2>
        
        {/* Subtitle exactly matching screenshot */}
        <p className="text-sm text-zinc-400 font-medium max-w-[280px] mt-2.5 leading-relaxed">
          Your allocated workflow tasks will be populated here.
        </p>
      </div>

      {/* Settings Cog icon exactly matching screenshot placement */}
      <button 
        onClick={onOpenFaq}
        className="absolute right-1 top-[55%] -translate-y-1/2 p-2 rounded-full hover:bg-white/5 text-zinc-600 hover:text-zinc-400 active:scale-90 transition-all cursor-pointer"
        title="Settings & FAQ"
      >
        <Settings className="w-8 h-8 stroke-[1.5]" />
      </button>
    </div>
  );
}
