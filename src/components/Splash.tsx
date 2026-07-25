import React, { useState } from 'react';
import { Mail, Lock, Sparkles, UserPlus, LogIn, CheckCircle2, ShieldCheck, Gift } from 'lucide-react';
import { UserState } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SplashProps {
  onLogin: (email: string, loadedState?: UserState) => void;
}

export default function Splash({ onLogin }: SplashProps) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isSignUpMode && !displayName.trim()) {
      setError('Please add your full name.');
      return;
    }
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUpMode) {
        // Firebase Auth Create User
        const credential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
        const uid = credential.user.uid;
        
        // Populate Firestore Document with complete user schema
        const freshUserDoc = {
          uid,
          fullName: displayName.trim() || 'Member Node',
          email: email.toLowerCase(),
          mobile: '',
          profilePhoto: 'user-0',
          coins: 0, // start at 0 as requested in standard registration
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingWithdraw: 0,
          referralCode: referralCode.trim() || '',
          joinedAt: new Date().toISOString(),
          isAdmin: false,
          isBanned: false,
          paymentDetails: {},
          notifications: 0,
          dailyStreak: 3,
          lastCheckIn: new Date().toISOString().split('T')[0],
          completedTasksCount: 3,
          spins: 9,
          history: []
        };
        
        await setDoc(doc(db, 'users', uid), freshUserDoc);
        setSuccess('Account registered successfully! Welcome to Reward Rush.');
        
        setTimeout(() => {
          onLogin(email);
        }, 1200);

      } else {
        // Firebase Auth Login
        await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
        setSuccess('Authentication success! Loading dashboard...');
        
        setTimeout(() => {
          onLogin(email);
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'Authentication failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already registered.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email address or password.';
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      const emailAddress = result.user.email || '';
      
      // Check if user document already exists in Firestore
      const userDocRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (!userSnapshot.exists()) {
        // Create user document if first time logging in with Google
        const freshUserDoc = {
          uid,
          fullName: result.user.displayName || 'Member Node',
          email: emailAddress,
          mobile: result.user.phoneNumber || '',
          profilePhoto: result.user.photoURL || 'user-0',
          coins: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingWithdraw: 0,
          referralCode: '',
          joinedAt: new Date().toISOString(),
          isAdmin: false,
          isBanned: false,
          paymentDetails: {},
          notifications: 0,
          dailyStreak: 3,
          lastCheckIn: new Date().toISOString().split('T')[0],
          completedTasksCount: 3,
          spins: 9,
          history: []
        };
        await setDoc(userDocRef, freshUserDoc);
      }
      
      setSuccess('Connected with Google! Session verified.');
      setTimeout(() => {
        onLogin(emailAddress);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase());
      setSuccess('Password reset link has been dispatched to your email address!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to dispatch password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full p-6 text-white bg-black select-none">
      {/* Centered Modern Logo Badge (Hexagon Gift Rupee) */}
      <div className="flex flex-col items-center mt-2 text-center">
        <div className="relative flex items-center justify-center w-20 h-20 mb-3">
          <div 
            className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <div 
              className="w-[90%] h-[90%] bg-zinc-950 flex flex-col items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <div className="relative flex flex-col items-center justify-center">
                <Gift className="w-8 h-8 text-amber-500" />
                <span className="absolute text-[10px] font-black text-black bg-amber-500 px-0.5 rounded-sm leading-none top-[13px]">₹</span>
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Reward Rush
        </h1>
        <p className="mt-1 text-[9px] tracking-widest text-zinc-500 uppercase font-bold max-w-[240px] leading-relaxed">
          Premium serverless extraction dashboard configuration
        </p>
      </div>

      {/* Red toggling capsule button */}
      <div className="w-full flex justify-center my-3">
        <button
          onClick={() => {
            setIsSignUpMode(!isSignUpMode);
            setError('');
            setSuccess('');
          }}
          className="w-full max-w-xs py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-end px-4 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer overflow-hidden"
        >
          {isSignUpMode ? (
            <span className="w-full text-center">⚡ Double rewards for each referral!</span>
          ) : (
            <span>⚡ New user</span>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="my-auto py-1">
        <div className="p-5 rounded-2xl bg-[#080808] border border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Golden Divider / Pill Header */}
          <div className="w-full flex justify-center mb-4">
            <div className="bg-amber-950/20 border border-amber-500/20 text-amber-400 text-[9px] tracking-wider py-1 px-4 rounded-full text-center font-bold font-mono">
              🛡️ FIRST CREATE ACCOUNT OR CHOOSE GOOGLE
            </div>
          </div>
          
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUpMode ? (
              <>
                {/* FULL NAME */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="add your full name"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>

                {/* REFERRAL CODE (OPTIONAL) */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    REFERRAL CODE (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter referrer's code"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>

                {/* GMAIL ADDRESS */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    GMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>

                {/* SECURITY ACCESS PASSWORD */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    SECURITY ACCESS PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>
              </>
            ) : (
              <>
                {/* GMAIL ADDRESS */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    GMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>

                {/* SECURITY ACCESS PASSWORD */}
                <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-4 space-y-1 text-left">
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 font-sans">
                    SECURITY ACCESS PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your security password"
                    className="w-full bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-600 transition-all font-medium"
                  />
                </div>

                {!isSignUpMode && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[9px] font-black text-amber-500/70 hover:text-amber-500 uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="p-3 text-[10px] font-bold bg-rose-950/20 border border-rose-500/20 text-rose-400 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-[10px] font-bold bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-1.5 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-3.5 overflow-hidden text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Configuring Session...</span>
                </div>
              ) : (
                <span>{isSignUpMode ? 'Register & Setup Node' : 'Direct Account Access'}</span>
              )}
            </button>
          </form>

          {/* Continue with Google Button */}
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-3 text-[9px] text-zinc-600 uppercase tracking-widest font-bold">or</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 bg-white rounded-xl text-xs text-black font-extrabold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {/* Embedded Google SVG Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      {/* Footer Text */}
      <div className="text-center mt-3">
        {isSignUpMode ? (
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(false);
              setError('');
              setSuccess('');
            }}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2 cursor-pointer transition-colors active:scale-95 underline decoration-amber-500/30 underline-offset-4"
          >
            Already registered? Direct Access here
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(true);
              setError('');
              setSuccess('');
            }}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2 cursor-pointer transition-colors active:scale-95"
          >
            New allocation? Register user node entry
          </button>
        )}
      </div>
    </div>
  );
}
