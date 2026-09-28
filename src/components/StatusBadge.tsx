import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { ComplianceStatus, OverallComplianceStatus } from '../types';

interface StatusBadgeProps {
  status: ComplianceStatus | OverallComplianceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  let bg = 'bg-[#f1f5f9] dark:bg-slate-800';
  let text = 'text-[#475569] dark:text-slate-300';
  let border = 'border-[#cbd5e1] dark:border-slate-700';
  let label = status;
  let IconComponent = AlertTriangle;

  switch (status) {
    case 'PASS':
    case 'COMPLIANT':
      bg = 'bg-[#ecfdf5] dark:bg-emerald-950/40';
      text = 'text-[#059669] dark:text-emerald-400';
      border = 'border-[#a7f3d0] dark:border-emerald-800';
      label = status === 'PASS' ? 'COMPLIANT' : 'COMPLIANT';
      IconComponent = CheckCircle2;
      break;

    case 'FAIL':
    case 'NON_COMPLIANT':
      bg = 'bg-[#fef2f2] dark:bg-red-950/40';
      text = 'text-[#dc2626] dark:text-red-400';
      border = 'border-[#fecaca] dark:border-red-800';
      label = status === 'FAIL' ? 'VIOLATION' : 'NON-COMPLIANT';
      IconComponent = XCircle;
      break;

    case 'NEEDS_REVIEW':
      bg = 'bg-[#fffbeb] dark:bg-amber-950/40';
      text = 'text-[#d97706] dark:text-amber-400';
      border = 'border-[#fde68a] dark:border-amber-800';
      label = 'NEEDS REVIEW';
      IconComponent = AlertTriangle;
      break;

    case 'NOT_APPLICABLE':
      bg = 'bg-[#f1f5f9] dark:bg-slate-800';
      text = 'text-[#475569] dark:text-slate-300';
      border = 'border-[#cbd5e1] dark:border-slate-700';
      label = 'NOT APPLICABLE';
      IconComponent = HelpCircle;
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 rounded',
    md: 'text-[11px] px-2.5 py-1 gap-1.5 font-bold rounded',
    lg: 'text-xs px-3.5 py-1.5 gap-2 font-bold tracking-wider rounded-md'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={`inline-flex items-center border font-mono uppercase tracking-wider ${bg} ${text} ${border} ${sizeClasses[size]} shrink-0 transition-colors shadow-2xs`}
    >
      {showIcon && <IconComponent className={`${iconSizes[size]} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
