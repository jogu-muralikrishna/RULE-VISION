import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Layers,
  FileText,
  ClipboardList,
  Database,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  User
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'inspectors'
  | 'scans'
  | 'reports'
  | 'audit-logs'
  | 'system'
  | 'settings';

interface AdminShellProps {
  currentSection: AdminSection;
  onNavigateSection: (section: AdminSection) => void;
  currentUser: UserProfile;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  pendingRequestsCount?: number;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  currentSection,
  onNavigateSection,
  currentUser,
  isDarkMode,
  onToggleTheme,
  onLogout,
  pendingRequestsCount = 0,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: {
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Administration Console', icon: LayoutDashboard },
    { id: 'inspectors', label: 'Officer Authorizations', icon: UserCheck, badge: pendingRequestsCount },
    { id: 'users', label: 'Registered Directory', icon: Users },
    { id: 'scans', label: 'Inspection Audit Register', icon: Layers },
    { id: 'reports', label: 'Statutory Reports', icon: FileText },
    { id: 'audit-logs', label: 'Security Audit Trail', icon: ClipboardList },
    { id: 'system', label: 'Database & Schemas', icon: Database },
    { id: 'settings', label: 'System Configuration', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0a0f1d] text-[#0d1c2e] dark:text-[#f8f9ff] flex flex-col antialiased">
      {/* 1. TOP STATUTORY BAR */}
      <div className="bg-[#eff4ff] dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 text-[11px] px-4 sm:px-6 py-1.5 flex items-center justify-between border-b border-[#dce9ff] dark:border-slate-800 z-50">
        <div className="flex items-center gap-2 max-w-[1680px] mx-auto w-full justify-between">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700 dark:text-emerald-400 shrink-0" />
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate font-semibold">
              RuleVision Master Administration Console • State &amp; Federal Metrology Directorate
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest shrink-0 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SECURE AUTHORITY NODE: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#131b2e] border-b border-[#e2e8f0] dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-4 sm:px-6 max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <BrandLogo
              size="md"
              badge="ADMIN"
              showSubtitle={true}
              subtitle="System Administration & Verification Portal"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-[#eff4ff] dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-[#dce9ff] dark:border-slate-700 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[#0d1c2e] dark:text-white truncate max-w-[160px]">
                {currentUser.email}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#0f172a] text-white text-[10px] font-bold uppercase">
                Admin
              </span>
            </div>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg border border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            )}

            {onLogout && (
              <button
                id="btn-admin-logout"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-mono font-bold transition-colors cursor-pointer"
                title="Sign Out of Master Admin Console"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 3. MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-[#101116] border-b border-[#e2e8f0] dark:border-slate-800 px-4 py-3 space-y-1 shadow-md z-30">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigateSection(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. WORKSPACE CONTAINER */}
      <div className="flex-1 flex max-w-[1680px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#131b2e] border-r border-[#e2e8f0] dark:border-slate-800 p-4 shrink-0 justify-between">
          <div className="flex flex-col gap-4">
            {/* Sidebar Brand Header */}
            <div className="pb-3 border-b border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between">
              <BrandLogo size="sm" badge="ADMIN" showSubtitle={false} />
            </div>

            <div className="p-3 bg-[#eff4ff] dark:bg-slate-800/70 rounded-lg border border-[#dce9ff] dark:border-slate-700">
              <div className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                System Context
              </div>
              <div className="font-mono text-sm font-bold text-[#0d1c2e] dark:text-white mt-0.5 truncate">
                Central Directorate
              </div>
              <div className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Full Regulatory Authority
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`admin-nav-${item.id}`}
                    onClick={() => onNavigateSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#dce9ff] dark:bg-slate-700/80 text-[#0d1c2e] dark:text-white font-bold border-l-2 border-[#0f172a] dark:border-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0d1c2e] dark:hover:text-white hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0f172a] dark:text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 bg-[#eff4ff] dark:bg-slate-800/70 rounded-lg border border-[#dce9ff] dark:border-slate-700 flex flex-col gap-1 mt-6 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="uppercase text-slate-500 font-bold">Admin Authority</span>
              <span className="text-emerald-600 font-bold">VERIFIED</span>
            </div>
            <div className="text-slate-600 truncate">
              {currentUser.email}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}

          {/* Professional Admin Footer */}
          <footer className="mt-16 pt-6 pb-4 border-t border-[#e2e8f0] dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="xs" showSubtitle={false} />
              <span className="text-slate-400">•</span>
              <span>Master Administration &amp; Regulatory Verification Portal</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Legal Metrology Act, 2009 &amp; PCR 2011 Administrative Directorate
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
