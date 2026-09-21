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
  Shield,
  Building2,
  MapPin,
  UploadCloud,
  FileText,
  Check
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

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  isDarkMode,
  onToggleTheme
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'consumer' | 'inspector'>('consumer');
  const [inspectorId, setInspectorId] = useState('');
  const [department, setDepartment] = useState('Department of Legal Metrology');
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('');
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);
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

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (accountType === 'inspector') {
      if (!inspectorId.trim()) {
        setErrorMessage('Inspector ID / Badge Number is required for enforcement accounts.');
        return;
      }
      if (!department.trim()) {
        setErrorMessage('Department / Authority is required.');
        return;
      }
      if (!state.trim()) {
        setErrorMessage('Jurisdiction State is required.');
        return;
      }
      if (!district.trim()) {
        setErrorMessage('District / Zone is required.');
        return;
      }
    }

    setLoading(true);

    try {
      let supportingDocUrl: string | null = null;
      if (accountType === 'inspector' && supportingDocFile) {
        supportingDocUrl = await authService.uploadSupportingDocument(supportingDocFile);
      }

      const res = await authService.signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        accountType,
        inspectorDetails: accountType === 'inspector' ? {
          inspectorId: inspectorId.trim(),
          department: department.trim(),
          state: state.trim(),
          district: district.trim(),
          supportingDocument: supportingDocUrl
        } : undefined
      });

      if (res.success && res.user) {
        if (res.user.inspector_status === 'pending') {
          setSuccessMessage('Inspector access request submitted successfully! Your account is pending administrator approval.');
        } else {
          setSuccessMessage('Account created successfully! Logging you in...');
        }
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 600);
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
                  {/* Step 1: Select Account Type Cards */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#F5F5F7] block uppercase tracking-wider">
                      Select Account Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Consumer Card */}
                      <div
                        onClick={() => setAccountType('consumer')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                          accountType === 'consumer'
                            ? 'border-[#FF2638] bg-[#FF2638]/10 ring-1 ring-[#FF2638]/50 shadow-md shadow-[#FF2638]/10'
                            : 'border-[#292B34] bg-[#101116] hover:border-slate-600 hover:bg-[#15161D]'
                        }`}
                      >
                        {accountType === 'consumer' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF2638] flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-lg ${accountType === 'consumer' ? 'bg-[#FF2638]/20 text-[#FF2638]' : 'bg-[#1F2028] text-slate-400'}`}>
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Consumer</span>
                          </div>
                          <p className="text-[11px] text-[#A5A7B0] leading-snug">
                            Scan product labels, check declarations, and view your personal inspection history.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[#292B34]/60">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Immediate Access
                          </span>
                        </div>
                      </div>

                      {/* Legal Metrology Inspector Card */}
                      <div
                        onClick={() => setAccountType('inspector')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                          accountType === 'inspector'
                            ? 'border-[#FF2638] bg-[#FF2638]/10 ring-1 ring-[#FF2638]/50 shadow-md shadow-[#FF2638]/10'
                            : 'border-[#292B34] bg-[#101116] hover:border-slate-600 hover:bg-[#15161D]'
                        }`}
                      >
                        {accountType === 'inspector' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF2638] flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-lg ${accountType === 'inspector' ? 'bg-[#FF2638]/20 text-[#FF2638]' : 'bg-[#1F2028] text-slate-400'}`}>
                              <Shield className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Legal Metrology Inspector</span>
                          </div>
                          <p className="text-[11px] text-[#A5A7B0] leading-snug">
                            Request inspector access to conduct and manage authorized product compliance inspections.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[#292B34]/60">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                            <AlertCircle className="w-3 h-3" />
                            Requires Verification
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Common Field: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                    />
                  </div>

                  {/* Common Field: Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#A5A7B0]" />
                      {accountType === 'inspector' ? 'Official Email Address' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={accountType === 'inspector' ? 'officer@dept.gov.in' : 'citizen@example.com'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-sm focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-all"
                    />
                  </div>

                  {/* Inspector Specific Verification Section */}
                  {accountType === 'inspector' && (
                    <div className="p-3.5 rounded-xl bg-[#0F1015] border border-[#292B34] space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-[#20222B]">
                        <Shield className="w-4 h-4 text-[#FF2638]" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Inspector Verification Details
                        </span>
                      </div>

                      {/* Inspector ID / Employee ID */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                          <span>Inspector ID / Employee ID</span>
                          <span className="text-[#FF2638]">*</span>
                        </label>
                        <input
                          type="text"
                          required={accountType === 'inspector'}
                          value={inspectorId}
                          onChange={(e) => setInspectorId(e.target.value)}
                          placeholder="e.g. LM-KA-2024-089"
                          className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#14151B] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                        />
                      </div>

                      {/* Department / Office */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#A5A7B0]" />
                          <span>Department / Office</span>
                          <span className="text-[#FF2638]">*</span>
                        </label>
                        <input
                          type="text"
                          required={accountType === 'inspector'}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. Department of Legal Metrology"
                          className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#14151B] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                        />
                      </div>

                      {/* Jurisdiction State & District */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#C5C7D0] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#A5A7B0]" />
                            <span>State / UT</span>
                            <span className="text-[#FF2638]">*</span>
                          </label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-[#292B34] bg-[#14151B] text-white text-xs focus:outline-none focus:border-[#FF2638]"
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
                            <span>District / Zone</span>
                            <span className="text-[#FF2638]">*</span>
                          </label>
                          <input
                            type="text"
                            required={accountType === 'inspector'}
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Bengaluru Urban"
                            className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#14151B] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
                          />
                        </div>
                      </div>

                      {/* Supporting Document Upload (Optional) */}
                      <div className="space-y-1 pt-1">
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
                                setSupportingDocFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                            id="inspector-doc-upload"
                          />
                          <label
                            htmlFor="inspector-doc-upload"
                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-[#292B34] bg-[#14151B] hover:border-[#FF2638]/60 cursor-pointer text-xs transition-colors"
                          >
                            <span className="text-[#A5A7B0] truncate">
                              {supportingDocFile ? supportingDocFile.name : 'Click to attach ID Card or Official Order (PDF/JPG)'}
                            </span>
                            <UploadCloud className="w-4 h-4 text-[#FF2638] shrink-0 ml-2" />
                          </label>
                          {supportingDocFile && (
                            <button
                              type="button"
                              onClick={() => setSupportingDocFile(null)}
                              className="text-[10px] text-red-400 hover:text-red-300 mt-1 inline-block"
                            >
                              Remove attached document
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info Notice for Inspector Approval */}
                      <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <strong className="text-white block mb-0.5">Administrative Verification Required</strong>
                          <span>Inspector access requires administrative verification. Submitting this request does not automatically grant inspector privileges. While your request is pending review, you can still access the Consumer workspace.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Password Field */}
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

                  {/* Confirm Password Field */}
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
                    {loading ? (
                      'Processing Request...'
                    ) : accountType === 'inspector' ? (
                      <>
                        <span>Submit Inspector Access Request</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Create RuleVision Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
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
