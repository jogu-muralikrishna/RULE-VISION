import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Calendar,
  MapPin,
  Trash2,
  Eye,
  X,
  FileDown,
  TrendingUp,
  Gavel,
  Shield,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Barcode,
  Clock,
  Sparkles
} from 'lucide-react';
import { InspectionRecord, OverallComplianceStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { exportInspectionsToCSV } from '../utils/csvExport';

interface HistoryPageProps {
  inspections: InspectionRecord[];
  onSelectInspection: (inspection: InspectionRecord) => void;
  onSoftDelete?: (id: string) => Promise<void>;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  inspections,
  onSelectInspection,
  onSoftDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<InspectionRecord | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InspectionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeInspections = useMemo(() => {
    return inspections.filter(i => !i.is_deleted);
  }, [inspections]);

  // Forensic KPI Counts
  const totalCount = activeInspections.length;
  const compliantCount = activeInspections.filter(i => i.overall_status === 'COMPLIANT').length;
  const nonCompliantCount = activeInspections.filter(i => i.overall_status === 'NON_COMPLIANT').length;
  const reviewCount = activeInspections.filter(i => i.overall_status === 'NEEDS_REVIEW').length;

  const compliantPercent = totalCount > 0 ? ((compliantCount / totalCount) * 100).toFixed(1) : '0.0';
  const nonCompliantPercent = totalCount > 0 ? ((nonCompliantCount / totalCount) * 100).toFixed(1) : '0.0';
  const reviewPercent = totalCount > 0 ? ((reviewCount / totalCount) * 100).toFixed(1) : '0.0';

  const filteredInspections = useMemo(() => {
    return activeInspections.filter(item => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.inspection_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.commodity_name && item.commodity_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.barcode_number && item.barcode_number.includes(searchQuery));

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.overall_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activeInspections, searchQuery, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onSoftDelete) return;
    setIsDeleting(true);
    try {
      await onSoftDelete(itemToDelete.id);
      if (selectedDrawerItem?.id === itemToDelete.id) {
        setSelectedDrawerItem(null);
      }
      setToastMessage(`Inspection ${itemToDelete.inspection_code} moved to Recycle Bin.`);
      setItemToDelete(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to soft delete inspection:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    exportInspectionsToCSV(
      filteredInspections.length > 0 ? filteredInspections : activeInspections,
      `rulevision_statutory_registry_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* 1. TOP STATUTORY REGISTRY CONTEXT & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider">
            <span>Enforcement Registry</span>
            <span>/</span>
            <span className="text-[#0d1c2e] dark:text-white font-bold">Legal Metrology Act, 2009 (Sec 36)</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#0d1c2e] dark:text-white tracking-tight">
              Inspection History & Statutory Registry
            </h1>
            <span className="bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-slate-200 px-2.5 py-0.5 rounded text-xs font-mono font-bold border border-[#dce9ff] dark:border-slate-700">
              REG-ZONE4-ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Complete chain-of-custody archive for packaged commodity verification under LM (Packaged Commodities) Rules 2011. Evidentiary records logged with irreversible SHA-256 state stamps.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0d1c2e] dark:text-white text-xs font-semibold shadow-xs transition-all cursor-pointer font-mono"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export Inspection CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer font-mono"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Batch Sec. 36 Dossier Export</span>
          </button>
        </div>
      </div>

      {/* 2. FORENSIC KPI OVERVIEW MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Audits */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Audits
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-white flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-[#0d1c2e] dark:text-white tracking-tight">
              {totalCount}
            </span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
              <TrendingUp className="w-3 h-3" /> 100%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Active enforcement batch register
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
            <span>Zero statutory breaches recorded</span>
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

        {/* KPI 4: Pending / Incomplete */}
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-amber-200 dark:border-amber-900/60 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Incomplete & Pending
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

      {/* 3. FILTER & PRECISION SEARCH CONTROL CONSOLE */}
      <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search inspection by ID, SKU, product title, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8f9ff] dark:bg-slate-800 text-[#0d1c2e] dark:text-white pl-9 pr-4 py-2 rounded-lg font-sans text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f172a] border border-[#e2e8f0] dark:border-slate-700 transition-all"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-[#eff4ff] dark:bg-slate-800 p-1 rounded-xl overflow-x-auto shrink-0 border border-[#dce9ff] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NON_COMPLIANT')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'NON_COMPLIANT'
                  ? 'bg-red-50 text-red-700 border border-red-200 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-red-600'
              }`}
            >
              Non-Compliant ({nonCompliantCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLIANT')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'COMPLIANT'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
              }`}
            >
              Compliant ({compliantCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEEDS_REVIEW')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'NEEDS_REVIEW'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              Pending ({reviewCount})
            </button>
          </div>
        </div>

        {/* Active Filter Indicator Strip */}
        {(searchQuery || statusFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e8f0] dark:border-slate-800 text-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Active Filters:</span>
            {statusFilter !== 'ALL' && (
              <span className="bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-slate-200 px-2.5 py-1 rounded-md border border-[#dce9ff] dark:border-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                <span>Status: <strong>{statusFilter}</strong></span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="bg-[#eff4ff] dark:bg-slate-800 text-[#0f172a] dark:text-slate-200 px-2.5 py-1 rounded-md border border-[#dce9ff] dark:border-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                <span>Query: <strong>"{searchQuery}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-red-600 hover:underline font-mono font-bold cursor-pointer ml-1"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-[#eff4ff] dark:bg-slate-800 border border-[#dce9ff] dark:border-slate-700 text-xs font-semibold text-[#0d1c2e] dark:text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. MAIN WORKSPACE SPLIT: DATA TABLE & INSPECTION DETAIL SLIDE-OVER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Primary Data Registry Table */}
        <div className={`${selectedDrawerItem ? 'xl:col-span-7' : 'xl:col-span-12'} bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200`}>
          <div className="bg-[#f8fafc] dark:bg-slate-800/60 px-5 py-3.5 flex items-center justify-between border-b border-[#e2e8f0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#0f172a] dark:text-slate-300" />
              <span className="font-mono text-xs font-bold text-[#0d1c2e] dark:text-white uppercase tracking-wider">
                Statutory Inspection Records
              </span>
              <span className="bg-[#eff4ff] dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold border border-[#dce9ff] dark:border-slate-700">
                {filteredInspections.length} Matching
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live Synced
              </span>
            </div>
          </div>

          {filteredInspections.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white">No matching inspection records</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search query or status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#eff4ff]/50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#e2e8f0] dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Case / Specimen ID</th>
                    <th className="px-4 py-3 font-semibold">Commodity & Title</th>
                    <th className="px-4 py-3 font-semibold">Captured Date</th>
                    <th className="px-4 py-3 font-semibold">Statutory Status</th>
                    <th className="px-4 py-3 font-semibold">Breaches</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredInspections.map((item) => {
                    const isSelected = selectedDrawerItem?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedDrawerItem(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#eff4ff] dark:bg-slate-800/90 border-l-4 border-l-[#0f172a]'
                            : 'hover:bg-[#f8f9ff] dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono">
                          <div className="font-bold text-[#0d1c2e] dark:text-white">{item.inspection_code}</div>
                          {item.barcode_number && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              SKU: {item.barcode_number}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#0d1c2e] dark:text-white truncate max-w-xs">
                            {item.product_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {item.commodity_name || 'Pre-Packaged Commodity'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {new Date(item.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.overall_status} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          {item.violations && item.violations.length > 0 ? (
                            <span className="text-red-600 font-bold">
                              {item.violations.length} breach{item.violations.length > 1 ? 'es' : ''}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0 breaches</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDrawerItem(item)}
                              className="px-2.5 py-1 rounded border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#eff4ff] text-[#0d1c2e] dark:text-white font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              Details
                            </button>
                            {onSoftDelete && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete(item)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Move to Recycle Bin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inspection Detail Slide-over / Forensic Dossier Panel (Rv4 Reference) */}
        {selectedDrawerItem && (
          <div className="xl:col-span-5 bg-white dark:bg-[#131b2e] rounded-xl border border-[#e2e8f0] dark:border-slate-800 shadow-xs p-5 space-y-5 sticky top-24">
            {/* Header with Case ID and Close */}
            <div className="flex items-start justify-between pb-3 border-b border-[#e2e8f0] dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#0f172a] dark:text-white">
                    {selectedDrawerItem.inspection_code}
                  </span>
                  <StatusBadge status={selectedDrawerItem.overall_status} size="sm" />
                </div>
                <h3 className="font-headline text-base font-bold text-[#0d1c2e] dark:text-white leading-tight">
                  {selectedDrawerItem.product_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrawerItem(null)}
                className="text-slate-400 hover:text-[#0d1c2e] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Specimen Photographic Thumbnail with PDP overlay */}
            <div className="flex gap-4 items-center p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-800/60 border border-[#e2e8f0] dark:border-slate-700">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-[#cbd5e1] shrink-0 flex items-center justify-center">
                {selectedDrawerItem.image_url ? (
                  <img
                    src={selectedDrawerItem.image_url}
                    alt={selectedDrawerItem.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Barcode className="w-10 h-10 text-slate-400" />
                )}
                <div className="absolute inset-1 border border-dashed border-red-500 rounded pointer-events-none" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Specimen Evidence
                </div>
                <div className="font-mono text-[11px] font-semibold text-[#0d1c2e] dark:text-white">
                  PDP Detected: 145 × 190 mm
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  SHA-256: d98a...f412
                </div>
                <div className="text-[11px] text-slate-500">
                  {selectedDrawerItem.location_name || 'Zone IV Metrology Lab'}
                </div>
              </div>
            </div>

            {/* Statutory Key Declarations Table */}
            <div className="space-y-2">
              <div className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Statutory Declarations (Rule 6 Check)
              </div>
              <div className="bg-[#f8f9ff] dark:bg-slate-800/50 rounded-lg border border-[#e2e8f0] dark:border-slate-700 p-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Commodity:</span>
                  <span className="font-mono font-semibold text-[#0d1c2e] dark:text-white text-right max-w-[200px] truncate">
                    {selectedDrawerItem.commodity_name || selectedDrawerItem.product_name}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Net Quantity:</span>
                  <span className="font-mono font-bold text-[#0d1c2e] dark:text-white">
                    {selectedDrawerItem.net_quantity || '---'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-slate-500 font-medium">MRP (incl. taxes):</span>
                  <span className="font-mono font-bold text-[#0d1c2e] dark:text-white">
                    {selectedDrawerItem.mrp || '---'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Mfg / Packing Date:</span>
                  <span className="font-mono font-semibold text-[#0d1c2e] dark:text-white">
                    {selectedDrawerItem.manufacturing_or_packing_date || '---'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Country of Origin:</span>
                  <span className="font-mono font-semibold text-[#0d1c2e] dark:text-white">
                    {selectedDrawerItem.country_of_origin || 'India'}
                  </span>
                </div>
              </div>
            </div>

            {/* Violations / Infractions Box */}
            {selectedDrawerItem.violations && selectedDrawerItem.violations.length > 0 ? (
              <div className="space-y-2">
                <div className="font-mono text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Statutory Breaches ({selectedDrawerItem.violations.length})</span>
                </div>
                <div className="space-y-1.5">
                  {selectedDrawerItem.violations.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-red-800 dark:text-red-300">
                        <span>{v.fieldLabel}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-900">
                          {v.ruleNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-1">
                        {v.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All mandatory declarations verified compliant under PCR 2011.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onSelectInspection(selectedDrawerItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer font-mono"
              >
                <span>Launch Full Audit Suite</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Moving to Recycle Bin */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0d1c2e] dark:text-white">Move to Recycle Bin</h3>
                <p className="font-mono text-xs text-slate-500">Case ID: {itemToDelete.inspection_code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to move the inspection record for <strong>{itemToDelete.product_name}</strong> to the Recycle Bin? The evidentiary record can be restored anytime from the Recycle Bin.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? 'Moving...' : 'Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
