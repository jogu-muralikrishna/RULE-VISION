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
  Sparkles,
  Trash2,
  Eye,
  AlertOctagon,
  X
} from 'lucide-react';
import { InspectionRecord, OverallComplianceStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

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
  const [itemToDelete, setItemToDelete] = useState<InspectionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredInspections = useMemo(() => {
    return inspections.filter(item => {
      // Search filter
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.inspection_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.commodity_name && item.commodity_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'DEMO' && item.is_demo) ||
        item.overall_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inspections, searchQuery, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onSoftDelete) return;
    setIsDeleting(true);
    try {
      await onSoftDelete(itemToDelete.id);
      setToastMessage(`Inspection ${itemToDelete.inspection_code} moved to Recycle Bin.`);
      setItemToDelete(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to soft delete inspection:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-slate-900 dark:text-white" />
            Inspection Audit History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Immutable log of completed Legal Metrology compliance screenings and field inspections.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          Showing {filteredInspections.length} of {inspections.length} active records
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name or RV-ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'COMPLIANT', label: 'Compliant' },
            { id: 'NON_COMPLIANT', label: 'Non-Compliant' },
            { id: 'NEEDS_REVIEW', label: 'Needs Review' },
            { id: 'DEMO', label: 'Demo Cases' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === filter.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filteredInspections.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching inspection records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search keywords or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Inspection ID</th>
                  <th className="px-6 py-3.5">Product & Commodity</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Violations</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredInspections.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.inspection_code}
                      </div>
                      {item.is_demo && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                          Demo
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        MRP: {item.mrp || 'N/A'} • Qty: {item.net_quantity || 'N/A'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        {item.inspector_name || 'Not Provided'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                      {item.location_name || (item.latitude ? `${item.latitude.toFixed(2)}°, ${item.longitude?.toFixed(2)}°` : 'N/A')}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={item.overall_status} size="sm" />
                    </td>

                    <td className="px-6 py-4">
                      {item.failed_count > 0 ? (
                        <span className="font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                          {item.failed_count} Issues
                        </span>
                      ) : item.review_count > 0 ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          {item.review_count} Review
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Compliant</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          id={`btn-view-${item.id}`}
                          onClick={() => onSelectInspection(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
                          title="View inspection details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {onSoftDelete && (
                          <button
                            id={`btn-delete-${item.id}`}
                            onClick={() => setItemToDelete(item)}
                            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Move to Recycle Bin Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  Move this inspection to Recycle Bin?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  This inspection will be moved to the Recycle Bin. You can restore it later if needed.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {itemToDelete.inspection_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {itemToDelete.product_name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-soft-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Moving...' : 'Move to Recycle Bin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

