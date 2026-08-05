import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Coins } from 'lucide-react';

interface SpinWheelProps {
  userSpins: number;
  onSpinResult: (rewardCoins: number) => void;
  triggerToast: (message: string) => void;
  spinCount?: number;
}

interface WheelSegment {
  value: number;
  reward: number; // in coins (e.g. 1 or 2)
  angle: number; // center angle in degrees
}

const SEGMENTS: WheelSegment[] = [
  { value: 1, reward: 1, angle: 22.5 },
  { value: 2, reward: 2, angle: 67.5 },
  { value: 1, reward: 1, angle: 112.5 },
  { value: 2, reward: 2, angle: 157.5 },
  { value: 1, reward: 1, angle: 202.5 },
  { value: 2, reward: 2, angle: 247.5 },
  { value: 1, reward: 1, angle: 292.5 },
  { value: 2, reward: 2, angle: 337.5 }
];

export default function SpinWheel({ userSpins, onSpinResult, triggerToast, spinCount = 0 }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleSpin = () => {
    if (isSpinning) return;

    if (userSpins <= 0) {
      triggerToast('No spins available! Complete offers to earn more spins.');
      return;
    }

    setIsSpinning(true);

    // Determine target reward based on how many times user has spun:
    // Mostly ₹1 (1 coin) by default, but if they have done more spins, they get ₹2 (2 coins).
    let targetReward = 1;
    const rand = Math.random();
    if (spinCount < 2) {
      // First 2 spins: 85% chance of ₹1, 15% chance of ₹2
      targetReward = rand < 0.85 ? 1 : 2;
    } else {
      // Spun more: 75% chance of ₹2, 25% chance of ₹1
      targetReward = rand < 0.75 ? 2 : 1;
    }

    // Filter segments that correspond to the chosen reward to keep visual alignment perfect
    const matchingSegments = SEGMENTS.filter(seg => seg.reward === targetReward);
    const randomIndex = Math.floor(Math.random() * matchingSegments.length);
    const targetSegment = matchingSegments[randomIndex];

    // Compute rotation angle
    // Standard rotation: 360 - segment center angle
    // Add 5 to 8 full rotations (1800 to 2880 deg) for suspenseful spin
    const fullRotations = (5 + Math.floor(Math.random() * 4)) * 360;
    const finalAngle = fullRotations + (360 - targetSegment.angle);

    setRotation(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      onSpinResult(targetSegment.reward);
    }, 4000); // 4 seconds duration
  };

  const conicGradient = `conic-gradient(
    #f97316 0deg 45deg,
    #f59e0b 45deg 90deg,
    #eab308 90deg 135deg,
    #ea580c 135deg 180deg,
    #d97706 180deg 225deg,
    #ca8a04 225deg 270deg,
    #f97316 270deg 315deg,
    #f59e0b 315deg 360deg
  )`;

  return (
    <div className="w-full p-6 rounded-[32px] bg-zinc-950/60 backdrop-blur-xl border border-white/10 flex flex-col items-center text-center">
      {/* Title Header */}
      <h3 className="text-base font-black text-white uppercase tracking-wider mb-5">
        Spin the Wheel!
      </h3>

      {/* Main Wheel Area */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        {/* Top Pointer exactly matching yellow downward arrow */}
        <div className="absolute -top-4 z-30 flex flex-col items-center drop-shadow-md">
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-yellow-400" />
        </div>

        {/* Outer circular shadow ring */}
        <div className="p-1 rounded-full bg-linear-to-b from-white/10 to-black border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
          {/* Rotating Wheel Graphic */}
          <div 
            style={{ 
              backgroundImage: conicGradient,
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none'
            }}
            className="w-56 h-56 rounded-full relative overflow-hidden border-4 border-zinc-950 flex items-center justify-center"
          >
            {/* Center Hub SPIN button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="absolute w-14 h-14 bg-zinc-900 rounded-full z-20 border-2 border-white/20 shadow-inner flex items-center justify-center cursor-pointer hover:bg-zinc-850 active:scale-95 transition-all"
            >
              <span className="text-xs font-black text-white tracking-widest">SPIN</span>
            </button>

            {/* Segment Labels */}
            {SEGMENTS.map((seg, i) => (
              <div
                key={i}
                style={{
                  transform: `rotate(${seg.angle}deg)`,
                  transformOrigin: '50% 100%',
                  height: '50%',
                  top: '0',
                  left: 'calc(50% - 15px)',
                  width: '30px'
                }}
                className="absolute flex flex-col items-center justify-start pt-4 select-none"
              >
                <span className="text-xs font-black text-white font-sans drop-shadow-md">
                  ₹{seg.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-[13px] uppercase tracking-wider text-center cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/10 disabled:opacity-50"
      >
        {isSpinning ? 'Spinning...' : 'Spin Now'}
      </button>
    </div>
  );
}
