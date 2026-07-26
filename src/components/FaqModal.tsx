import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, ChevronDown, ChevronUp, Sparkles, BookOpen, ShieldCheck, Mail } from 'lucide-react';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode?: 'oled' | 'cool-gray';
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do Daily Check-ins work?",
    answer: "You can claim consecutive daily rewards up to 7 days! Day 1 grants 10 Nav Durga Coins, growing up to 250 Nav Durga Coins on Day 7. Missing a day resets your streak count to Day 1. Use the Rewards Calendar modal to claim yours daily!"
  },
  {
    question: "How can I complete Tasks & Offers?",
    answer: "Go to the Offers tab to watch interstitial ad placements, test download campaigns, or participate in feedback questionnaires. Once completed, reward credits are immediately injected into your sandbox balance!"
  },
  {
    question: "How do Referral Codes reward me?",
    answer: "You can copy your unique Promo code or share your invite link. When another simulated account signs up with your link, both of you are immediately credited with a +100 coins sandbox bonus!"
  },
  {
    question: "How are Payouts processed?",
    answer: "All payouts are routed instantly via simulated serverless RPC extractors. Once you hit the minimum 100 Nav Durga Coins (₹100.00 value), you can request Paytm, UPI, or PayPal transfers on the Logs/Redeem tabs. Transactions are fully simulated!"
  },
  {
    question: "What is the coin to currency conversion?",
    answer: "Each Nav Durga Coin is equal to exactly ₹1.00 INR. The application operates strictly in a serverless simulated sandbox space for demonstration and developer iteration."
  }
];

export default function FaqModal({ isOpen, onClose, themeMode = 'oled' }: FaqModalProps) {
  const isOled = themeMode === 'oled';
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl ${
                isOled ? 'bg-[#050505] border border-white/10' : 'bg-[#0f172a] border border-slate-800'
              } p-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col`}
            >
              {/* Glow top line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">
                      Support Hub
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold">FREQUENTLY ASKED QUESTIONS</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Subtitle intro */}
              <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed shrink-0">
                Welcome to the Reward Rush support desk! Find explanations below on how to maximize extraction, complete offers, and test withdraw logs.
              </p>

              {/* Accordion list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {FAQ_ITEMS.map((faq, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/5 bg-zinc-950/40 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleExpand(index)}
                        className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[11.5px] font-bold text-zinc-100 leading-snug">
                          {faq.question}
                        </span>
                        <div className="text-zinc-500 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/5 bg-black/20"
                          >
                            <div className="p-4 text-[11px] text-zinc-400 leading-relaxed whitespace-pre-line">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Help support action */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-200">Contact Support</h4>
                    <p className="text-[9px] text-zinc-500 leading-snug mt-0.5">
                      Need help? Shoot a ticket to our support team directly from the app interface.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[8px] text-zinc-600 font-bold uppercase tracking-wider text-center mt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
                  <span>Compliance Sandbox Verified Support Unit</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
