import React from 'react';
import { ShieldCheck, MapPin, Calendar, CheckCircle2, XCircle, AlertTriangle, Printer, FileText } from 'lucide-react';
import { InspectionRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import { BrandLogo } from './BrandLogo';

interface InspectionSummaryProps {
  inspection: InspectionRecord;
  onGenerateReport?: () => void;
  onPrint?: () => void;
}

export const InspectionSummary: React.FC<InspectionSummaryProps> = ({
  inspection,
  onGenerateReport,
  onPrint
}) => {
  const formattedDate = new Date(inspection.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = new Date(inspection.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
      {/* Top Heading */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            • Inspection Summary
          </span>
        </div>
        {inspection.is_demo && (
          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
            DEMO DATA — NOT A REAL INSPECTION
          </span>
        )}
      </div>

      {/* Top Banner Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              ID: {inspection.inspection_code}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-950 tracking-tight">
            {inspection.product_name}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={inspection.overall_status} size="lg" />
        </div>
      </div>

      {/* Metadata Row: Date, Time, Location, Inspector */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pb-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-800">{formattedDate}</span>
            <span className="text-slate-400">at</span>
            <span className="font-medium text-slate-800">{formattedTime}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{inspection.location_name || (inspection.latitude ? `${inspection.latitude.toFixed(4)}° N, ${inspection.longitude?.toFixed(4)}° E` : 'Not Provided')}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Audited by: {inspection.inspector_name || 'Not Provided'}</span>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Compliance Overview
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Checks
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {inspection.compliance_results.length} Evaluated
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Passed
            </span>
            <span className="text-xl font-bold text-emerald-900 mt-1 block">
              {inspection.passed_count}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-red-50/60 border border-red-100">
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </span>
            <span className="text-xl font-bold text-red-900 mt-1 block">
              {inspection.failed_count}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
            </span>
            <span className="text-xl font-bold text-amber-900 mt-1 block">
              {inspection.review_count}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Not Applicable
            </span>
            <span className="text-xl font-bold text-slate-700 mt-1 block">
              {inspection.not_applicable_count ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span className="text-[11px] text-slate-400">
          Legal Metrology (Packaged Commodities) Rules, 2011
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onGenerateReport && (
            <button
              id="summary-btn-view-report"
              onClick={onGenerateReport}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-semibold transition-colors shadow-2xs"
            >
              <FileText className="w-4 h-4" />
              Inspection Notice & Report
            </button>
          )}

          {onPrint && (
            <button
              id="summary-btn-print"
              onClick={onPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              title="Print Summary"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
