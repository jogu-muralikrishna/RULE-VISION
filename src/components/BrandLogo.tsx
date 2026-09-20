import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
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
  subtitle = 'AI-Powered Legal Metrology Compliance Auditor',
  className = '',
  onlyEmblem = false,
  onClick
}) => {
  const sizeMap = {
    sm: {
      container: 'gap-2',
      box: 'w-7 h-7 rounded-lg',
      img: 'w-7 h-7 rounded-lg',
      title: 'text-sm',
      badgeText: 'text-[9px] px-1 py-0.2',
      subText: 'text-[9px]'
    },
    md: {
      container: 'gap-2.5',
      box: 'w-9 h-9 rounded-xl',
      img: 'w-9 h-9 rounded-xl',
      title: 'text-base',
      badgeText: 'text-[10px] px-1.5 py-0.5',
      subText: 'text-[11px]'
    },
    lg: {
      container: 'gap-3',
      box: 'w-12 h-12 rounded-xl',
      img: 'w-12 h-12 rounded-xl',
      title: 'text-xl',
      badgeText: 'text-xs px-2 py-0.5',
      subText: 'text-xs'
    },
    hero: {
      container: 'gap-4',
      box: 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl',
      img: 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl',
      title: 'text-3xl sm:text-4xl md:text-5xl',
      badgeText: 'text-xs px-2.5 py-1',
      subText: 'text-xs sm:text-sm'
    }
  };

  const config = sizeMap[size];

  return (
    <div
      className={`inline-flex items-center ${config.container} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Official RuleVision Shield Emblem with Red Neon Checkmark & Metallic Barcode */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div
          className={`${config.box} overflow-hidden rounded-xl bg-[#08090C] border border-[#292B34] shadow-md transition-transform duration-200 hover:scale-105`}
          style={{
            boxShadow: '0 0 16px -2px rgba(255, 38, 56, 0.25)'
          }}
        >
          <img
            src="/assets/rulevision_logo.png"
            alt="RuleVision Logo"
            className={`${config.img} object-contain p-0.5`}
            onError={(e) => {
              // Fallback to local relative asset path if served without root public dir
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('./assets/')) {
                target.src = './assets/rulevision_logo.png';
              }
            }}
          />
        </div>
      </div>

      {/* Brand Wordmark & Descriptor (if not onlyEmblem) */}
      {!onlyEmblem && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-950 dark:text-white ${config.title}`}>
              Rule<span className="text-[#FF2638]">Vision</span>
            </span>
            {badge && (
              <span
                className={`font-bold uppercase tracking-wider rounded-md bg-[#1B1C23] text-[#F5F5F7] border border-[#292B34] ${config.badgeText}`}
              >
                {badge}
              </span>
            )}
          </div>

          {showSubtitle && (
            <span className={`font-semibold tracking-wide text-slate-500 dark:text-[#A5A7B0] mt-1 ${config.subText}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
