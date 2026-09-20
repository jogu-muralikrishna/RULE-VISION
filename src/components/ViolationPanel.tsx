import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { FieldComplianceResult } from '../types';
import { StatusBadge } from './StatusBadge';

interface ViolationPanelProps {
  violations: FieldComplianceResult[];
  onSelectField?: (fieldKey: string) => void;
}

export const ViolationPanel: React.FC<ViolationPanelProps> = ({ violations, onSelectField }) => {
  if (violations.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-center gap-3.5 shadow-2xs">
        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-950">No Statutory Violations Detected</h4>
          <p className="text-xs text-emerald-800 mt-0.5">
            All evaluated mandatory declarations meet the baseline criteria of the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
      </div>
    );
  }

  const failCount = violations.filter(v => v.status === 'FAIL').length;
  const reviewCount = violations.filter(v => v.status === 'NEEDS_REVIEW').length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Detected Issues & Action Items</h3>
            <p className="text-xs text-slate-500">
              Findings requiring inspector review or statutory rectification under PCR 2011
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {failCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              {failCount} {failCount === 1 ? 'Violation' : 'Violations'}
            </span>
          )}
          {reviewCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {reviewCount} Needs Review
            </span>
          )}
        </div>
      </div>

      {/* Issues List */}
      <div className="divide-y divide-slate-100">
        {violations.map((item) => {
          const isFail = item.status === 'FAIL';

          return (
            <div
              key={item.fieldKey}
              onClick={() => onSelectField && onSelectField(item.fieldKey)}
              className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{item.fieldLabel}</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.ruleNumber}
                  </span>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-500 block">Detected Value:</span>
                    <span className="text-slate-900 font-medium">
                      {item.detectedValue || <em className="text-red-600">Not detected on package</em>}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block">Reason:</span>
                    <p className="text-slate-700 leading-relaxed">{item.reason}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {item.ruleReference && (
                    <div>
                      <span className="font-semibold text-slate-500 block">Statutory Reference:</span>
                      <span className="text-slate-700 font-mono text-[11px]">{item.ruleReference}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-500 block">Recommended Officer Action:</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {item.recommendedAction}
                    </p>
                  </div>
                </div>
              </div>

              {item.evidence && (
                <div className="mt-3 p-2 bg-slate-100 rounded text-[11px] font-mono text-slate-600">
                  <span className="font-semibold text-slate-500 mr-2">Evidence:</span>
                  "{item.evidence}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
