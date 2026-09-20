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
  User
} from 'lucide-react';
import { InspectionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { BrandLogo } from '../components/BrandLogo';

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

  const recentInspections = activeInspections.slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Welcome Header */}
      <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-6 md:p-8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1B1C23] border border-slate-200 dark:border-[#292B34] text-slate-800 dark:text-[#FF2638] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Legal Metrology Compliance Screening</span>
          </div>
          <div className="pt-1">
            <BrandLogo size="lg" />
          </div>
          <p className="text-sm md:text-base text-slate-600 dark:text-[#A5A7B0] leading-relaxed font-normal">
            AI-Powered Legal Metrology Compliance Auditor. Scan packaged commodity labels, verify mandatory statutory declarations under the Legal Metrology Packaged Commodities Rules, and generate official compliance reports.
          </p>
        </div>

        {/* Primary & Secondary Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            id="dashboard-cta-inspect"
            onClick={() => onNavigate('inspect')}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all cursor-pointer"
          >
            <ScanEye className="w-4 h-4" />
            Inspect Product
          </button>
          <button
            id="dashboard-cta-batch"
            onClick={() => onNavigate('batch')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#292B34] bg-white dark:bg-[#1B1C23] hover:bg-slate-50 dark:hover:bg-[#101116] text-slate-700 dark:text-[#F5F5F7] text-sm font-semibold transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-500 dark:text-[#A5A7B0]" />
            Batch Audit
          </button>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspections */}
        <div className="bg-white dark:bg-[#14151B] rounded-xl border border-slate-200 dark:border-[#292B34] p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-[#A5A7B0] tracking-wider">
              TOTAL INSPECTIONS
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white mt-1">
              {totalCount}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-[#71737E] mt-0.5 block">Active inspection records</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#1B1C23] flex items-center justify-center text-slate-700 dark:text-[#F5F5F7] shrink-0 border border-transparent dark:border-[#292B34]">
            <FileSpreadsheet className="w-5 h-5 text-[#FF2638]" />
          </div>
        </div>

        {/* Compliant */}
        <div className="bg-white dark:bg-[#14151B] rounded-xl border border-emerald-200 dark:border-emerald-900/60 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
              COMPLIANT
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-emerald-300 mt-1">
              {compliantCount}
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 block">Zero violations detected</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Non-Compliant */}
        <div className="bg-white dark:bg-[#14151B] rounded-xl border border-red-200 dark:border-red-900/60 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-red-700 dark:text-red-400 tracking-wider">
              NON-COMPLIANT
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-950 dark:text-red-300 mt-1">
              {nonCompliantCount}
            </div>
            <span className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5 block">Statutory breaches</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Needs Review */}
        <div className="bg-white dark:bg-[#14151B] rounded-xl border border-amber-200 dark:border-amber-900/60 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              NEEDS REVIEW
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 dark:text-amber-300 mt-1">
              {reviewCount}
            </div>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 block">Ambiguous / unreadable</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-white dark:bg-[#14151B] rounded-xl border border-slate-200 dark:border-[#292B34] shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#292B34] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Inspections</h2>
            <p className="text-xs text-slate-500 dark:text-[#A5A7B0]">Real-time register of examined packaged commodities</p>
          </div>
          {totalCount > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-slate-900 dark:text-[#FF2638] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All ({totalCount})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentInspections.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1B1C23] text-slate-400 dark:text-[#A5A7B0] mx-auto flex items-center justify-center border border-transparent dark:border-[#292B34]">
              <ScanEye className="w-6 h-6 text-[#FF2638]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No inspections yet.</h3>
            <p className="text-xs text-slate-500 dark:text-[#A5A7B0] max-w-sm mx-auto">
              Upload or capture a packaged commodity photograph to start your first Legal Metrology compliance audit.
            </p>
            <button
              onClick={() => onNavigate('inspect')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              Inspect Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#101116] text-slate-500 dark:text-[#A5A7B0] font-semibold border-b border-slate-200/80 dark:border-[#292B34] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Inspection ID</th>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">Inspected By</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Issues</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#292B34] font-normal">
                {recentInspections.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#1B1C23]/60 transition-colors cursor-pointer"
                    onClick={() => onSelectInspection(item)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {item.inspection_code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-[#A5A7B0]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#FF2638]" />
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                          {item.inspector_name || item.inspector_email || 'Authorized User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-[#A5A7B0] whitespace-nowrap">
                      <div>
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[#71737E]">
                        {new Date(item.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.overall_status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      {item.failed_count > 0 ? (
                        <span className="text-red-700 dark:text-red-400 font-semibold">
                          {item.failed_count} violations
                        </span>
                      ) : item.review_count > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          {item.review_count} to review
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInspection(item);
                        }}
                        className="text-xs font-semibold text-slate-900 dark:text-[#FF2638] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        View Details
                        <ArrowRight className="w-3 h-3" />
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
