import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Check, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserState } from '../types';
import { formatINR } from '../lib/currency';

interface PaymentDetailsProps {
  user: UserState;
  onBack: () => void;
  onUpdateUser: (updates: Partial<UserState>) => void;
  triggerToast: (message: string, reward?: number) => void;
  isWithdrawFlow?: boolean;
  onCompleteTask?: (id: string, reward: number, title: string, status?: 'pending' | 'completed') => void;
  noticeMessage?: string;
}

export default function PaymentDetails({
  user,
  onBack,
  onUpdateUser,
  triggerToast,
  isWithdrawFlow = false,
  onCompleteTask,
  noticeMessage
}: PaymentDetailsProps) {
  const [name, setName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phoneNumber || '');
  const [upi, setUpi] = useState(user.upiId || '');
  const [alternativeEmail, setAlternativeEmail] = useState(user.redeemEmail || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  // Dual Currency Conversion
  const inrValue = formatINR(user.balance);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a valid full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (!upi.trim() || !upi.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. username@upi).');
      return;
    }

    // Save fields to User Profile
    const updates: Partial<UserState> = {
      displayName: name.trim(),
      email: email.trim(),
      phoneNumber: phone.trim(),
      upiId: upi.trim(),
      redeemEmail: alternativeEmail.trim(),
      hasAddedPayoutDetails: true
    };
    onUpdateUser(updates);

    if (isWithdrawFlow) {
      // If it is the actual Withdrawal tab, clicking Save & Update Details triggers withdrawal
      const minCoins = 100;
      if (user.balance < minCoins) {
        setError(`Minimum balance required to withdraw is ₹${formatINR(minCoins)} (${minCoins} coins). Current balance: ₹${inrValue}`);
        return;
      }

      setIsProcessing(true);

      setTimeout(() => {
        setIsProcessing(false);
        setShowSuccessModal(true);

        // Deduct coins as a negative transaction
        if (onCompleteTask) {
          const deductCoins = -user.balance; // Withdraw entire balance or min limit
          const transactionTitle = `Withdrawal via UPI (${upi.trim()})`;
          onCompleteTask(`tx-withdraw-${Date.now()}`, deductCoins, transactionTitle, 'pending');
        }
      }, 2000);

    } else {
      // Standard profile flow
      triggerToast('Payment details updated successfully!');
      onBack();
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-white">
      {/* 1. Header with Back button matching mockup */}
      <div className="flex items-center gap-4 mb-1">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#121212] border border-white/5 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-300" />
        </button>
        <h2 className="text-[19px] font-black text-white tracking-tight">
          Payment Details
        </h2>
      </div>

      {/* Notice Message alert banner if provided */}
      {noticeMessage && (
        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
          <div className="leading-relaxed font-semibold">
            {noticeMessage}
          </div>
        </div>
      )}

      {/* Available balance indicator for Withdraw flow */}
      {isWithdrawFlow && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">Available Cashout</span>
            <div className="text-xl font-black text-white mt-0.5">₹{inrValue}</div>
          </div>
          <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] text-orange-400 font-black uppercase tracking-wider flex items-center gap-1">
            <span>UPI Instant</span>
          </div>
        </div>
      )}

      {/* Form with styled cards matching mockup */}
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Card 1: FULL NAME */}
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center">
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-2">
            FULL NAME
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-white font-medium text-[15px] w-full placeholder-zinc-500"
            placeholder="add your full name"
          />
        </div>

        {/* Card 2: EMAIL ADDRESS */}
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center">
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-2">
            EMAIL ADDRESS
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-white font-medium text-[15px] w-full placeholder-zinc-500"
            placeholder="enter email"
          />
        </div>

        {/* Card 3: MOBILE NUMBER */}
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center">
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-2">
            MOBILE NUMBER
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-white font-medium text-[15px] w-full placeholder-zinc-500"
            placeholder="add mobile number"
          />
        </div>

        {/* Card 4: UPI ID */}
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center">
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-2">
            UPI ID
          </label>
          <input
            type="text"
            required
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-white font-medium text-[15px] w-full placeholder-zinc-500"
            placeholder="enter upi ID"
          />
        </div>

        {/* Card 5: Redeem Email (Alternative) */}
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center relative">
          <label className="text-[13px] font-bold text-white mb-2">
            Redeem Email (Alternative)
          </label>
          <input
            type="email"
            value={alternativeEmail}
            onChange={(e) => setAlternativeEmail(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-zinc-400 font-medium text-[15px] w-full placeholder-zinc-600"
            placeholder="add your email"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-1.5 mt-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Save & Update Details Orange Gradient Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full mt-2 py-4 rounded-[18px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all shadow-md shadow-orange-500/10 disabled:opacity-50"
        >
          {isProcessing ? 'Verifying Sandbox Ledger...' : 'Save & Update Details'}
        </button>
      </form>

      {/* Fullscreen processing loader overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Sandbox Ledger Protocol</span>
          <p className="text-[10px] text-zinc-400 mt-1 animate-pulse">Establishing secure mock checkout handshakes...</p>
        </div>
      )}

      {/* Success cashout modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/10 blur-xl" />

              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <h3 className="text-base font-extrabold text-white">Payout Dispatched Successfully</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Your withdrawal request of <span className="text-emerald-400 font-bold">₹{inrValue}</span> has been securely logged as <span className="text-amber-500 font-bold">Pending</span>.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-zinc-500 text-left">
                <span className="font-semibold text-emerald-400 block mb-0.5">Authentication Details:</span>
                UPI sandbox nodes have successfully processed the token ledger. You can clear the pending request anytime on your main ledger.
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onBack();
                }}
                className="mt-6 w-full py-3 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-all cursor-pointer text-center"
              >
                Return to Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
