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

    setConfigSuccess('Configuration saved! Reloading application to connect Supabase...');
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
      // Find last filled index
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

    // Insert digit at first empty box or active index
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

  // Interactive Drag on the Slingshot Pouch (Fun mini-game feel!)
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
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F7] flex flex-col justify-between selection:bg-[#FF2638] selection:text-white relative overflow-x-hidden">
      {/* Ambient Red & Amber Lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF2638]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#292B34] bg-[#101116]/80 backdrop-blur-md sticky top-0 z-40">
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer transition-colors"
              title="Click to view or edit Supabase configuration"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">Supabase Cloud Connected</span>
              <span className="sm:hidden">Connected</span>
              <Settings className="w-3 h-3 text-emerald-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer transition-colors"
              title="Click to connect Supabase Cloud"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="hidden sm:inline">Dev Mode (OTP: 123456)</span>
              <span className="sm:hidden">Dev Mode</span>
              <span className="text-[11px] underline ml-1 font-bold">Connect Cloud ⚙️</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToMainLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#292B34] bg-[#14151B] text-[#A5A7B0] hover:text-white hover:border-[#FF2638]/50 transition-colors text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Main Login</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {step === 'email' ? (
          /* ====================================================
             SCREEN 1: INSPECTOR EMAIL ENTRY SCREEN
             ==================================================== */
          <div className="w-full max-w-md bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1B1C23] border border-amber-500/30 text-xs font-bold text-amber-400">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Inspector Verification</span>
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight pt-1">
                Legal Metrology Inspector Login
              </h1>

              <p className="text-xs text-[#A5A7B0] leading-relaxed">
                Enter your registered email address. We will send you a secure verification code to continue.
              </p>
            </div>

            {/* Dev Mode Banner if Supabase is not connected */}
            {!isCloudConnected && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>⚡ Local Development / Demo Mode</span>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="underline text-amber-400 hover:text-white cursor-pointer font-bold"
                    >
                      Connect Cloud
                    </button>
                  </div>
                  <p className="text-[#C8CAD4] text-[11px] leading-relaxed">
                    Supabase credentials are not connected yet. You can test with any email — your verification OTP code will be <strong className="text-white font-mono bg-amber-500/20 px-1 py-0.5 rounded">123456</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Feedback Banners */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A5A7B0]" />
                  Official / Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@dept.gov.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF2638] via-[#FF3B4D] to-amber-500 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-[#FF2638]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Secure OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onBackToMainLogin}
                  className="text-xs font-semibold text-[#A5A7B0] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Return to Standard Sign In</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ====================================================
             SCREEN 2: OTP VERIFICATION SCREEN (SLINGSHOT DESIGN)
             ==================================================== */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl">
            {/* Left Column: Slingshot Interactive Visual Element */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center order-2 lg:order-1">
              <div className="relative w-full max-w-xs bg-[#101116] rounded-3xl border border-[#292B34] p-6 shadow-2xl flex flex-col items-center overflow-hidden">
                {/* Visual Target Area at Top */}
                <div className="w-full flex flex-col items-center pb-4 border-b border-[#20222B] relative">
                  <div
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                      slingshotStatus === 'verified'
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_25px_#10b981]'
                        : slingshotStatus === 'failed'
                        ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_#ef4444]'
                        : 'bg-[#1B1C23] border border-[#292B34]'
                    }`}
                  >
                    {/* Bullseye Rings */}
                    <div className="absolute inset-2 rounded-full border border-dashed border-[#292B34] animate-spin-slow" />
                    <div className="absolute inset-4 rounded-full border border-[#292B34]" />

                    {slingshotStatus === 'verified' ? (
                      <Check className="w-8 h-8 text-emerald-400 stroke-[3] animate-scale-up" />
                    ) : (
                      <ShieldCheck
                        className={`w-8 h-8 transition-colors ${
                          slingshotStatus === 'failed' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A7B0] mt-2">
                    {slingshotStatus === 'verified'
                      ? 'Access Granted'
                      : slingshotStatus === 'failed'
                      ? 'Verification Failed'
                      : 'Statutory Verification Target'}
                  </span>
                </div>

                {/* SLINGSHOT SVG CANVAS */}
                <div
                  className="relative w-64 h-56 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  title="Drag the slingshot pouch or enter OTP digits to pull back!"
                >
                  <svg className="w-full h-full" viewBox="0 0 240 220" fill="none">
                    <defs>
                      <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B4513" />
                        <stop offset="50%" stopColor="#A0522D" />
                        <stop offset="100%" stopColor="#5C2E0B" />
                      </linearGradient>
                      <linearGradient id="rubberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF2638" />
                        <stop offset="100%" stopColor="#B51226" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Slingshot Wooden Fork (Y-Shape) */}
                    {/* Left Prong */}
                    <path
                      d="M 60 40 C 60 70, 100 110, 110 140 L 110 200 L 130 200 L 130 140 C 140 110, 180 70, 180 40 L 165 38 C 165 65, 135 95, 125 120 C 115 95, 85 65, 85 38 Z"
                      fill="url(#woodGradient)"
                      stroke="#4A2508"
                      strokeWidth="2"
                    />

                    {/* Metallic Pegs on the Prongs */}
                    <circle cx="72" cy="38" r="5" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />
                    <circle cx="172" cy="38" r="5" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />

                    {/* Rubber Bands */}
                    {/* Left Band stretching to Pouch */}
                    <line
                      x1="72"
                      y1="38"
                      x2={120}
                      y2={65 + calculatedPull}
                      stroke="url(#rubberGradient)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    {/* Right Band stretching to Pouch */}
                    <line
                      x1="172"
                      y1="38"
                      x2={120}
                      y2={65 + calculatedPull}
                      stroke="url(#rubberGradient)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />

                    {/* Leather Pouch & Projectile Orb */}
                    <g transform={`translate(120, ${65 + calculatedPull})`}>
                      {/* Leather Pouch */}
                      <ellipse cx="0" cy="0" rx="18" ry="9" fill="#292524" stroke="#78716C" strokeWidth="1.5" />

                      {/* Projectile Orb (The Verification Token) */}
                      <circle
                        cx="0"
                        cy="0"
                        r={slingshotStatus === 'launching' ? 7 : 11}
                        fill={slingshotStatus === 'verified' ? '#10B981' : '#FF2638'}
                        filter="url(#glow)"
                        className={filledCount === 6 ? 'animate-pulse' : ''}
                      />
                      <circle
                        cx="-3"
                        cy="-3"
                        r="3"
                        fill="#FFFFFF"
                        opacity="0.7"
                      />
                    </g>
                  </svg>
                </div>

                {/* Progress Tension Label */}
                <div className="w-full text-center pt-2">
                  <div className="text-[11px] font-semibold text-[#A5A7B0] flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tension: {filledCount}/6 Digits Loaded</span>
                  </div>
                  <div className="w-full bg-[#1B1C23] h-1.5 rounded-full mt-1.5 overflow-hidden border border-[#292B34]">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#FF2638] transition-all duration-200"
                      style={{ width: `${(filledCount / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: OTP Input Card & Keypad */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="bg-[#14151B] rounded-3xl border border-[#292B34] shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF2638]/5 rounded-full blur-2xl pointer-events-none" />

                {/* Card Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/80">
                      Secure OTP Verification
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-[#A5A7B0] hover:text-white transition-colors cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>

                  <h2 className="text-2xl font-black text-white tracking-tight pt-1">
                    Verify Your Email
                  </h2>

                  <p className="text-xs text-[#A5A7B0] leading-relaxed">
                    We sent a 6-digit verification code to{' '}
                    <strong className="text-white font-mono">{maskEmail(email)}</strong>
                  </p>
                </div>

                {/* Dev Mode OTP Indicator & Quick Fill */}
                {!isCloudConnected && (
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Dev Code: <strong className="text-white font-mono">123456</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickFillDevOtp}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer transition-colors border border-amber-500/30"
                    >
                      ⚡ Auto-fill & Verify
                    </button>
                  </div>
                )}

                {/* Feedback Toast */}
                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
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
                        className={`w-11 h-13 sm:w-13 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-xl border bg-[#101116] text-white focus:outline-none transition-all duration-200 ${
                          digit
                            ? 'border-amber-500 bg-[#161720] shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : activeOtpIndex === idx
                            ? 'border-[#FF2638] ring-2 ring-[#FF2638]/40'
                            : 'border-[#292B34] hover:border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Number Pad for Quick Tap & Mobile Ease */}
                <div className="space-y-2 pt-2 border-t border-[#20222B]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71737E] flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      Quick Numeric Keypad
                    </span>
                    <span className="text-[10px] text-[#71737E]">
                      Physical keyboard also supported
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        className="py-2.5 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-[#1C1D26] hover:border-amber-500/40 text-white font-mono text-base font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CLEAR')}
                      className="py-2.5 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-red-950/30 hover:border-red-500/40 text-red-400 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="py-2.5 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-[#1C1D26] hover:border-amber-500/40 text-white font-mono text-base font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('BACKSPACE')}
                      className="py-2.5 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-[#1C1D26] hover:border-amber-500/40 text-[#A5A7B0] font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
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
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF2638] via-[#FF3B4D] to-amber-500 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify OTP & Authorize Inspector</span>
                    </>
                  )}
                </button>

                {/* Resend & Navigation Options */}
                <div className="flex items-center justify-between text-xs text-[#A5A7B0] pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className="font-semibold text-[#A5A7B0] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
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
      <footer className="py-4 px-4 sm:px-8 border-t border-[#292B34] bg-[#101116]/80 text-center text-xs text-[#A5A7B0] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Inspector OTP Authentication</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#71737E]">
          <span>Protected by Multi-Factor Verification</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-amber-400 hover:text-white underline cursor-pointer"
          >
            Supabase Settings
          </button>
        </div>
      </footer>

      {/* ====================================================
         SUPABASE CLOUD CONFIGURATION MODAL
         ==================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 sm:p-7 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#292B34] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Supabase Cloud Connection</h3>
                  <p className="text-xs text-[#A5A7B0]">Configure live Supabase authentication & database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigSuccess(null);
                }}
                className="p-1.5 rounded-lg text-[#A5A7B0] hover:text-white hover:bg-[#1F2128] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{configSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F5F5F7] flex items-center justify-between">
                  <span>Supabase Project URL (<code className="text-amber-400 font-mono">VITE_SUPABASE_URL</code>)</span>
                  {cfgUrl && <span className="text-[10px] text-emerald-400 font-normal">Configured</span>}
                </label>
                <input
                  type="url"
                  value={cfgUrl}
                  onChange={(e) => setCfgUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F5F5F7] flex items-center justify-between">
                  <span>Supabase Anon Public Key (<code className="text-amber-400 font-mono">VITE_SUPABASE_ANON_KEY</code>)</span>
                  {cfgKey && <span className="text-[10px] text-emerald-400 font-normal">Configured</span>}
                </label>
                <input
                  type="text"
                  value={cfgKey}
                  onChange={(e) => setCfgKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#101116] border border-[#20222B] text-xs text-[#A5A7B0] space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Where do I get these credentials?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  In your Supabase Dashboard (<a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a>), navigate to <strong>Project Settings → API</strong>. Copy the <strong>Project URL</strong> and the public <strong>anon key</strong>.
                </p>
                <p className="text-[11px] leading-relaxed text-[#71737E]">
                  You can also paste them directly into <code className="text-amber-300 font-mono">.env</code> in your project root as <code className="text-white font-mono">VITE_SUPABASE_URL</code> and <code className="text-white font-mono">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="px-3 py-2 rounded-xl border border-[#292B34] text-xs text-[#A5A7B0] hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                >
                  Clear / Dev Mode
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2638] via-[#FF3B4D] to-amber-500 text-white font-bold text-xs shadow-md shadow-[#FF2638]/20 hover:opacity-95 transition-all cursor-pointer"
                >
                  Save & Connect Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
