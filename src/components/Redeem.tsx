import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, CircleMinus, RotateCw, ArrowUpRight, ArrowDownLeft, 
  ArrowLeft, Settings, AlertCircle, CheckCircle2, ShieldCheck, Info,
  Smartphone, Ticket, Wallet, User, Mail, X, Loader2
} from 'lucide-react';
import { UserState } from '../types';
import NavDurgaCoin from './NavDurgaCoin';
import PaymentDetails from './PaymentDetails';

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

  // Dual Currency Conversion Values (1 Coin = 1 Rupee)
  const inrValue = user.balance.toFixed(2);

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
                <span>{inrValue}</span>
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
                <span>{inrValue}</span>
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

      {/* Fullscreen green check success overlay */}
      <AnimatePresence>
        {isSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-[32px] p-7 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full" />
              
              {/* Animated Green Circle & Tick Effect */}
              <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-18 h-18 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border-2 border-emerald-500/20"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 250, damping: 12 }}
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[3]" />
                  </motion.div>
                </motion.div>
                
                {/* Wave effect */}
                <span className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping opacity-25" />
              </div>

              <h3 className="text-lg font-black text-white tracking-tight">
                Payout Dispatched Successfully
              </h3>
              
              <div className="text-3xl font-black text-emerald-400 mt-3 font-mono">
                ₹{selectedAmount?.toFixed(2)}
              </div>
              
              <p className="text-xs text-zinc-400 mt-3.5 leading-relaxed font-semibold px-2">
                Your money will be received within <span className="text-white font-bold">24 hours</span> or more. Don't worry, just wait for your money or earn more in the meantime!
              </p>

              <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-zinc-500 text-left leading-normal font-semibold">
                <span className="font-extrabold text-emerald-400 uppercase tracking-wider block mb-1 text-[9px]">
                  Authentication Details:
                </span>
                Simulated node has securely verified the transaction ledger. Feel free to clear it from your history list below.
              </div>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setSelectedAmount(null);
                  setView('ledger');
                }}
                className="mt-6 w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all cursor-pointer text-center hover:bg-zinc-100"
              >
                Return to Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
