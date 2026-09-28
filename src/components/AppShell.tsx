import React, { useState } from 'react';
import {
  LayoutDashboard,
  ScanEye,
  Layers,
  History,
  Trash2,
  FileText,
  Scale,
  Menu,
  X,
  Info,
  Sun,
  Moon,
  ArrowLeft,
  Sparkles,
  Key,
  Check,
  Settings,
  LogOut,
  Gavel,
  Shield,
  FileDown,
  User,
  Activity
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

export type PageId = 'dashboard' | 'inspect' | 'batch' | 'history' | 'recycle-bin' | 'reports' | 'rules' | 'admin-requests';

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onSwitchMode?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  recycleBinCount?: number;
  pendingRequestsCount?: number;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  onSwitchMode,
  isDarkMode = false,
  onToggleTheme,
  recycleBinCount = 0,
  pendingRequestsCount = 0,
  currentUser,
  onLogout,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('rulevision_vision_api_key') || localStorage.getItem('rulevision_gemini_api_key') || ''
      : '';
  });
  const [keySavedToast, setKeySavedToast] = useState(false);
  const hasVisionKey = Boolean(apiKeyInput && apiKeyInput.trim() !== '');

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('rulevision_vision_api_key', apiKeyInput.trim());
      localStorage.setItem('rulevision_gemini_api_key', apiKeyInput.trim());
    } else {
      localStorage.removeItem('rulevision_vision_api_key');
      localStorage.removeItem('rulevision_gemini_api_key');
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setShowAiModal(false);
    }, 1200);
  };

  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Inspector Dashboard', icon: LayoutDashboard },
    { id: 'inspect', label: 'Start Inspection', icon: ScanEye },
    { id: 'batch', label: 'Batch Audit', icon: Layers },
    { id: 'history', label: 'Inspection Records', icon: History },
    { id: 'recycle-bin', label: 'Recycle Bin', icon: Trash2, badge: recycleBinCount },
    { id: 'reports', label: 'Reports & Notices', icon: FileText },
    { id: 'rules', label: 'LM Rules 2011 Guide', icon: Scale }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0a0f1d] text-[#0d1c2e] dark:text-[#f8f9ff] flex flex-col antialiased">
      {/* 1. TOP STATUTORY LEGAL METROLOGY CONTEXT STRIP */}
      <div id="statutory-disclaimer-banner" className="bg-[#eff4ff] dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 text-[11px] px-4 sm:px-6 py-1.5 flex items-center justify-between border-b border-[#dce9ff] dark:border-slate-800 z-50">
        <div className="flex items-center gap-2 max-w-[1600px] mx-auto w-full justify-between">
          <div className="flex items-center gap-2 truncate">
            <Gavel className="w-3.5 h-3.5 text-slate-700 dark:text-emerald-400 shrink-0" />
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate font-semibold">
              Statutory Legal Metrology Enforcement Framework • Legal Metrology (Packaged Commodities) Rules 2011
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest shrink-0 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE AUDIT TRAIL LOGGING (SECTION 36 READY)</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#131b2e] border-b border-[#e2e8f0] dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-4 sm:px-6 max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-4 shrink-0">
            <BrandLogo
              size="md"
              badge={currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'inspector' ? 'Inspector' : 'Officer'}
              showSubtitle={true}
              subtitle="Legal Metrology Compliance System (LM-Rules 6 & 7)"
            />
          </div>

          {/* Center: Desktop Quick Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#eff4ff] dark:bg-slate-800/60 p-1 rounded-xl border border-[#dce9ff] dark:border-slate-700">
            <button
              id="top-nav-inspect"
              onClick={() => onNavigate('inspect')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 'inspect'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white'
              }`}
            >
              New Inspection
            </button>
            <button
              id="top-nav-dashboard"
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              id="top-nav-history"
              onClick={() => onNavigate('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 'history'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white'
              }`}
            >
              Inspection Records
            </button>
            <button
              id="top-nav-reports"
              onClick={() => onNavigate('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 'reports'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white'
              }`}
            >
              Reports & Dossiers
            </button>
            <button
              id="top-nav-rules"
              onClick={() => onNavigate('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 'rules'
                  ? 'bg-white dark:bg-slate-700 text-[#0d1c2e] dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white'
              }`}
            >
              Statutory Guide
            </button>
          </nav>

          {/* Right: Operational Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Inspector Status Pill */}
            <div className="hidden xl:flex items-center gap-2 bg-[#eff4ff] dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-[#dce9ff] dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col text-left leading-tight">
                <span className="font-mono text-[11px] font-bold text-[#0d1c2e] dark:text-white">
                  {currentUser?.inspector_id || 'LM-F-4092'}
                </span>
                <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  System Ready
                </span>
              </div>
            </div>

            {/* Quick Export Trigger */}
            <button
              id="btn-quick-dossier-export"
              type="button"
              onClick={() => onNavigate('reports')}
              className="hidden md:flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Section 36 Dossier</span>
            </button>

            {/* Vision AI Engine Setting */}
            <button
              id="btn-ai-engine-settings"
              type="button"
              onClick={() => setShowAiModal(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                hasVisionKey
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
              title="Configure Vision AI Engine"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline font-mono text-[11px]">
                {hasVisionKey ? 'Vision AI Ready' : 'Vision AI'}
              </span>
            </button>

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                id="sidebar-theme-toggle"
                onClick={onToggleTheme}
                className="p-2 rounded-lg border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            )}

            {/* User Profile Pill / Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1">
                <div
                  className="w-8 h-8 rounded-lg bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs shadow-xs"
                  title={`${currentUser.full_name || currentUser.email} (${currentUser.role})`}
                >
                  <User className="w-4 h-4" />
                </div>
                {onLogout && (
                  <button
                    id="btn-sidebar-logout"
                    onClick={onLogout}
                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 3. MOBILE MENU SLIDEOUT */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-[#101116] border-b border-[#e2e8f0] dark:border-slate-800 px-4 py-3 space-y-1 shadow-md z-30">
          {onSwitchMode && (
            <button
              onClick={() => {
                onSwitchMode();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Switch Mode</span>
            </button>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      )}

      {/* 4. WORKSPACE CONTAINER WITH SIDEBAR */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar (Rv2 / Rv4 inspired) */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#131b2e] border-r border-[#e2e8f0] dark:border-slate-800 p-4 shrink-0 justify-between">
          <div className="flex flex-col gap-4">
            {/* Sidebar Brand Header */}
            <div className="pb-3 border-b border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between">
              <BrandLogo size="sm" showSubtitle={false} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold bg-[#eff4ff] dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[#dce9ff] dark:border-slate-700">
                LM-2011
              </span>
            </div>

            {/* Inspection Session Registry Card */}
            <div className="p-3 bg-[#eff4ff] dark:bg-slate-800/70 rounded-lg border border-[#dce9ff] dark:border-slate-700">
              <div className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                Inspection Session
              </div>
              <div className="font-mono text-sm font-bold text-[#0d1c2e] dark:text-white mt-0.5">
                CASE-2024-LM-0884
              </div>
              <div className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Zone IV Metrology Lab
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#dce9ff] dark:bg-slate-700/80 text-[#0d1c2e] dark:text-white font-bold border-l-2 border-[#0f172a] dark:border-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0f172a] dark:text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Card: Enforcement Node Telemetry */}
          <div className="p-3 bg-[#eff4ff] dark:bg-slate-800/70 rounded-lg border border-[#dce9ff] dark:border-slate-700 flex flex-col gap-1 mt-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                Enforcement Node
              </span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <div className="font-mono text-xs text-[#0d1c2e] dark:text-slate-200 font-semibold">
              Nodal Engine v3.12-PCR
            </div>
            <div className="font-mono text-[10px] text-slate-400 truncate">
              Hash: 9e4f•b218•c30a
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}

          {/* Professional Footer */}
          <footer className="mt-16 pt-6 pb-4 border-t border-[#e2e8f0] dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="xs" showSubtitle={false} />
              <span className="text-slate-400">•</span>
              <span>Legal Metrology (Packaged Commodities) Compliance System</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              LM Act 2009 • GSR 427(E) Gazette Rules 6 &amp; 7 Compliant
            </div>
          </footer>
        </main>
      </div>

      {/* Vision AI Configuration Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white">Vision AI Engine Setup</h3>
                  <p className="font-mono text-[10px] text-slate-500">Legal Metrology Visual Inference</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When an <strong>Image Analysis API Key</strong> is configured, RuleVision scans <strong>any uploaded or captured product photo in real-time</strong> to extract printed declarations under Rules 6 & 7.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Image Analysis API Key:
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter Image Analysis API Key..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
              <p className="font-mono text-[10px] text-slate-400">
                Fallback: RuleVision utilizes the built-in local text extraction engine if no key is entered.
              </p>
            </div>

            {keySavedToast && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>API Key saved successfully! Real-time image analysis active.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {hasVisionKey && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    localStorage.removeItem('rulevision_vision_api_key');
                    localStorage.removeItem('rulevision_gemini_api_key');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
