import React from 'react';
import { ReportStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: ReportStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (status) {
    case 'Submitted':
      style = 'bg-blue-50/80 text-blue-800 border-blue-200';
      break;
    case 'Under Review':
      style = 'bg-amber-50/80 text-amber-800 border-amber-200';
      break;
    case 'Acknowledged':
      style = 'bg-indigo-50/80 text-indigo-800 border-indigo-200';
      break;
    case 'In Progress':
      style = 'bg-teal-50/90 text-teal-800 border-teal-200';
      break;
    case 'Resolution Submitted':
      style = 'bg-purple-50/80 text-purple-800 border-purple-200';
      break;
    case 'Resolved':
      style = 'bg-emerald-50/80 text-emerald-800 border-emerald-200';
      break;
    case 'Reopened':
      style = 'bg-rose-50/80 text-rose-800 border-rose-200';
      break;
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded ${px} ${style} tracking-tight whitespace-nowrap`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
