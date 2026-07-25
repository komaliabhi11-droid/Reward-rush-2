import React from 'react';
// @ts-ignore
import navDurgaCoinImg from '../assets/images/nav_durga_coin_1784945609070.jpg';

interface NavDurgaCoinProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export default function NavDurgaCoin({ className = '', size = 'md' }: NavDurgaCoinProps) {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-12 h-12',
    '3xl': 'w-16 h-16',
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <img
      src={navDurgaCoinImg}
      alt="Nav Durga Coin"
      className={`rounded-full shadow-md border border-amber-500/20 object-cover shrink-0 select-none inline-block ${selectedSize} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}
