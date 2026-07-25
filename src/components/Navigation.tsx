import React from 'react';
import { CheckCircle2, Dice5, History, ClipboardList, User } from 'lucide-react';

interface NavigationProps {
  activeTab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile';
  onTabChange: (tab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile') => void;
  themeMode?: 'oled' | 'cool-gray';
}

export default function Navigation({ activeTab, onTabChange, themeMode = 'oled' }: NavigationProps) {
  const activeText = 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,124,0,0.5)]';
  const dotBg = 'bg-amber-500 shadow-[0_0_10px_#ff9800]';

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-20 bg-black/95 backdrop-blur-2xl border-t border-white/5 px-2 flex items-center justify-around z-40">
      
      {/* Tab 1: Tasks */}
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-2xl transition-all duration-300 relative ${
          activeTab === 'dashboard'
            ? `${activeText} scale-105 font-black`
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <CheckCircle2 className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
        <span className="text-[9px] tracking-widest uppercase font-extrabold font-sans">Tasks</span>
        {activeTab === 'dashboard' && (
          <span className={`absolute -top-1 w-1.5 h-1.5 ${dotBg} rounded-full`} />
        )}
      </button>

      {/* Tab 2: Offers */}
      <button
        onClick={() => onTabChange('earn')}
        className={`flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-2xl transition-all duration-300 relative ${
          activeTab === 'earn'
            ? `${activeText} scale-105 font-black`
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Dice5 className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'earn' ? 'scale-110' : ''}`} />
        <span className="text-[9px] tracking-widest uppercase font-extrabold font-sans">Offers</span>
        {activeTab === 'earn' && (
          <span className={`absolute -top-1 w-1.5 h-1.5 ${dotBg} rounded-full`} />
        )}
      </button>

      {/* Tab 3: Logs */}
      <button
        onClick={() => onTabChange('redeem')}
        className={`flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-2xl transition-all duration-300 relative ${
          activeTab === 'redeem'
            ? `${activeText} scale-105 font-black`
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <History className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'redeem' ? 'scale-110' : ''}`} />
        <span className="text-[9px] tracking-widest uppercase font-extrabold font-sans">Logs</span>
        {activeTab === 'redeem' && (
          <span className={`absolute -top-1 w-1.5 h-1.5 ${dotBg} rounded-full`} />
        )}
      </button>

      {/* Tab 4: Surveys */}
      <button
        onClick={() => onTabChange('leaderboard')}
        className={`flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-2xl transition-all duration-300 relative ${
          activeTab === 'leaderboard'
            ? `${activeText} scale-105 font-black`
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <ClipboardList className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'leaderboard' ? 'scale-110' : ''}`} />
        <span className="text-[9px] tracking-widest uppercase font-extrabold font-sans">Surveys</span>
        {activeTab === 'leaderboard' && (
          <span className={`absolute -top-1 w-1.5 h-1.5 ${dotBg} rounded-full`} />
        )}
      </button>

      {/* Tab 5: Profile */}
      <button
        onClick={() => onTabChange('profile')}
        className={`flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-2xl transition-all duration-300 relative ${
          activeTab === 'profile'
            ? `${activeText} scale-105 font-black`
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <User className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'profile' ? 'scale-110' : ''}`} />
        <span className="text-[9px] tracking-widest uppercase font-extrabold font-sans">Profile</span>
        {activeTab === 'profile' && (
          <span className={`absolute -top-1 w-1.5 h-1.5 ${dotBg} rounded-full`} />
        )}
      </button>

    </nav>
  );
}
