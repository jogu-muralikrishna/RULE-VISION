import React, { useState, useEffect } from 'react';
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
  UserCheck
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
    return typeof localStorage !== 'undefined' ? localStorage.getItem('rulevision_gemini_api_key') || '' : '';
  });
  const [keySavedToast, setKeySavedToast] = useState(false);
  const hasGeminiKey = Boolean(apiKeyInput && apiKeyInput.trim() !== '');

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('rulevision_gemini_api_key', apiKeyInput.trim());
    } else {
      localStorage.removeItem('rulevision_gemini_api_key');
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setShowAiModal(false);
    }, 1200);
  };

  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inspect', label: 'Inspect Product', icon: ScanEye },
    { id: 'batch', label: 'Batch Audit', icon: Layers },
    { id: 'history', label: 'Inspection History', icon: History },
    { id: 'recycle-bin', label: 'Recycle Bin', icon: Trash2, badge: recycleBinCount },
    { id: 'reports', label: 'Reports & Notices', icon: FileText },
    { id: 'rules', label: 'Compliance Rules', icon: Scale },
    ...(currentUser?.role === 'admin'
      ? [{ id: 'admin-requests' as PageId, label: 'Inspector Requests', icon: UserCheck, badge: pendingRequestsCount }]
      : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] flex flex-col antialiased transition-colors duration-200">
      {/* Statutory Disclaimer Banner - Non-intrusive, clear */}
      <div id="statutory-disclaimer-banner" className="bg-slate-900 dark:bg-[#08090C] text-slate-300 dark:text-[#A5A7B0] text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800 dark:border-[#292B34]">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Info className="w-3.5 h-3.5 text-[#FF2638] shrink-0" />
          <span className="truncate">
            <strong className="text-white font-semibold">Statutory Notice:</strong> RuleVision is an AI-assisted screening tool. Final legal determination must be made by an authorized Legal Metrology officer under applicable rules.
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#101116] border-r border-slate-200 dark:border-[#292B34] p-4 shrink-0 shadow-xs">
          {/* Brand Header */}
          <div className="px-2 py-3 mb-4 border-b border-slate-100 dark:border-[#292B34]">
            <BrandLogo
              size="md"
              badge={currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'inspector' ? 'Inspector' : 'Citizen'}
              showSubtitle={true}
              subtitle="Legal Metrology Screening"
            />
          </div>

          {/* Mode switch & theme toggles */}
          <div className="flex items-center gap-2 mb-4 px-1">
            {onSwitchMode && (
              <button
                id="sidebar-switch-mode"
                onClick={onSwitchMode}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#292B34] bg-white dark:bg-[#1B1C23] hover:bg-slate-100 dark:hover:bg-[#14151B] text-slate-700 dark:text-[#F5F5F7] hover:border-[#FF2638]/40 transition-colors shadow-2xs cursor-pointer"
                title="Return to mode selection screen"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#FF2638]" />
                <span>Switch Mode</span>
              </button>
            )}
            {onToggleTheme && (
              <button
                id="sidebar-theme-toggle"
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#292B34] bg-white dark:bg-[#1B1C23] text-slate-700 dark:text-[#F5F5F7] hover:bg-slate-100 dark:hover:bg-[#14151B] transition-colors shadow-2xs text-xs font-medium cursor-pointer"
                title={isDarkMode ? 'Switch to White Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden lg:inline text-[11px]">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span className="hidden lg:inline text-[11px]">Dark</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-[#FF2638] text-white shadow-md shadow-[#FF2638]/20'
                      : 'text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1B1C23]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-[#71737E]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Settings Link */}
            <button
              id="nav-link-settings"
              onClick={() => setShowAiModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all text-left"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Settings</span>
              </div>
            </button>

            {/* Logout Link */}
            {onLogout && (
              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </div>
              </button>
            )}
          </nav>

          {/* User Profile Info Pill */}
          {currentUser && (
            <div className="py-2.5 px-3 mb-2 rounded-xl bg-slate-50 dark:bg-[#1B1C23] border border-slate-200 dark:border-[#292B34] text-[11px] flex items-center justify-between">
              <span className="truncate max-w-[130px] font-semibold text-slate-700 dark:text-[#F5F5F7]">
                {currentUser.email}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-[#101116] text-slate-800 dark:text-[#FF2638] border border-transparent dark:border-[#FF2638]/30">
                {currentUser.role}
              </span>
            </div>
          )}
          {/* Vision AI Engine Status / Config Pill */}
          <div className="pt-4 mt-auto border-t border-slate-100 dark:border-[#292B34]">
            <button
              id="btn-ai-engine-settings"
              type="button"
              onClick={() => setShowAiModal(true)}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-[#292B34] hover:border-[#FF2638]/50 bg-slate-50 dark:bg-[#1B1C23] transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A5A7B0] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF2638]" />
                  Vision AI Engine
                </span>
                <span className={`w-2 h-2 rounded-full ${hasGeminiKey ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-[#FF2638] animate-pulse shadow-[0_0_8px_#FF2638]'}`} />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-[#F5F5F7] truncate">
                {hasGeminiKey ? 'Gemini 2.5 Flash' : 'Dynamic Vision AI'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#A5A7B0] mt-0.5 flex items-center justify-between">
                <span>{hasGeminiKey ? 'Real-time Multimodal' : 'Perceptual Intelligence'}</span>
                <span className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-[#FF2638] text-[10px] font-semibold underline">
                  Setup
                </span>
              </div>
            </button>
          </div>
        </aside>

        {/* Mobile Top Header */}
        <header className="md:hidden bg-white dark:bg-[#101116] border-b border-slate-200 dark:border-[#292B34] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <BrandLogo
            size="sm"
            badge={currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'inspector' ? 'Inspector' : 'Citizen'}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1 text-slate-700 dark:text-slate-200"
              title="Vision AI Configuration"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold">{hasGeminiKey ? 'AI Online' : 'AI Setup'}</span>
            </button>
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
                aria-label="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1 shadow-lg z-30">
            {onSwitchMode && (
              <button
                onClick={() => {
                  onSwitchMode();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Switch Mode</span>
              </button>
            )}

            {navItems.map(item => {
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => {
                setShowAiModal(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-y-auto flex flex-col justify-between">
          <div>
            {children}
          </div>
          <footer className="pt-12 pb-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800 mt-12">
            <p className="font-semibold text-slate-600 dark:text-slate-400">RuleVision</p>
            <p className="text-[11px] mt-0.5">
              AI-Powered Legal Metrology Compliance Inspection Platform
            </p>
          </footer>
        </main>
      </div>

      {/* Vision AI Configuration Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Vision AI Engine Setup</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Google Gemini Multimodal Vision AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When a <strong>Google Gemini API Key</strong> is configured, RuleVision scans <strong>any uploaded or captured product photo in real-time</strong> and reads the actual printed declarations (MRP, Net Qty, Dates, FSSAI).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Gemini API Key (Optional):
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                If left blank, RuleVision automatically uses the <strong>Perceptual Dynamic Packaging Intelligence Engine</strong> to classify each photo with customized, distinct declarations.
              </p>
            </div>

            {keySavedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>API Key saved successfully! Real-time Vision AI active.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {hasGeminiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    localStorage.removeItem('rulevision_gemini_api_key');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold transition-all shadow-xs"
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

