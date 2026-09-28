import React, { useEffect, useRef, useState } from 'react';
import { ScanLine, X, Camera, QrCode } from 'lucide-react';

interface BarcodeScannerProps {
  onScanResult: (result: string, format: string) => void;
  onClose: () => void;
}

/**
 * Barcode/QR Code Scanner Component
 * Uses html5-qrcode library for EAN-13, UPC-A, QR Code, Code-128 scanning
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanResult, onClose }) => {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    let html5QrcodeScanner: any = null;

    const initScanner = async () => {
      try {
        // Dynamically import html5-qrcode to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');

        html5QrcodeScanner = new Html5Qrcode('barcode-scanner-container');
        scannerRef.current = html5QrcodeScanner;

        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.5,
            disableFlip: false,
          },
          (decodedText: string, decodedResult: any) => {
            // Avoid duplicate scans
            if (decodedText === lastScanned) return;
            setLastScanned(decodedText);

            const format = decodedResult?.result?.format?.formatName || 'UNKNOWN';
            onScanResult(decodedText, format);

            // Stop scanner after successful scan
            try {
              html5QrcodeScanner.stop();
            } catch (e) {
              // Scanner may already be stopped
            }
          },
          (errorMessage: string) => {
            // Scanning in progress - no match yet (this is normal, not an error)
          }
        );

        setIsStarting(false);
      } catch (err: any) {
        console.error('Barcode scanner initialization error:', err);
        setIsStarting(false);

        if (err?.message?.includes('NotAllowedError') || err?.message?.includes('Permission')) {
          setError('Camera permission was denied. Please allow camera access and try again.');
        } else if (err?.message?.includes('NotFoundError')) {
          setError('No camera device was found on this device.');
        } else {
          setError(err?.message || 'Failed to initialize barcode scanner. Please try uploading an image instead.');
        }
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {
          // Scanner may already be stopped
        }
      }
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto py-3 space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
            <QrCode className="w-4 h-4 text-slate-800" />
            Barcode / QR Code Optical Sensor
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Rule 6(1) Packaging Optical Scanner
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-3">
          <X className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-900">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-white border border-red-200 text-red-800 text-xs font-bold shadow-xs cursor-pointer"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-slate-950 shadow-sm border border-slate-300">
          {isStarting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/85">
              <div className="text-center space-y-2">
                <div className="w-7 h-7 border-2 border-slate-400 border-t-white rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-300 font-mono">INITIALIZING OPTICAL SENSOR...</p>
              </div>
            </div>
          )}

          <div id="barcode-scanner-container" ref={containerRef} className="w-full min-h-[300px]"></div>

          {!isStarting && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-mono font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-slate-700">
                <ScanLine className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>ALIGN BARCODE IN SENSOR RETICLE</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-[10px] text-slate-400 font-mono">
        STANDARDS: EAN-13 • EAN-8 • UPC-A • UPC-E • QR CODE • CODE-128
      </div>
    </div>
  );
};
