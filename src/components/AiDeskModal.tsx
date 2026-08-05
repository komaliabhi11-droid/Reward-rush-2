import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Image, Sparkles, User, HelpCircle, Coins, ArrowUpRight } from 'lucide-react';
import { UserState } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: string;
}

interface AiDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserState;
  onCreditBonus: (amount: number, reason: string) => void;
  themeMode?: 'oled' | 'cool-gray';
}

export default function AiDeskModal({
  isOpen,
  onClose,
  user,
  onCreditBonus,
  themeMode = 'oled'
}: AiDeskModalProps) {
  const isOled = themeMode === 'oled';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! I am your automated Reward Rush AI Desk Assistant. ⚡\n\nHow can I help you extract rewards today? Ask me about:\n• "payout" limits or processing status\n• "spin" wheel prizes and cost\n• "streak" rewards calendar\n• "offers" and completing tasks`,
      timestamp: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSmartResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    if (q.includes('payout') || q.includes('redeem') || q.includes('withdraw') || q.includes('cashout')) {
      return `All sandbox payouts are routed instantly via simulated RPC gateways. 💳\n\n• Processing speed: instant (0-2 hours)\n• Minimum withdrawal threshold: 10000 Nav Durga Coins (₹100.00 value)\n• Methods available: Simulated PayPal, Paytm, UPI, and Amazon Voucher codes on the Logs/Redeem tabs!`;
    }
    
    if (q.includes('spin') || q.includes('wheel') || q.includes('lucky')) {
      return `The Lucky Wheel interactive minigame is located in the Offers tab! 🎡\n\n• Spinning cost: Free spin when earned via offers!\n• Maximum rewards: up to 200 Nav Durga Coins (₹2.00)!\n• Animation engine: physics-based simulated micro-interactions. Try a spin today!`;
    }

    if (q.includes('streak') || q.includes('checkin') || q.includes('calendar') || q.includes('daily')) {
      return `Streak Check-Ins are highly recommended! 📅\n\n• Consecutive check-in rewards: values scale from 10 Nav Durga Coins to 250 Nav Durga Coins on Day 7!\n• Daily reset interval: 24h cycle (midnight reset).\n• Check your remaining time using the Daily Calendar button!`;
    }

    if (q.includes('offer') || q.includes('task') || q.includes('ad') || q.includes('monet')) {
      return `You can accumulate simulated coins by finishing listed placements inside the Offers section. 🚀\n\n• Video campaigns: watch for 5-10s to earn credits.\n• Newsletters: register a sandbox email to submit.\n• Interstitial Ads: test full-screen popups for instant bonus coins!`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return `Hey there! Great to chat with you in the Sandbox simulation console. Let me know if you need to test payouts, understand the Lucky Wheel, or trace transaction ledgers! 🪙`;
    }

    return `I am programmed to assist with testing Reward Rush core mechanics! 💡\n\nIf you have completed an external task, you can also click the Image icon below to upload a simulated screenshot. My OCR scanner will credit your ledger +100 bonus Nav Durga Coins instantly!`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate smart bot response
    setTimeout(() => {
      const replyText = getSmartResponse(userMsg.text);
      const botMsg: Message = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  // Simulate Image Attachment trigger
  const handleAttachImageSim = () => {
    setIsTyping(true);
    
    setTimeout(() => {
      const userImgMsg: Message = {
        id: `msg-user-img-${Date.now()}`,
        sender: 'user',
        text: 'Sent screenshot attachment for verification',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&q=80',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userImgMsg]);
      
      setTimeout(() => {
        setIsTyping(false);
        const botOcrReply: Message = {
          id: `msg-bot-ocr-${Date.now()}`,
          sender: 'assistant',
          text: `🔍 [Simulated OCR Scanned Result]\n\nTask details verified from image metadata! Image represents correct placement compliance.\n\nSimulated Credit: +100 coins successfully injected into your dashboard wallet! 🎉`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botOcrReply]);
        
        // Credit simulated user balance!
        onCreditBonus(100, 'AI Desk Screenshot Compliance Verification');
      }, 1200);
    }, 800);
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
              } h-[520px] flex flex-col shadow-2xl relative overflow-hidden`}
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 z-10" />

              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 relative">
                    <Bot className="w-4.5 h-4.5 animate-pulse" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#050505]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100 flex items-center gap-1">
                      AI Desk 
                      <span className="text-[8px] bg-amber-500 text-black px-1 rounded-sm py-0.2">SIM</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold">SMART ASSISTANT RESPONSIVE</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Chat Message Box */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isBot = msg.sender === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      {isBot && (
                        <div className="w-6.5 h-6.5 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 text-amber-500 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[78%] ${isBot ? 'items-start' : 'items-end'}`}>
                        {msg.image && (
                          <div className="rounded-xl overflow-hidden border border-white/10 mb-1.5 max-w-[200px]">
                            <img src={msg.image} alt="Attachment" className="w-full h-auto" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-2xl text-[11.5px] leading-relaxed whitespace-pre-line ${
                            isBot
                              ? 'bg-zinc-900 text-zinc-200 border border-white/5 rounded-tl-xs'
                              : 'bg-gradient-to-tr from-orange-500 to-amber-500 text-black font-semibold rounded-tr-xs shadow-md shadow-orange-500/5'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[8px] text-zinc-600 font-mono mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {!isBot && (
                        <div className="w-6.5 h-6.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-400 mt-0.5 font-bold text-[9px]">
                          U
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Simulated Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-6.5 h-6.5 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-500 mt-0.5">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                    </div>
                    <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl rounded-tl-xs flex items-center gap-1 text-[11px] text-zinc-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Suggesters */}
              <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                {['payout info', 'streak calendar', 'offers lists', 'spin prizes'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setInputText(p);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-zinc-400 font-bold uppercase tracking-wider hover:text-white hover:border-orange-500/30 transition-all cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-zinc-950 flex gap-2">
                <button
                  type="button"
                  onClick={handleAttachImageSim}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Simulate Attachment compliance screenshot"
                >
                  <Image className="w-4.5 h-4.5 text-orange-400 animate-pulse" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask something about payouts or spin wheel..."
                  className="flex-1 px-4 py-2 bg-black border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
                />

                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-black hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
