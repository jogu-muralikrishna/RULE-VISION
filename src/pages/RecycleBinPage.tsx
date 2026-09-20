import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertOctagon,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import { InspectionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface RecycleBinPageProps {
  deletedInspections: InspectionRecord[];
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onNavigateToHistory: () => void;
}

export const RecycleBinPage: React.FC<RecycleBinPageProps> = ({
  deletedInspections,
  onRestore,
  onPermanentDelete,
  onNavigateToHistory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToPermanentlyDelete, setItemToPermanentlyDelete] = useState<InspectionRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = deletedInspections.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.inspection_code.toLowerCase().includes(query) ||
      (item.commodity_name && item.commodity_name.toLowerCase().includes(query))
    );
  });

  const handleRestoreClick = async (item: InspectionRecord) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onRestore(item.id);
      setNotification(`Inspection ${item.inspection_code} restored successfully.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore inspection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToPermanentlyDelete) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onPermanentDelete(itemToPermanentlyDelete.id);
      setNotification(`Inspection ${itemToPermanentlyDelete.inspection_code} was permanently deleted.`);
      setItemToPermanentlyDelete(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Permanent deletion failed in database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Trash2 className="w-7 h-7 text-red-600 dark:text-red-500" />
            Recycle Bin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Recover soft-deleted inspections or remove records permanently from the audit archive.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          {deletedInspections.length} deleted {deletedInspections.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Success Notification Banner */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-800 dark:text-red-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      {deletedInspections.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deleted records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      )}

      {/* Deleted Inspections List / Empty State */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {deletedInspections.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recycle Bin is empty.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Deleted inspections will appear here before permanent removal. You can restore them anytime.
            </p>
            <div className="pt-2">
              <button
                onClick={onNavigateToHistory}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Go to Inspection History
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No deleted inspections match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Inspection ID</th>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Original Inspection Date</th>
                  <th className="px-6 py-3.5">Deleted Date</th>
                  <th className="px-6 py-3.5">Original Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.inspection_code}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {item.commodity_name || 'Generic Commodity'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.deleted_at ? (
                        <>
                          <div>
                            {new Date(item.deleted_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.deleted_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </>
                      ) : (
                        'Recently'
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={item.overall_status} size="sm" />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          id={`btn-restore-${item.id}`}
                          onClick={() => handleRestoreClick(item)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors border border-slate-300 dark:border-slate-700"
                          title="Restore to active history"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          id={`btn-perm-delete-${item.id}`}
                          onClick={() => setItemToPermanentlyDelete(item)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-700 dark:text-red-300 transition-colors border border-red-200 dark:border-red-800"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {itemToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  Permanently Delete Inspection?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  This will permanently delete this inspection. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {itemToPermanentlyDelete.inspection_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {itemToPermanentlyDelete.product_name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToPermanentlyDelete(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-permanent-delete"
                onClick={handleConfirmPermanentDelete}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
