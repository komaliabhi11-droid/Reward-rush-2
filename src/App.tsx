import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wifi, Battery, Signal, Sparkles, Coins, Bell, Calendar } from 'lucide-react';
import { UserState, TaskItem } from './types';
import Splash from './components/Splash';
import Dashboard from './components/Dashboard';
import Earn from './components/Earn';
import Profile from './components/Profile';
import Redeem from './components/Redeem';
import Navigation from './components/Navigation';
import Leaderboard from './components/Leaderboard';
import NotificationsModal, { NotificationItem } from './components/NotificationsModal';
import CalendarModal from './components/CalendarModal';
import AiDeskModal from './components/AiDeskModal';
import FaqModal from './components/FaqModal';
import NavDurgaCoin from './components/NavDurgaCoin';

import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { mapFirestoreToUserState, mapUserStateToFirestore } from './lib/userMapping';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
const STORAGE_LOGGED_KEY = 'adreward_logged_in_sim';
const STORAGE_THEME_KEY = 'adreward_theme_mode_sim';
const STORAGE_TASKS_KEY = 'adreward_tasks_data_sim';

const INITIAL_USER_STATE: UserState = {
  email: '',
  displayName: '',
  avatarId: 'user-0',
  balance: 280, // 280 Nav Durga Coins = ₹280.00
  dailyStreak: 3,
  lastCheckIn: new Date().toISOString().split('T')[0], // already checked in today
  completedTasksCount: 3,
  spins: 9, // 9 spins
  phoneNumber: '',
  upiId: '',
  hasAddedPayoutDetails: false,
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  history: [
    {
      id: 'tx-withdraw-1',
      title: 'Withdrawal via UPI',
      amount: -100, // -100 coins = -₹100.00
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      type: 'redeem',
      status: 'pending'
    },
    {
      id: 'tx-spin-1',
      title: 'Spin wheel reward',
      amount: 30, // +30 coins = +₹30.00
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      type: 'earn',
      status: 'completed'
    },
    {
      id: 'tx-checkin-1',
      title: 'Daily Check-In Reward credited',
      amount: 20, // +20 coins = +₹20.00
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'earn',
      status: 'completed'
    },
    {
      id: 'tx-offer-1',
      title: 'Completed offer: Install app',
      amount: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      type: 'earn',
      status: 'completed'
    }
  ]
};

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'video-1',
    title: 'Watch AdSense Video Placement',
    description: 'Complete a brief 5-second simulated premium video ad placement to earn coins.',
    reward: 50,
    type: 'video',
    category: 'Video Ads',
    isCompleted: false,
    duration: 5
  },
  {
    id: 'survey-1',
    title: 'Interactive User Survey',
    description: 'Provide quick anonymous platform answers to immediately credit your wallet.',
    reward: 80,
    type: 'survey',
    category: 'Paid Survey',
    isCompleted: false
  },
  {
    id: 'install-app',
    title: 'Simulate game app install',
    description: 'Initiate a mock download of "Coin Legends" to verify action completion.',
    reward: 150,
    type: 'action',
    category: 'App Install',
    isCompleted: false
  },
  {
    id: 'newsletter',
    title: 'Subscribe to sponsor digest',
    description: 'Input email address to register with sponsor networks for reward.',
    reward: 30,
    type: 'action',
    category: 'Hot Offer',
    isCompleted: false
  }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<UserState>(INITIAL_USER_STATE);

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const data = localStorage.getItem(STORAGE_TASKS_KEY);
    return data ? JSON.parse(data) : INITIAL_TASKS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile'>('dashboard');
  const [themeMode, setThemeMode] = useState<'oled' | 'cool-gray'>(() => {
    const mode = localStorage.getItem(STORAGE_THEME_KEY);
    return (mode === 'cool-gray' ? 'cool-gray' : 'oled') as 'oled' | 'cool-gray';
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const data = localStorage.getItem('adreward_notifications');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error(e);
      }
    }
    const defaults: NotificationItem[] = [
      {
        id: 'notif-system-1',
        title: 'Welcome to AdReward!',
        body: 'Start earning simulated coins by completing placement tasks on the Earn tab.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        isRead: false,
        type: 'system'
      },
      {
        id: 'notif-system-2',
        title: 'Lucky Wheel is Now Open! 🎡',
        body: 'Spin the brand new Lucky Wheel widget in the Earn screen to win up to 100 coins!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        isRead: false,
        type: 'game'
      }
    ];
    localStorage.setItem('adreward_notifications', JSON.stringify(defaults));
    return defaults;
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAiDeskOpen, setIsAiDeskOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState('');
  const [toast, setToast] = useState<{ message: string; show: boolean; reward?: number }>({ message: '', show: false });

  const triggerToast = (message: string, reward?: number) => {
    setToast({ message, show: true, reward });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Real-time Firebase Auth state change subscription & Firestore sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Logged in: establish real-time Firestore document listener
        const docRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const mappedState = mapFirestoreToUserState(snap.data());
            setUser(mappedState);
            setIsLoggedIn(true);
          } else {
            console.warn("User profile does not exist in Firestore.");
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'users/' + firebaseUser.uid);
        });

        return () => {
          unsubscribeSnapshot();
        };
      } else {
        // Logged out
        setIsLoggedIn(false);
        setUser(INITIAL_USER_STATE);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('adreward_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Smartphone Status Bar Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // 12h format
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Authentications
  const handleLogin = (email: string) => {
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUser(INITIAL_USER_STATE);
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Reset Sandbox Utility
  const handleResetData = async () => {
    if (window.confirm('Do you want to reset all earned coins and task states to default parameters?')) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const resetUser = {
          ...INITIAL_USER_STATE,
          uid: currentUser.uid,
          email: user.email,
          fullName: user.displayName || 'Member Node'
        };
        const firestoreData = mapUserStateToFirestore(resetUser, currentUser.uid);
        await updateDoc(docRef, firestoreData);
        setTasks(INITIAL_TASKS);
        setActiveTab('dashboard');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users/' + currentUser.uid);
      }
    }
  };

  // Update Profile Customization
  const handleUpdateProfile = async (updates: Partial<UserState>) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const mergedUser = { ...user, ...updates };
      const firestoreData = mapUserStateToFirestore(mergedUser, currentUser.uid);
      await updateDoc(docRef, firestoreData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users/' + currentUser.uid);
    }
  };

  // Refresh User Wallet, Balance, and History from Firestore
  const handleRefreshUserData = async (creditedSurvey?: boolean) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data();
        const mappedState = mapFirestoreToUserState(currentData);
        
        if (creditedSurvey) {
          const rewardAmount = 280; // CPX Research survey reward is 280 coins
          const newTx = {
            id: `tx-cpx-${Date.now()}`,
            title: "CPX Research Survey - Reward Credited",
            amount: rewardAmount,
            timestamp: new Date().toISOString(),
            type: 'earn' as const,
            status: 'completed' as const
          };
          
          const updatedHistory = [newTx, ...(mappedState.history || [])];
          const updatedBalance = mappedState.balance + rewardAmount;
          const updatedCompletedCount = mappedState.completedTasksCount + 1;
          
          const mergedUser = {
            ...mappedState,
            balance: updatedBalance,
            completedTasksCount: updatedCompletedCount,
            history: updatedHistory
          };
          
          const firestoreData = mapUserStateToFirestore(mergedUser, currentUser.uid);
          await updateDoc(docRef, firestoreData);
          setUser(mergedUser);
          triggerToast('Survey Credited! 🎉 +280 Coins', 280);
        } else {
          setUser(mappedState);
          triggerToast('Wallet Synchronized! 🔄');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users/' + currentUser.uid);
    }
  };

  const addNotification = (title: string, body: string, type: NotificationItem['type']) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      body,
      timestamp: new Date().toISOString(),
      isRead: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Claim Daily Rewards
  const handleClaimDaily = async () => {
    const todayString = new Date().toISOString().split('T')[0];
    
    // Dynamic streak rewards mapping (1 coin = 1 rupee)
    const streakRewards = [10, 20, 30, 50, 100, 150, 250];
    const currentStreak = user.dailyStreak;
    // Next streak day is (currentStreak % 7) + 1
    const nextDay = (currentStreak >= 7) ? 1 : currentStreak + 1;
    const rewardAmount = streakRewards[nextDay - 1];

    const newHistory = [
      {
        id: `tx-checkin-${Date.now()}`,
        title: `Day ${nextDay} Streak Reward credited`,
        amount: rewardAmount,
        timestamp: new Date().toISOString(),
        type: 'earn' as const,
        status: 'completed' as const
      },
      ...user.history
    ];

    await handleUpdateProfile({
      balance: user.balance + rewardAmount,
      dailyStreak: nextDay,
      lastCheckIn: todayString,
      history: newHistory
    });

    addNotification(
      'Daily Streak Claimed! 🔥',
      `You successfully claimed your Day ${nextDay} streak reward of +${rewardAmount} coins!`,
      'streak'
    );

    triggerToast(`Day ${nextDay} Streak claimed!`, rewardAmount);
  };

  // AI Desk verified screenshot bonus injector
  const handleCreditBonus = async (amount: number, reason: string) => {
    const newTx = {
      id: `tx-bonus-${Date.now()}`,
      title: reason,
      amount: amount,
      timestamp: new Date().toISOString(),
      type: 'earn' as const,
      status: 'completed' as const
    };

    await handleUpdateProfile({
      balance: user.balance + amount,
      completedTasksCount: user.completedTasksCount + 1,
      history: [newTx, ...user.history]
    });

    addNotification(
      'AI Desk Verified Credit! 🎉',
      `Compliance document approved successfully! Credited +${amount} sandbox coins.`,
      'earn'
    );

    triggerToast(`AI compliance: +${amount} Coins`, amount);
  };

  // Complete Reward Tasks & Process Redemptions
  const handleCompleteTask = async (taskId: string, reward: number, taskTitle: string, status?: 'pending' | 'completed', spinsChange?: number) => {
    // 1. Mark task as completed if it's an interactive earn task
    if (!taskId.startsWith('tx-')) {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, isCompleted: true } : t))
      );
    }

    // 2. Determine if this is a redemption/deduction
    const isRedemption = reward < 0;
    const absReward = Math.abs(reward);

    // Check if transaction already exists in history
    const exists = user.history.some(tx => tx.id === taskId);
    let updatedHistory;

    if (exists) {
      // Update the existing transaction status and optionally title
      updatedHistory = user.history.map(tx => {
        if (tx.id === taskId) {
          const updatedTitle = status === 'completed' && !tx.title.includes('completed') 
            ? `${tx.title} (Direct Transfer completed)` 
            : tx.title;
          return {
            ...tx,
            status: status || tx.status,
            title: updatedTitle
          };
        }
        return tx;
      });
    } else {
      // Prepend new transaction
      const newTx = {
        id: taskId.startsWith('tx-') ? taskId : `tx-task-${Date.now()}`,
        title: taskId.startsWith('tx-') ? taskTitle : `Completed Task: "${taskTitle}"`,
        amount: isRedemption ? -absReward : absReward,
        timestamp: new Date().toISOString(),
        type: (isRedemption ? 'redeem' : 'earn') as 'earn' | 'redeem',
        status: status || (isRedemption ? 'pending' : 'completed')
      };
      updatedHistory = [newTx, ...user.history];
    }

    await handleUpdateProfile({
      balance: user.balance + reward, // correctly adds positive and subtracts negative values
      completedTasksCount: (isRedemption || exists) ? user.completedTasksCount : user.completedTasksCount + 1,
      spins: (user.spins !== undefined ? user.spins : 9) + (spinsChange || 0),
      history: updatedHistory
    });

    if (isRedemption) {
      addNotification(
        'Redemption Request Sent! 🏦',
        `Dispatched payout request of ${absReward} Nav Durga Coins (₹${absReward.toFixed(2)} value). Status is pending.`,
        'redeem'
      );
      triggerToast('Redemption Request Dispatched!', absReward);
    } else {
      if (reward > 0) {
        if (taskId.startsWith('tx-spin-reward')) {
          addNotification(
            'Spin Wheel Winner! 🎉',
            `You won +${absReward} coins on the Lucky Wheel game!`,
            'game'
          );
        } else if (taskId.startsWith('tx-spin-fee')) {
          addNotification(
            'Lucky Wheel Entry Deducted',
            `Spent -${absReward} coins to spin the Lucky Wheel.`,
            'game'
          );
        } else {
          addNotification(
            'Task Completed! ⚡',
            `Earned +${absReward} coins for completing: "${taskTitle}"`,
            'earn'
          );
        }
        triggerToast(`"${taskTitle}" completed!`, absReward);
      } else if (status === 'completed' && taskId.startsWith('tx-withdraw-')) {
        addNotification(
          'Withdrawal Approved! 💸',
          `Your payout for "${taskTitle}" has been processed and completed successfully!`,
          'redeem'
        );
        triggerToast('Payout Completed!', 0);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-6 select-none font-sans overflow-y-auto">
      
      {/* 
        Smartphone Frame Bezel Container
        Max width container centered on desktop, takes up full viewport on mobile 
      */}
      <div 
        className={`w-full max-w-md md:h-[844px] h-screen bg-zinc-950 md:rounded-[40px] md:border-[10px] md:border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden transition-all duration-500 ${
          themeMode === 'cool-gray' 
            ? 'bg-radial from-slate-900 via-zinc-950 to-zinc-950 text-slate-100' 
            : 'bg-black text-white'
        }`}
      >
        {/* Dynamic Mobile Status Bar Notch */}
        <div className="h-10 shrink-0 bg-zinc-950 flex items-center justify-between px-6 z-50 text-white">
          <span className="text-xs font-semibold tracking-wide">{currentTime || '09:41 AM'}</span>
          
          {/* Dynamic Speaker Notch Spacer for desktop presentation */}
          <div className="hidden md:block w-28 h-4.5 bg-black rounded-b-2xl absolute left-1/2 -translate-x-1/2 top-0" />

          <div className="flex items-center gap-2 text-zinc-300">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold">100%</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Real-time floating glassmorphic Toast notifications */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute left-4 right-4 top-14 z-[99] p-3.5 rounded-2xl bg-zinc-900/95 border border-yellow-500/30 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">Reward Dispatched</span>
                  <span className="text-xs text-zinc-100 font-semibold truncate leading-normal">{toast.message}</span>
                </div>
              </div>
              {toast.reward && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500 text-black font-extrabold text-xs shrink-0 shadow-md shadow-yellow-500/15">
                  <NavDurgaCoin size="xs" />
                  <span>+{toast.reward}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Brand Header with Notification Center trigger */}
        {isLoggedIn && (
          <div className="flex flex-col shrink-0 bg-black z-40">
            {/* Row 1: Title Bar with three-dot vertical menu */}
            <div className="h-10 px-5 flex items-center justify-between border-b border-white/5 bg-zinc-950">
              <span className="text-xs font-black tracking-wide text-zinc-100 font-mono">
                Reward Rush - Premium Dashboard
              </span>
              <button 
                onClick={() => {
                  setThemeMode(prev => prev === 'oled' ? 'cool-gray' : 'oled');
                  triggerToast(`Theme switched!`);
                }}
                className="text-zinc-400 hover:text-white p-1 text-xs font-mono transition-colors active:scale-95 cursor-pointer"
                title="Switch Theme Accent"
              >
                More ⋮
              </button>
            </div>

            {/* Row 2: Icons Row Bar with exact 3 columns */}
            <div className="h-14 px-5 flex items-center justify-between border-b border-white/5 bg-zinc-950/60 backdrop-blur-md">
              {/* Daily Streak calendar button */}
              <button
                onClick={() => {
                  setIsCalendarOpen(prev => !prev);
                }}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative active:scale-90 cursor-pointer ${
                  isCalendarOpen 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,124,0,0.2)]' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
                title="Daily Calendar Streak"
              >
                <Calendar className="w-4.5 h-4.5" />
                {user.lastCheckIn !== new Date().toISOString().split('T')[0] && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                )}
              </button>

              {/* AI Desk Pill Button */}
              <button
                onClick={() => setIsAiDeskOpen(true)}
                className="flex items-center gap-1.5 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-200 transition-all active:scale-95 text-xs font-bold font-mono cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🤖 AI Desk</span>
              </button>

              {/* Notification Bell Button */}
              <button 
                onClick={() => setShowNotifications(true)} 
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all relative active:scale-90 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5 text-zinc-300" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic App Content Body */}
        <div className="flex-1 overflow-y-auto p-5 relative">
          <AnimatePresence mode="wait">
            {!isLoggedIn ? (
              <motion.div
                key="splash"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <Splash onLogin={handleLogin} />
              </motion.div>
            ) : isCalendarOpen ? (
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <CalendarModal
                  isOpen={true}
                  onClose={() => setIsCalendarOpen(false)}
                  user={user}
                  onClaimDaily={handleClaimDaily}
                  themeMode={themeMode}
                  inline={true}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    user={user} 
                    onClaimDaily={handleClaimDaily} 
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                    onOpenAiDesk={() => setIsAiDeskOpen(true)}
                    onOpenFaq={() => setIsFaqOpen(true)}
                    themeMode={themeMode}
                    onTabChange={setActiveTab}
                  />
                )}
                {activeTab === 'earn' && (
                  <Earn 
                    tasks={tasks} 
                    onCompleteTask={handleCompleteTask} 
                    user={user} 
                    triggerToast={triggerToast} 
                  />
                )}
                {activeTab === 'leaderboard' && (
                  <Leaderboard 
                    user={user} 
                    onCompleteTask={handleCompleteTask} 
                    themeMode={themeMode} 
                    onSetActiveTab={setActiveTab}
                    onRefreshUserData={handleRefreshUserData}
                  />
                )}
                {activeTab === 'redeem' && (
                  <Redeem 
                    user={user} 
                    onCompleteTask={handleCompleteTask} 
                    onTabChange={setActiveTab} 
                    onUpdateUser={handleUpdateProfile}
                    triggerToast={triggerToast}
                  />
                )}
                {activeTab === 'profile' && (
                  <Profile
                    user={user}
                    themeMode={themeMode}
                    onChangeTheme={setThemeMode}
                    onResetData={handleResetData}
                    onLogout={handleLogout}
                    onUpdateUser={handleUpdateProfile}
                    triggerToast={triggerToast}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Render bottom navigation only if logged in */}
        {isLoggedIn && (
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} themeMode={themeMode} />
        )}

        {/* In-App Notification Center Drawer */}
        <NotificationsModal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearAllNotifications}
          themeMode={themeMode}
        />

        {/* 7-Day Rewards Calendar Modal Overlay */}
        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          user={user}
          onClaimDaily={handleClaimDaily}
          themeMode={themeMode}
        />

        {/* Smart AI Desk Chat Assistant Modal Overlay */}
        <AiDeskModal
          isOpen={isAiDeskOpen}
          onClose={() => setIsAiDeskOpen(false)}
          user={user}
          onCreditBonus={handleCreditBonus}
          themeMode={themeMode}
        />

        {/* FAQ support collapsible accordion Modal Overlay */}
        <FaqModal
          isOpen={isFaqOpen}
          onClose={() => setIsFaqOpen(false)}
          themeMode={themeMode}
        />

        {/* Physical Home Indicator bar simulation for premium smartphone look */}
        <div className="h-2.5 shrink-0 bg-zinc-950 flex justify-center items-end pb-1.5">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
