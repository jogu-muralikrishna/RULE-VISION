import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ComplianceStatus, OverallComplianceStatus } from '../types';

interface StatusBadgeProps {
  status: ComplianceStatus | OverallComplianceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  let bg = 'bg-slate-100';
  let text = 'text-slate-800';
  let border = 'border-slate-200';
  let label = status;
  let IconComponent = AlertTriangle;

  switch (status) {
    case 'PASS':
    case 'COMPLIANT':
      bg = 'bg-emerald-50';
      text = 'text-emerald-800';
      border = 'border-emerald-200';
      label = status === 'PASS' ? 'PASS' : 'COMPLIANT';
      IconComponent = CheckCircle2;
      break;

    case 'FAIL':
    case 'NON_COMPLIANT':
      bg = 'bg-red-50';
      text = 'text-red-800';
      border = 'border-red-200';
      label = status === 'FAIL' ? 'FAIL' : 'NON-COMPLIANT';
      IconComponent = XCircle;
      break;

    case 'NEEDS_REVIEW':
      bg = 'bg-amber-50';
      text = 'text-amber-850';
      border = 'border-amber-300';
      label = 'NEEDS REVIEW';
      IconComponent = AlertTriangle;
      break;

    case 'NOT_APPLICABLE':
      bg = 'bg-slate-100';
      text = 'text-slate-700';
      border = 'border-slate-300';
      label = 'NOT APPLICABLE';
      IconComponent = AlertTriangle;
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold tracking-wide'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border ${bg} ${text} ${border} ${sizeClasses[size]} shrink-0 transition-colors`}
    >
      {showIcon && <IconComponent className={`${iconSizes[size]} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
