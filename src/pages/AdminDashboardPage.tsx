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
  Users
} from 'lucide-react';
import { InspectorAccessRequest, UserProfile } from '../types';
import { authService } from '../services/authService';

interface AdminDashboardPageProps {
  currentUser: UserProfile;
}

type FilterStatus = 'ALL' | 'pending' | 'approved' | 'rejected';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<InspectorAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<InspectorAccessRequest | null>(null);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await authService.getInspectorRequests();
      setRequests(data);
    } catch (e) {
      console.error('Failed to load inspector requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async () => {
    if (!selectedRequest) return;
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
      await loadRequests();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to approve request.'
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
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
      await loadRequests();
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Failed to reject request.'
      });
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const term = searchTerm.toLowerCase();
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FF2638]/10 border border-[#FF2638]/30 text-xs font-bold text-[#FF2638] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Inspector Access Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#A5A7B0]">
            Review, verify, and authorize enforcement credentials for Legal Metrology Officers.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#292B34] bg-[#14151B] hover:bg-[#1C1D24] text-white text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-semibold ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
              : 'bg-red-950/70 border border-red-800/80 text-red-300'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#14151B] border border-[#292B34] space-y-1">
          <div className="flex items-center justify-between text-[#A5A7B0]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Applications</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-white">{requests.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#14151B] border border-amber-900/40 space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#14151B] border border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Officers</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{approvedCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#14151B] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected Requests</span>
            <ShieldX className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-300">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="p-4 rounded-xl bg-[#14151B] border border-[#292B34] flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71737E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, department, state..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white text-xs placeholder-[#71737E] focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#FF2638] text-white'
                : 'bg-[#101116] text-[#A5A7B0] hover:text-white border border-[#292B34]'
            }`}
          >
            All ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-[#101116] text-amber-400 hover:text-amber-300 border border-[#292B34]'
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#101116] text-emerald-400 hover:text-emerald-300 border border-[#292B34]'
            }`}
          >
            Approved ({approvedCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-slate-700 text-white'
                : 'bg-[#101116] text-slate-400 hover:text-white border border-[#292B34]'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Requests Table / Card List */}
      <div className="rounded-xl border border-[#292B34] bg-[#14151B] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#A5A7B0] text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#FF2638] mb-2" />
            Loading inspector applications...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-[#A5A7B0] text-xs space-y-2">
            <Filter className="w-8 h-8 mx-auto text-[#71737E]" />
            <p className="font-semibold text-white">No inspector access requests found.</p>
            <p className="text-[11px] text-[#71737E]">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter options.'
                : 'No enforcement applicants have submitted verification requests yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101116] border-b border-[#292B34] text-[#A5A7B0] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Inspector ID / Dept</th>
                  <th className="py-3 px-4">Jurisdiction</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20222B]">
                {filteredRequests.map((req) => {
                  const isSelf = currentUser.id === req.user_id;

                  return (
                    <tr key={req.id} className="hover:bg-[#191A22] transition-colors">
                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{req.full_name}</div>
                        <div className="text-[11px] text-[#A5A7B0]">{req.email}</div>
                      </td>

                      {/* Inspector ID & Dept */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-emerald-400 font-semibold block">
                          {req.inspector_id}
                        </span>
                        <span className="text-[11px] text-[#A5A7B0] block truncate max-w-[200px]">
                          {req.department}
                        </span>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{req.district}</div>
                        <div className="text-[11px] text-[#A5A7B0]">{req.state}</div>
                      </td>

                      {/* Submitted */}
                      <td className="py-3.5 px-4 text-[#A5A7B0] whitespace-nowrap text-[11px]">
                        {new Date(req.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 border border-amber-800/80 text-amber-400">
                            <Clock className="w-2.5 h-2.5" />
                            Pending
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 border border-emerald-800/80 text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                            <XCircle className="w-2.5 h-2.5" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#292B34] bg-[#101116] hover:bg-[#1E202A] text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="View Applicant Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Approve / Reject for Pending */}
                          {req.status === 'pending' && (
                            <>
                              {isSelf ? (
                                <span className="text-[10px] text-slate-500 italic px-1">
                                  Self-approval disallowed
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setShowConfirmModal('approve');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    title="Approve Request"
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
                                    className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    title="Reject Request"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: VIEW DETAILS MODAL */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#20222B] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF2638]" />
                <h2 className="text-base font-bold text-white">
                  Inspector Application Dossier
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="text-[#A5A7B0] hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Applicant Name
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {selectedRequest.full_name}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Official Email
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {selectedRequest.email}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Inspector ID / Badge
                </span>
                <span className="font-mono text-emerald-400 font-semibold block mt-0.5">
                  {selectedRequest.inspector_id}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Department
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {selectedRequest.department}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Jurisdiction
                </span>
                <span className="font-semibold text-white block mt-0.5">
                  {selectedRequest.district}, {selectedRequest.state}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1015] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Current Status
                </span>
                <span className="font-semibold uppercase tracking-wider block mt-0.5 text-amber-400">
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {/* Supporting Document Viewer / Link */}
            <div className="p-3.5 rounded-lg bg-[#0F1015] border border-[#20222B] space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF2638]" />
                Supporting Credential Document
              </span>
              {selectedRequest.supporting_document_path ? (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#A5A7B0] truncate max-w-sm">
                    {selectedRequest.supporting_document_path}
                  </span>
                  <a
                    href={selectedRequest.supporting_document_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1B1C23] border border-[#292B34] text-xs font-semibold text-[#FF2638] hover:text-[#FF4D5E] hover:border-[#FF2638]/50 transition-colors"
                  >
                    <span>Open Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-[#71737E] italic">
                  No supporting credential file was uploaded with this request.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#20222B]">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-[#1E202A] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Close Dossier
              </button>

              {selectedRequest.status === 'pending' && currentUser.id !== selectedRequest.user_id && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal('reject')}
                    className="px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal('approve')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Approve Officer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM APPROVE / REJECT MODAL */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              {showConfirmModal === 'approve' ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {showConfirmModal === 'approve' ? 'Authorize Inspector Role' : 'Reject Inspector Request'}
                </h3>
                <p className="text-xs text-[#A5A7B0]">
                  Target Officer: <strong className="text-white">{selectedRequest.full_name}</strong> ({selectedRequest.inspector_id})
                </p>
              </div>
            </div>

            <p className="text-xs text-[#A5A7B0] leading-relaxed">
              {showConfirmModal === 'approve'
                ? 'This action grants full Legal Metrology Inspector privileges, enabling access to statutory infraction reports, official notice generation, and penalty calculations under the Legal Metrology Act.'
                : 'This action will reject the applicant\'s request for enforcement privileges. The account will remain active as a standard Consumer.'}
            </p>

            {showConfirmModal === 'reject' && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-[#C5C7D0] block">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Inspector ID could not be verified in state roster"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#292B34] bg-[#101116] text-white placeholder-[#71737E] text-xs focus:outline-none focus:border-[#FF2638]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#20222B]">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#292B34] bg-[#101116] hover:bg-[#1E202A] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {showConfirmModal === 'approve' ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading ? 'Granting Role...' : 'Confirm & Authorize'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
