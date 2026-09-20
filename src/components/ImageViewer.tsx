import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers } from 'lucide-react';
import { FieldComplianceResult } from '../types';

interface ImageViewerProps {
  imageUrl: string;
  complianceResults?: FieldComplianceResult[];
  selectedFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  complianceResults = [],
  selectedFieldKey = null,
  onSelectField
}) => {
  const [zoom, setZoom] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isFullViewModal, setIsFullViewModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  // Filter valid bounding boxes (coordinates between 0 and 1000)
  const annotations = complianceResults.filter(
    item => item.boundingBox &&
      typeof item.boundingBox.ymin === 'number' &&
      typeof item.boundingBox.xmin === 'number' &&
      typeof item.boundingBox.ymax === 'number' &&
      typeof item.boundingBox.xmax === 'number'
  );

  const renderBoundingBoxes = () => {
    if (!showAnnotations || annotations.length === 0) return null;

    return annotations.map(item => {
      const box = item.boundingBox!;
      // Normalized coordinates (0-1000) to percentage
      const top = (box.ymin / 10).toFixed(2) + '%';
      const left = (box.xmin / 10).toFixed(2) + '%';
      const width = Math.max(((box.xmax - box.xmin) / 10), 3).toFixed(2) + '%';
      const height = Math.max(((box.ymax - box.ymin) / 10), 2).toFixed(2) + '%';

      const isSelected = selectedFieldKey === item.fieldKey;

      let borderColor = 'border-emerald-500 bg-emerald-500/10';
      let tagColor = 'bg-emerald-600 text-white';

      if (item.status === 'FAIL') {
        borderColor = 'border-red-500 bg-red-500/15';
        tagColor = 'bg-red-600 text-white';
      } else if (item.status === 'NEEDS_REVIEW') {
        borderColor = 'border-amber-500 bg-amber-500/15';
        tagColor = 'bg-amber-600 text-white';
      }

      if (isSelected) {
        borderColor += ' ring-2 ring-white ring-offset-1';
      }

      return (
        <div
          key={item.fieldKey}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectField) onSelectField(item.fieldKey);
          }}
          style={{ top, left, width, height }}
          className={`absolute border-2 rounded-xs cursor-pointer transition-all ${borderColor}`}
          title={`${item.fieldLabel} (${item.status})`}
        >
          <span
            className={`absolute -top-5 left-0 px-1 py-0.2 text-[9px] font-bold rounded-xs truncate max-w-[120px] shadow-2xs ${tagColor}`}
          >
            {item.fieldLabel}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden flex flex-col shadow-2xs">
      {/* Control Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-xs text-white px-3 py-2 flex items-center justify-between border-b border-slate-800 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Package Image Preview</span>
          {annotations.length > 0 && (
            <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
              {annotations.length} AI Annotations
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {annotations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                showAnnotations ? 'bg-white text-slate-950 font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle bounding box overlays"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Boxes</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullViewModal(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fullscreen Modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="relative overflow-auto max-h-[500px] min-h-[340px] flex items-center justify-center p-4 bg-slate-950/40"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
          className="relative inline-block"
        >
          <img
            src={imageUrl}
            alt="Packaged Commodity Label"
            className="max-h-[460px] w-auto object-contain rounded-md shadow-lg"
          />
          {renderBoundingBoxes()}
        </div>
      </div>

      {/* Real-time Visual Verification: Red Tags for Missing, Blurred, or Non-Compliant Text */}
      {complianceResults.some(r => r.status !== 'PASS') && (
        <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-2 flex flex-wrap items-center gap-2 z-10">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Flagged Declarations:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {complianceResults
              .filter(r => r.status !== 'PASS')
              .map(item => (
                <button
                  key={item.fieldKey}
                  type="button"
                  onClick={() => onSelectField && onSelectField(item.fieldKey)}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                    item.status === 'FAIL'
                      ? 'bg-red-950/90 text-red-200 border-red-700 hover:bg-red-900/90 hover:border-red-500'
                      : 'bg-amber-950/90 text-amber-200 border-amber-700 hover:bg-amber-900/90 hover:border-amber-500'
                  }`}
                  title={`${item.ruleNumber}: ${item.reason}`}
                >
                  <span>{item.fieldLabel}</span>
                  <span className="text-[8px] uppercase tracking-wider opacity-80">
                    [{item.status === 'FAIL' ? 'Missing / Non-Compliant' : 'Review / Blurred'}]
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Fullscreen View Modal */}
      {isFullViewModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4">
          <div className="flex justify-between items-center text-white pb-3 border-b border-slate-800">
            <span className="font-semibold text-sm">Full High-Resolution Package Inspection</span>
            <button
              onClick={() => setIsFullViewModal(false)}
              className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700"
            >
              Close
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <div className="relative inline-block max-w-full max-h-full">
              <img
                src={imageUrl}
                alt="Full Package Label"
                className="max-h-[85vh] w-auto object-contain rounded shadow-2xl"
              />
              {renderBoundingBoxes()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
