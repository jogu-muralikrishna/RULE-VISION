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
  ArrowLeft,
  Database,
  Info
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { BrandLogo } from '../components/BrandLogo';

interface AdminLoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToMainLogin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToMainLogin,
  isDarkMode,
  onToggleTheme
}) => {
  const [email, setEmail] = useState('admin@iare.com');
  const [password, setPassword] = useState('murali@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSqlSeedModal, setShowSqlSeedModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Authenticates securely via Supabase Auth and validates trusted role = 'admin'
      const res = await authService.signIn(email, password, 'admin');

      if (res.success && res.user) {
        if (res.user.role !== 'admin') {
          setErrorMessage('Access Denied: This account is not an authorized administrator.');
        } else {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials in Supabase Auth.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to Supabase authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-800 flex flex-col justify-between selection:bg-slate-800 selection:text-white font-sans">
      {/* Top Official Gazette Strip */}
      <header className="bg-[#131b2e] text-slate-300 border-b border-slate-700/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <BrandLogo
            size="md"
            badge="ADMIN"
            showSubtitle={true}
            subtitle="Administrative Control Console"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMainLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Standard Portal Login</span>
            </button>

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

      {/* Main Admin Login Card */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          {/* Header */}
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                RESTRICTED ADMIN PRIVILEGES
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight pt-1 font-display">
              Administrator Login
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate with your verified Supabase Administrator credentials to access user management, audit logs, and system registries.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1 flex-1">
                <span>{errorMessage}</span>
                {errorMessage.includes('SQL seed') && (
                  <button
                    type="button"
                    onClick={() => setShowSqlSeedModal(true)}
                    className="block text-[11px] text-slate-800 underline hover:text-slate-950 font-semibold pt-1 cursor-pointer"
                  >
                    View Supabase SQL Seed Script →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Admin Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Administrator Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@iare.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Master Admin Password
              </label>
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
              {loading ? (
                'Verifying Administrator Role...'
              ) : (
                <>
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security & Setup Info Box */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-[11px] font-display">
              <Database className="w-3.5 h-3.5 text-slate-700" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Session is verified through Supabase Auth. The system ensures the account has <strong className="text-slate-800 font-mono">role = 'admin'</strong> in the database before granting access.
            </p>
            <button
              type="button"
              onClick={() => setShowSqlSeedModal(true)}
              className="text-[11px] text-slate-800 hover:underline cursor-pointer block font-semibold pt-0.5"
            >
              Need to seed admin in Supabase? View SQL Setup Script →
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 sm:px-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        RuleVision Administrative Control Console • Legal Metrology Act, 2009 &amp; PCR 2011
      </footer>

      {/* SQL Setup Instruction Modal */}
      {showSqlSeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900 font-display">Supabase Admin Account Setup SQL</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSeedModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              To create the admin user with <strong className="text-slate-900 font-mono">admin@iare.com</strong> and <strong className="text-slate-900 font-mono">murali@123</strong> in your Supabase project, execute this script in <strong>Supabase Dashboard → SQL Editor</strong>:
            </p>

            <div className="flex-1 overflow-y-auto bg-slate-900 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
              <pre className="whitespace-pre-wrap">{`-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure user profile exists with admin role
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@iare.com',
  'Master Administrator',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();`}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSqlSeedModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
