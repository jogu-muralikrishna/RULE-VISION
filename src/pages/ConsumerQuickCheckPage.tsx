import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Info,
  Sun,
  Moon,
  Sparkles,
  Phone,
  Building2,
  Calendar,
  Tag,
  Scale,
  Globe,
  FileCheck
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { InspectionRecord, ExtractedPackageData } from '../types';
import { analyzeProductImage } from '../services/inspectionService';
import { DEMO_INSPECTIONS } from '../data/demoData';

interface ConsumerQuickCheckPageProps {
  onSwitchMode?: () => void;
  onLogout?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const ConsumerQuickCheckPage: React.FC<ConsumerQuickCheckPageProps> = ({
  onSwitchMode,
  onLogout,
  isDarkMode,
  onToggleTheme
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('package_photo.jpg');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [resultRecord, setResultRecord] = useState<InspectionRecord | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access was denied or is unavailable on this device. You can upload a photo instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setImageSrc(dataUrl);
    const newName = `photo_${Date.now()}.jpg`;
    setImageFileName(newName);
    setResultRecord(null);
    setAnalysisError(null);
    // Immediately initiate scanning without passing filename as product name
    handleAnalyze(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageSrc(dataUrl);
      setImageFileName(file.name);
      setResultRecord(null);
      setAnalysisError(null);
      stopCamera();
      // Immediately initiate scanning without passing filename as commodity name
      handleAnalyze(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (customSrc?: string) => {
    const targetImage = customSrc || imageSrc;
    if (!targetImage) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Execute standard shared analysis pipeline
      // Do not send image filename or placeholder as statutory commodity name
      const record = await analyzeProductImage({
        image: targetImage,
        mimeType: 'image/jpeg',
        productName: undefined
      });

      setResultRecord(record);
    } catch (err: any) {
      console.error('Consumer analysis error:', err);
      setAnalysisError(err.message || 'Could not inspect the image. Please try another photo or ensure the package label is clearly visible.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = (sample: InspectionRecord) => {
    stopCamera();
    setImageSrc(sample.image_url);
    setImageFileName(sample.product_name);
    setResultRecord(sample);
    setAnalysisError(null);
  };

  const handleReset = () => {
    stopCamera();
    setImageSrc(null);
    setResultRecord(null);
    setAnalysisError(null);
  };

  // Check overall classification for consumer wording
  const hasIssues = resultRecord && (resultRecord.failed_count > 0 || resultRecord.overall_status === 'NON_COMPLIANT');
  const needsReview = resultRecord && !hasIssues && (resultRecord.review_count > 0 || resultRecord.overall_status === 'NEEDS_REVIEW');
  const allClear = resultRecord && !hasIssues && !needsReview;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] flex flex-col transition-colors duration-200 antialiased">
      {/* Top Header */}
      <header className="bg-white dark:bg-[#101116] border-b border-slate-200 dark:border-[#292B34] px-4 py-3 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" badge="Consumer" showSubtitle={true} subtitle="Quick Compliance Check" />

          <div className="flex items-center gap-2">
            <button
              id="consumer-theme-toggle"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#292B34] bg-white dark:bg-[#1B1C23] text-slate-700 dark:text-[#F5F5F7] hover:bg-slate-100 dark:hover:bg-[#14151B] transition-colors shadow-2xs text-xs font-medium cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-[11px]">Dark</span>
                </>
              )}
            </button>

            {onLogout && (
              <button
                id="consumer-logout-btn"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 transition-colors cursor-pointer"
                title="Sign out of RuleVision"
              >
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1B1C23] text-slate-700 dark:text-[#FF2638] border border-slate-200 dark:border-[#292B34]">
              RULEVISION
            </span>
            <span className="text-xs text-slate-500 dark:text-[#A5A7B0] font-semibold">• Consumer Dashboard</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Quick Product Check
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A5A7B0]">
            Scan or upload a packaged product to verify statutory declarations under PCR 2011.
          </p>
        </div>

        {/* Input Card: Camera or Upload */}
        {!resultRecord && (
          <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-6">
            {/* Camera Viewport */}
            {isCameraActive && (
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                  <button
                    id="consumer-btn-capture"
                    onClick={capturePhoto}
                    className="px-5 py-2.5 rounded-full bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-semibold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error notice if camera fails */}
            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Primary Action Buttons (When no image chosen yet) */}
            {!imageSrc && !isCameraActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  id="consumer-btn-open-camera"
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#292B34] hover:border-[#FF2638] dark:hover:border-[#FF2638] hover:bg-red-50/20 dark:hover:bg-[#1B1C23] text-slate-700 dark:text-[#F5F5F7] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-[#1B1C23] border border-transparent dark:border-[#292B34] text-[#FF2638] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-sm block text-slate-900 dark:text-white">Open Camera</span>
                    <span className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5 block">Use device webcam to snap product package</span>
                  </div>
                </button>

                <button
                  id="consumer-btn-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#292B34] hover:border-[#FF2638] dark:hover:border-[#FF2638] hover:bg-slate-100/50 dark:hover:bg-[#1B1C23] text-slate-700 dark:text-[#F5F5F7] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1B1C23] border border-transparent dark:border-[#292B34] text-slate-800 dark:text-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-[#FF2638]" />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-sm block text-slate-900 dark:text-white">Upload Image</span>
                    <span className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5 block">Select package label photo from device</span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Image Preview & Analyze CTA */}
            {imageSrc && !isCameraActive && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#101116] border border-slate-200 dark:border-[#292B34]">
                  <div className="w-32 h-32 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-200 dark:bg-[#1B1C23] shrink-0 border border-slate-300 dark:border-[#292B34] flex items-center justify-center">
                    <img src={imageSrc} alt="Product Preview" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-sm">
                      {imageFileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#A5A7B0]">
                      Photo ready for AI-assisted declaration check.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleReset}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-[#A5A7B0] hover:bg-slate-200 dark:hover:bg-[#1B1C23] transition-colors cursor-pointer"
                    >
                      Change Photo
                    </button>
                    <button
                      id="consumer-btn-analyze"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="px-5 py-2.5 rounded-xl bg-[#FF2638] hover:bg-[#B51226] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Product</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {analysisError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
                <XCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Check Unsuccessful</p>
                  <p>{analysisError}</p>
                </div>
              </div>
            )}

            {/* Quick Test Samples (Optional for testing) */}
            {!imageSrc && !isCameraActive && (
              <div className="pt-2 border-t border-slate-100 dark:border-[#292B34] text-center">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-[#A5A7B0] block mb-2">
                  OR TRY A DEMONSTRATION PRODUCT
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {DEMO_INSPECTIONS.map(demo => (
                    <button
                      key={demo.id}
                      onClick={() => handleLoadSample(demo)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1B1C23] hover:bg-slate-200 dark:hover:bg-[#101116] border border-transparent dark:border-[#292B34] hover:border-[#FF2638]/40 text-slate-700 dark:text-[#F5F5F7] transition-all font-medium cursor-pointer"
                    >
                      {demo.product_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* CONSUMER RESULTS VIEW                             */}
        {/* ================================================= */}
        {resultRecord && (
          <div className="space-y-6">
            {/* Consumer Status Result Card */}
            <div className={`p-5 sm:p-6 rounded-2xl border shadow-2xs transition-all ${
              hasIssues
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/80 text-red-950 dark:text-red-100'
                : needsReview
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  hasIssues
                    ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                    : needsReview
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {hasIssues ? (
                    <XCircle className="w-6 h-6" />
                  ) : needsReview ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    {hasIssues
                      ? 'Potential Issue Detected'
                      : needsReview
                      ? 'Information Requires Verification'
                      : 'Required visible declarations were detected.'}
                  </h2>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                    {hasIssues
                      ? 'Certain mandatory label declarations under Legal Metrology rules appear to be missing or non-compliant on this package.'
                      : needsReview
                      ? 'Some declarations could not be confidently verified due to lighting, packaging curve, or print quality.'
                      : 'All 8 core statutory declarations (MRP, Net Quantity, Dates, Consumer Care, and Manufacturer) were identified on this package.'}
                  </p>
                </div>
              </div>
            </div>

            {/* A. Summary Counts (Single Source of Truth) */}
            <div className={`grid grid-cols-2 ${(resultRecord.not_applicable_count || 0) > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
              <div className="p-3 bg-white dark:bg-[#14151B] rounded-xl border border-slate-200 dark:border-[#292B34] text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A5A7B0] block">Total Checks</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {resultRecord.compliance_results?.length || 0}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">Passed</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {resultRecord.passed_count}
                </span>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 block">Failed</span>
                <span className="text-xl font-black text-red-700 dark:text-red-300">
                  {resultRecord.failed_count}
                </span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Needs Review</span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                  {resultRecord.review_count}
                </span>
              </div>
              {(resultRecord.not_applicable_count || 0) > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-[#1B1C23] rounded-xl border border-slate-200 dark:border-[#292B34] text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#A5A7B0] block">Not Applicable</span>
                  <span className="text-xl font-black text-slate-700 dark:text-slate-300">
                    {resultRecord.not_applicable_count}
                  </span>
                </div>
              )}
            </div>

            {/* Mandatory Statutory Notice */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#14151B] border border-slate-200 dark:border-[#292B34] text-xs text-slate-600 dark:text-[#A5A7B0] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#FF2638] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-slate-800 dark:text-white font-semibold">Statutory Notice:</strong> RuleVision provides AI-assisted screening under Legal Metrology Rules, 2011. Final legal determination must be made by an authorized Legal Metrology officer.
              </p>
            </div>

            {/* B. Product Information Breakdown */}
            <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-[#A5A7B0] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#FF2638]" />
                Product Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Product / Commodity */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Generic Commodity Name</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.commodity_name || 'Not Detected'}
                  </span>
                </div>

                {/* MRP */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">MRP (Maximum Retail Price)</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.mrp || 'Not Detected'}
                  </span>
                </div>

                {/* Net Quantity */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Net Quantity</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.net_quantity || 'Not Detected'}
                  </span>
                </div>

                {/* Dates */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Date (Mfg / Packing)</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.manufacturing_or_packing_date || 'Not Detected'}
                  </span>
                </div>

                {/* Expiry / Best Before */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Expiry / Best Before</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.expiry_or_best_before || 'Not Detected'}
                  </span>
                </div>

                {/* Country of Origin */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Country of Origin</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                    {resultRecord.country_of_origin || 'Not Detected'}
                  </span>
                </div>

                {/* Consumer Care */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Consumer Care Contact</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {resultRecord.consumer_care_contact || 'Not Detected'}
                  </span>
                </div>

                {/* Manufacturer / Packer Name */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Manufacturer / Packer Name</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {resultRecord.manufacturer_name || 'Not Detected'}
                  </span>
                </div>

                {/* Manufacturer / Packer Full Address */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                  <span className="text-slate-400 dark:text-[#71737E] font-semibold block">Manufacturer / Packer Full Address</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {resultRecord.manufacturer_address || 'Not Detected'}
                  </span>
                </div>

                {/* FSSAI License Number (if applicable or present) */}
                {resultRecord.fssai_license && (
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200/80 dark:border-[#292B34] space-y-1">
                    <span className="text-slate-400 dark:text-[#71737E] font-semibold block">FSSAI License Number</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {resultRecord.fssai_license}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* C. Declarations Requiring Verification */}
            {resultRecord.compliance_results?.some(c => c.status === 'NEEDS_REVIEW') && (
              <div className="bg-amber-50/95 dark:bg-[#14151B] rounded-2xl border-2 border-amber-400 dark:border-amber-800/80 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Declarations Requiring Verification ({resultRecord.compliance_results.filter(c => c.status === 'NEEDS_REVIEW').length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {resultRecord.compliance_results.filter(c => c.status === 'NEEDS_REVIEW').map((rev, i) => (
                    <div key={`c-rev-${rev.fieldKey || i}`} className="p-3.5 bg-white dark:bg-[#1B1C23] rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                        <span>{rev.fieldLabel}</span>
                        <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">Needs Check</span>
                      </div>
                      <p className="text-amber-900 dark:text-amber-300 leading-normal">{rev.reason}</p>
                      {rev.detectedValue && (
                        <p className="text-slate-500 dark:text-[#A5A7B0] text-[11px] font-mono truncate">
                          Detected text: "{rev.detectedValue}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. Verified Passed Checks */}
            {resultRecord.compliance_results?.some(c => c.status === 'PASS') && (
              <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified Passed Checks ({resultRecord.compliance_results.filter(c => c.status === 'PASS').length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {resultRecord.compliance_results.filter(c => c.status === 'PASS').map((pass, index) => (
                    <div
                      key={`pass-${pass.fieldKey || index}`}
                      className="p-3.5 bg-emerald-50/60 dark:bg-[#1B1C23] rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                        <span>{pass.fieldLabel}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                          Pass
                        </span>
                      </div>
                      <p className="text-emerald-800 dark:text-emerald-300/90 leading-normal">{pass.reason}</p>
                      {pass.detectedValue && (
                        <p className="text-slate-500 dark:text-[#A5A7B0] text-[11px] font-mono truncate">
                          Declared: {pass.detectedValue}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. Confirmed Failures, if any */}
            {resultRecord.compliance_results?.some(c => c.status === 'FAIL') && (
              <div className="bg-red-50/95 dark:bg-[#14151B] rounded-2xl border-2 border-red-400 dark:border-red-900/80 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    Confirmed Statutory Failures ({resultRecord.compliance_results.filter(c => c.status === 'FAIL').length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {resultRecord.compliance_results.filter(c => c.status === 'FAIL').map((viol, i) => (
                    <div key={`c-viol-${viol.fieldKey || i}`} className="p-3.5 bg-white dark:bg-[#1B1C23] rounded-xl border border-red-200 dark:border-red-900/60 space-y-1.5 shadow-2xs">
                      <div className="font-bold text-red-900 dark:text-red-300 flex items-center justify-between">
                        <span>{viol.fieldLabel}</span>
                        <span className="text-[10px] font-mono uppercase bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-300 dark:border-red-800">Violation</span>
                      </div>
                      <p className="text-red-800 dark:text-red-300/90 leading-normal">{viol.reason}</p>
                      {viol.detectedValue && (
                        <p className="text-slate-500 dark:text-[#A5A7B0] text-[11px] italic">
                          Evidence on label: "{viol.detectedValue}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-center pt-2">
              <button
                id="consumer-btn-check-another"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Another Product</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Clean Consumer Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <p className="font-bold text-slate-700 dark:text-slate-300 tracking-tight">
          Rule<span className="text-slate-500 dark:text-slate-400">Vision</span>
        </p>
        <p className="text-[11px] mt-0.5">Team RuleVision • AI-Powered Legal Metrology Compliance Auditor</p>
      </footer>
    </div>
  );
};
