import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number; // 1 to 6
  stepMessage?: string;
}

const STEPS = [
  { step: 1, title: 'Image Ingestion', desc: 'Secure image capture & payload buffering' },
  { step: 2, title: 'Quality & Preprocessing', desc: 'Dewarping, contrast enhancement & auto-orientation' },
  { step: 3, title: 'Multimodal Vision AI', desc: 'Curved, reflective & multi-line label analysis' },
  { step: 4, title: 'JSON Entity Extraction', desc: 'Schema-agnostic semantic key-value mapping' },
  { step: 5, title: 'Deterministic Legal Validation', desc: 'Legal Metrology Rules 2011 8-point verification' },
  { step: 6, title: 'Inspector Visual Verification', desc: 'Green compliant boxes & red non-compliant tags' },
  { step: 7, title: 'Statutory Dossier & Notice', desc: 'Timestamped, geo-tagged Form 1 legal notice ready' },
];

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, stepMessage }) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Conducting Metrology Compliance Audit</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Evaluating mandatory declarations under Legal Metrology (Packaged Commodities) Rules, 2011
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {STEPS.map((item) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;

          return (
            <div
              key={item.step}
              className={`flex items-center gap-3.5 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                  : isDone
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-600 opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-slate-900 dark:text-white animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                )}
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-semibold block ${isCurrent ? 'text-slate-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {item.step}. {item.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {item.desc}
                  </span>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-semibold font-mono text-slate-800 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded">
                    Processing
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] font-semibold font-mono text-emerald-700 dark:text-emerald-400">
                    Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {stepMessage && (
        <div className="text-center text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
          {stepMessage}
        </div>
      )}
    </div>
  );
};
