import React from 'react';
import {
  ScanEye,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  Calendar,
  MapPin,
  TrendingUp,
  FileDown,
  Gavel,
  History,
  FileText
} from 'lucide-react';
import { InspectionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  inspections: InspectionRecord[];
  onNavigate: (page: any) => void;
  onSelectInspection: (inspection: InspectionRecord) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  inspections,
  onNavigate,
  onSelectInspection
}) => {
  // Ensure statistics count ONLY active (non-deleted) inspections
  const activeInspections = inspections.filter(i => !i.is_deleted);
  const totalCount = activeInspections.length;
  const compliantCount = activeInspections.filter(i => i.overall_status === 'COMPLIANT').length;
  const nonCompliantCount = activeInspections.filter(i => i.overall_status === 'NON_COMPLIANT').length;
  const reviewCount = activeInspections.filter(i => i.overall_status === 'NEEDS_REVIEW').length;

  const compliantPercent = totalCount > 0 ? ((compliantCount / totalCount) * 100).toFixed(1) : '0.0';
  const nonCompliantPercent = totalCount > 0 ? ((nonCompliantCount / totalCount) * 100).toFixed(1) : '0.0';
  const reviewPercent = totalCount > 0 ? ((reviewCount / totalCount) * 100).toFixed(1) : '0.0';

  const recentInspections = activeInspections.slice(0, 10);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* 1. TOP STATUTORY CONTEXT & ACTION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider">
            <span>Enforcement Wing</span>
            <span>/</span>
            <span className="text-[#0d1c2e] dark:text-white font-bold">Legal Metrology Act, 2009 (Sec 36)</span>
            <span className="text-slate-400">•</span>
            <span className="bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-[#dce9ff] dark:border-slate-700">
              REG-ZONE4-ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#0d1c2e] dark:text-white tracking-tight">
            Inspector Enforcement Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Standard legal metrology intake, statutory compliance screening, and forensic packaging audit under LM (Packaged Commodities) Rules 2011.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            id="dashboard-cta-inspect"
            onClick={() => onNavigate('inspect')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ScanEye className="w-4 h-4 text-emerald-400" />
            <span>New Field Inspection</span>
          </button>
          <button
            id="dashboard-cta-batch"
            onClick={() => onNavigate('batch')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0d1c2e] dark:text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Batch Audit</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0d1c2e] dark:text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Sec 36 Dossiers</span>
          </button>
        </div>
      </div>

      {/* 2. STATUTORY KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Audits */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Audits Logged
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-[#0d1c2e] dark:text-white tracking-tight">
              {totalCount}
            </span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
              <TrendingUp className="w-3 h-3" /> Active
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Recorded in zone enforcement register
          </div>
        </div>

        {/* KPI 2: Compliant Rate */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-emerald-200 dark:border-emerald-900/60 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Compliant Rate
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              {compliantCount}
            </span>
            <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
              {compliantPercent}%
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-400/80 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Zero statutory infractions recorded</span>
          </div>
        </div>

        {/* KPI 3: Non-Compliant Violations */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-red-200 dark:border-red-900/60 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Non-Compliant Violations
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">
              {nonCompliantCount}
            </span>
            <span className="font-mono text-base font-bold text-red-600 dark:text-red-400">
              {nonCompliantPercent}%
            </span>
          </div>
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Sec. 36 Notice actions recommended</span>
          </div>
        </div>

        {/* KPI 4: Incomplete / Review */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-amber-200 dark:border-amber-900/60 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending / Needs Review
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {reviewCount}
            </span>
            <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
              {reviewPercent}%
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Requires officer secondary audit</span>
          </div>
        </div>
      </div>

      {/* 3. RECENT INSPECTIONS REGISTRY TABLE */}
      <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 bg-[#f8fafc] dark:bg-slate-800/50 border-b border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-[#0f172a] dark:text-slate-200" />
            <div>
              <h2 className="text-sm font-bold text-[#0d1c2e] dark:text-white uppercase tracking-wider font-mono">
                Statutory Inspection Records
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live chain-of-custody register for packaged commodities
              </p>
            </div>
          </div>
          {totalCount > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="font-mono text-xs font-semibold text-[#0f172a] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Records ({totalCount})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentInspections.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-white flex items-center justify-center mx-auto">
              <ScanEye className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white">
              No Inspections Logged Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Ready for packaged commodity verification under Legal Metrology Rules 2011. Start your first inspection.
            </p>
            <button
              onClick={() => onNavigate('inspect')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ScanEye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Launch First Inspection</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#eff4ff]/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#e2e8f0] dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Case / Specimen ID</th>
                  <th className="px-5 py-3 font-semibold">Product Title & Commodity</th>
                  <th className="px-5 py-3 font-semibold">Inspection Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Location / Lab</th>
                  <th className="px-5 py-3 font-semibold">Statutory Status</th>
                  <th className="px-5 py-3 font-semibold">Infractions</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800/80">
                {recentInspections.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectInspection(item)}
                    className="hover:bg-[#f8f9ff] dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-[#0d1c2e] dark:text-white">
                      <div>{item.inspection_code}</div>
                      {item.barcode_number && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          SKU: {item.barcode_number}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#0d1c2e] dark:text-white truncate max-w-xs">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {item.commodity_name || 'Standard Pre-Packaged Commodity'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      <span className="truncate max-w-[160px] block">
                        {item.location_name || 'Central Enforcement Lab'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.overall_status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {item.violations && item.violations.length > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          {item.violations.length} breach{item.violations.length > 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          0 breaches
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectInspection(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#eff4ff] text-[#0d1c2e] dark:text-white font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <span>Audit Dossier</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
