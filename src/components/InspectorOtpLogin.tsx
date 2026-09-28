import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Mail,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Sparkles,
  Lock,
  ShieldCheck,
  Check,
  ChevronLeft,
  Smartphone,
  Database,
  Settings,
  X,
  ExternalLink
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { authService } from '../services/authService';
import { dbService } from '../services/db';
import { UserProfile } from '../types';

interface InspectorOtpLoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToMainLogin: () => void;
  isDarkMode: boolean;
}

type Step = 'email' | 'otp';

/**
 * Mask email for privacy (e.g., "rajesh.kumar@gov.in" -> "r***r@gov.in")
 */
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}@${domain}`;
}

export const InspectorOtpLogin: React.FC<InspectorOtpLoginProps> = ({
  onLoginSuccess,
  onBackToMainLogin,
  isDarkMode
}) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [activeOtpIndex, setActiveOtpIndex] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend countdown timer (60 seconds)
  const [countdown, setCountdown] = useState<number>(0);

  // Supabase cloud status & config modal
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(dbService.isSupabaseConfigured());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [cfgUrl, setCfgUrl] = useState<string>(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('rulevision_supabase_url')) || '';
  });
  const [cfgKey, setCfgKey] = useState<string>(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('rulevision_supabase_anon_key')) || '';
  });
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Slingshot animation states
  const [slingshotStatus, setSlingshotStatus] = useState<'idle' | 'charging' | 'launching' | 'verified' | 'failed'>('idle');
  const [manualPull, setManualPull] = useState<number>(0);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);

  // Input refs for the 6 boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = cfgUrl.trim();
    const cleanKey = cfgKey.trim();

    if (cleanUrl) {
      localStorage.setItem('rulevision_supabase_url', cleanUrl);
    } else {
      localStorage.removeItem('rulevision_supabase_url');
    }

    if (cleanKey) {
      localStorage.setItem('rulevision_supabase_anon_key', cleanKey);
    } else {
      localStorage.removeItem('rulevision_supabase_anon_key');
    }

    setConfigSuccess('Configuration saved! Reloading application to connect database...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClearConfig = () => {
    localStorage.removeItem('rulevision_supabase_url');
    localStorage.removeItem('rulevision_supabase_anon_key');
    setConfigSuccess('Cloud configuration cleared. Reverting to local development mode...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleQuickFillDevOtp = () => {
    const devCode = ['1', '2', '3', '4', '5', '6'];
    setOtp(devCode);
    handleVerifyOtp('123456');
  };

  // Timer countdown handler
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Focus the first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Calculate entered digits count
  const filledCount = otp.filter((digit) => digit.trim() !== '').length;

  // Slingshot tension based on filled count (0 to 6) and manual drag
  const calculatedPull = slingshotStatus === 'launching'
    ? -80
    : Math.min(100, filledCount * 14 + manualPull);

  // 1. STEP 1: SEND OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your official registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendInspectorOtp(cleanEmail);
      if (res.success) {
        setSuccessMessage(res.message || 'Verification code sent to your email.');
        setStep('otp');
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setActiveOtpIndex(0);
        setSlingshotStatus('idle');
      } else {
        setErrorMessage(res.error || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // 2. STEP 2: RESEND OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await authService.sendInspectorOtp(email.trim().toLowerCase());
      if (res.success) {
        setSuccessMessage('A fresh 6-digit verification code has been dispatched.');
        setCountdown(60);
      } else {
        setErrorMessage(res.error || 'Unable to resend verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 3. STEP 3: VERIFY OTP
  const handleVerifyOtp = async (overrideToken?: string) => {
    const tokenToVerify = overrideToken || otp.join('');
    if (tokenToVerify.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    // Trigger Slingshot Launch Animation!
    setSlingshotStatus('launching');

    try {
      const res = await authService.verifyInspectorOtp(email.trim().toLowerCase(), tokenToVerify);

      if (res.success && res.user) {
        setSlingshotStatus('verified');
        setSuccessMessage('Verification successful! Authorizing Inspector session...');

        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 1100);
      } else {
        setSlingshotStatus('failed');
        setErrorMessage(res.error || 'Invalid verification code. Please check and try again.');
        setTimeout(() => {
          setSlingshotStatus('idle');
        }, 800);
      }
    } catch (err: any) {
      setSlingshotStatus('failed');
      setErrorMessage(err?.message || 'Failed to verify OTP.');
      setTimeout(() => {
        setSlingshotStatus('idle');
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Changes
  const handleDigitChange = (index: number, value: string) => {
    // Take only the last entered digit
    const cleaned = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 0) {
      newOtp[index] = cleaned[cleaned.length - 1];
      setOtp(newOtp);

      // Auto-advance to next box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
        setActiveOtpIndex(index + 1);
      }

      // If all 6 digits are now filled, auto trigger verify
      const fullCode = newOtp.join('');
      if (fullCode.length === 6 && !newOtp.includes('')) {
        handleVerifyOtp(fullCode);
      }
    } else {
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  // Handle Backspace and Navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Move to previous box on backspace if current is empty
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
        setActiveOtpIndex(index - 1);
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveOtpIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveOtpIndex(index + 1);
    }
  };

  // Handle Pasting 6 Digits
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (!pasted) return;

    const digits = pasted.slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) newOtp[i] = d;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setActiveOtpIndex(nextIndex);

    if (newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // Numeric Keypad Click Handler
  const handleKeypadPress = (digit: string) => {
    if (digit === 'BACKSPACE') {
      const lastFilled = [...otp].reverse().findIndex((d) => d !== '');
      if (lastFilled !== -1) {
        const targetIndex = 5 - lastFilled;
        const newOtp = [...otp];
        newOtp[targetIndex] = '';
        setOtp(newOtp);
        inputRefs.current[targetIndex]?.focus();
        setActiveOtpIndex(targetIndex);
      }
      return;
    }

    if (digit === 'CLEAR') {
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setActiveOtpIndex(0);
      return;
    }

    const firstEmptyIndex = otp.findIndex((d) => d === '');
    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : activeOtpIndex;

    if (targetIndex >= 0 && targetIndex < 6) {
      const newOtp = [...otp];
      newOtp[targetIndex] = digit;
      setOtp(newOtp);

      if (targetIndex < 5) {
        inputRefs.current[targetIndex + 1]?.focus();
        setActiveOtpIndex(targetIndex + 1);
      }

      if (newOtp.join('').length === 6 && !newOtp.includes('')) {
        handleVerifyOtp(newOtp.join(''));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY > 0) {
      setManualPull(Math.min(deltaY * 0.8, 50));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setManualPull(0);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-800 flex flex-col justify-between selection:bg-slate-800 selection:text-white font-sans">
      {/* Top Official Gazette Strip */}
      <header className="bg-[#131b2e] text-slate-300 border-b border-slate-700/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <BrandLogo
            size="md"
            showSubtitle={true}
            subtitle="Official Legal Metrology Enforcement Portal"
          />

          <div className="flex items-center gap-2 sm:gap-3">
            {isCloudConnected ? (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-mono cursor-pointer transition-colors"
                title="System Database Connected"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="hidden sm:inline">DATABASE CONNECTED</span>
                <span className="sm:hidden">CONNECTED</span>
                <Settings className="w-3 h-3 text-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-700/60 text-amber-300 hover:bg-amber-900/60 text-xs font-mono cursor-pointer transition-colors"
                title="Configure Database Connection"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="hidden sm:inline">LOCAL MODE (PASSCODE: 123456)</span>
                <span className="sm:hidden">LOCAL</span>
                <span className="text-[10px] underline ml-1 font-bold">DATABASE ⚙️</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToMainLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Main Login</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {step === 'email' ? (
          /* SCREEN 1: INSPECTOR EMAIL ENTRY SCREEN */
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            {/* Header */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-mono font-bold text-amber-800">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>INSPECTOR 2FA DISPATCH</span>
              </div>

              <h1 className="text-xl font-bold text-slate-900 tracking-tight pt-1 font-display">
                Legal Metrology Inspector Login
              </h1>

              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered official email address. A one-time verification passcode will be dispatched to authenticate your enforcement session.
              </p>
            </div>

            {/* Dev Mode Banner if Supabase is not connected */}
            {!isCloudConnected && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>⚡ Demonstration / Local Mode</span>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="underline text-amber-800 hover:text-slate-900 cursor-pointer font-bold"
                    >
                      Configure Database
                    </button>
                  </div>
                  <p className="text-amber-800/80 text-[11px] leading-relaxed">
                    Database is operating in local mode. For offline demonstration and verification, your test passcode is <strong className="text-slate-900 font-mono bg-white px-1 py-0.5 rounded border border-amber-200">123456</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Feedback Banners */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Official / Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@dept.gov.in"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Passcode...</span>
                  </>
                ) : (
                  <>
                    <span>Dispatch One-Time Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onBackToMainLogin}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Return to Standard Sign In</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* SCREEN 2: OTP VERIFICATION SCREEN (SLINGSHOT DESIGN) */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl">
            {/* Left Column: Slingshot Interactive Visual Element */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center order-2 lg:order-1">
              <div className="relative w-full max-w-xs bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center overflow-hidden">
                {/* Visual Target Area at Top */}
                <div className="w-full flex flex-col items-center pb-3 border-b border-slate-100 relative">
                  <div
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      slingshotStatus === 'verified'
                        ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                        : slingshotStatus === 'failed'
                        ? 'bg-red-50 border-2 border-red-500 shadow-sm'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <div className="absolute inset-1.5 rounded-full border border-dashed border-slate-300" />
                    {slingshotStatus === 'verified' ? (
                      <Check className="w-6 h-6 text-emerald-600 stroke-[3]" />
                    ) : (
                      <ShieldCheck
                        className={`w-6 h-6 transition-colors ${
                          slingshotStatus === 'failed' ? 'text-red-500' : 'text-slate-700'
                        }`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mt-2">
                    {slingshotStatus === 'verified'
                      ? 'OFFICIAL AUTHORIZATION GRANTED'
                      : slingshotStatus === 'failed'
                      ? 'VERIFICATION REJECTED'
                      : 'STATUTORY AUDIT RETICLE'}
                  </span>
                </div>

                {/* SLINGSHOT SVG CANVAS */}
                <div
                  className="relative w-56 h-48 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  title="Drag the slingshot pouch or enter OTP digits to pull back!"
                >
                  <svg className="w-full h-full" viewBox="0 0 240 220" fill="none">
                    <defs>
                      <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="50%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="rubberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>

                    {/* Slingshot Wooden Fork */}
                    <path
                      d="M 60 40 C 60 70, 100 110, 110 140 L 110 200 L 130 200 L 130 140 C 140 110, 180 70, 180 40 L 165 38 C 165 65, 135 95, 125 120 C 115 95, 85 65, 85 38 Z"
                      fill="url(#woodGradient)"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />

                    {/* Pegs */}
                    <circle cx="72" cy="38" r="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="172" cy="38" r="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />

                    {/* Bands */}
                    <line
                      x1="72"
                      y1="38"
                      x2={120}
                      y2={65 + calculatedPull}
                      stroke="url(#rubberGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="172"
                      y1="38"
                      x2={120}
                      y2={65 + calculatedPull}
                      stroke="url(#rubberGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    {/* Leather Pouch & Orb */}
                    <g transform={`translate(120, ${65 + calculatedPull})`}>
                      <ellipse cx="0" cy="0" rx="18" ry="9" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                      <circle
                        cx="0"
                        cy="0"
                        r={slingshotStatus === 'launching' ? 7 : 10}
                        fill={slingshotStatus === 'verified' ? '#059669' : '#0f172a'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  </svg>
                </div>

                {/* Progress Tension Label */}
                <div className="w-full text-center pt-2">
                  <div className="text-[11px] font-mono font-semibold text-slate-600 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                    <span>Passcode Tension: {filledCount}/6 Digits</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-slate-800 transition-all duration-200"
                      style={{ width: `${(filledCount / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: OTP Input Card & Keypad */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
                {/* Card Header */}
                <div className="space-y-1.5 border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      SECURE 2FA PASSCODE
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 tracking-tight pt-1 font-display">
                    Verify Your Credentials
                  </h2>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter the 6-digit passcode dispatched to{' '}
                    <strong className="text-slate-800 font-mono">{maskEmail(email)}</strong>
                  </p>
                </div>

                {/* Dev Mode OTP Indicator & Quick Fill */}
                {!isCloudConnected && (
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Dev Bypass: <strong className="text-slate-900 font-mono">123456</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickFillDevOtp}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-mono font-bold cursor-pointer transition-colors border border-slate-200 shadow-xs"
                    >
                      ⚡ Auto-fill &amp; Verify
                    </button>
                  </div>
                )}

                {/* Feedback Toast */}
                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Six OTP Input Boxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        onFocus={() => setActiveOtpIndex(idx)}
                        className={`w-11 h-13 sm:w-12 sm:h-13 text-center font-mono text-xl sm:text-2xl font-bold rounded-lg border bg-slate-50 text-slate-900 focus:outline-none transition-all duration-150 ${
                          digit
                            ? 'border-slate-800 bg-white ring-1 ring-slate-800'
                            : activeOtpIndex === idx
                            ? 'border-slate-800 ring-1 ring-slate-800 bg-white'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Number Pad for Quick Tap & Mobile Ease */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      Virtual PIN Keypad
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Physical keyboard enabled
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        className="py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-800 font-mono text-sm font-bold transition-all active:scale-98 cursor-pointer shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CLEAR')}
                      className="py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 text-red-600 font-semibold text-xs transition-all active:scale-98 cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-800 font-mono text-sm font-bold transition-all active:scale-98 cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('BACKSPACE')}
                      className="py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-600 font-semibold text-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>⌫</span>
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Verify OTP */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={filledCount !== 6 || loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code &amp; Authorize Session</span>
                    </>
                  )}
                </button>

                {/* Resend & Navigation Options */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 sm:px-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 font-display">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Inspector OTP Authentication</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span>STATUTORY MULTI-FACTOR VERIFICATION</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
          >
            Database Settings
          </button>
        </div>
      </footer>

      {/* SYSTEM DATABASE CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl p-6 sm:p-7 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">System Database Configuration</h3>
                  <p className="text-xs text-slate-500">Configure live system database &amp; authentication</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigSuccess(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{configSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Database Endpoint URL (<code className="text-slate-900 font-mono">VITE_SUPABASE_URL</code>)</span>
                  {cfgUrl && <span className="text-[10px] text-emerald-700 font-mono">Configured</span>}
                </label>
                <input
                  type="url"
                  value={cfgUrl}
                  onChange={(e) => setCfgUrl(e.target.value)}
                  placeholder="https://database.agency.gov"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Public API Key (<code className="text-slate-900 font-mono">VITE_SUPABASE_ANON_KEY</code>)</span>
                  {cfgKey && <span className="text-[10px] text-emerald-700 font-mono">Configured</span>}
                </label>
                <input
                  type="text"
                  value={cfgKey}
                  onChange={(e) => setCfgKey(e.target.value)}
                  placeholder="Enter authorized public API key..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-display">
                  <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                  <span>Configuration Reference</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Enter your assigned system database URL and client API key, or define them in your server environment variables.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="px-3 py-2 rounded-md border border-slate-200 text-xs text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                >
                  Reset to Local Mode
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#131b2e] hover:bg-[#1e293b] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Save &amp; Connect Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
