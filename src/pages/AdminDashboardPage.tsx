import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  MapPin,
  FileText,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Filter,
  Users,
  Database,
  Download,
  Plus,
  Trash2,
  Layers,
  BarChart3,
  Calendar,
  AlertOctagon,
  Copy,
  Activity,
  Archive,
  RotateCcw,
  Check,
  Sliders,
  FileDown,
  ClipboardList
} from 'lucide-react';
import { InspectorAccessRequest, UserProfile, InspectionRecord, UserRole, AdminAuditLog } from '../types';
import { authService } from '../services/authService';
import { dbService } from '../services/db';
import { auditLogService } from '../services/auditLogService';
import { generateComplianceReportPDF } from '../utils/pdfExport';
import { AdminSection } from '../components/AdminShell';

interface AdminDashboardPageProps {
  currentUser: UserProfile;
  activeSection: AdminSection;
  onNavigateSection: (section: AdminSection) => void;
  onLogout: () => void;
}

type FilterStatus = 'ALL' | 'pending' | 'approved' | 'rejected';
type InspectionStatusFilter = 'ALL' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  activeSection,
  onNavigateSection,
  onLogout
}) => {
  const [loading, setLoading] = useState(true);

  // Inspector Requests State
  const [requests, setRequests] = useState<InspectorAccessRequest[]>([]);
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [inspectorStatusFilter, setInspectorStatusFilter] = useState<FilterStatus>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<InspectorAccessRequest | null>(null);

  // All Inspections in Supabase State
  const [allInspections, setAllInspections] = useState<InspectionRecord[]>([]);
  const [inspectionSearch, setInspectionSearch] = useState('');
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState<InspectionStatusFilter>('ALL');
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);

  // All Users State
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // Supabase Raw Table Explorer State
  const [selectedTable, setSelectedTable] = useState<'inspections' | 'profiles' | 'admin_audit_logs'>('inspections');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedRawRow, setSelectedRawRow] = useState<any | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);

  // Connection & Diagnostics State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success?: boolean;
    latencyMs?: number;
    error?: string;
  }>({ tested: false });
  const [configUrl, setConfigUrl] = useState(() => dbService.getSupabaseConfig().url);
  const [configAnonKey, setConfigAnonKey] = useState(() => dbService.getSupabaseConfig().anonKey);

  // Modals & Action States
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'approve' | 'reject' | 'revoke' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'inspection' | 'user' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load all real Supabase records
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [reqs, inspections, profiles, logs] = await Promise.all([
        authService.getInspectorRequests(),
        dbService.getAllInspections(true),
        authService.getAllProfiles(),
        auditLogService.getAuditLogs()
      ]);

      setRequests(reqs);
      setAllInspections(inspections);
      setAllProfiles(profiles);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Fetch Table Data when exploring
  useEffect(() => {
    if (activeSection === 'system') {
      if (selectedTable === 'admin_audit_logs') {
        auditLogService.getAuditLogs().then(logs => setTableRows(logs));
      } else {
        dbService.fetchRawTable(selectedTable).then((res) => {
          if (res.success) {
            setTableRows(res.data);
          }
        });
      }
    }
  }, [activeSection, selectedTable]);

  // Test Supabase Live Ping
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({ tested: false });
    const res = await dbService.testSupabaseConnection();
    setTestingConnection(false);
    setConnectionStatus({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error
    });
  };

  // Save Supabase Configuration
  const handleSaveConfig = () => {
    const res = dbService.setSupabaseConfig(configUrl, configAnonKey);
    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: 'Database credentials updated. Connection refreshed.'
      });
      handleTestConnection();
      loadAllData();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to save configuration.'
      });
    }
  };

  // Inspector Action: Approve
  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.user_id === currentUser.id) {
      setActionFeedback({ type: 'error', message: 'Action Denied: You cannot approve your own inspector request.' });
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);

    const res = await authService.approveInspectorRequest(selectedRequest.user_id, currentUser.email);
    setActionLoading(false);

    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: `Inspector privileges granted to ${selectedRequest.full_name} (${selectedRequest.inspector_id}).`
      });
      setShowConfirmModal(null);
      setShowDetailsModal(false);
      await loadAllData();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to approve request.'
      });
    }
  };

  // Inspector Action: Reject
  const handleReject = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.user_id === currentUser.id) {
      setActionFeedback({ type: 'error', message: 'Action Denied: You cannot reject your own inspector request.' });
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);

    const res = await authService.rejectInspectorRequest(selectedRequest.user_id, currentUser.email, rejectReason);
    setActionLoading(false);

    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: `Inspector access request for ${selectedRequest.full_name} was rejected.`
      });
      setShowConfirmModal(null);
      setShowDetailsModal(false);
      setRejectReason('');
      await loadAllData();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to reject request.'
      });
    }
  };

  // Inspector Action: Revoke
  const handleRevoke = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setActionFeedback(null);

    const res = await authService.revokeInspectorRequest(selectedRequest.user_id, currentUser.email);
    setActionLoading(false);

    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: `Inspector credentials for ${selectedRequest.full_name} have been revoked.`
      });
      setShowConfirmModal(null);
      setShowDetailsModal(false);
      await loadAllData();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to revoke credentials.'
      });
    }
  };

  // User Role Change Action
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await authService.updateUserProfile(userId, {
      role: newRole,
      inspector_status: newRole === 'inspector' ? 'approved' : 'not_requested'
    });
    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: `User role updated to "${newRole.toUpperCase()}".`
      });
      await loadAllData();
    }
  };

  // Permanent Delete Record with Audit Trail
  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);

    if (deleteTarget.type === 'inspection') {
      const res = await dbService.permanentlyDeleteInspection(deleteTarget.id);
      if (res.success) {
        await auditLogService.logAction({
          action: 'INSPECTION_DELETED',
          admin_id: currentUser.id,
          admin_email: currentUser.email,
          target_id: deleteTarget.id,
          target_type: 'inspection',
          details: { record_code: deleteTarget.name }
        });
        setActionFeedback({ type: 'success', message: `Inspection ${deleteTarget.name} permanently deleted.` });
      } else {
        setActionFeedback({ type: 'error', message: res.error || 'Failed to delete inspection.' });
      }
    } else if (deleteTarget.type === 'user') {
      const res = await authService.deleteUserProfile(deleteTarget.id);
      if (res.success) {
        setActionFeedback({ type: 'success', message: `User ${deleteTarget.name} deleted.` });
      } else {
        setActionFeedback({ type: 'error', message: res.error || 'Failed to delete user.' });
      }
    }

    setActionLoading(false);
    setDeleteTarget(null);
    await loadAllData();
  };

  // Soft Delete / Archive Inspection
  const handleSoftDeleteInspection = async (id: string, code: string) => {
    await dbService.softDeleteInspection(id);
    setActionFeedback({ type: 'success', message: `Inspection ${code} moved to archive (Recycle Bin).` });
    await loadAllData();
  };

  // Restore Inspection
  const handleRestoreInspection = async (id: string, code: string) => {
    await dbService.restoreInspection(id);
    setActionFeedback({ type: 'success', message: `Inspection ${code} restored.` });
    await loadAllData();
  };

  // Copy JSON to Clipboard
  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // ==========================================
  // DYNAMIC COMPUTATIONS (SECTION 5: NO FAKE NUMBERS)
  // ==========================================
  const totalUsers = allProfiles.length;
  const totalConsumers = allProfiles.filter((p) => p.role === 'consumer').length;
  const totalInspectors = allProfiles.filter((p) => p.role === 'inspector').length;
  const pendingInspectorRequests = requests.filter((r) => r.status === 'pending').length;
  const approvedInspectors = requests.filter((r) => r.status === 'approved').length;
  const rejectedInspectors = requests.filter((r) => r.status === 'rejected').length;

  const totalScans = allInspections.length;
  const passScans = allInspections.filter((i) => i.overall_status === 'COMPLIANT').length;
  const failScans = allInspections.filter((i) => i.overall_status === 'NON_COMPLIANT').length;
  const needsReviewScans = allInspections.filter((i) => i.overall_status === 'NEEDS_REVIEW').length;

  // Filtered Inspector Requests
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = inspectorStatusFilter === 'ALL' || req.status === inspectorStatusFilter;
    const term = inspectorSearch.toLowerCase();
    const matchesSearch =
      !term ||
      req.full_name.toLowerCase().includes(term) ||
      req.email.toLowerCase().includes(term) ||
      req.inspector_id.toLowerCase().includes(term) ||
      req.department.toLowerCase().includes(term) ||
      req.state.toLowerCase().includes(term) ||
      req.district.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  // Filtered Inspections
  const filteredInspections = allInspections.filter((insp) => {
    const matchesStatus = inspectionStatusFilter === 'ALL' || insp.overall_status === inspectionStatusFilter;
    const term = inspectionSearch.toLowerCase();
    const matchesSearch =
      !term ||
      insp.inspection_code.toLowerCase().includes(term) ||
      insp.product_name.toLowerCase().includes(term) ||
      (insp.commodity_name && insp.commodity_name.toLowerCase().includes(term)) ||
      (insp.manufacturer_name && insp.manufacturer_name.toLowerCase().includes(term)) ||
      (insp.inspector_name && insp.inspector_name.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  // Filtered Users
  const filteredUsers = allProfiles.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'ALL' ||
      (userStatusFilter === 'pending' && u.inspector_status === 'pending') ||
      (userStatusFilter === 'approved' && u.inspector_status === 'approved') ||
      (userStatusFilter === 'rejected' && u.inspector_status === 'rejected');

    const term = userSearch.toLowerCase();
    const matchesSearch =
      !term ||
      u.email.toLowerCase().includes(term) ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term)) ||
      (u.inspector_id && u.inspector_id.toLowerCase().includes(term));

    return matchesRole && matchesStatus && matchesSearch;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
    const term = auditLogSearch.toLowerCase();
    const matchesSearch =
      !term ||
      log.action.toLowerCase().includes(term) ||
      log.admin_email.toLowerCase().includes(term) ||
      log.target_id.toLowerCase().includes(term) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(term);

    return matchesAction && matchesSearch;
  });

  // Filtered Table Rows
  const filteredTableRows = tableRows.filter((row) => {
    if (!tableSearch) return true;
    return JSON.stringify(row).toLowerCase().includes(tableSearch.toLowerCase());
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          )}
          <span className="flex-1 font-mono text-[11px]">{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          1. DASHBOARD OVERVIEW SECTION (SECTION 5)
      ======================================================== */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 shadow-2xs">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 mb-1.5 uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>System Database Intelligence Hub</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-headline font-bold text-[#0d1c2e] dark:text-white">RuleVision System Overview</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time compliance intelligence calculated directly from active system database records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAllData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0d1c2e] dark:text-white text-xs font-mono font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                <span>Refresh System Data</span>
              </button>
            </div>
          </div>

          {/* Section 5: Top Statistics Grid (All from System Database) */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              User &amp; Officer Authorizations (User Profiles)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Total Users</span>
                <p className="text-2xl font-headline font-bold text-[#0d1c2e] dark:text-white">{totalUsers}</p>
                <span className="text-[10px] text-slate-400">All Registered Accounts</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Total Consumers</span>
                <p className="text-2xl font-headline font-bold text-[#0d1c2e] dark:text-white">{totalConsumers}</p>
                <span className="text-[10px] text-slate-400">Citizen Users</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Inspectors</span>
                <p className="text-2xl font-headline font-bold text-emerald-900 dark:text-emerald-300">{totalInspectors}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Certified Enforcement</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Requests</span>
                <p className="text-2xl font-headline font-bold text-amber-900 dark:text-amber-300">{pendingInspectorRequests}</p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Awaiting Admin Action</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved Officers</span>
                <p className="text-2xl font-headline font-bold text-emerald-900 dark:text-emerald-300">{approvedInspectors}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Verified &amp; Active</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#e2e8f0] dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Rejected Requests</span>
                <p className="text-2xl font-headline font-bold text-slate-700 dark:text-slate-300">{rejectedInspectors}</p>
                <span className="text-[10px] text-slate-400">Declined Applications</span>
              </div>
            </div>
          </div>

          {/* Section 5: Scan Results Statistics (All from system inspections registry) */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inspection &amp; Scan Results (Inspection Registry)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Total Scans</span>
                <p className="text-2xl font-headline font-bold text-[#0d1c2e] dark:text-white">{totalScans}</p>
                <span className="text-[10px] text-slate-400">Recorded Package Scans</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">PASS Scans</span>
                <p className="text-2xl font-headline font-bold text-[#059669] dark:text-emerald-400">{passScans}</p>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80">Fully Compliant Packages</span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700 dark:text-red-400">FAIL Scans</span>
                <p className="text-2xl font-headline font-bold text-[#dc2626] dark:text-red-400">{failScans}</p>
                <span className="text-[10px] text-red-700 dark:text-red-400/80">Violations Identified</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-2xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">NEEDS REVIEW Scans</span>
                <p className="text-2xl font-headline font-bold text-[#d97706] dark:text-amber-400">{needsReviewScans}</p>
                <span className="text-[10px] text-amber-700 dark:text-amber-400/80">Flagged For Officer Audit</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateSection('inspectors')}
              className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 hover:border-[#0f172a] dark:hover:border-blue-400 text-left transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  {pendingInspectorRequests} Pending
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white group-hover:text-blue-600 transition-colors">
                Manage Inspector Approvals →
              </h3>
              <p className="text-xs text-slate-500 mt-1">Review badge IDs, jurisdictions, and authorize enforcement credentials.</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('scans')}
              className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 hover:border-[#0f172a] dark:hover:border-blue-400 text-left transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] font-mono font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  {totalScans} Audits
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white group-hover:text-blue-600 transition-colors">
                Review Stored Scans →
              </h3>
              <p className="text-xs text-slate-500 mt-1">Inspect extracted declarations, statutory Rule 6 findings, and evidence.</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('audit-logs')}
              className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 hover:border-[#0f172a] dark:hover:border-blue-400 text-left transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {auditLogs.length} Records
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white group-hover:text-blue-600 transition-colors">
                View Admin Audit Log →
              </h3>
              <p className="text-xs text-slate-500 mt-1">Audit administrative operations, approvals, and user status adjustments.</p>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. USER MANAGEMENT SECTION (SECTION 6)
      ======================================================== */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, badge ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#0f172a]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700">
                {(['ALL', 'consumer', 'inspector', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                      userRoleFilter === r
                        ? 'bg-[#0f172a] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700">
                {(['ALL', 'pending', 'approved', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUserStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold capitalize transition-colors cursor-pointer ${
                      userStatusFilter === s
                        ? 'bg-[#d97706] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-[#0f172a] dark:text-slate-300 uppercase text-[10px] font-mono font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User ID & Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Role Modifier & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0d1c2e] dark:text-white flex items-center gap-1.5">
                          <span>{u.full_name || 'RuleVision User'}</span>
                          {u.role === 'admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-red-600 text-white">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{u.id}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">{u.email}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                              : u.role === 'inspector'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-800 dark:text-slate-200 font-semibold">{u.inspector_status || 'Active'}</span>
                        {u.inspector_id && (
                          <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{u.inspector_id}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                        {new Date(u.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#cbd5e1] dark:border-slate-700 text-xs text-[#0d1c2e] dark:text-white font-mono focus:outline-none focus:border-[#0f172a] cursor-pointer"
                          >
                            <option value="consumer">Consumer</option>
                            <option value="inspector">Inspector</option>
                            <option value="admin">Admin</option>
                          </select>

                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: u.id, name: u.email, type: 'user' })}
                              className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. INSPECTOR APPROVALS & ROSTER (SECTION 7 & 8)
      ======================================================== */}
      {activeSection === 'inspectors' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inspectorSearch}
                onChange={(e) => setInspectorSearch(e.target.value)}
                placeholder="Search inspector applicant, badge ID, department..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#0f172a]"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700">
              {(['ALL', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInspectorStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold capitalize transition-colors cursor-pointer ${
                    inspectorStatusFilter === st
                      ? st === 'pending'
                        ? 'bg-[#d97706] text-white shadow-2xs'
                        : st === 'approved'
                        ? 'bg-[#059669] text-white shadow-2xs'
                        : 'bg-[#dc2626] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? `All (${requests.length})` : `${st} (${requests.filter((r) => r.status === st).length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-[#0f172a] dark:text-slate-300 uppercase text-[10px] font-mono font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Applicant / Officer Name</th>
                    <th className="py-3 px-4">Inspector Badge & Dept</th>
                    <th className="py-3 px-4">Jurisdiction</th>
                    <th className="py-3 px-4">Request Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0d1c2e] dark:text-white flex items-center gap-1.5">
                          <span>{req.full_name}</span>
                          {req.status === 'approved' && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{req.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold block">{req.inspector_id}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[200px] block">{req.department}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#0d1c2e] dark:text-white font-medium">{req.district}</div>
                        <div className="text-[11px] text-slate-500">{req.state}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                        {new Date(req.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                            <Clock className="w-2.5 h-2.5" />
                            PENDING
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            APPROVED
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                            <XCircle className="w-2.5 h-2.5" />
                            REJECTED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            title="View Applicant Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowConfirmModal('approve');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowConfirmModal('reject');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {req.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowConfirmModal('revoke');
                              }}
                              className="px-2 py-1 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. SCANS & SCREENING RESULTS (SECTION 10 & 11)
      ======================================================== */}
      {activeSection === 'scans' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inspectionSearch}
                onChange={(e) => setInspectionSearch(e.target.value)}
                placeholder="Search scan ID, commodity, manufacturer..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#0f172a]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700">
              {(['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW'] as InspectionStatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInspectionStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    inspectionStatusFilter === st
                      ? st === 'COMPLIANT'
                        ? 'bg-[#059669] text-white shadow-2xs'
                        : st === 'NON_COMPLIANT'
                        ? 'bg-[#dc2626] text-white shadow-2xs'
                        : st === 'NEEDS_REVIEW'
                        ? 'bg-[#d97706] text-white shadow-2xs'
                        : 'bg-[#0f172a] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? `All (${allInspections.length})` : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-[#0f172a] dark:text-slate-300 uppercase text-[10px] font-mono font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Scan ID / Code</th>
                    <th className="py-3 px-4">Product / Commodity</th>
                    <th className="py-3 px-4">Overall Result</th>
                    <th className="py-3 px-4">Pass / Fail / Review</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Data Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredInspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0d1c2e] dark:text-white">
                        <span>{insp.inspection_code}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0d1c2e] dark:text-white">{insp.product_name}</div>
                        <div className="text-[11px] text-slate-500">{insp.commodity_name || 'Pre-Packaged Commodity'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {insp.overall_status === 'COMPLIANT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            PASS
                          </span>
                        )}
                        {insp.overall_status === 'NON_COMPLIANT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-200">
                            <XCircle className="w-2.5 h-2.5" />
                            FAIL ({insp.failed_count || (insp.violations ? insp.violations.length : 0)})
                          </span>
                        )}
                        {insp.overall_status === 'NEEDS_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            NEEDS REVIEW
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{insp.passed_count ?? 0} PASS</span> •{' '}
                        <span className="text-red-700 dark:text-red-400 font-bold">{insp.failed_count ?? 0} FAIL</span> •{' '}
                        <span className="text-amber-700 dark:text-amber-400 font-bold">{insp.review_count ?? 0} REV</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(insp.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInspection(insp)}
                            className="px-2.5 py-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0d1c2e] dark:text-white transition-colors cursor-pointer text-[11px] font-mono font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSoftDeleteInspection(insp.id, insp.inspection_code)}
                            className="p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Archive Scan"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: insp.id, name: insp.inspection_code, type: 'inspection' })}
                            className="p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Scan Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. REPORT MANAGEMENT (SECTION 12)
      ======================================================== */}
      {activeSection === 'reports' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-[#0d1c2e] dark:text-white">Generated Statutory Compliance Reports</h2>
              <p className="text-xs text-slate-500">
                Official PDF dossiers and show cause notices generated from verified inspection records.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-[#0f172a] dark:text-slate-300 uppercase text-[10px] font-mono font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Inspection Reference</th>
                  <th className="py-3 px-4">Commodity / Manufacturer</th>
                  <th className="py-3 px-4">Screening Result</th>
                  <th className="py-3 px-4">Audited Date</th>
                  <th className="py-3 px-4 text-right">Official Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                {allInspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0d1c2e] dark:text-white">
                      <span>{insp.inspection_code}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0d1c2e] dark:text-white">{insp.product_name}</div>
                      <div className="text-[11px] text-slate-500">{insp.manufacturer_name || 'Packer Details on File'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          insp.overall_status === 'COMPLIANT'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : insp.overall_status === 'NON_COMPLIANT'
                            ? 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {insp.overall_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {new Date(insp.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => generateComplianceReportPDF(insp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF Report</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          6. ADMIN AUDIT LOGS (SECTION 13)
      ======================================================== */}
      {activeSection === 'audit-logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditLogSearch}
                onChange={(e) => setAuditLogSearch(e.target.value)}
                placeholder="Search audit actions, admin email, targets..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#0f172a]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">{filteredAuditLogs.length} Traceable Events</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-[#0f172a] dark:text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Target ID / Type</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('APPROVED')
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.action.includes('REJECTED') || log.action.includes('DELETED') || log.action.includes('REVOKED')
                            ? 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#0d1c2e] dark:text-white font-semibold">{log.admin_email}</td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-[#0f172a] dark:text-blue-400">{log.target_type}</span>: {log.target_id || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs">
                      {JSON.stringify(log.details || {})}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          7. SYSTEM DATA (DATABASE EXPLORER)
      ======================================================== */}
      {activeSection === 'system' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#e2e8f0] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#0d1c2e] dark:text-white uppercase">Database Table:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-[#cbd5e1] dark:border-slate-700">
                {(['inspections', 'profiles', 'admin_audit_logs'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold font-mono transition-colors cursor-pointer ${
                      selectedTable === t
                        ? 'bg-[#0f172a] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    public.{t}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search raw fields, UUIDs..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#0f172a]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#cbd5e1] dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden shadow-2xs">
            <div className="px-4 py-2 bg-[#f8f9ff] dark:bg-slate-900 border-b border-[#cbd5e1] dark:border-slate-800 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              Table: public.{selectedTable} • {filteredTableRows.length} rows loaded (Click any row to open Raw JSON)
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#f8f9ff] dark:bg-slate-900 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-[#cbd5e1] dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">id</th>
                    <th className="py-2.5 px-3">Primary Identifier</th>
                    <th className="py-2.5 px-3">Status / Role / Action</th>
                    <th className="py-2.5 px-3">Created At</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredTableRows.map((row, i) => (
                    <tr
                      key={row.id || i}
                      onClick={() => setSelectedRawRow(row)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 text-blue-700 dark:text-blue-400 truncate max-w-[120px] font-bold">{row.id}</td>
                      <td className="py-2.5 px-3 text-[#0d1c2e] dark:text-white">
                        {row.inspection_code || row.email || row.action || 'Record'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {row.overall_status || row.role || row.target_type || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{row.created_at}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Eye className="w-3.5 h-3.5 inline text-slate-500 hover:text-slate-900 dark:hover:text-white" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          8. SETTINGS & DATABASE CONFIG
      ======================================================== */}
      {activeSection === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-[#131b2e] border border-[#cbd5e1] dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-[#0d1c2e] dark:text-white">System Database Settings</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">Database Endpoint URL</label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://database.agency.gov"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs font-mono focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">Public Database API Key</label>
                <input
                  type="password"
                  value={configAnonKey}
                  onChange={(e) => setConfigAnonKey(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs font-mono focus:outline-none focus:border-[#0f172a]"
                />
              </div>
            </div>

            {connectionStatus.tested && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  connectionStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200'
                }`}
              >
                {connectionStatus.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Live database connection active! Round-trip latency: <strong>{connectionStatus.latencyMs} ms</strong>.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Connection failure: {connectionStatus.error}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[#0d1c2e] dark:text-white text-xs font-mono font-semibold cursor-pointer"
              >
                <Activity className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin text-amber-500' : 'text-emerald-600'}`} />
                <span>{testingConnection ? 'Testing Ping...' : 'Test Database Ping'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SCREENING RESULT & SCAN DETAILS (SECTION 11)
      ======================================================== */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white dark:bg-[#131b2e] rounded-xl border border-[#cbd5e1] dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[#0d1c2e] dark:text-white font-mono">
                  Scan Screening Dossier: {selectedInspection.inspection_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 p-2 flex items-center justify-center">
                {selectedInspection.image_url ? (
                  <img
                    src={selectedInspection.image_url}
                    alt={selectedInspection.product_name}
                    className="max-h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-xs text-slate-500 py-12">No image attached</div>
                )}
              </div>

              {/* Extracted Fields (Section 11) */}
              <div className="md:col-span-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Commodity</span>
                  <span className="text-[#0d1c2e] dark:text-white font-semibold">{selectedInspection.product_name}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">MRP</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">{selectedInspection.mrp || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Net Quantity</span>
                  <span className="text-[#0d1c2e] dark:text-white font-mono font-semibold">{selectedInspection.net_quantity || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Packed Date</span>
                  <span className="text-[#0d1c2e] dark:text-white font-semibold">{selectedInspection.manufacturing_or_packing_date || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Expiry / Best Before</span>
                  <span className="text-[#0d1c2e] dark:text-white font-semibold">{selectedInspection.expiry_or_best_before || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Country of Origin</span>
                  <span className="text-[#0d1c2e] dark:text-white font-semibold">{selectedInspection.country_of_origin || 'India'}</span>
                </div>
                <div className="col-span-2 p-2.5 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Manufacturer / Packer</span>
                  <span className="text-[#0d1c2e] dark:text-white font-semibold block">{selectedInspection.manufacturer_name || 'N/A'}</span>
                  <span className="text-[11px] text-slate-500">{selectedInspection.manufacturer_address || ''}</span>
                </div>
              </div>
            </div>

            {/* Individual Rule Compliance Findings (Section 11) */}
            {selectedInspection.compliance_results && selectedInspection.compliance_results.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#0d1c2e] dark:text-white uppercase tracking-wider block">
                  Mandatory Legal Rule Compliance Verdicts:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedInspection.compliance_results.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0d1c2e] dark:text-white font-mono">{r.ruleNumber}: </span>
                        <span className="text-slate-700 dark:text-slate-300">{r.fieldLabel}</span>
                        {r.reason && <p className="text-[11px] text-slate-500 mt-0.5">{r.reason}</p>}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          r.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : r.status === 'FAIL'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : r.status === 'NEEDS_REVIEW'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => generateComplianceReportPDF(selectedInspection)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-mono font-bold cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Official PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="px-4 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RAW JSON INSPECTOR
      ======================================================== */}
      {selectedRawRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] rounded-xl border border-[#cbd5e1] dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#0d1c2e] dark:text-white font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Raw JSON Record (ID: {selectedRawRow.id})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRawRow(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedRawRow, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleCopyJson(selectedRawRow)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-white text-xs font-mono font-semibold"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRawRow(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-mono font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM PERMANENT DELETE (SECTION 14)
      ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#131b2e] rounded-xl border border-red-300 dark:border-red-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0d1c2e] dark:text-white">Confirm Permanent Deletion</h3>
                <p className="text-xs text-slate-500">
                  Target: <strong className="text-[#0d1c2e] dark:text-white font-mono">{deleteTarget.name}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-red-900 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-800/50 leading-relaxed font-mono">
              <strong>Warning:</strong> This will permanently delete this record from the system database. This action is irreversible and will be logged in the Administrator Audit Log.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: INSPECTOR APPROVAL DOSSIER (SECTION 7 & 8)
      ======================================================== */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#131b2e] rounded-xl border border-[#cbd5e1] dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#0d1c2e] dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Inspector Credential Dossier
              </h3>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Full Name</span>
                <span className="font-semibold text-[#0d1c2e] dark:text-white block mt-0.5">{selectedRequest.full_name}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Official Email</span>
                <span className="font-semibold text-[#0d1c2e] dark:text-white block mt-0.5 font-mono">{selectedRequest.email}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Badge ID</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5">{selectedRequest.inspector_id}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Department</span>
                <span className="font-semibold text-[#0d1c2e] dark:text-white block mt-0.5">{selectedRequest.department}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Jurisdiction</span>
                <span className="font-semibold text-[#0d1c2e] dark:text-white block mt-0.5">{selectedRequest.district}, {selectedRequest.state}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Current Status</span>
                <span className="font-semibold uppercase tracking-wider block mt-0.5 font-mono text-amber-700 dark:text-amber-400">{selectedRequest.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9ff] dark:bg-slate-850 border border-[#e2e8f0] dark:border-slate-700 text-xs">
              <span className="font-semibold text-[#0d1c2e] dark:text-white block mb-1">Attached Credential Order / ID Document:</span>
              {selectedRequest.supporting_document_path ? (
                <a
                  href={selectedRequest.supporting_document_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 dark:text-blue-400 underline flex items-center gap-1 mt-1 font-mono text-[11px]"
                >
                  <span>Open Attached Document</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">No document was attached with application.</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-white hover:bg-slate-50"
              >
                Close
              </button>

              {selectedRequest.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal('reject')}
                    className="px-3.5 py-2 rounded-lg bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 text-xs font-mono font-bold shadow-2xs"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal('approve')}
                    className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-xs"
                  >
                    Approve Inspector
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM APPROVE / REJECT / REVOKE
      ======================================================== */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#131b2e] rounded-xl border border-[#cbd5e1] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0d1c2e] dark:text-white">
              {showConfirmModal === 'approve'
                ? 'Authorize Inspector Privileges'
                : showConfirmModal === 'revoke'
                ? 'Revoke Inspector Privileges'
                : 'Reject Inspector Application'}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Target Applicant: <strong className="text-[#0d1c2e] dark:text-white">{selectedRequest.full_name}</strong> ({selectedRequest.inspector_id})
            </p>

            {showConfirmModal === 'reject' && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Inspector badge could not be verified in state roster"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0d1c2e] dark:text-white text-xs focus:outline-none focus:border-[#0f172a]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e2e8f0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-white hover:bg-slate-50"
              >
                Cancel
              </button>

              {showConfirmModal === 'approve' ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-xs"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval'}
                </button>
              ) : showConfirmModal === 'revoke' ? (
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-mono font-bold shadow-xs"
                >
                  {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-mono font-bold shadow-xs"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
