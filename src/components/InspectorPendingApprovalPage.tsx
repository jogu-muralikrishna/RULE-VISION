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
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F7] flex flex-col justify-between selection:bg-[#FF2638] selection:text-white">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#292B34] bg-[#101116]/80 backdrop-blur-md sticky top-0 z-40">
        <BrandLogo
          size="md"
          showSubtitle={true}
          subtitle="AI-Powered Legal Metrology Compliance Inspection"
        />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-[11px] font-semibold text-amber-300">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Verification Pending
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#292B34] bg-[#14151B] text-[#A5A7B0] hover:text-white hover:border-red-500/50 transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Verification Dossier */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full bg-[#14151B] rounded-2xl border border-[#292B34] shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Ambient Amber Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Status Badge & Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Inspector Access Request Submitted</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Application Under Administrative Review
            </h1>

            <p className="text-sm text-[#A5A7B0] leading-relaxed max-w-xl">
              Thank you for registering your enforcement credentials. To maintain statutory integrity under the Legal Metrology Act, all inspector privileges are subject to administrator verification before access is granted.
            </p>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#1A1B22] border border-amber-500/40 text-amber-200 text-xs shadow-md">
              <BadgeAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Submitted Information Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0F1015] border border-[#292B34] space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#20222B]">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF2638]" />
                Submitted Officer Profile
              </span>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                Status: Pending
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Full Name
                </span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {currentUser.full_name || 'Not Provided'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold">
                  Registered Email
                </span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {currentUser.email}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <span>Inspector ID / Badge</span>
                </span>
                <span className="font-semibold text-emerald-400 font-mono tracking-wider block mt-0.5">
                  {currentUser.inspector_id || 'Pending submission'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#A5A7B0]" />
                  <span>Department</span>
                </span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {currentUser.department || 'Department of Legal Metrology'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#A5A7B0]" />
                  <span>Jurisdiction</span>
                </span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {currentUser.district ? `${currentUser.district}, ${currentUser.state}` : (currentUser.state || 'India')}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14151B] border border-[#20222B]">
                <span className="text-[10px] text-[#71737E] uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#A5A7B0]" />
                  <span>Supporting Document</span>
                </span>
                {currentUser.supporting_document_path ? (
                  <a
                    href={currentUser.supporting_document_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#FF2638] hover:text-[#FF4D5E] font-semibold flex items-center gap-1 mt-0.5"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-semibold text-[#71737E] block mt-0.5">
                    None Attached
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Verification Protocol Explainer */}
          <div className="p-4 rounded-xl bg-[#101116] border border-[#292B34] space-y-2 text-xs text-[#A5A7B0]">
            <h2 className="font-bold text-white text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              What happens next?
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1 text-[#8F919E]">
              <li>The Legal Metrology Administrator verifies your department ID against the state enforcement roster.</li>
              <li>Once verified, your account is upgraded to the full <strong className="text-white">Inspector Suite</strong>, enabling official penalty calculations, compounding notice generation, and court-ready dossiers.</li>
              <li>Review typically completes within <strong className="text-white">24-48 business hours</strong>.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#FF2638] hover:bg-[#B51226] text-white text-xs font-bold shadow-lg shadow-[#FF2638]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking Status...' : 'Refresh Status'}
            </button>

            <button
              type="button"
              onClick={onContinueToConsumer}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-[#292B34] bg-[#1B1C23] hover:bg-[#22242D] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Consumer Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#A5A7B0]" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 sm:px-8 border-t border-[#292B34] bg-[#101116]/80 text-center text-xs text-[#A5A7B0] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">RuleVision</span>
          <span>•</span>
          <span>Legal Metrology Verification Service</span>
        </div>
        <div className="text-[11px] text-[#71737E]">
          National Legal Metrology Portal Integration
        </div>
      </footer>
    </div>
  );
};
