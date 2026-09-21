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
  FileCheck,
  User,
  History,
  Eye,
  ArrowRight,
  Clock,
  X,
  FileText,
  UploadCloud,
  Shield
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { InspectionRecord, ExtractedPackageData, UserProfile } from '../types';
import { analyzeProductImage } from '../services/inspectionService';
import { dbService } from '../services/db';
import { authService } from '../services/authService';
import { StatusBadge } from '../components/StatusBadge';

interface ConsumerQuickCheckPageProps {
  currentUser?: UserProfile | null;
  onSwitchMode?: () => void;
  onLogout?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onViewPendingStatus?: () => void;
  onProfileUpdated?: (updatedUser: UserProfile) => void;
}

export const ConsumerQuickCheckPage: React.FC<ConsumerQuickCheckPageProps> = ({
  currentUser,
  onSwitchMode,
  onLogout,
  isDarkMode,
  onToggleTheme,
  onViewPendingStatus,
  onProfileUpdated
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('package_photo.jpg');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [resultRecord, setResultRecord] = useState<InspectionRecord | null>(null);
  const [userInspections, setUserInspections] = useState<InspectionRecord[]>([]);

  // Inspector re-application states for rejected users
  const [showReapplyModal, setShowReapplyModal] = useState<boolean>(false);
  const [reapplyInspectorId, setReapplyInspectorId] = useState<string>(currentUser?.inspector_id || '');
  const [reapplyDepartment, setReapplyDepartment] = useState<string>(currentUser?.department || 'Department of Legal Metrology');
  const [reapplyState, setReapplyState] = useState<string>(currentUser?.state || 'Karnataka');
  const [reapplyDistrict, setReapplyDistrict] = useState<string>(currentUser?.district || '');
  const [reapplyDocFile, setReapplyDocFile] = useState<File | null>(null);
  const [reapplying, setReapplying] = useState<boolean>(false);
  const [reapplyError, setReapplyError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load user saved inspections on mount
  useEffect(() => {
    dbService.getAllInspections(false).then(records => {
      if (currentUser?.id || currentUser?.email) {
        const userRecords = records.filter(r => 
          (currentUser.id && r.user_id === currentUser.id) || 
          (currentUser.email && r.inspector_email === currentUser.email)
        );
        setUserInspections(userRecords);
      } else {
        setUserInspections(records);
      }
    }).catch(err => console.warn('Failed to load user inspections:', err));
  }, [currentUser]);

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
      const record = await analyzeProductImage({
        image: targetImage,
        mimeType: 'image/jpeg',
        productName: undefined
      });

      // Save real-time inspection associated with the logged-in user
      const userRecord: InspectionRecord = {
        ...record,
        user_id: currentUser?.id || null,
        inspector_name: currentUser?.email ? `Citizen (${currentUser.email.split('@')[0]})` : 'Citizen User',
        inspector_email: currentUser?.email || 'citizen@rulevision.gov.in'
      };

      await dbService.saveInspection(userRecord);
      setResultRecord(userRecord);
      setUserInspections(prev => [userRecord, ...prev.filter(r => r.id !== userRecord.id)]);
    } catch (err: any) {
      console.error('Consumer analysis error:', err);
      setAnalysisError(err.message || 'Could not inspect the image. Please ensure the package label declarations are clearly visible.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const handleReapplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setReapplyError(null);
    setReapplying(true);

    try {
      let docUrl: string | null = null;
      if (reapplyDocFile) {
        docUrl = await authService.uploadSupportingDocument(reapplyDocFile);
      }

      const res = await authService.reapplyInspectorRequest(currentUser.id, {
        inspectorId: reapplyInspectorId.trim(),
        department: reapplyDepartment.trim(),
        state: reapplyState.trim(),
        district: reapplyDistrict.trim(),
        supportingDocument: docUrl
      });

      if (res.success && res.user) {
        setShowReapplyModal(false);
        onProfileUpdated?.(res.user);
      } else {
        setReapplyError(res.error || 'Failed to submit inspector request.');
      }
    } catch (err: any) {
      setReapplyError(err?.message || 'Unable to submit request.');
    } finally {
      setReapplying(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setImageSrc(null);
    setResultRecord(null);
    setAnalysisError(null);
  };

  const handleSelectPastInspection = (item: InspectionRecord) => {
    stopCamera();
    setImageSrc(item.image_url);
    setImageFileName(item.product_name);
    setResultRecord(item);
    setAnalysisError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <BrandLogo size="sm" badge="Citizen" showSubtitle={true} subtitle="Legal Metrology Quick Check" />

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1B1C23] border border-slate-200 dark:border-[#292B34] text-xs">
                <User className="w-3.5 h-3.5 text-[#FF2638]" />
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{currentUser.email}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded uppercase font-bold bg-[#FF2638]/20 text-[#FF2638] border border-[#FF2638]/30">Citizen</span>
              </div>
            )}

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
        {/* Status Banner for Pending Inspector Request */}
        {currentUser?.inspector_status === 'pending' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300 shadow-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-spin" />
              <div>
                <strong className="font-bold text-white">Inspector Access Request Pending:</strong> Your application for Legal Metrology Officer access ({currentUser.inspector_id || 'ID under verification'}) is awaiting administrative approval.
              </div>
            </div>
            {onViewPendingStatus && (
              <button
                type="button"
                onClick={onViewPendingStatus}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold whitespace-nowrap transition-colors cursor-pointer text-xs self-start sm:self-auto"
              >
                View Status Dossier
              </button>
            )}
          </div>
        )}

        {/* Status Banner for Rejected Inspector Request */}
        {currentUser?.inspector_status === 'rejected' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-300 shadow-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <strong className="font-bold text-white">Inspector Role Not Granted:</strong> Your previous application for enforcement privileges was reviewed and not approved. You can continue inspecting commodities as a Consumer, or submit an updated request.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReapplyError(null);
                setShowReapplyModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white font-bold whitespace-nowrap transition-colors cursor-pointer text-xs self-start sm:self-auto shadow-sm"
            >
              Submit New Request
            </button>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1B1C23] text-slate-700 dark:text-[#FF2638] border border-slate-200 dark:border-[#292B34]">
              RULEVISION
            </span>
            <span className="text-xs text-slate-500 dark:text-[#A5A7B0] font-semibold">• Citizen Inspection Workspace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Quick Product Check
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A5A7B0]">
            Scan or upload a packaged product to verify statutory declarations under Legal Metrology rules.
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
                    <span className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5 block">Select package photo from device</span>
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

            {/* Image Preview & Analysis trigger */}
            {imageSrc && !isCameraActive && (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 dark:border-[#292B34]">
                  <img src={imageSrc} alt="Product Preview" className="w-full h-full object-contain" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500 dark:text-[#A5A7B0] truncate max-w-xs">
                    File: <span className="font-medium text-slate-800 dark:text-slate-200">{imageFileName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      disabled={isAnalyzing}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#292B34] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#1B1C23] transition-colors cursor-pointer"
                    >
                      Change Photo
                    </button>

                    <button
                      id="consumer-btn-analyze"
                      onClick={() => handleAnalyze()}
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

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono font-bold tracking-wider opacity-75">
                      {resultRecord.inspection_code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-white/10 font-semibold">
                      Saved to Dashboard
                    </span>
                  </div>

                  <h2 className="text-xl font-bold tracking-tight">
                    {hasIssues
                      ? 'Statutory Non-Compliance Detected'
                      : needsReview
                      ? 'Notice: Additional Verification Recommended'
                      : 'All Mandatory Declarations Verified'}
                  </h2>

                  <p className="text-xs leading-relaxed opacity-90">
                    {hasIssues
                      ? 'One or more mandatory declarations required under Legal Metrology rules appear missing or non-compliant on this packaging.'
                      : needsReview
                      ? 'Some declarations could not be verified with complete confidence (e.g. obscured, faint font, or curved surface glare). Physical verification advised.'
                      : 'All examined statutory declarations (Commodity Name, Net Qty, MRP with taxes, Dates, Consumer Care, Manufacturer & Origin) are present and conform to rules.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Commodity Identification Summary */}
            <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#292B34] pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#FF2638]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Identified Product
                  </span>
                </div>
                <StatusBadge status={resultRecord.overall_status} size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Commodity / Product Name</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block mt-0.5">
                    {resultRecord.commodity_name || resultRecord.product_name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Inspected By</span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {resultRecord.inspector_name || resultRecord.inspector_email || 'Citizen User'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Maximum Retail Price (MRP)</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                    {resultRecord.mrp || 'Not Detected'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Net Quantity</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                    {resultRecord.net_quantity || 'Not Detected'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Manufacturer Name</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {resultRecord.manufacturer_name || 'Not Detected'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 dark:text-[#71737E] block text-[11px]">Consumer Care</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {resultRecord.consumer_care_contact || 'Not Detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist of Rule Declarations */}
            <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#FF2638]" />
                Declarations Verification Breakdown
              </h3>

              <div className="space-y-2.5 text-xs">
                {resultRecord.compliance_results?.map((rule, idx) => (
                  <div
                    key={`rule-${idx}`}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      rule.status === 'PASS'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : rule.status === 'FAIL'
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                        : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{rule.fieldLabel}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({rule.statutoryReference.split('-')[1]?.trim() || rule.statutoryReference})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-[#A5A7B0] leading-normal">{rule.reason}</p>
                      {rule.detectedValue && (
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                          Detected: <span className="font-semibold text-slate-900 dark:text-white">{rule.detectedValue}</span>
                        </p>
                      )}
                    </div>

                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      rule.status === 'PASS'
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        : rule.status === 'FAIL'
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                    }`}>
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Another Product</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* MY RECENT INSPECTIONS (SAVED TO DASHBOARD)        */}
        {/* ================================================= */}
        <div className="bg-white dark:bg-[#14151B] rounded-2xl border border-slate-200 dark:border-[#292B34] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#292B34] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#FF2638]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                My Saved Inspections
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-[#71737E]">
              {userInspections.length} recorded
            </span>
          </div>

          {userInspections.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1B1C23] text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-5 h-5 text-[#FF2638]" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No inspections yet</p>
              <p className="text-[11px] text-slate-500 dark:text-[#A5A7B0] max-w-xs mx-auto">
                Scan or upload a packaged product photo above to run an inspection and save it to your dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userInspections.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectPastInspection(item)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-[#292B34] bg-slate-50/50 dark:bg-[#101116] hover:border-[#FF2638]/60 hover:bg-slate-100/50 dark:hover:bg-[#1B1C23] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {item.inspection_code}
                      </span>
                      <StatusBadge status={item.overall_status} size="sm" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.product_name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-[#71737E] flex items-center gap-2">
                      <span>{new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>•</span>
                      <span>Inspected by: {item.inspector_name || item.inspector_email || 'You'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-2 rounded-lg bg-white dark:bg-[#1B1C23] border border-slate-200 dark:border-[#292B34] text-slate-700 dark:text-slate-300 group-hover:border-[#FF2638] group-hover:text-[#FF2638] transition-colors shrink-0"
                    title="View Inspection Details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-[#292B34] py-4 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <p className="font-bold text-slate-700 dark:text-slate-300 tracking-tight">
          Rule<span className="text-[#FF2638]">Vision</span>
        </p>
        <p className="text-[11px] mt-0.5">RuleVision • AI-Powered Legal Metrology Compliance Auditor</p>
      </footer>

      {/* Inspector Access Re-application Modal */}
      {showReapplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151B] border border-[#292B34] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B34]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF2638]/20 border border-[#FF2638]/40 text-[#FF2638] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Submit Inspector Access Request
                  </h3>
                  <p className="text-[11px] text-[#A5A7B0]">
                    Update your credentials for Legal Metrology Administrator verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReapplyModal(false)}
                className="p-1 rounded-lg text-[#71737E] hover:text-white hover:bg-[#1B1C23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reapplyError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs">
                {reapplyError}
              </div>
            )}

            <form onSubmit={handleReapplySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                  <span>Inspector ID / Employee ID</span>
                  <span className="text-[#FF2638]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reapplyInspectorId}
                  onChange={(e) => setReapplyInspectorId(e.target.value)}
                  placeholder="e.g. LM-KA-2024-089"
                  className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#A5A7B0]" />
                  <span>Department / Office</span>
                  <span className="text-[#FF2638]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reapplyDepartment}
                  onChange={(e) => setReapplyDepartment(e.target.value)}
                  placeholder="e.g. Department of Legal Metrology"
                  className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                    <span>State</span>
                    <span className="text-[#FF2638]">*</span>
                  </label>
                  <select
                    value={reapplyState}
                    onChange={(e) => setReapplyState(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white text-xs focus:outline-none focus:border-[#FF2638]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st} className="bg-[#14151B] text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                    <span>District</span>
                    <span className="text-[#FF2638]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reapplyDistrict}
                    onChange={(e) => setReapplyDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru Urban"
                    className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#A5A7B0]" />
                    Supporting Document (ID / Appointment Order)
                  </span>
                  <span className="text-[10px] text-[#71737E]">Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReapplyDocFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="reapply-doc-upload"
                  />
                  <label
                    htmlFor="reapply-doc-upload"
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-[#292B34] bg-[#101116] hover:border-[#FF2638]/60 cursor-pointer text-xs transition-colors"
                  >
                    <span className="text-[#A5A7B0] truncate">
                      {reapplyDocFile ? reapplyDocFile.name : 'Click to attach ID Card or Official Order (PDF/JPG)'}
                    </span>
                    <UploadCloud className="w-4 h-4 text-[#FF2638] shrink-0 ml-2" />
                  </label>
                  {reapplyDocFile && (
                    <button
                      type="button"
                      onClick={() => setReapplyDocFile(null)}
                      className="text-[10px] text-red-400 hover:text-red-300 mt-1 inline-block"
                    >
                      Remove attached document
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Inspector access requires administrative verification. Submitting this request does not automatically grant inspector privileges.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#292B34]">
                <button
                  type="button"
                  onClick={() => setShowReapplyModal(false)}
                  className="px-3 py-2 rounded-xl border border-[#292B34] text-xs font-semibold text-[#A5A7B0] hover:text-white hover:bg-[#1B1C23] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reapplying}
                  className="px-4 py-2 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {reapplying ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
