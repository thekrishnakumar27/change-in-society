import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  RotateCcw,
  Users,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Activity,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ImpactStats, Category } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface ImpactDashboardProps {
  stats: ImpactStats | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenReport: (reportId: string) => void;
}

export const ImpactDashboard: React.FC<ImpactDashboardProps> = ({
  stats,
  loading,
  onRefresh,
  onOpenReport,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset local SQLite database to initial synthetic demo state? Any unsaved test submissions will be replaced.')) {
      return;
    }

    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      const data = await res.json();
      setResetMessage(data.message || 'Demo data restored.');
      onRefresh();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
        <p className="text-sm text-slate-500">Calculating impact metrics from SQLite database...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-500">
        Unable to load impact data. Please check server connection.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
            <span>Verified Analytics</span>
            <span className="text-slate-300">·</span>
            <span>SQLite Data Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Community Impact Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real metrics calculated directly from database records. No fabricated statistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Refresh Metrics
          </button>
          <button
            onClick={handleResetDemoData}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
          <span>{resetMessage}</span>
          <button onClick={() => setResetMessage(null)} className="text-teal-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Reports Logged</span>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {stats.totalReports}
          </p>
          <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
            <span>Citizen submissions:</span>
            <strong className="text-teal-700">{stats.realUserReports}</strong>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Synthetic demo records:</span>
            <strong className="text-amber-700">{stats.syntheticReports}</strong>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
          <p className="text-3xl font-extrabold text-amber-600 tabular-nums">
            {stats.awaitingReview}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Pending initial coordinator triage
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Currently In Progress</span>
          <p className="text-3xl font-extrabold text-teal-700 tabular-nums">
            {stats.inProgress}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Assigned to municipal or community fixers
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Evidence Verified Resolved</span>
          <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
            {stats.resolved}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Confirmed with human-reviewed physical proof
          </p>
        </div>
      </div>

      {/* Two Column Section: Category Distribution & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>Report Distribution by Problem Category</span>
            </h3>
            <span className="text-xs text-slate-500">Live DB Tally</span>
          </div>

          <div className="space-y-3.5">
            {stats.categories.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{c.category}</span>
                  <span className="text-slate-500 tabular-nums">
                    <strong>{c.count}</strong> reports ({c.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(c.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Community Notes Logged:</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                {stats.totalContributions}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Evidence Approved:</span>
              <p className="text-lg font-bold text-emerald-700 mt-0.5 tabular-nums">
                {stats.verifiedEvidenceCount}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Civic Activity Timeline (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Recent Civic Activity</span>
            </h3>
            <span className="text-xs text-slate-500">Audit Stream</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {stats.recentActivity.map((act) => (
              <div
                key={act.id}
                onClick={() => onOpenReport(act.report_id)}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-xs space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-teal-800 font-bold">
                    {act.report_id}
                  </span>
                  <StatusBadge status={act.new_status} size="sm" />
                </div>
                <p className="font-semibold text-slate-900 line-clamp-1">
                  {act.title}
                </p>
                <p className="text-slate-600 text-[11px] line-clamp-2">
                  {act.note || `Transitioned to ${act.new_status}`}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{act.action_by}</span>
                  <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demonstration Notice Card */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-2 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700" />
          <span>Hackathon Demonstration & Data Integrity Standards</span>
        </div>
        <p className="leading-relaxed">
          Change in Society strictly distinguishes between synthetic demonstration scenarios (labeled <code>[Demo]</code>) and real citizen submissions. Demonstration data can be reset at any time using the "Reset Demo Data" control above, allowing judges to test new reporting flows and verification procedures from a known baseline.
        </p>
      </div>
    </div>
  );
};
