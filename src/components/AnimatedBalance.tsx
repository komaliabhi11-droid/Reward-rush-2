import React, { useState, useEffect, useRef } from 'react';

interface AnimatedBalanceProps {
  value: number;
}

export default function AnimatedBalance({ value }: AnimatedBalanceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;
    
    if (startValue === endValue) return;

    let startTimestamp: number | null = null;
    const duration = 1000; // 1 second smooth interpolation

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quadratic ease-out easing function
      const easeOut = (t: number) => t * (2 - t);
      const easedProgress = easeOut(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(parseFloat(currentValue.toFixed(2)));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    };

    const animationId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationId);
  }, [value]);

  return <span>{displayValue.toFixed(2)}</span>;
}
