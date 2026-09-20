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
    <div className="max-w-xl mx-auto py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-slate-900 dark:text-white" />
            Scan Barcode / QR Code
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Align barcode (EAN-13, UPC, QR) within the scanning frame.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center space-y-3">
          <X className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs font-bold"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800">
          {isStarting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-white/70 font-semibold">Starting barcode scanner...</p>
              </div>
            </div>
          )}

          <div id="barcode-scanner-container" ref={containerRef} className="w-full min-h-[300px]"></div>

          {!isStarting && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Scanning for barcodes...
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-[11px] text-slate-500 dark:text-slate-400">
        Supported formats: EAN-13, EAN-8, UPC-A, UPC-E, QR Code, Code-128, Code-39, ITF, Codabar
      </div>
    </div>
  );
};
