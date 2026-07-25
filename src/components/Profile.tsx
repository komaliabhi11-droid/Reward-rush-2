import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, CreditCard, ChevronRight, ChevronLeft, 
  Play, LogOut, Share2, Camera, Loader2, Check, Trophy, Flame, Zap, Coins, Laptop
} from 'lucide-react';
import { UserState } from '../types';
import PaymentDetails from './PaymentDetails';

export const PRESET_AVATARS = [
  { id: 'user-0', name: 'Beta Tester', icon: User, gradient: 'from-amber-500 to-yellow-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { id: 'user-1', name: 'Diamond Hands', icon: Trophy, gradient: 'from-purple-500 to-indigo-500', textColor: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  { id: 'user-2', name: 'Streak Master', icon: Flame, gradient: 'from-rose-500 to-orange-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  { id: 'user-3', name: 'Ad Speedrunner', icon: Zap, gradient: 'from-blue-500 to-cyan-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { id: 'user-4', name: 'Coin King', icon: Coins, gradient: 'from-yellow-500 to-amber-600', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
  { id: 'user-5', name: 'Passive Earner', icon: Laptop, gradient: 'from-emerald-500 to-teal-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' }
];

interface ProfileProps {
  user: UserState;
  themeMode: 'oled' | 'cool-gray';
  onChangeTheme: (mode: 'oled' | 'cool-gray') => void;
  onResetData: () => void;
  onLogout: () => void;
  onUpdateUser: (updates: Partial<UserState>) => void;
  triggerToast: (message: string, reward?: number) => void;
}

const getInitials = (name?: string) => {
  if (!name) return 'ME';
  const clean = name.trim();
  if (clean === 'Member Node') return 'ME'; // Matches screenshot exactly
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

export default function Profile({ 
  user, 
  onLogout,
  onUpdateUser,
  triggerToast
}: ProfileProps) {
  const [activeSubView, setActiveSubView] = useState<'main' | 'edit-profile' | 'address' | 'payout'>('main');

  // Ad simulation states
  const [activeAdSim, setActiveAdSim] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Profile fields states
  const [name, setName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phoneNumber || '');

  // Address fields states
  const [addr1, setAddr1] = useState(user.addressLine1 || '');
  const [addr2, setAddr2] = useState(user.addressLine2 || '');
  const [city, setCity] = useState(user.city || '');
  const [state, setState] = useState(user.state || '');
  const [pin, setPin] = useState(user.pincode || '');

  // Payout states
  const [upi, setUpi] = useState(user.upiId || '');

  // Avatar upload simulation state
  const [isUploading, setIsUploading] = useState(false);

  // Hidden input ref for mobile gallery file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      triggerToast('Please select a valid image file from your gallery');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onUpdateUser({ avatarUrl: result });
      setIsUploading(false);
      triggerToast('Profile picture updated!');
    };
    reader.onerror = () => {
      setIsUploading(false);
      triggerToast('Failed to load selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Sync state values when user object changes
  useEffect(() => {
    setName(user.displayName || '');
    setEmail(user.email || '');
    setPhone(user.phoneNumber || '');
    setAddr1(user.addressLine1 || '');
    setAddr2(user.addressLine2 || '');
    setCity(user.city || '');
    setState(user.state || '');
    setPin(user.pincode || '');
    setUpi(user.upiId || '');
  }, [user]);

  // Ad Timer logic
  useEffect(() => {
    let interval: any;
    if (activeAdSim && adCountdown > 0) {
      interval = setInterval(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (activeAdSim && adCountdown === 0) {
      setActiveAdSim(false);
      setAlertMessage('Offer completed! You earned 1 spin.');
    }
    return () => clearInterval(interval);
  }, [activeAdSim, adCountdown]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('RRFN88AE');
    triggerToast('Referral code copied to clipboard!');
  };

  const handleWatchAd = () => {
    setAdCountdown(5);
    setActiveAdSim(true);
  };

  const handleAlertConfirm = () => {
    // Record ad completion and grant 1 spin
    const newTx = {
      id: 'tx-profile-ad-' + Date.now(),
      title: 'Watched profile video ad',
      amount: 0,
      timestamp: new Date().toISOString(),
      type: 'earn' as const,
      status: 'completed' as const
    };

    onUpdateUser({
      spins: (user.spins !== undefined ? user.spins : 9) + 1,
      history: [newTx, ...user.history]
    });

    setAlertMessage(null);
    triggerToast('Earned +1 Spin!');
  };

  const handlePhotoUpload = () => {
    handleTriggerFileInput();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast('Name cannot be empty!');
      return;
    }
    onUpdateUser({
      displayName: name.trim(),
      email: email.trim(),
      phoneNumber: phone.trim()
    });
    triggerToast('Profile updated!');
    setActiveSubView('main');
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      addressLine1: addr1.trim(),
      addressLine2: addr2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pin.trim()
    });
    triggerToast('Address saved!');
    setActiveSubView('main');
  };

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upi.trim() || !upi.includes('@')) {
      triggerToast('Enter a valid UPI ID (e.g. 1234@upi)');
      return;
    }
    onUpdateUser({
      upiId: upi.trim()
    });
    triggerToast('Payment settings updated!');
    setActiveSubView('main');
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-white">
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: MAIN PROFILE VIEW */}
        {activeSubView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5"
          >
            {/* Avatar block exactly matching screenshot */}
            <div className="flex flex-col items-center pt-6">
              <div className="w-28 h-28 rounded-full border-[3px] border-amber-500 bg-black flex items-center justify-center shadow-lg relative select-none overflow-hidden">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName || 'Profile Avatar'} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-black text-white font-sans tracking-wide">
                    {getInitials(user.displayName)}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-center text-white tracking-tight mt-3">
                {user.displayName || 'Add your full name'}
              </h2>
              <p className="text-xs text-center text-zinc-400 font-medium mt-1">
                Configure account metrics below
              </p>
            </div>

            {/* Referral Stats Card exactly matching Screenshot */}
            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/5 shadow-md flex items-center justify-between">
              {/* Left Column: Referral Code */}
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  REFERRAL CODE
                </span>
                <span className="text-[19px] font-black text-amber-500 font-mono tracking-wider mt-1.5 leading-none">
                  RRFN88AE
                </span>
              </div>

              {/* Middle Column: Share Button */}
              <button
                onClick={handleCopyReferral}
                className="w-11 h-11 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center hover:bg-zinc-900 text-amber-500 active:scale-90 transition-all cursor-pointer shadow-inner"
              >
                <Share2 className="w-4.5 h-4.5" />
              </button>

              {/* Right Columns: Referrals & Earned */}
              <div className="flex gap-5.5">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                    REFERRALS
                  </span>
                  <span className="text-[17px] font-black text-white font-mono mt-1.5 leading-none">
                    0
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                    EARNED
                  </span>
                  <span className="text-[17px] font-black text-emerald-400 font-mono mt-1.5 leading-none">
                    ₹0
                  </span>
                </div>
              </div>
            </div>

            {/* Watch Ads Big Orange Button */}
            <button
              onClick={handleWatchAd}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all shadow-md shadow-orange-500/10"
            >
              <div className="w-5 h-5 rounded-full bg-white text-orange-500 flex items-center justify-center">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
              <span>Watch Ads</span>
            </button>

            {/* Menu Options List exactly matching screenshot */}
            <div className="rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden flex flex-col mt-1">
              {/* Edit Profile */}
              <button
                onClick={() => setActiveSubView('edit-profile')}
                className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-all active:bg-white/5 border-b border-white/5 cursor-pointer"
              >
                <span className="text-[13px] font-bold text-zinc-200">
                  Edit Profile & Avatar Image
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* Address Details */}
              <button
                onClick={() => setActiveSubView('address')}
                className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-all active:bg-white/5 border-b border-white/5 cursor-pointer"
              >
                <span className="text-[13px] font-bold text-zinc-200">
                  Address Details
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* Payout Details */}
              <button
                onClick={() => setActiveSubView('payout')}
                className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-all active:bg-white/5 border-b border-white/5 cursor-pointer"
              >
                <span className="text-[13px] font-bold text-zinc-200">
                  Payout & Payment Details
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-rose-500/5 transition-all active:bg-rose-500/10 cursor-pointer"
              >
                <span className="text-[13px] font-bold text-rose-400">
                  Disconnect Session Node
                </span>
                <LogOut className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: EDIT PROFILE SUBVIEW */}
        {activeSubView === 'edit-profile' && (
          <motion.form
            key="edit-profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSaveProfile}
            className="flex flex-col gap-5 pt-3"
          >
            {/* Sub-view Header */}
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => setActiveSubView('main')}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-zinc-850 transition-all text-zinc-400 hover:text-white cursor-pointer active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-black text-white tracking-wider uppercase font-sans">
                Edit Profile
              </h3>
            </div>

            {/* Photo upload container */}
            <div className="flex flex-col items-center my-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={handlePhotoUpload}
                disabled={isUploading}
                className="w-24 h-24 rounded-full bg-zinc-900 border border-dashed border-white/20 hover:border-amber-500/55 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 text-zinc-500 hover:text-amber-500 relative group overflow-hidden"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    <Camera className="w-7 h-7" />
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1.5">UPLOAD</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2.5 font-bold">
                Click image area to change avatar image
              </p>
            </div>

            {/* Fields form */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="add your full name"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="enter email"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="add mobile number"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full mt-3 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </motion.form>
        )}

        {/* VIEW 3: ADDRESS SUBVIEW */}
        {activeSubView === 'address' && (
          <motion.form
            key="address"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSaveAddress}
            className="flex flex-col gap-5 pt-3"
          >
            {/* Sub-view Header */}
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => setActiveSubView('main')}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-zinc-850 transition-all text-zinc-400 hover:text-white cursor-pointer active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-black text-white tracking-wider uppercase font-sans">
                Address Details
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  House/Flat No / Landmark
                </label>
                <input
                  type="text"
                  required
                  value={addr1}
                  onChange={(e) => setAddr1(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="H-No 4-12/A, Main Street"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={addr2}
                  onChange={(e) => setAddr2(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="Near Central Park"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                    placeholder="Hyderabad"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                    placeholder="Telangana"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">
                  Pin Code
                </label>
                <input
                  type="text"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-medium w-full"
                  placeholder="500001"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-3 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Address</span>
            </button>
          </motion.form>
        )}

        {/* VIEW 4: PAYOUT DETAILS SUBVIEW */}
        {activeSubView === 'payout' && (
          <PaymentDetails
            user={user}
            onBack={() => setActiveSubView('main')}
            onUpdateUser={onUpdateUser}
            triggerToast={triggerToast}
          />
        )}
      </AnimatePresence>

      {/* Ad Countdown Simulation Overlay */}
      <AnimatePresence>
        {activeAdSim && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-6 text-center shadow-2xl relative">
              <span className="text-[10px] bg-amber-500 text-black px-2.5 py-0.5 rounded-sm uppercase font-black tracking-widest mb-4 inline-block">
                Sponsored Video Simulation
              </span>
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Simulating Video Ad Stream
              </h3>
              <p className="text-[11px] text-zinc-400 mb-6 font-medium">
                Please wait {adCountdown}s to complete the monetization loop securely.
              </p>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Fidelity Alert Dialog */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-zinc-900 rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col"
            >
              {/* Alert Content */}
              <div className="p-6 text-center flex flex-col gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Alert
                </h3>
                <p className="text-[13px] text-zinc-300 font-medium leading-relaxed">
                  {alertMessage}
                </p>
              </div>

              {/* Thick divider and centered OK button */}
              <div className="w-full border-t border-white/10">
                <button
                  onClick={handleAlertConfirm}
                  className="w-full py-4 text-center text-sm font-black text-orange-400 hover:text-orange-300 hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer uppercase tracking-widest"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
