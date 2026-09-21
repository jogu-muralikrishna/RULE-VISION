import React, { useState, useEffect, useCallback } from 'react';
import { AppShell, PageId } from './components/AppShell';
import { AuthScreen } from './components/AuthScreen';
import { InspectorPendingApprovalPage } from './components/InspectorPendingApprovalPage';
import { ConsumerQuickCheckPage } from './pages/ConsumerQuickCheckPage';
import { DashboardPage } from './pages/DashboardPage';
import { InspectProductPage } from './pages/InspectProductPage';
import { BatchAuditPage } from './pages/BatchAuditPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { RulesConfigPage } from './pages/RulesConfigPage';
import { RecycleBinPage } from './pages/RecycleBinPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { InspectionRecord, UserProfile } from './types';
import { dbService } from './services/db';
import { authService } from './services/authService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rulevision_theme') === 'dark';
  });

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [deletedInspections, setDeletedInspections] = useState<InspectionRecord[]>([]);
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [consumerModeOverride, setConsumerModeOverride] = useState<boolean>(false);

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

  // Load pending inspector requests count for admins
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      authService.getInspectorRequests().then(reqs => {
        setPendingRequestsCount(reqs.filter(r => r.status === 'pending').length);
      }).catch(err => console.warn('Could not count pending requests:', err));
    }
  }, [currentUser, currentPage]);

  // Load active and deleted inspections for inspector or admin
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
    // Load full inspection database if user has inspector or admin role
    if (currentUser?.role === 'inspector' || currentUser?.role === 'admin') {
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

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setActiveInspection(null);
    setInspections([]);
    setDeletedInspections([]);
    setConsumerModeOverride(false);
  };

  // 1. FIRST SCREEN: LOGIN / AUTH SCREEN
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setConsumerModeOverride(false);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // 2. PENDING INSPECTOR SCREEN: Show dedicated status dossier unless user clicked continue to consumer
  if (currentUser.inspector_status === 'pending' && !consumerModeOverride) {
    return (
      <InspectorPendingApprovalPage
        currentUser={currentUser}
        onStatusUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        onContinueToConsumer={() => setConsumerModeOverride(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // 3. CONSUMER DASHBOARD (Citizen experience with saved real-time inspections)
  // Shown for consumer role or when pending inspector chooses to continue to consumer view
  if (currentUser.role === 'consumer') {
    return (
      <ConsumerQuickCheckPage
        currentUser={currentUser}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onViewPendingStatus={() => setConsumerModeOverride(false)}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          setConsumerModeOverride(false);
        }}
      />
    );
  }

  // 4. INSPECTOR & ADMIN DASHBOARD & SUITE
  return (
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

      {currentPage === 'admin-requests' && (
        <AdminDashboardPage currentUser={currentUser} />
      )}
    </AppShell>
  );
}

