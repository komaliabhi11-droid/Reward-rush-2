import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, CircleMinus, RotateCw, ArrowUpRight, ArrowDownLeft, 
  ArrowLeft, Settings, AlertCircle, CheckCircle2, ShieldCheck, Info,
  Smartphone, Ticket, Wallet, User, Mail, X, Loader2, Volume2, Music
} from 'lucide-react';
import { UserState } from '../types';
import NavDurgaCoin from './NavDurgaCoin';
import PaymentDetails from './PaymentDetails';
import AnimatedBalance from './AnimatedBalance';

interface RedeemProps {
  user: UserState;
  onCompleteTask: (id: string, reward: number, title: string, status?: 'pending' | 'completed') => void;
  onTabChange?: (tab: 'dashboard' | 'earn' | 'leaderboard' | 'redeem' | 'profile') => void;
  onUpdateUser: (updates: Partial<UserState>) => void;
  triggerToast: (message: string, reward?: number) => void;
}

interface PayoutMethod {
  id: string;
  name: string;
  logo: string;
  currency: string;
  minCoins: number;
  cashValue: string;
  placeholder: string;
  inputType: 'email' | 'text';
  label: string;
  colorClass: string;
}

const PAYOUT_METHODS: PayoutMethod[] = [
  {
    id: 'upi',
    name: 'UPI Instant Payout',
    logo: 'UPI',
    currency: 'INR',
    minCoins: 100,
    cashValue: '₹100.00 INR',
    placeholder: 'username@okaxis',
    inputType: 'text',
    label: 'UPI Address (VPA)',
    colorClass: 'from-orange-500 to-amber-600 text-white'
  },
  {
    id: 'paypal',
    name: 'PayPal Transfer',
    logo: 'PayPal',
    currency: 'INR',
    minCoins: 500,
    cashValue: '₹500.00 INR',
    placeholder: 'your-paypal@email.com',
    inputType: 'email',
    label: 'PayPal Registered Email Address',
    colorClass: 'from-blue-600 to-indigo-700 text-white'
  },
  {
    id: 'amazon',
    name: 'Amazon Gift Card',
    logo: 'Amazon',
    currency: 'INR',
    minCoins: 250,
    cashValue: '₹250.00 Gift Voucher',
    placeholder: 'delivery-email@gmail.com',
    inputType: 'email',
    label: 'Email to Dispatch Digital Code',
    colorClass: 'from-amber-600 to-orange-700 text-white'
  },
  {
    id: 'gplay',
    name: 'Google Play Code',
    logo: 'GPlay',
    currency: 'INR',
    minCoins: 100,
    cashValue: '₹100.00 Play Balance',
    placeholder: 'delivery-email@gmail.com',
    inputType: 'email',
    label: 'Email to Dispatch Play Code',
    colorClass: 'from-purple-600 to-pink-700 text-white'
  }
];

function CountingWalletBalance({ start, end, duration = 2000 }: { start: number; end: number; duration?: number }) {
  const [value, setValue] = useState(start);

  React.useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const currentVal = start + (end - start) * easeProgress;
      setValue(currentVal);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };
    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [start, end, duration]);

  return <span className="font-mono font-bold tracking-tight">₹{value.toFixed(2)}</span>;
}

