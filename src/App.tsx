import React, { useState, useEffect, useCallback } from 'react';
import { AppShell, PageId } from './components/AppShell';
import { AdminShell, AdminSection } from './components/AdminShell';
import { AuthScreen } from './components/AuthScreen';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { InspectorPendingApprovalPage } from './components/InspectorPendingApprovalPage';
import { ConsumerQuickCheckPage } from './pages/ConsumerQuickCheckPage';
import { DashboardPage } from './pages/DashboardPage';
import { InspectProductPage } from './pages/InspectProductPage';
import { BatchAuditPage } from './pages/BatchAuditPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { RulesConfigPage } from './pages/RulesConfigPage';
import { RecycleBinPage } from './pages/RecycleBinPage';
import { InspectionRecord, UserProfile } from './types';
import { dbService } from './services/db';
import { authService } from './services/authService';
import { ShieldAlert, X } from 'lucide-react';

const VALID_ADMIN_SECTIONS: AdminSection[] = [
  'dashboard',
  'users',
  'inspectors',
  'scans',
  'reports',
  'audit-logs',
  'system',
  'settings'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rulevision_theme') === 'dark';
  });

  // HTML5 History Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [adminSection, setAdminSection] = useState<AdminSection>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path.startsWith('/admin/')) {
        const sub = path.replace('/admin/', '').split('/')[0] as AdminSection;
        if (VALID_ADMIN_SECTIONS.includes(sub)) {
          return sub;
        }
      }
    }
    return 'dashboard';
  });

  // Access Control & Security Notice
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Inspector Shell State
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [deletedInspections, setDeletedInspections] = useState<InspectionRecord[]>([]);
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [consumerModeOverride, setConsumerModeOverride] = useState<boolean>(false);

  // Navigate helper with History pushState
  const navigateTo = useCallback((newPath: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }
    setCurrentPath(newPath);
  }, []);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (path.startsWith('/admin/')) {
        const sub = path.replace('/admin/', '').split('/')[0] as AdminSection;
        if (VALID_ADMIN_SECTIONS.includes(sub)) {
          setAdminSection(sub);
        }
      } else if (path === '/admin') {
        setAdminSection('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync theme with HTML root class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rulevision_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rulevision_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Initialize auth session on mount
  useEffect(() => {
    authService.initSession().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    }).catch(err => {
      console.warn('Auth session initialization notice:', err);
    });
  }, []);

  // Role-based Access Control and Route Guarding
  useEffect(() => {
    if (!currentUser) {
      // Unauthenticated: allow /admin/login or render AdminLoginPage on /admin/*
      return;
    }

    if (currentUser.role === 'admin') {
      // Admin is restricted to system data management (NO scanning or inspector workflows)
      if (currentPath.startsWith('/consumer') || currentPath.startsWith('/inspector')) {
        setAccessDeniedMessage('Administrators manage system data only and do not have scanning or field inspection tools.');
        navigateTo('/admin');
      } else if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
        navigateTo('/admin');
      }
    } else if (currentUser.role === 'consumer') {
      // Consumer trying to access admin or inspector routes
      if (currentPath.startsWith('/admin')) {
        setAccessDeniedMessage('Access Denied: Administrative privileges required. Consumers cannot access the Admin Console.');
        navigateTo('/consumer');
      } else if (currentPath.startsWith('/inspector')) {
        setAccessDeniedMessage('Access Denied: Official inspector authorization required.');
        navigateTo('/consumer');
      } else if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
        navigateTo('/consumer');
      }
    } else if (currentUser.role === 'inspector') {
      // Inspector trying to access admin routes
      if (currentPath.startsWith('/admin')) {
        setAccessDeniedMessage('Access Denied: Administrative privileges required. Inspectors cannot access the Admin Console.');
        navigateTo('/inspector');
      } else if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
        navigateTo('/inspector');
      }
    }
  }, [currentUser, currentPath, navigateTo]);

  // Load pending inspector requests count for admins
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      authService.getInspectorRequests().then(reqs => {
        setPendingRequestsCount(reqs.filter(r => r.status === 'pending').length);
      }).catch(err => console.warn('Could not count pending requests:', err));
    }
  }, [currentUser, adminSection]);

  // Load active and deleted inspections for inspector
  const loadData = useCallback(async () => {
    try {
      const [activeRecords, deletedRecords] = await Promise.all([
        dbService.getAllInspections(false),
        dbService.getDeletedInspections()
      ]);
      setInspections(activeRecords);
      setDeletedInspections(deletedRecords);
    } catch (e) {
      console.error('Failed to load inspections:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'inspector') {
      loadData();
    }
  }, [currentUser, loadData]);

  const handleNavigate = (page: PageId) => {
    if (page === 'inspect') {
      setActiveInspection(null);
    }
    setCurrentPage(page);
  };

  const handleSelectInspection = (inspection: InspectionRecord) => {
    setActiveInspection(inspection);
    setCurrentPage('inspect');
  };

  const handleViewReport = (inspection: InspectionRecord) => {
    setActiveInspection(inspection);
    setCurrentPage('reports');
  };

  const handleInspectionCompleted = (newRecord: InspectionRecord) => {
    setActiveInspection(newRecord);
    setInspections(prev => [newRecord, ...prev.filter(r => r.id !== newRecord.id)]);
  };

  // Recycle Bin: Soft Delete
  const handleSoftDelete = async (id: string) => {
    await dbService.softDeleteInspection(id);
    const target = inspections.find(i => i.id === id);
    if (target) {
      const updatedTarget: InspectionRecord = {
        ...target,
        is_deleted: true,
        deleted_at: new Date().toISOString()
      };
      setInspections(prev => prev.filter(i => i.id !== id));
      setDeletedInspections(prev => [updatedTarget, ...prev.filter(i => i.id !== id)]);
    } else {
      await loadData();
    }
  };

  // Recycle Bin: Restore
  const handleRestore = async (id: string) => {
    await dbService.restoreInspection(id);
    const target = deletedInspections.find(i => i.id === id);
    if (target) {
      const restoredTarget: InspectionRecord = {
        ...target,
        is_deleted: false,
        deleted_at: null
      };
      setDeletedInspections(prev => prev.filter(i => i.id !== id));
      setInspections(prev => [restoredTarget, ...prev.filter(i => i.id !== id)]);
    } else {
      await loadData();
    }
  };

  // Recycle Bin: Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    await dbService.permanentlyDeleteInspection(id);
    setDeletedInspections(prev => prev.filter(i => i.id !== id));
  };

  // Secure Logout (Requirement 21)
  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setActiveInspection(null);
    setInspections([]);
    setDeletedInspections([]);
    setConsumerModeOverride(false);
    setAccessDeniedMessage(null);
    // Overwrite history to prevent back navigation from accessing protected admin views
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/login');
    }
    setCurrentPath('/login');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setConsumerModeOverride(false);
    setAccessDeniedMessage(null);

    if (user.role === 'admin') {
      navigateTo('/admin');
    } else if (user.role === 'inspector') {
      if (user.inspector_status === 'approved') {
        navigateTo('/inspector');
      } else if (user.inspector_status === 'rejected') {
        navigateTo('/consumer');
      } else {
        navigateTo('/inspector');
      }
    } else {
      navigateTo('/consumer');
    }
  };

  // ========================================================
  // 1. UNAUTHENTICATED STATE: LOGIN & AUTH ROUTING
  // ========================================================
  if (!currentUser) {
    if (currentPath === '/admin/login' || currentPath.startsWith('/admin')) {
      return (
        <AdminLoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackToMainLogin={() => navigateTo('/login')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      );
    }

    return (
      <AuthScreen
        initialMode={currentPath === '/signup' ? 'signup' : 'login'}
        onLoginSuccess={handleLoginSuccess}
        onNavigateToAdminLogin={() => navigateTo('/admin/login')}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ========================================================
  // 2. ADMIN ROLE: DEDICATED ADMIN PANEL ONLY (NO SCANNER)
  // ========================================================
  if (currentUser.role === 'admin') {
    return (
      <AdminShell
        currentSection={adminSection}
        onNavigateSection={(sec) => {
          setAdminSection(sec);
          navigateTo(`/admin/${sec}`);
        }}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        pendingRequestsCount={pendingRequestsCount}
      >
        {accessDeniedMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{accessDeniedMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccessDeniedMessage(null)}
              className="text-amber-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <AdminDashboardPage
          currentUser={currentUser}
          activeSection={adminSection}
          onNavigateSection={(sec) => {
            setAdminSection(sec);
            navigateTo(`/admin/${sec}`);
          }}
          onLogout={handleLogout}
        />
      </AdminShell>
    );
  }

  // ========================================================
  // 3. PENDING INSPECTOR SCREEN: Dossier View
  // ========================================================
  if (currentUser.inspector_status === 'pending' && !consumerModeOverride) {
    return (
      <InspectorPendingApprovalPage
        currentUser={currentUser}
        onStatusUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        onContinueToConsumer={() => {
          setConsumerModeOverride(true);
          navigateTo('/consumer');
        }}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ========================================================
  // 4. CONSUMER ROLE: CITIZEN SCANNING QUICK CHECK
  // ========================================================
  if (currentUser.role === 'consumer' || (currentUser.inspector_status === 'rejected') || consumerModeOverride) {
    return (
      <>
        {accessDeniedMessage && (
          <div className="bg-red-950 text-red-200 border-b border-red-800 px-4 py-2.5 text-xs flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{accessDeniedMessage}</span>
              <button
                type="button"
                onClick={() => setAccessDeniedMessage(null)}
                className="ml-auto text-red-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <ConsumerQuickCheckPage
          currentUser={currentUser}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onViewPendingStatus={() => {
            setConsumerModeOverride(false);
            navigateTo('/inspector');
          }}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            setConsumerModeOverride(false);
          }}
        />
      </>
    );
  }

  // ========================================================
  // 5. APPROVED INSPECTOR: FULL ENFORCEMENT AUDIT SUITE
  // ========================================================
  return (
    <>
      {accessDeniedMessage && (
        <div className="bg-red-950 text-red-200 border-b border-red-800 px-4 py-2.5 text-xs flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">{accessDeniedMessage}</span>
            <button
              type="button"
              onClick={() => setAccessDeniedMessage(null)}
              className="ml-auto text-red-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <AppShell
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        recycleBinCount={deletedInspections.length}
        pendingRequestsCount={pendingRequestsCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {currentPage === 'dashboard' && (
          <DashboardPage
            inspections={inspections}
            onNavigate={handleNavigate}
            onSelectInspection={handleSelectInspection}
          />
        )}

        {currentPage === 'inspect' && (
          <InspectProductPage
            currentInspection={activeInspection}
            onInspectionCompleted={handleInspectionCompleted}
            onViewReport={handleViewReport}
            currentUser={currentUser}
          />
        )}

        {currentPage === 'batch' && (
          <BatchAuditPage onSelectInspection={handleSelectInspection} />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            inspections={inspections}
            onSelectInspection={handleSelectInspection}
            onSoftDelete={handleSoftDelete}
          />
        )}

        {currentPage === 'recycle-bin' && (
          <RecycleBinPage
            deletedInspections={deletedInspections}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onNavigateToHistory={() => setCurrentPage('history')}
          />
        )}

        {currentPage === 'reports' && (
          <ReportsPage
            inspections={inspections}
            selectedInspection={activeInspection}
            onSelectInspection={(record) => setActiveInspection(record)}
          />
        )}

        {currentPage === 'rules' && <RulesConfigPage />}
      </AppShell>
    </>
  );
}
