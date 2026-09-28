import React, { useState, useEffect } from 'react';
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
import { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';
import { InspectorOtpLogin } from './InspectorOtpLogin';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  initialMode?: AuthMode;
  onNavigateToAdminLogin?: () => void;
}

export type AuthMode = 'login' | 'signup' | 'forgot_password' | 'inspector_otp';

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
  onToggleTheme,
  initialMode = 'login',
  onNavigateToAdminLogin
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

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

  if (authMode === 'inspector_otp') {
    return (
      <InspectorOtpLogin
        onLoginSuccess={onLoginSuccess}
        onBackToMainLogin={() => setAuthMode('login')}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-800 flex flex-col justify-between selection:bg-slate-800 selection:text-white font-sans">
      {/* Top Official Gazette Strip */}
      <header className="bg-[#131b2e] text-slate-300 border-b border-slate-700/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <BrandLogo
            size="md"
            showSubtitle={true}
            subtitle="AI-Powered Legal Metrology Compliance Inspection"
          />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-mono font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>STATUTORY ACT 2009 &amp; PCR 2011</span>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - 2-Column Statutory Precision Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Brand & Statutory Feature Showcase */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6 pr-4">
            
            {/* Hero Brand Title */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                <span>DIRECTORATE OF LEGAL METROLOGY • STATUTORY PLATFORM</span>
              </div>
              
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
                Automated Packaged Commodity Compliance with{' '}
                <span className="text-[#131b2e] underline decoration-slate-400 decoration-2 underline-offset-4">
                  Statutory Precision
                </span>
              </h1>
              
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                RuleVision delivers automated compliance screening for packaged commodities under the{' '}
                <strong className="text-slate-900 font-semibold">Legal Metrology Act, 2009</strong> and the{' '}
                <strong className="text-slate-900 font-semibold">Packaged Commodities Rules (PCR), 2011</strong>. 
                Perform high-precision package image analysis, verify statutory declarations, and generate official court-ready audit dossiers.
              </p>
            </div>

            {/* Packaging Scanner Specification Matrix Card */}
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-display">Mandatory Declarations Verification Matrix</span>
                    <span className="text-[11px] text-slate-500 font-mono">Rule 6(1) Statutory Provisions</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PCR 2011 VERIFIED
                </span>
              </div>

              {/* Statutory Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(a)</span>
                  <span className="font-semibold text-slate-800 truncate block text-xs">Manufacturer &amp; Address</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(b)</span>
                  <span className="font-semibold text-slate-800 truncate block text-xs">Generic Name</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(c)</span>
                  <span className="font-semibold text-emerald-700 truncate block text-xs">Net Quantity &amp; Units</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(d)</span>
                  <span className="font-semibold text-slate-800 truncate block text-xs">Mfg / Packing Date</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(e)</span>
                  <span className="font-semibold text-emerald-700 truncate block text-xs">MRP (Taxes Incl.)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono block">Rule 6(1)(f)</span>
                  <span className="font-semibold text-slate-800 truncate block text-xs">Consumer Care Contact</span>
                </div>
              </div>
            </div>

            {/* Core Capabilities 3-Card Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
                <Cpu className="w-4 h-4 text-slate-800" />
                <h2 className="text-xs font-bold text-slate-900 font-display">Text Extraction</h2>
                <p className="text-[11px] text-slate-500 leading-tight">
                  High-accuracy recognition for curved, reflective, or cylindrical packaging surfaces.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-900 font-display">Rule-Based Verification</h2>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Evaluates mandatory declarations against legal rules with statutory infraction scoring.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <h2 className="text-xs font-bold text-slate-900 font-display">Official Dossiers</h2>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Generates court-ready PDF inspection reports, show-cause notices, and Section 36 dockets.
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
              
              {/* Header */}
              <div className="space-y-1.5 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {authMode === 'login' ? 'SECURE SIGN IN' : authMode === 'signup' ? 'REGISTRATION' : 'RECOVERY'}
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 tracking-tight pt-2 font-display">
                  {authMode === 'login' && 'Sign In to RuleVision'}
                  {authMode === 'signup' && 'Create Your Account'}
                  {authMode === 'forgot_password' && 'Reset Password'}
                </h2>
                <p className="text-xs text-slate-500">
                  {authMode === 'login' && 'Enter your credentials to access your inspection workspace.'}
                  {authMode === 'signup' && 'Register as a citizen or officer to inspect packaged commodities.'}
                  {authMode === 'forgot_password' && 'Enter your registered email to receive a password reset link.'}
                </p>
              </div>

              {/* Feedback Banners */}
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

              {/* FORM: LOGIN */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setAuthMode('forgot_password');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
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
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Inspector Portal Login Divider & Button */}
                  <div className="relative flex items-center justify-center pt-1">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      ENFORCEMENT ACCESS
                    </span>
                    <div className="border-t border-slate-200 w-full" />
                  </div>


                  <button
                    type="button"
                    id="btn-inspector-otp-login"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setAuthMode('inspector_otp');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-xs"
                  >
                    <Shield className="w-4 h-4 text-amber-600 group-hover:scale-105 transition-transform" />
                    <span>Legal Metrology Inspector Login (Email OTP)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setAuthMode('signup');
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Don't have an account? <span className="text-slate-900 font-semibold underline underline-offset-2">Create Account</span>
                    </button>
                  </div>

                  {onNavigateToAdminLogin && (
                    <div className="pt-2 text-center border-t border-slate-100">
                      <button
                        type="button"
                        id="link-admin-portal-login"
                        onClick={onNavigateToAdminLogin}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                        <span>Open Dedicated Administrator Portal (/admin)</span>
                      </button>
                    </div>
                  )}
                </form>
              )}

              {/* FORM: SIGN UP */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Step 1: Select Account Type Cards */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider font-mono">
                      Select Account Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Consumer Card */}
                      <div
                        onClick={() => setAccountType('consumer')}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          accountType === 'consumer'
                            ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {accountType === 'consumer' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={`p-1 rounded ${accountType === 'consumer' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 font-display">Consumer</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            Scan labels, verify mandatory statutory declarations, and maintain your personal dossier.
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            Immediate Access
                          </span>
                        </div>
                      </div>

                      {/* Legal Metrology Inspector Card */}
                      <div
                        onClick={() => setAccountType('inspector')}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          accountType === 'inspector'
                            ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {accountType === 'inspector' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={`p-1 rounded ${accountType === 'inspector' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>
                              <Shield className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 font-display">Inspector</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            Conduct official audits, formulate violation dockets, and issue enforcement show-cause notices.
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 font-mono">
                            <AlertCircle className="w-3 h-3" />
                            Official Verification
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Common Field: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all"
                    />
                  </div>

                  {/* Common Field: Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {accountType === 'inspector' ? 'Official Government / Authority Email' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={accountType === 'inspector' ? 'officer@dept.gov.in' : 'citizen@example.com'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all"
                    />
                  </div>

                  {/* Inspector Specific Verification Section */}
                  {accountType === 'inspector' && (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                        <Shield className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                          Inspector Verification Credentials
                        </span>
                      </div>

                      {/* Inspector ID / Employee ID */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                          <span>Inspector ID / Badge Number</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={accountType === 'inspector'}
                          value={inspectorId}
                          onChange={(e) => setInspectorId(e.target.value)}
                          placeholder="e.g. LM-KA-2024-089"
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-mono"
                        />
                      </div>

                      {/* Department / Office */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>Department / Authority</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={accountType === 'inspector'}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. Department of Legal Metrology"
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      {/* Jurisdiction State & District */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>State / UT</span>
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:border-slate-800"
                          >
                            {INDIAN_STATES.map((st) => (
                              <option key={st} value={st} className="text-slate-900">
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <span>District / Zone</span>
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={accountType === 'inspector'}
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Bengaluru Urban"
                            className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                          />
                        </div>
                      </div>

                      {/* Supporting Document Upload */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-500" />
                            Supporting Document (ID / Appointment Order)
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Optional</span>
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
                            className="flex items-center justify-between px-3 py-2 rounded-md border border-dashed border-slate-300 bg-white hover:border-slate-400 cursor-pointer text-xs transition-colors"
                          >
                            <span className="text-slate-600 truncate">
                              {supportingDocFile ? supportingDocFile.name : 'Attach Official Order / ID Card (PDF/JPG)'}
                            </span>
                            <UploadCloud className="w-4 h-4 text-slate-600 shrink-0 ml-2" />
                          </label>
                          {supportingDocFile && (
                            <button
                              type="button"
                              onClick={() => setSupportingDocFile(null)}
                              className="text-[10px] text-red-600 hover:underline mt-1 inline-block"
                            >
                              Remove attached document
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info Notice for Inspector Approval */}
                      <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong className="font-semibold block mb-0.5">Statutory Authorization Required</strong>
                          <span>Inspector accounts require administrative clearance. While pending approval, you can access the standard Consumer workspace.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
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
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
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
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      'Processing...'
                    ) : accountType === 'inspector' ? (
                      <>
                        <span>Submit Inspector Verification Request</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Create RuleVision Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Already have an account? <span className="text-slate-900 font-semibold underline underline-offset-2">Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* FORM: FORGOT PASSWORD */}
              {authMode === 'forgot_password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Remember your password? <span className="text-slate-900 font-semibold underline underline-offset-2">Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 sm:px-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 font-display">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Statutory Screening Platform</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          DIRECTORATE OF LEGAL METROLOGY • ACT 2009 &amp; PCR 2011
        </div>
      </footer>
    </div>
  );
};