export default function Redeem({ user, onCompleteTask, onTabChange, onUpdateUser, triggerToast }: RedeemProps) {
  const [view, setView] = useState<'ledger' | 'withdraw'>('ledger');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'redeem'>('all');
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>(PAYOUT_METHODS[0]);
  const [recipientAccount, setRecipientAccount] = useState(user.upiId || '');
  const [recipientName, setRecipientName] = useState(user.displayName || '');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [dispatchedCash, setDispatchedCash] = useState('');

  // New states for the premium withdrawal selector matching mockup
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'redeem'>('upi');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Floating assets for the satisfying upward-floating note/coin effect
  interface FloatingAsset {
    id: number;
    type: 'coin' | 'note';
    left: number;
    delay: number;
    duration: number;
    scale: number;
    rotate: number;
  }
  const [floatingAssets, setFloatingAssets] = useState<FloatingAsset[]>([]);

  // Track active sound sources to prevent overlapping/distorted noise stacking
  const activeNodesRef = React.useRef<any[]>([]);
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Initialize and clean up floating assets on successful withdraw triggers
  React.useEffect(() => {
    if (isSuccess || showSuccessModal) {
      const assets: FloatingAsset[] = [];
      const numAssets = 25; // Rich denseness
      for (let i = 0; i < numAssets; i++) {
        assets.push({
          id: i,
          type: Math.random() > 0.5 ? 'note' : 'coin',
          left: Math.random() * 85 + 7, // 7% to 92% screen layout width
          delay: Math.random() * 1.5, // staggered starts
          duration: 2.2 + Math.random() * 1.6, // float up duration
          scale: 0.6 + Math.random() * 0.7,
          rotate: Math.random() * 360 - 180
        });
      }
      setFloatingAssets(assets);
    } else {
      setFloatingAssets([]);
    }
  }, [isSuccess, showSuccessModal]);

  // Clean up any remaining oscillators or audio threads on unmount to safeguard against memory leaks
  React.useEffect(() => {
    return () => {
      if (activeNodesRef.current.length > 0) {
        activeNodesRef.current.forEach((node) => {
          try {
            node.stop();
          } catch (e) {}
        });
      }
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch (e) {}
      }
    };
  }, []);

  const playWithdrawalSound = async (currentVol = 0.8) => {
    // 1. Stop any previously playing nodes or tracks to prevent acoustic overlay
    if (activeNodesRef.current.length > 0) {
      activeNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch (e) {}
      });
      activeNodesRef.current = [];
    }
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (e) {}
      activeAudioRef.current = null;
    }

    // 2. Custom-engineered 100% original synthesiser fallback sound themes (Web Audio API)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // "Paisa Hi Paisa" Bollywood Arpeggio: Fast & happy 8-bit dance synth beat!
      const paisaNotes = [
        523.25, 659.25, 783.99, 880.00, 1046.50, 880.00, 1046.50, 1318.51, 
        1046.50, 1318.51, 1567.98, 1318.51, 1567.98, 2093.00
      ];
      paisaNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now + idx * 0.06);
        
        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.12 * currentVol, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        activeNodesRef.current.push(osc);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch (err) {
      console.warn("AudioContext fallback synthesis failed:", err);
    }
  };

  // Dual Currency Conversion Values (1 Coin = 1 Rupee)
  const inrValue = user.balance.toFixed(2);

  React.useEffect(() => {
    if (isSuccess || showSuccessModal) {
      // 1. Play trending funny custom ringtone
      playWithdrawalSound();

      // 2. Vibrate phone if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 80, 150]);
      }

      // 3. Trigger premium confetti
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default;
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 250);
      }).catch(err => console.error("Confetti failed:", err));
    }
  }, [isSuccess, showSuccessModal]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handleProceedWithdraw = () => {
    setError('');

    if (!selectedAmount) {
      setError('Please select an amount to withdraw.');
      return;
    }

    if (user.balance < selectedAmount) {
      setError(`Insufficient balance. Minimum required is ₹${selectedAmount.toFixed(2)} (${selectedAmount} coins). Your current balance is ₹${inrValue}.`);
      return;
    }

    // Begin professional sandbox payout ledger sequence
    setIsWithdrawing(true);

    setTimeout(() => {
      setIsWithdrawing(false);
      setIsSuccess(true);

      // Deduct coins as a pending transaction in history
      const deductCoins = -selectedAmount;
      const gatewayName = withdrawMethod === 'upi' ? 'UPI Transfer' : 'Redeem Code';
      const destination = withdrawMethod === 'upi' ? (user.upiId || 'Not configured') : (user.redeemEmail || user.email || 'Not configured');
      const transactionTitle = `Withdrawal via ${gatewayName} (${destination})`;
      onCompleteTask(`tx-withdraw-${Date.now()}`, deductCoins, transactionTitle, 'pending');
    }, 2500); // 2.5s secure handshake simulation
  };

  const handleRedeemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (user.balance < selectedMethod.minCoins) {
      setError(`Minimum balance to redeem via ${selectedMethod.name} is ${selectedMethod.minCoins} Nav Durga Coins.`);
      return;
    }

    if (!recipientAccount) {
      setError(`Please enter your valid ${selectedMethod.label}.`);
      return;
    }

    if (selectedMethod.inputType === 'email' && !recipientAccount.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (selectedMethod.id === 'upi' && !recipientName.trim()) {
      setError('Please enter your Account Holder Name for secure UPI deposit.');
      return;
    }

    // Process simulation
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setDispatchedCash(selectedMethod.cashValue);
      setShowSuccessModal(true);

      // Deduct coins as a negative task reward with a PENDING status transaction in ledger
      const deductCoins = -selectedMethod.minCoins;
      const transactionTitle = `Withdrawal via ${selectedMethod.logo}`;
      onCompleteTask(`tx-withdraw-${Date.now()}`, deductCoins, transactionTitle, 'pending');

      // Clear fields
      setRecipientAccount('');
      setRecipientName('');
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Filter history logic with guaranteed unique transaction IDs
  const filteredHistory = (() => {
    const seen = new Set<string>();
    return user.history
      .filter((tx) => {
        if (filterType === 'all') return true;
        return tx.type === filterType;
      })
      .filter((tx) => {
        if (!tx || !tx.id || seen.has(tx.id)) {
          return false;
        }
        seen.add(tx.id);
        return true;
      });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-5 pb-24 text-white"
    >
      <AnimatePresence mode="wait">
        {view === 'ledger' ? (
          <motion.div
            key="ledger-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
             {/* 1. Gorgeous AVAILABLE BALANCE card matching Screenshot exactly */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-tr from-[#f59e0b] via-[#ea580c] to-[#f97316] shadow-2xl shadow-orange-500/10 border border-white/10">
              {/* Glow Accent */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-widest text-orange-100/90 font-extrabold block">
                  AVAILABLE BALANCE
                </span>
                <NavDurgaCoin size="xl" className="shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse" />
              </div>
              
              <div className="text-4xl font-black mt-2 text-white font-sans flex items-center tracking-tight gap-1.5 flex-wrap">
                <span className="text-3xl font-semibold">₹</span>
                <AnimatedBalance value={user.balance} />
                <span className="text-xs font-medium text-orange-100/80 font-mono bg-black/20 px-2 py-0.5 rounded-full ml-1 shrink-0">
                  {user.balance} Coins
                </span>
              </div>

              {/* Side-by-side action buttons */}
              <div className="grid grid-cols-2 gap-3.5 mt-6">
                <button
                  onClick={() => setView('withdraw')}
                  className="bg-black/20 hover:bg-black/30 backdrop-blur-md text-white border border-white/10 transition-all font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <CircleMinus className="w-4 h-4 text-orange-200" />
                  <span>Withdraw</span>
                </button>

                <button
                  onClick={handleRefresh}
                  className="bg-black/20 hover:bg-black/30 backdrop-blur-md text-white border border-white/10 transition-all font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCw className={`w-4 h-4 text-orange-200 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* 2. Earn More full width bar matching Screenshot exactly */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => onTabChange?.('earn')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>⚡ Earn More</span>
              </button>

              <button
                onClick={() => setShowInfoOverlay(prev => !prev)}
                className="w-12 h-12 shrink-0 rounded-2xl bg-[#1e1008] border border-orange-500/20 text-orange-400 flex items-center justify-center hover:bg-[#2e190d] hover:border-orange-500/40 transition-colors active:scale-95 cursor-pointer"
                title="Compliance Info"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Compliance details toggle */}
            <AnimatePresence>
              {showInfoOverlay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-orange-500/20 text-xs text-zinc-300 leading-relaxed overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2 text-orange-400 font-extrabold uppercase text-[10px] tracking-wider">
                    <Info className="w-4 h-4" />
                    <span>LEDGER COMPLIANCE GUIDELINES</span>
                  </div>
                  Please complete sandbox verification actions properly. To clear pending test withdrawals, tap directly on any "PENDING" transaction in the ledger list below. Direct transfers will instantly clear in real-time.
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. Filter account history segmented control */}
            <div>
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block mb-2.5">
                FILTER ACCOUNT HISTORY
              </span>

              <div className="p-1 rounded-xl bg-zinc-950 border border-white/5 flex items-center gap-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`py-2 px-4 rounded-lg flex-1 text-center font-bold text-xs transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-zinc-800 text-white font-black shadow-md'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  All Logs
                </button>
                <button
                  onClick={() => setFilterType('earn')}
                  className={`py-2 px-4 rounded-lg flex-1 text-center font-bold text-xs transition-all cursor-pointer ${
                    filterType === 'earn'
                      ? 'bg-zinc-800 text-white font-black shadow-md'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Earnings
                </button>
                <button
                  onClick={() => setFilterType('redeem')}
                  className={`py-2 px-4 rounded-lg flex-1 text-center font-bold text-xs transition-all cursor-pointer ${
                    filterType === 'redeem'
                      ? 'bg-zinc-800 text-white font-black shadow-md'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Withdraws
                </button>
              </div>
            </div>

            {/* 4. Filtered Ledger list items matching Screenshot exactly */}
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs font-semibold uppercase tracking-wider">
                  No transaction history logged for this filter.
                </div>
              ) : (
                filteredHistory.map((tx) => {
                  const isDebit = tx.amount < 0;
                  const displayInrAmount = Math.abs(tx.amount).toFixed(2);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (tx.status === 'pending') {
                          onCompleteTask(tx.id, 0, tx.title, 'completed');
                        }
                      }}
                      className={`p-4 rounded-2xl bg-zinc-950 border transition-all duration-200 flex items-center justify-between gap-3 relative overflow-hidden ${
                        tx.status === 'pending'
                          ? 'border-amber-500/20 hover:border-amber-500/40 cursor-pointer active:scale-[0.99]'
                          : 'border-white/5 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Circle Arrow Status Icon */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-zinc-900 border ${
                          isDebit 
                            ? 'border-orange-500/10 text-orange-500' 
                            : 'border-emerald-500/10 text-emerald-400'
                        }`}>
                          {isDebit ? (
                            <ArrowUpRight className="w-5 h-5 text-orange-500" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>

                        {/* Title and date */}
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-zinc-100 leading-snug">
                            {tx.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                            {formatDate(tx.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Right-aligned Amount and Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-xs font-black font-mono ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isDebit ? '-' : '+'}₹{displayInrAmount}
                        </span>
                        
                        {tx.status && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm mt-1.5 ${
                            tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {tx.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : !user.hasAddedPayoutDetails ? (
          <PaymentDetails
            user={user}
            onBack={() => setView('ledger')}
            onUpdateUser={onUpdateUser}
            triggerToast={triggerToast}
            noticeMessage="Please add your withdrawal details before you can withdraw. Once saved, you can instantly cash out."
          />
        ) : (
          <motion.div
            key="withdraw-form-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5 text-white pb-12"
          >
            {/* Header / Back to Ledger button */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-black text-white tracking-tight">Withdraw funds</h2>
              <button
                onClick={() => setView('ledger')}
                className="w-10 h-10 rounded-full bg-[#121212] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5 text-zinc-300" />
              </button>
            </div>

            {/* AVAILABLE BALANCE Card with gold-orange gradient */}
            <div className="relative overflow-hidden p-6 rounded-[24px] bg-gradient-to-tr from-[#f59e0b] via-[#ea580c] to-[#f97316] shadow-2xl shadow-orange-500/10 border border-white/10">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-widest text-orange-100/90 font-extrabold block">
                  AVAILABLE BALANCE
                </span>
                <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black text-white">
                  <Wallet className="w-3 h-3 text-orange-200" />
                  <span>Wallet</span>
                </div>
              </div>

              <div className="text-4xl font-black mt-3 text-white font-sans flex items-baseline tracking-tight">
                <span className="text-2xl font-bold mr-0.5">₹</span>
                <AnimatedBalance value={user.balance} />
                <span className="text-xs font-medium text-orange-100/80 font-mono bg-black/20 px-2.5 py-0.5 rounded-full ml-2">
                  {user.balance} Coins
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD section */}
            <div className="space-y-3 mt-1">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block px-1">
                PAYMENT METHOD
              </span>

              <div className="grid grid-cols-2 gap-3.5">
                {/* UPI Transfer Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod('upi');
                    setError('');
                  }}
                  className={`p-5 rounded-[24px] text-left border relative transition-all duration-300 flex flex-col justify-center gap-3 cursor-pointer ${
                    withdrawMethod === 'upi'
                      ? 'bg-[#121212] border-orange-500 shadow-lg shadow-orange-500/5 scale-[1.02]'
                      : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'
                  }`}
                >
                  <Smartphone className={`w-6 h-6 ${withdrawMethod === 'upi' ? 'text-orange-500' : 'text-zinc-500'}`} />
                  <div>
                    <h4 className="text-[13px] font-black text-white">UPI Transfer</h4>
                  </div>
                </button>

                {/* Redeem Code Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod('redeem');
                    setError('');
                  }}
                  className={`p-5 rounded-[24px] text-left border relative transition-all duration-300 flex flex-col justify-center gap-3 cursor-pointer ${
                    withdrawMethod === 'redeem'
                      ? 'bg-[#121212] border-orange-500 shadow-lg shadow-orange-500/5 scale-[1.02]'
                      : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'
                  }`}
                >
                  <Ticket className={`w-6 h-6 ${withdrawMethod === 'redeem' ? 'text-orange-500' : 'text-zinc-500'}`} />
                  <div>
                    <h4 className="text-[13px] font-black text-white">Redeem Code</h4>
                  </div>
                </button>
              </div>

              {/* Dynamic verified account display card */}
              <div className="p-4.5 rounded-[20px] bg-[#0a0a0a] border border-white/5 flex items-center gap-4.5 mt-2">
                {withdrawMethod === 'upi' ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                        Registered UPI Destination ID
                      </span>
                      <span className="text-xs font-black text-white mt-0.5 block truncate">
                        {user.upiId || 'Not set'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                        Registered Redeem Email
                      </span>
                      <span className="text-xs font-black text-white mt-0.5 block truncate">
                        {user.redeemEmail || user.email || 'Not set'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SELECT AMOUNT chips */}
            <div className="space-y-3 mt-1">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block px-1">
                SELECT AMOUNT
              </span>

              <div className="grid grid-cols-4 gap-2.5">
                {[10, 20, 50, 100].map((amt) => {
                  const isSelected = selectedAmount === amt;
                  const hasEnough = user.balance >= amt;

                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setError('');
                      }}
                      className={`py-4 rounded-[20px] border text-center text-[13px] font-black transition-all duration-200 cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-[#121212] border-orange-500 text-white font-black shadow-md shadow-orange-500/5'
                          : 'bg-[#0a0a0a] border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <span>₹{amt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Cancel and Proceed actions */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                type="button"
                onClick={() => setView('ledger')}
                className="py-4 rounded-[20px] bg-zinc-950 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all font-black text-xs uppercase tracking-wider text-center cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedWithdraw}
                className="py-4 rounded-[20px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider text-center cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/10"
              >
                Proceed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen processing loader with circle rotating effect */}
      {isWithdrawing && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            {/* Continuous rotating outer loading ring */}
            <div className="absolute inset-0 rounded-full border-4 border-orange-500/10" />
            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin" />
            <Wallet className="w-8 h-8 text-orange-400 animate-pulse" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-orange-500 font-mono">
            Verifying Sandbox Ledger Protocol
          </span>
          <p className="text-[10px] text-zinc-500 mt-2 text-center max-w-xs leading-normal font-medium">
            Establishing secure mock checkout handshakes...
          </p>
        </div>
      )}

      {/* Fullscreen premium green & gold celebration overlay */}
      {createPortal(
        <AnimatePresence>
          {(isSuccess || showSuccessModal) && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            {/* Ambient deep blurring background */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl" 
            />

            {/* Glowing gold and green background ambient lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Render flying notes and coins in front of backdrop but behind popup card */}
            {floatingAssets.map((asset) => (
              <motion.div
                key={asset.id}
                initial={{ y: '105vh', x: 0, opacity: 0, scale: asset.scale, rotate: asset.rotate }}
                animate={{ 
                  y: '-15vh', 
                  x: [0, (Math.random() * 120 - 60), (Math.random() * 200 - 100)],
                  opacity: [0, 1, 1, 0],
                  rotate: asset.rotate + 360 * (Math.random() > 0.5 ? 1 : -1)
                }}
                transition={{ 
                  delay: asset.delay, 
                  duration: asset.duration, 
                  ease: "easeOut" 
                }}
                className="fixed z-[210] pointer-events-none text-3xl select-none"
                style={{ left: `${asset.left}%` }}
              >
                {asset.type === 'note' ? (
                  <div className="relative filter drop-shadow-[0_4px_10px_rgba(34,197,94,0.4)]">
                    <div className="w-16 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-sm border border-emerald-400 flex items-center justify-center text-white font-extrabold text-[13px] tracking-tighter">
                      ₹
                    </div>
                    {/* Detail bands on money bill */}
                    <div className="absolute inset-1 border border-emerald-400/30 rounded-sm pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border border-yellow-200 flex items-center justify-center text-amber-950 font-black text-sm shadow-lg shadow-amber-500/30 filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)]">
                    ₹
                  </div>
                )}
              </motion.div>
            ))}

            {/* Translucent Glassmorphic Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-sm bg-zinc-950/70 border border-white/10 rounded-[32px] p-7 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl z-[220] shadow-emerald-500/5"
            >
              {/* Dynamic light rays decoration inside card */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

              {/* Animated Success Check & Particles */}
              <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
                {/* Circular layered glowing rings */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 15 }}
                  className="w-20 h-20 bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 rounded-full flex items-center justify-center border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/10 relative"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 250, damping: 12 }}
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[3]" />
                  </motion.div>
                </motion.div>
                
                {/* Gold particles bursting outwards */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(6)].map((_, idx) => {
                    const angle = (idx * 360) / 6;
                    const rad = (angle * Math.PI) / 180;
                    const xDist = Math.cos(rad) * 45;
                    const yDist = Math.sin(rad) * 45;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{ x: xDist, y: yDist, scale: [0, 1, 0], opacity: [0, 1, 0] }}
                        transition={{ delay: 0.4, duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                        className="absolute left-[47%] top-[47%] w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md shadow-amber-500/50"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Title with Gradient Text */}
              <h3 className="text-xl font-black bg-gradient-to-r from-emerald-400 via-green-300 to-amber-300 bg-clip-text text-transparent tracking-tight">
                Withdrawal Successful!
              </h3>

              {/* Amount value display */}
              <div className="text-3xl font-black text-emerald-400 mt-2.5 font-sans flex items-center justify-center gap-1">
                <span>₹</span>
                <span>{(isSuccess ? (selectedAmount || 0) : (selectedMethod.minCoins || 0)).toFixed(2)}</span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-semibold">
                ₹{(isSuccess ? (selectedAmount || 0) : (selectedMethod.minCoins || 0)).toFixed(2)} has been sent successfully.
              </p>

              {/* Wallet Balance counting down container */}
              <div className="mt-4 p-3 rounded-2xl bg-[#080808] border border-white/5 space-y-2 text-left leading-normal">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black text-zinc-500">
                  <span>DEDUCTED WALLET FUNDS</span>
                  <span className="text-rose-400 font-extrabold">-₹{(isSuccess ? (selectedAmount || 0) : (selectedMethod.minCoins || 0)).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-zinc-400">Remaining Balance:</span>
                  <span className="text-amber-400">
                    <CountingWalletBalance 
                      start={user.balance + (isSuccess ? (selectedAmount || 0) : (selectedMethod.minCoins || 0))} 
                      end={user.balance} 
                    />
                  </span>
                </div>
              </div>

              <div className="mt-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-zinc-500 text-left leading-relaxed font-medium">
                <span className="font-extrabold text-emerald-400 uppercase tracking-wider block mb-0.5 text-[9px]">
                  AUTHENTICATION DETAILS:
                </span>
                Destination ID: <span className="text-zinc-300 font-bold font-mono">
                  {isSuccess 
                    ? (withdrawMethod === 'upi' ? (user.upiId || 'Direct UPI Wallet') : (user.redeemEmail || user.email))
                    : (recipientAccount || user.redeemEmail || user.email)}
                </span>. Transaction ledger verified securely. Clear from list anytime.
              </div>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setShowSuccessModal(false);
                  setSelectedAmount(null);
                  setView('ledger');
                }}
                className="mt-5.5 w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-[0.97] transition-all cursor-pointer text-center shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
              >
                Return to Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>, document.body)}
    </motion.div>
  );
}
