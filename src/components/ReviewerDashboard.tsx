import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  FileCheck,
  Check,
  X,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { Report, ReviewerUser, ReportStatus, ResolutionEvidence } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface ReviewerDashboardProps {
  reviewer: ReviewerUser | null;
  reviewerToken: string | null;
  onLogin: (token: string, user: ReviewerUser) => void;
  onLogout: () => void;
  onOpenReportDetail: (reportId: string) => void;
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({
  reviewer,
  reviewerToken,
  onLogin,
  onLogout,
  onOpenReportDetail,
}) => {
  // Login form
  const [email, setEmail] = useState('reviewer@changeinsociety.org');
  const [password, setPassword] = useState('ChangeAdmin2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard data
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Status Change Dialog
  const [statusModalReport, setStatusModalReport] = useState<Report | null>(null);
  const [targetStatus, setTargetStatus] = useState<ReportStatus>('Under Review');
  const [reviewerNote, setReviewerNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Evidence Verification Dialog
  const [verifyingReport, setVerifyingReport] = useState<Report | null>(null);
  const [pendingEvidence, setPendingEvidence] = useState<ResolutionEvidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<ResolutionEvidence | null>(null);
  const [evidenceDecision, setEvidenceDecision] = useState<'Approve' | 'Reject' | 'Request More Evidence'>('Approve');
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!reviewerToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('sort', 'newest');

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading reviewer reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reviewerToken) {
      fetchReports();
    }
  }, [reviewerToken, statusFilter]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/reviewer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLogin(data.token, data.reviewer);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      if (reviewerToken) {
        await fetch('/api/reviewer/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${reviewerToken}` },
        });
      }
    } catch (err) {
      console.warn('Logout error:', err);
    }
    onLogout();
  };

  // Open Status modal
  const handleOpenStatusModal = (r: Report) => {
    setStatusModalReport(r);
    setTargetStatus(
      r.status === 'Submitted'
        ? 'Under Review'
        : r.status === 'Under Review'
        ? 'Acknowledged'
        : r.status === 'Acknowledged'
        ? 'In Progress'
        : 'In Progress'
    );
    setReviewerNote('');
    setStatusError(null);
  };

  // Submit status update
  const handleSubmitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalReport || !reviewerToken) return;

    if (!reviewerNote.trim() || reviewerNote.trim().length < 5) {
      setStatusError('Reviewer note is required (minimum 5 characters).');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const res = await fetch(`/api/reviewer/reports/${statusModalReport.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${reviewerToken}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          note: reviewerNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }

      setStatusModalReport(null);
      setToastMessage(data.message);
      fetchReports();
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Evidence inspection
  const handleOpenEvidenceInspection = async (r: Report) => {
    setVerifyingReport(r);
    setDecisionError(null);
    setDecisionFeedback('');
    try {
      const res = await fetch(`/api/reports/${r.id}`);
      if (res.ok) {
        const data = await res.json();
        const pending = (data.resolutionEvidence || []).filter(
          (e: ResolutionEvidence) => e.status === 'Pending Review'
        );
        setPendingEvidence(pending.length > 0 ? pending : data.resolutionEvidence || []);
        setSelectedEvidence(pending[0] || data.resolutionEvidence?.[0] || null);
      }
    } catch (err) {
      console.error('Error fetching evidence:', err);
    }
  };

  // Submit evidence decision
  const handleSubmitEvidenceDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidence || !reviewerToken) return;

    if (!decisionFeedback.trim() || decisionFeedback.trim().length < 5) {
      setDecisionError('Please provide inspector feedback explaining your decision.');
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError(null);

    try {
      const res = await fetch(`/api/reviewer/evidence/${selectedEvidence.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${reviewerToken}`,
        },
        body: JSON.stringify({
          decision: evidenceDecision,
          feedback: decisionFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record decision.');
      }

      setVerifyingReport(null);
      setSelectedEvidence(null);
      setToastMessage(data.message);
      fetchReports();
    } catch (err: any) {
      setDecisionError(err.message);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // If NOT logged in, show simple, secure login screen with demo credentials banner
  if (!reviewer) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 text-teal-800 rounded-xl flex items-center justify-center mx-auto border border-slate-200">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Authorized Reviewer Portal
            </h2>
            <p className="text-xs text-slate-500">
              Restricted to authorized municipal coordinators and verified civic inspectors.
            </p>
          </div>

          {/* Hackathon Demo Credentials Banner */}
          <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Demo Reviewer Credentials</span>
            </div>
            <div className="text-teal-800 space-y-0.5 font-mono text-[11px]">
              <div>Email: <strong>reviewer@changeinsociety.org</strong></div>
              <div>Password: <strong>ChangeAdmin2026!</strong></div>
            </div>
            <p className="text-[10px] text-teal-700 pt-1">
              Click "Sign In as Reviewer" below to load these pre-filled credentials.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reviewer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reviewer Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {isLoggingIn ? 'Verifying Credentials...' : 'Sign In as Reviewer'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 text-center">
            Server-side token verification and salted scrypt hashing enabled.
          </p>
        </div>
      </div>
    );
  }

  // Calculate quick stats from loaded reports
  const awaitingReview = reports.filter(
    (r) => r.status === 'Submitted' || r.status === 'Under Review'
  ).length;
  const inProgress = reports.filter((r) => r.status === 'In Progress').length;
  const resolutionPending = reports.filter((r) => r.status === 'Resolution Submitted').length;
  const resolved = reports.filter((r) => r.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Reviewer Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              Authorized Reviewer Session
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {reviewer.name}
          </h1>
          <p className="text-xs text-slate-400">
            {reviewer.role} · {reviewer.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Refresh Queue
          </button>
          <button
            onClick={handleLogoutClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-900/50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Reviewer Action Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-4 cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('Submitted')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer"
        >
          <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{awaitingReview}</p>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer"
        >
          <span className="text-xs text-slate-500 font-medium">In Progress</span>
          <p className="text-2xl font-bold text-teal-700 mt-1 tabular-nums">{inProgress}</p>
        </div>

        <div
          onClick={() => setStatusFilter('Resolution Submitted')}
          className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 hover:border-purple-300 transition-colors cursor-pointer"
        >
          <span className="text-xs text-purple-800 font-medium">Resolution Verification</span>
          <p className="text-2xl font-bold text-purple-900 mt-1 tabular-nums">
            {resolutionPending}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('Resolved')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer"
        >
          <span className="text-xs text-slate-500 font-medium">Verified Resolved</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{resolved}</p>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">Filter Queue:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Statuses ({reports.length})</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolution Submitted">Resolution Submitted</option>
              <option value="Resolved">Resolved</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
              placeholder="Search reports or ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Problem Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Locality</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Reviewer Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading records from SQLite...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No reports found matching status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.id}
                      {r.is_synthetic === 1 && (
                        <span className="ml-1.5 text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          Demo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800">
                      {r.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {r.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate">
                      {r.city_locality}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => onOpenReportDetail(r.id)}
                        className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium cursor-pointer"
                        title="View Public Details"
                      >
                        Inspect
                      </button>

                      {r.status === 'Resolution Submitted' ? (
                        <button
                          onClick={() => handleOpenEvidenceInspection(r)}
                          className="px-2.5 py-1 text-purple-900 bg-purple-100 hover:bg-purple-200 font-semibold rounded cursor-pointer"
                        >
                          Verify Evidence
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenStatusModal(r)}
                          className="px-2.5 py-1 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 font-medium rounded cursor-pointer"
                        >
                          Change Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-teal-800 font-bold">
                  {statusModalReport.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Update Official Report Status
                </h3>
              </div>
              <button
                onClick={() => setStatusModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Current Status:{' '}
              <strong className="text-slate-900">{statusModalReport.status}</strong>
            </p>

            {statusError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {statusError}
              </p>
            )}

            <form onSubmit={handleSubmitStatusUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                  className="w-full px-3 py-2 rounded border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Acknowledged">Acknowledged (Confirmed valid by reviewer)</option>
                  <option value="In Progress">In Progress (Dispatched to field crew)</option>
                  <option value="Reopened">Reopened (Issue recurred or previous fix failed)</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mandatory Reviewer Note / Decision Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Record dispatch details, inspector findings, or official response notes..."
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusModalReport(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Recording...' : 'Commit Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Evidence Verification Modal */}
      {verifyingReport && selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-purple-800 font-bold">
                  Evidence Verification: {selectedEvidence.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Verify Physical Resolution Evidence
                </h3>
              </div>
              <button
                onClick={() => setVerifyingReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p className="font-semibold text-slate-800">
                Report: {verifyingReport.title}
              </p>
              <p className="text-slate-600">
                <strong>Submitted By:</strong> {selectedEvidence.submitter_role} on{' '}
                {new Date(selectedEvidence.created_at).toLocaleString()}
              </p>
              <p className="text-slate-700 italic">
                "{selectedEvidence.description}"
              </p>
              {selectedEvidence.photo_url && (
                <div className="rounded-lg overflow-hidden border border-slate-200 max-h-56 mt-2">
                  <img
                    src={selectedEvidence.photo_url}
                    alt="Proof of resolution"
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {decisionError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {decisionError}
              </p>
            )}

            <form onSubmit={handleSubmitEvidenceDecision} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reviewer Determination
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceDecision('Approve')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer ${
                      evidenceDecision === 'Approve'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Approve & Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceDecision('Reject')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer ${
                      evidenceDecision === 'Reject'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✗ Reject Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceDecision('Request More Evidence')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer ${
                      evidenceDecision === 'Request More Evidence'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Request More Proof
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Inspector Audit Note & Community Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionFeedback}
                  onChange={(e) => setDecisionFeedback(e.target.value)}
                  placeholder="e.g. Inspected site in person; asphalt patch verified flush with road grade; case approved and closed."
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerifyingReport(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                >
                  {isSubmittingDecision ? 'Submitting...' : 'Record Verification Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
