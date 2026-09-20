import React, { useState } from 'react';
import {
  Layers,
  Upload,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  ArrowRight,
  FileSpreadsheet,
  AlertOctagon
} from 'lucide-react';
import { BatchItem, InspectionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { dbService } from '../services/db';
import { analyzeProductImage } from '../services/inspectionService';

interface BatchAuditPageProps {
  onSelectInspection: (inspection: InspectionRecord) => void;
}

export const BatchAuditPage: React.FC<BatchAuditPageProps> = ({ onSelectInspection }) => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedIndex, setProcessedIndex] = useState(0);

  // Add multiple files
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = [];
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBatchItems(prev => [
          ...prev,
          {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            fileName: file.name,
            fileSize: file.size,
            dataUrl: dataUrl,
            status: 'queued'
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Run batch audit sequentially with resilient fault-tolerance
  const handleStartBatchAudit = async () => {
    if (batchItems.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProcessedIndex(0);

    for (let i = 0; i < batchItems.length; i++) {
      const current = batchItems[i];
      if (current.status === 'completed') {
        setProcessedIndex(i + 1);
        continue; // Already processed
      }

      // Mark current as processing
      setBatchItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'processing' } : item
      ));

      try {
        let payloadImage = current.dataUrl;
        if (payloadImage.startsWith('data:image/svg+xml') || payloadImage.startsWith('<svg')) {
          // Convert SVG to raster PNG for batch processing
          payloadImage = await new Promise<string>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 800;
                canvas.height = img.naturalHeight || 1000;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
                  resolve(canvas.toDataURL('image/png'));
                  return;
                }
              } catch {}
              resolve(current.dataUrl);
            };
            img.onerror = () => resolve(current.dataUrl);
            img.src = current.dataUrl;
          });
        }

        const record = await analyzeProductImage({
          image: payloadImage,
          productName: current.fileName.replace(/\.[^/.]+$/, '')
        });

        await dbService.saveInspection(record);

        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'completed', inspection: record } : item
        ));
      } catch (err: any) {
        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'failed', error: err.message || 'Processing failure' } : item
        ));
      }

      setProcessedIndex(i + 1);
    }

    setIsProcessing(false);
  };

  const handleClearBatch = () => {
    if (isProcessing) return;
    setBatchItems([]);
    setProcessedIndex(0);
  };

  // Export Results to CSV
  const handleExportCsv = () => {
    const completed = batchItems.filter(b => b.inspection);
    if (completed.length === 0) return;

    const headers = [
      'Inspection Code',
      'Product Name',
      'Overall Status',
      'Passed Checks',
      'Violations',
      'Needs Review',
      'MRP',
      'Net Quantity',
      'Date'
    ];

    const rows = completed.map(b => {
      const i = b.inspection!;
      return [
        `"${i.inspection_code}"`,
        `"${i.product_name.replace(/"/g, '""')}"`,
        `"${i.overall_status}"`,
        i.passed_count,
        i.failed_count,
        i.review_count,
        `"${i.mrp || 'N/A'}"`,
        `"${i.net_quantity || 'N/A'}"`,
        `"${i.created_at}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rulevision_batch_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const total = batchItems.length;
  const completedItems = batchItems.filter(b => b.status === 'completed' && b.inspection);
  const compliantCount = completedItems.filter(b => b.inspection?.overall_status === 'COMPLIANT').length;
  const nonCompliantCount = completedItems.filter(b => b.inspection?.overall_status === 'NON_COMPLIANT').length;
  const reviewCount = completedItems.filter(b => b.inspection?.overall_status === 'NEEDS_REVIEW').length;
  const failedProcessingCount = batchItems.filter(b => b.status === 'failed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-slate-900 dark:text-white" />
            Batch Compliance Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Process multiple packaged commodity images concurrently or sequentially with automated Legal Metrology compliance checks.
          </p>
        </div>
      </div>

      {/* Upload Dropzone & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-semibold cursor-pointer shadow-2xs transition-all">
              <Upload className="w-4 h-4" />
              Upload Product Images (Multiple)
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                className="hidden"
              />
            </label>

            {batchItems.length > 0 && !isProcessing && (
              <button
                type="button"
                onClick={handleClearBatch}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {batchItems.length > 0 && (
              <button
                id="btn-start-batch"
                type="button"
                disabled={isProcessing}
                onClick={handleStartBatchAudit}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isProcessing
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isProcessing ? 'Processing Batch...' : `Start Batch Audit (${batchItems.length} items)`}
              </button>
            )}

            {completedItems.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Real-time Progress Bar */}
        {isProcessing && (
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
              <span>Processing packaged commodities...</span>
              <span>{processedIndex} / {total} processed</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-slate-900 dark:bg-white h-2 transition-all duration-300"
                style={{ width: `${(processedIndex / total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      {batchItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Batch Total</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{total}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase text-emerald-700">Compliant</span>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1">{compliantCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase text-red-700">Non-Compliant</span>
            <div className="text-2xl font-extrabold text-red-950 mt-1">{nonCompliantCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase text-amber-700">Needs Review</span>
            <div className="text-2xl font-extrabold text-amber-950 mt-1">{reviewCount}</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Batch Items Queue & Results</h2>
          <span className="text-xs font-mono text-slate-500">
            {batchItems.length} items listed
          </span>
        </div>

        {batchItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No batch items loaded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload multiple packaged commodity photos or click "Load 3 Demo Commodities" to test the batch audit pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Image</th>
                  <th className="px-6 py-3.5">File / Product</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Audit Findings</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Thumbnail */}
                    <td className="px-6 py-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-200">
                        <img
                          src={item.dataUrl}
                          alt={item.fileName}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </td>

                    {/* File / Product Name */}
                    <td className="px-6 py-3">
                      <div className="font-semibold text-slate-900">
                        {item.inspection ? item.inspection.product_name : item.fileName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.inspection ? item.inspection.inspection_code : `${Math.round(item.fileSize / 1024)} KB`}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3">
                      {item.status === 'queued' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                          Queued
                        </span>
                      ) : item.status === 'processing' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 animate-pulse">
                          Processing AI...
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">
                          Failed
                        </span>
                      ) : item.inspection ? (
                        <StatusBadge status={item.inspection.overall_status} size="sm" />
                      ) : null}
                    </td>

                    {/* Findings */}
                    <td className="px-6 py-3">
                      {item.inspection ? (
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-700">
                            {item.inspection.passed_count} Passed, {item.inspection.failed_count} Violations
                          </span>
                          {item.inspection.violations.length > 0 && (
                            <div className="text-[11px] text-red-600 truncate max-w-xs">
                              Issues in: {item.inspection.violations.map(v => v.fieldLabel).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : item.error ? (
                        <span className="text-red-600 text-[11px]">{item.error}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Awaiting inspection</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3 text-right">
                      {item.inspection && (
                        <button
                          type="button"
                          onClick={() => onSelectInspection(item.inspection!)}
                          className="text-xs font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
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
