import React from 'react';
import rulevisionShield from '../assets/rulevision_shield.png';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  badge?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
  onlyEmblem?: boolean;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  badge,
  showSubtitle = false,
  subtitle = 'Legal Metrology Compliance System (LM-Rules 6 & 7)',
  className = '',
  onlyEmblem = false,
  onClick
}) => {
  const sizeMap = {
    xs: {
      container: 'gap-1.5',
      box: 'w-6 h-6 rounded-md',
      img: 'w-6 h-6',
      title: 'text-xs font-bold',
      badgeText: 'text-[8px] px-1 py-0.2',
      subText: 'text-[8px]'
    },
    sm: {
      container: 'gap-2.5',
      box: 'w-8 h-8 rounded-lg',
      img: 'w-8 h-8',
      title: 'text-sm font-bold',
      badgeText: 'text-[9px] px-1.5 py-0.5',
      subText: 'text-[10px]'
    },
    md: {
      container: 'gap-3',
      box: 'w-10 h-10 rounded-xl',
      img: 'w-10 h-10',
      title: 'text-base font-bold',
      badgeText: 'text-[10px] px-2 py-0.5',
      subText: 'text-[11px]'
    },
    lg: {
      container: 'gap-3.5',
      box: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
      img: 'w-14 h-14 sm:w-16 sm:h-16',
      title: 'text-xl sm:text-2xl font-bold',
      badgeText: 'text-xs px-2.5 py-0.5',
      subText: 'text-xs'
    },
    hero: {
      container: 'gap-4',
      box: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl shadow-lg ring-1 ring-slate-700/50',
      img: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
      title: 'text-3xl sm:text-4xl md:text-5xl font-extrabold',
      badgeText: 'text-xs px-2.5 py-1',
      subText: 'text-xs sm:text-sm'
    }
  };

  const config = sizeMap[size] || sizeMap.md;
  const isCol = className.includes('flex-col');

  return (
    <div
      className={`inline-flex items-center ${config.container} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Official RuleVision Shield Emblem (High-Clarity Native Asset) */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div
          className={`${config.box} overflow-hidden bg-[#070b14] border border-slate-700/80 shadow-md flex items-center justify-center aspect-square transition-transform duration-200 hover:scale-105 shrink-0`}
        >
          <img
            src={rulevisionShield}
            alt="RuleVision Logo"
            className={`${config.img} aspect-square object-cover block`}
            loading="eager"
          />
        </div>
      </div>

      {/* Brand Title & Descriptor */}
      {!onlyEmblem && (
        <div className={`flex flex-col justify-center ${isCol ? 'items-center text-center' : 'text-left'}`}>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className={`font-headline tracking-tight text-[#0d1c2e] dark:text-white ${config.title}`}>
              RuleVision
            </span>
            {badge && (
              <span
                className={`font-mono font-bold uppercase tracking-wider rounded bg-[#eff4ff] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[#dce9ff] dark:border-slate-700 ${config.badgeText}`}
              >
                {badge}
              </span>
            )}
          </div>

          {showSubtitle && (
            <span className={`font-sans font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-tight ${config.subText}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

