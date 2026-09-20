import React, { useState, useEffect } from 'react';
import { Scale, RotateCcw, ShieldCheck, Check, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { ComplianceRuleConfig } from '../types';
import { DEFAULT_PCR_RULES } from '../rules/defaultRules';

export const RulesConfigPage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRuleConfig[]>([]);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    // Load from localStorage or defaults
    const stored = localStorage.getItem('rulevision_rules_config');
    if (stored) {
      try {
        setRules(JSON.parse(stored));
        return;
      } catch (e) {
        // fallback to defaults
      }
    }
    setRules(DEFAULT_PCR_RULES);
  }, []);

  const handleToggle = (ruleId: string) => {
    const updated = rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    localStorage.setItem('rulevision_rules_config', JSON.stringify(updated));
    showSavedNotification();
  };

  const handleReset = () => {
    setRules(DEFAULT_PCR_RULES);
    localStorage.setItem('rulevision_rules_config', JSON.stringify(DEFAULT_PCR_RULES));
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-slate-900 dark:text-white" />
            Statutory Rules Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Legal Metrology (Packaged Commodities) Rules, 2011 — Mandatory Declarations Matrix under Rule 6(1).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3.5 h-3.5" /> Changes Applied
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default PCR Rules
          </button>
        </div>
      </div>

      {/* Statutory Guidance Card */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-4 flex items-start gap-3 text-xs text-slate-900 dark:text-slate-100">
        <Info className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">About Rule 6(1) of the Packaged Commodities Rules, 2011:</p>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            Under Indian law, every package shall bear thereon or on label securely affixed thereto, definite, plain and conspicuous declarations. Disabling a statutory rule here will exclude that check from future automated compliance screenings.
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border bg-white dark:bg-slate-900 p-5 transition-all shadow-2xs ${
              rule.enabled ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                    {rule.ruleNumber}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.fieldLabel}</h3>
                  {rule.isMandatory && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.2 rounded border border-red-200">
                      Mandatory
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal pt-1">
                  {rule.description}
                </p>

                <div className="pt-2 text-[11px] text-slate-400 font-mono">
                  Clause: {rule.statutoryReference}
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggle(rule.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
