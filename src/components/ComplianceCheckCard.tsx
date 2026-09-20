import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { FieldComplianceResult } from '../types';
import { StatusBadge } from './StatusBadge';

interface ComplianceCheckCardProps {
  result: FieldComplianceResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onMarkReviewed?: (fieldKey: string) => void;
}

export const ComplianceCheckCard: React.FC<ComplianceCheckCardProps> = ({
  result,
  isSelected = false,
  onSelect,
  onMarkReviewed
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status visual variants
  const isPass = result.status === 'PASS';
  const isFail = result.status === 'FAIL';
  const isReview = result.status === 'NEEDS_REVIEW';

  const cardBorder = isSelected
    ? 'ring-2 ring-slate-900 border-slate-900 dark:ring-white dark:border-white shadow-md'
    : isFail
    ? 'border-red-200 hover:border-red-300'
    : isReview
    ? 'border-amber-200 hover:border-amber-300'
    : 'border-slate-200 hover:border-slate-300';

  const accentBg = isFail
    ? 'bg-red-50/40'
    : isReview
    ? 'bg-amber-50/40'
    : 'bg-emerald-50/30';

  const Icon = isPass ? CheckCircle2 : isFail ? XCircle : AlertTriangle;
  const iconColor = isPass ? 'text-emerald-600' : isFail ? 'text-red-600' : 'text-amber-600';

  return (
    <div
      id={`compliance-card-${result.fieldKey}`}
      className={`rounded-xl border bg-white shadow-2xs transition-all overflow-hidden flex flex-col ${cardBorder}`}
    >
      {/* Card Header & Primary Status */}
      <div
        className={`p-4 flex items-start justify-between gap-3 cursor-pointer ${accentBg}`}
        onClick={() => {
          if (onSelect) onSelect();
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 p-1 rounded-md bg-white shadow-2xs shrink-0 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {result.fieldLabel}
              </h3>
              <span className="text-[11px] font-mono text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/80">
                {result.ruleNumber}
              </span>
            </div>

            {/* Detected Value Display */}
            <div className="mt-1.5">
              {result.detectedValue ? (
                <div className="text-base font-semibold text-slate-950 break-words line-clamp-2">
                  {result.detectedValue}
                </div>
              ) : (
                <div className="text-sm font-medium text-red-600 italic">
                  Not detected on label
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={result.status} size="sm" />
          {result.confidence > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              Conf: {Math.round(result.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Card Body - Reason & Highlight */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
        <div className="space-y-2">
          {/* Reason explanation */}
          <p className="text-slate-600 leading-relaxed font-normal">
            {result.reason}
          </p>

          {/* Evidence Preview */}
          {result.evidence ? (
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-words">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Detected Evidence:</span>
              "{result.evidence}"
            </div>
          ) : (
            isFail && (
              <div className="p-2 rounded-lg bg-red-50/60 border border-red-100 text-[11px] text-red-700">
                No matching declaration detected in photograph.
              </div>
            )
          )}
        </div>

        {/* Collapsible Details: Rule Reference & Officer Action */}
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full flex items-center justify-between text-slate-500 hover:text-slate-800 text-[11px] font-medium pt-2 border-t border-slate-100"
          >
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" />
              {isExpanded ? 'Hide Rule Reference' : 'Statutory Reference & Officer Action'}
            </span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isExpanded && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-[11px]">
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Statutory Reference:</span>
                <span className="text-slate-600 font-mono">{result.ruleReference}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Recommended Officer Action:</span>
                <span className="text-slate-600">{result.recommendedAction}</span>
              </div>
              {result.boundingBox && (
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 pt-1">
                  <Target className="w-3 h-3" />
                  <span>Bounding box annotation available on package image</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action button if Needs Review */}
        {isReview && onMarkReviewed && (
          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkReviewed(result.fieldKey);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark as Verified by Inspector
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
