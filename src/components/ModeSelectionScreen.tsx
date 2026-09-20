import React from 'react';
import { UserCheck, Search, ArrowRight, Sun, Moon, Sparkles, Scale } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'inspector' | 'consumer') => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  onSelectMode,
  isDarkMode,
  onToggleTheme
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 antialiased p-4 sm:p-6 md:p-8">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <BrandLogo size="sm" badge="PCR '11" />

        <button
          id="theme-toggle-mode-screen"
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs text-xs font-semibold"
          title={isDarkMode ? 'Switch to White Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>White Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Center Content */}
      <div className="max-w-2xl mx-auto w-full py-8 text-center space-y-8 my-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Legal Metrology Compliance Screening</span>
          </div>

          <div className="flex justify-center py-2">
            <BrandLogo size="hero" showSubtitle={true} subtitle="Legal Metrology (Packaged Commodities) Compliance Auditor" />
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-2">
            Choose Your Mode
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          {/* Inspector Mode Card */}
          <div
            id="card-inspector-mode"
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-100 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Scale className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                  INSPECTOR MODE
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Full compliance inspection tools, batch auditing, statutory rule evaluation, and inspection history.
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                id="btn-continue-inspector"
                onClick={() => onSelectMode('inspector')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-sm font-semibold shadow-xs hover:shadow transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Consumer Mode Card */}
          <div
            id="card-consumer-mode"
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-100 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Search className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                  CONSUMER MODE
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Quickly check a packaged product's visible declarations, MRP, net quantity, dates, and consumer care details.
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                id="btn-continue-consumer"
                onClick={() => onSelectMode('consumer')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-sm font-semibold shadow-xs hover:shadow transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-4 border-t border-slate-200 dark:border-slate-900 max-w-4xl mx-auto w-full">
        <p className="font-semibold text-slate-600 dark:text-slate-400">RuleVision</p>
        <p className="text-[11px] mt-0.5">
          Legal Metrology (Packaged Commodities) Rules, 2011 Automated Auditor
        </p>
      </div>
    </div>
  );
};
