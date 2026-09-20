import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Scan,
  Cpu,
  FileCheck2,
  Sparkles,
  User,
  Shield
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  isDarkMode,
  onToggleTheme
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('consumer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await authService.signIn(email, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Login failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.signUp(email, password, role);
      if (res.success && res.user) {
        setSuccessMessage('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 500);
      } else {
        setErrorMessage(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to register account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await authService.resetPassword(email);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F7] flex flex-col justify-between transition-colors duration-200 selection:bg-[#FF2638] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#292B34] bg-[#101116]/80 backdrop-blur-md sticky top-0 z-40">
        <BrandLogo
          size="md"
          showSubtitle={true}
          subtitle="AI-Powered Legal Metrology Compliance Inspection"
        />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#14151B] border border-[#292B34] text-[11px] font-medium text-[#A5A7B0]">
            <span className="w-2 h-2 rounded-full bg-[#FF2638] animate-pulse" />
            Legal Metrology (Packaged Commodities) Rules
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-[#292B34] bg-[#14151B] text-[#A5A7B0] hover:text-white hover:border-[#FF2638]/50 transition-colors shadow-xs cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Main Content Area - 2-Column Red Noir Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Brand & Feature Showcase */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-8 pr-4">
            
            {/* Hero Brand Title */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1B1C23] border border-[#292B34] text-xs font-semibold text-[#FF2638]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Statutory Enforcement & Citizen Protection</span>
              </div>
              
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
                Inspect Packaged Goods with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2638] via-[#FF4D5E] to-amber-400">
                  AI Precision
                </span>
              </h1>
              
              <p className="text-sm xl:text-base text-[#A5A7B0] leading-relaxed max-w-xl">
                RuleVision delivers automated compliance screening for packaged commodities under the{' '}
                <strong className="text-white">Legal Metrology Act</strong> and{' '}
                <strong className="text-white">Packaged Commodities Rules</strong>. 
                From real-time label OCR to statutory field validation and instant infraction reports.
              </p>
            </div>

            {/* Packaging Scanner Simulation Card */}
            <div className="relative rounded-2xl bg-[#14151B] border border-[#292B34] p-5 shadow-2xl overflow-hidden group hover:border-[#FF2638]/40 transition-all duration-300">
              {/* Laser Scan Line Animation */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF2638] to-transparent animate-pulse shadow-[0_0_12px_#FF2638]" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1B1C23] border border-[#292B34] flex items-center justify-center text-[#FF2638]">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Real-time Statutory Compliance Scanner</span>
                    <span className="text-[10px] text-[#A5A7B0]">Standard Label Verification (Rule 6 Declarations)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  Active AI Engine
                </span>
              </div>

              {/* Sample Packaging Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(a)</span>
                  <span className="font-semibold text-white truncate block">Manufacturer & Address</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(b)</span>
                  <span className="font-semibold text-white truncate block">Commodity Name</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(c)</span>
                  <span className="font-semibold text-emerald-400 truncate block">Net Quantity</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(d)</span>
                  <span className="font-semibold text-white truncate block">Mfg / Packing Date</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(e)</span>
                  <span className="font-semibold text-emerald-400 truncate block">MRP (Taxes Incl.)</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101116] border border-[#292B34]">
                  <span className="text-[10px] text-[#A5A7B0] block">Rule 6(1)(f)</span>
                  <span className="font-semibold text-white truncate block">Consumer Care Contact</span>
                </div>
              </div>
            </div>

            {/* Core Capabilities Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#101116]/60 border border-[#292B34] space-y-1">
                <Cpu className="w-4 h-4 text-[#FF2638]" />
                <h2 className="text-xs font-bold text-white">Multimodal AI OCR</h2>
                <p className="text-[11px] text-[#A5A7B0] leading-tight">
                  High-accuracy recognition for curved, reflective, or cylindrical packaging.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#101116]/60 border border-[#292B34] space-y-1">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white">Rule Verification</h2>
                <p className="text-[11px] text-[#A5A7B0] leading-tight">
                  Evaluates mandatory declarations against legal rules with penalty calculations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#101116]/60 border border-[#292B34] space-y-1">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold text-white">Official Audits</h2>
                <p className="text-[11px] text-[#A5A7B0] leading-tight">
                  Generates court-ready PDF inspection dossiers and show-cause notices.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Authentication Card */}
          <div className="col-span-1 lg:col-span-5 w-full max-w-md mx-auto">
            
            {/* Mobile Brand Header */}
            <div className="lg:hidden text-center mb-6 space-y-2">
              <BrandLogo
                size="lg"
                showSubtitle={true}
                subtitle="Legal Metrology Compliance Inspection"
                className="justify-center"
              />
            </div>

            <div className="bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF2638]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#1B1C23] border border-[#292B34] text-[#FF2638] shadow-xs">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5A7B0] bg-[#101116] px-2.5 py-1 rounded-full border border-[#292B34]">
                    {authMode === 'login' ? 'Secure Sign In' : authMode === 'signup' ? 'Create Account' : 'Account Recovery'}
                  </span>
                </div>
                
                <h2 className="text-2xl font-black text-white tracking-tight pt-2">
                  {authMode === 'login' && 'Sign In to RuleVision'}
                  {authMode === 'signup' && 'Create Your Account'}
                  {authMode === 'forgot_password' && 'Reset Password'}
                </h2>
                <p className="text-xs text-[#A5A7B0]">
                  {authMode === 'login' && 'Enter your credentials to access your inspection workspace.'}
                  {authMode === 'signup' && 'Register as a citizen or officer to inspect packaged commodities.'}
                  {authMode === 'forgot_password' && 'Enter your registered email to receive password reset link.'}
                </p>
              </div>

              {/* Feedback Banners */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs">
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

              {/* FORM: LOGIN */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#A5A7B0]" />
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setAuthMode('forgot_password');
                        }}
                        className="text-xs text-[#A5A7B0] hover:text-[#FF2638] font-medium transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5A7B0] hover:text-white p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setAuthMode('signup');
                      }}
                      className="text-xs font-semibold text-[#A5A7B0] hover:text-white transition-colors cursor-pointer"
                    >
                      Don't have an account? <span className="text-[#FF2638] underline underline-offset-2">Create Account</span>
                    </button>
                  </div>
                </form>
              )}

              {/* FORM: SIGN UP */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] block">
                      Select Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('consumer')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                          role === 'consumer'
                            ? 'border-[#FF2638] bg-[#FF2638]/10 text-white'
                            : 'border-[#292B34] bg-[#101116] text-[#A5A7B0] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <User className="w-3.5 h-3.5 text-[#FF2638]" />
                          <span className="text-xs font-bold text-white">Citizen</span>
                        </div>
                        <span className="text-[10px] text-[#A5A7B0]">Quick label verification</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('inspector')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                          role === 'inspector'
                            ? 'border-[#FF2638] bg-[#FF2638]/10 text-white'
                            : 'border-[#292B34] bg-[#101116] text-[#A5A7B0] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Shield className="w-3.5 h-3.5 text-[#FF2638]" />
                          <span className="text-xs font-bold text-white">Inspector</span>
                        </div>
                        <span className="text-[10px] text-[#A5A7B0]">Full audit suite & notices</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5A7B0] hover:text-white p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5A7B0] hover:text-white p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Creating Account...' : 'Create RuleVision Account'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setAuthMode('login');
                      }}
                      className="text-xs font-semibold text-[#A5A7B0] hover:text-white transition-colors cursor-pointer"
                    >
                      Already have an account? <span className="text-[#FF2638] underline underline-offset-2">Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* FORM: FORGOT PASSWORD */}
              {authMode === 'forgot_password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-sm font-bold shadow-lg shadow-[#FF2638]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setAuthMode('login');
                      }}
                      className="text-xs font-semibold text-[#A5A7B0] hover:text-white transition-colors cursor-pointer"
                    >
                      Remember your password? <span className="text-[#FF2638] underline underline-offset-2">Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 sm:px-8 border-t border-[#292B34] bg-[#101116]/80 text-center text-xs text-[#A5A7B0] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Screening Platform</span>
        </div>
        <div className="text-[11px] text-[#71737E]">
          RuleVision • AI-Powered Legal Metrology Compliance Inspection Platform
        </div>
      </footer>
    </div>
  );
};
