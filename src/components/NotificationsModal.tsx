import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, X, CheckCheck, Trash2, ShieldCheck, Sparkles, 
  Coins, Zap, AlertCircle, Calendar 
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO String
  isRead: boolean;
  type: 'earn' | 'redeem' | 'streak' | 'system' | 'game';
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  themeMode?: 'oled' | 'cool-gray';
}

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  themeMode = 'oled'
}: NotificationsModalProps) {
  const isOled = themeMode === 'oled';
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'earn':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Coins className="w-4.5 h-4.5" />
          </div>
        );
      case 'redeem':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5" />
          </div>
        );
      case 'streak':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Calendar className="w-4.5 h-4.5" />
          </div>
        );
      case 'game':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        );
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex justify-end"
          >
            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()} // prevent click-through
              className="w-full max-w-[320px] h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4.5 h-4.5 text-zinc-300" />
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-100">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar controls */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-b border-white/5 bg-zinc-950/40 flex items-center justify-between text-[10px]">
                  <button
                    onClick={onMarkAllRead}
                    disabled={unreadCount === 0}
                    className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all as read</span>
                  </button>
                  <button
                    onClick={onClearAll}
                    className="text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all</span>
                  </button>
                </div>
              )}

              {/* Notifications scrollable list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-3">
                      <Bell className="w-5 h-5 text-zinc-600" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400">All caught up!</span>
                    <span className="text-[10px] text-zinc-600 mt-1 max-w-[180px]">
                      Your completed tasks, daily streaks, and lucky wheel wins will show up here.
                    </span>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border relative transition-colors ${
                        notif.isRead
                          ? 'bg-black/20 border-white/5 opacity-60'
                          : 'bg-white/5 border-white/10 shadow-md'
                      }`}
                    >
                      {!notif.isRead && (
                        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                      
                      <div className="flex gap-3">
                        {getNotifIcon(notif.type)}

                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-[11px] font-bold text-zinc-200 truncate leading-tight">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                            {notif.body}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-mono mt-1.5 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            {formatTime(notif.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Informational footer */}
              <div className="p-4 border-t border-white/5 bg-black/40 text-[9px] text-zinc-600 text-center">
                Refreshed dynamically in standard localStorage sandbox.
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
