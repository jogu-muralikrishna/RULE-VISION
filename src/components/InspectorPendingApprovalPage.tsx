import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  ArrowRight,
  LogOut,
  Building2,
  MapPin,
  BadgeAlert,
  FileText,
  User,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { BrandLogo } from './BrandLogo';

interface InspectorPendingApprovalPageProps {
  currentUser: UserProfile;
  onStatusUpdated: (updatedUser: UserProfile) => void;
  onContinueToConsumer: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const InspectorPendingApprovalPage: React.FC<InspectorPendingApprovalPageProps> = ({
  currentUser,
  onStatusUpdated,
  onContinueToConsumer,
  onLogout,
  isDarkMode,
  onToggleTheme
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setFeedbackMessage(null);

    try {
      const updated = await authService.fetchUserProfile(currentUser.id, currentUser.email);
      onStatusUpdated(updated);

      if (updated.role === 'inspector' && updated.inspector_status === 'approved') {
        setFeedbackMessage('Congratulations! Your inspector credentials have been approved.');
      } else if (updated.inspector_status === 'rejected') {
        setFeedbackMessage('Your request was reviewed and not approved. You can continue using Consumer features.');
      } else {
        setFeedbackMessage('Status checked: Your application is currently under review by the Administrator.');
      }
    } catch (e: any) {
      setFeedbackMessage('Unable to connect to verification service. Please try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  };

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
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-amber-950/60 border border-amber-700/60 text-[11px] font-mono font-medium text-amber-300">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>CLEARANCE PENDING</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Verification Dossier */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Status Badge & Header */}
          <div className="space-y-2 text-center sm:text-left border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-mono font-bold text-amber-800">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>STATUTORY DOSSIER SUBMITTED • AWAITING CLEARANCE</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Officer Application Under Review
            </h1>

            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Thank you for registering your enforcement credentials. Under the Legal Metrology Act, 2009, all inspector privileges are subject to administrator verification before access is granted.
            </p>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <BadgeAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Submitted Information Card */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                <User className="w-3.5 h-3.5 text-slate-700" />
                Submitted Officer Profile
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                STATUS: PENDING VERIFICATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                  Full Name
                </span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5">
                  {currentUser.full_name || 'Not Provided'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                  Registered Email
                </span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5 font-mono">
                  {currentUser.email}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                  Inspector ID / Badge
                </span>
                <span className="font-semibold text-slate-900 font-mono tracking-wider block mt-0.5">
                  {currentUser.inspector_id || 'Pending submission'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span>Department</span>
                </span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5">
                  {currentUser.department || 'Department of Legal Metrology'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Jurisdiction</span>
                </span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5">
                  {currentUser.district ? `${currentUser.district}, ${currentUser.state}` : (currentUser.state || 'India')}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>Supporting Document</span>
                </span>
                {currentUser.supporting_document_path ? (
                  <a
                    href={currentUser.supporting_document_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-800 hover:text-slate-950 font-semibold flex items-center gap-1 mt-0.5 underline"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-semibold text-slate-400 block mt-0.5 font-mono text-[11px]">
                    None Attached
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Verification Protocol Explainer */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
            <h2 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-display">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              What happens next?
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1 text-slate-500">
              <li>The Legal Metrology Administrator verifies your department ID against the state enforcement roster.</li>
              <li>Once verified, your account is upgraded to the full <strong className="text-slate-800">Inspector Enforcement Suite</strong>.</li>
              <li>Verification is typically reviewed within <strong className="text-slate-800 font-mono">24-48 business hours</strong>.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking Status...' : 'Refresh Status'}
            </button>

            <button
              type="button"
              onClick={onContinueToConsumer}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Continue to Consumer Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 sm:px-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 font-display">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Verification Service</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          DIRECTORATE OF LEGAL METROLOGY • VERIFICATION DESK
        </div>
      </footer>
    </div>
  );
};
