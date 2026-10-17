import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Upload,
  AlertCircle,
  Camera,
  User,
  Plus,
  Send,
  Loader2,
  Mail,
} from 'lucide-react';
import {
  Report,
  CommunityContribution,
  ResolutionEvidence,
  StatusHistory,
  MockNotification,
} from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
  onReportUpdated?: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  reportId,
  onClose,
  onReportUpdated,
}) => {
  const [report, setReport] = useState<Report | null>(null);
  const [contributions, setContributions] = useState<CommunityContribution[]>([]);
  const [evidenceList, setEvidenceList] = useState<ResolutionEvidence[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs inside modal: 'details' | 'timeline' | 'contributions' | 'evidence' | 'notifications'
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'contributions' | 'evidence' | 'notifications'>('details');

  // New Contribution form state
  const [contribComment, setContribComment] = useState('');
  const [contribAuthor, setContribAuthor] = useState('');
  const [contribType, setContribType] = useState<'Observation' | 'Update' | 'Additional Photo' | 'Measurement'>('Observation');
  const [contribPhotoUrl, setContribPhotoUrl] = useState<string | null>(null);
  const [isSubmittingContrib, setIsSubmittingContrib] = useState(false);
  const [contribError, setContribError] = useState<string | null>(null);

  // Resolution Evidence form state
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceRole, setEvidenceRole] = useState('Civic Resident / Volunteer');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState<string | null>(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) {
        throw new Error(`Report ${reportId} not found.`);
      }
      const data = await res.json();
      setReport(data.report);
      setContributions(data.contributions || []);
      setEvidenceList(data.resolutionEvidence || []);
      setHistory(data.history || []);
      setNotifications(data.notifications || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load report details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [reportId]);

  // Handle image upload for contribution
  const handleContribPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setContribError('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setContribPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Handle image upload for resolution evidence
  const handleEvidencePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError('Photo must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEvidencePhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Submit contribution
  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribComment.trim() || contribComment.trim().length < 5) {
      setContribError('Please enter at least 5 characters.');
      return;
    }

    setIsSubmittingContrib(true);
    setContribError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: contribComment.trim(),
          authorName: contribAuthor.trim() || 'Community Member',
          contributionType: contribType,
          photoUrl: contribPhotoUrl,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit contribution.');
      }

      setContribComment('');
      setContribAuthor('');
      setContribPhotoUrl(null);
      await fetchDetail();
      if (onReportUpdated) onReportUpdated();
    } catch (err: any) {
      setContribError(err.message);
    } finally {
      setIsSubmittingContrib(false);
    }
  };

  // Submit resolution evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceDesc.trim() || evidenceDesc.trim().length < 10) {
      setEvidenceError('Please describe the repair or resolution in detail (minimum 10 characters).');
      return;
    }

    setIsSubmittingEvidence(true);
    setEvidenceError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/resolution-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: evidenceDesc.trim(),
          submitterRole: evidenceRole.trim(),
          photoUrl: evidencePhotoUrl || '',
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit resolution evidence.');
      }

      setShowEvidenceForm(false);
      setEvidenceDesc('');
      setEvidencePhotoUrl(null);
      await fetchDetail();
      if (onReportUpdated) onReportUpdated();
    } catch (err: any) {
      setEvidenceError(err.message);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {reportId}
            </span>
            {report && <StatusBadge status={report.status} size="md" />}
            {report?.is_synthetic === 1 && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Demo Sample
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" />
            Loading report record from database...
          </div>
        ) : error || !report ? (
          <div className="p-12 text-center text-sm text-rose-600">
            {error || 'Report could not be retrieved.'}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Metadata */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {report.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="font-semibold text-teal-800">{report.category}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{report.city_locality}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submitted {new Date(report.created_at).toLocaleString()}</span>
                </span>
              </div>
            </div>

            {/* Navigation tabs inside modal */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold shrink-0">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview & Evidence
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Status Timeline ({history.length})
              </button>
              <button
                onClick={() => setActiveTab('contributions')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'contributions'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Community Notes ({contributions.length})
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`flex-1 py-1.5 px-2.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'evidence'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Verification ({evidenceList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-1.5 px-2.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'notifications'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                <span>Email Alerts ({notifications.length})</span>
              </button>
            </div>

            {/* Tab 1: Details */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detailed Report
                  </h4>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {report.description}
                  </p>
                </div>

                {report.photo_url && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Initial Condition Photograph
                    </h4>
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-80">
                      <img
                        src={report.photo_url}
                        alt="Initial problem photo"
                        className="w-full h-72 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Precise Location / Landmark
                    </span>
                    <p className="text-slate-600">
                      {report.precise_location || 'No specific landmark provided.'}
                    </p>
                    {report.latitude && report.longitude && (
                      <p className="font-mono text-slate-500 mt-2 text-[11px]">
                        GPS: {report.latitude}, {report.longitude}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Additional Context
                    </span>
                    <p className="text-slate-600">
                      {report.additional_info || 'No extra notes registered.'}
                    </p>
                  </div>
                </div>

                {/* Quick resolution submission prompt banner */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-teal-900">
                      Has this issue been addressed?
                    </h4>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Submit photographic proof of the repair so an authorized reviewer can verify and resolve this case.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('evidence');
                      setShowEvidenceForm(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Submit Resolution Proof
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Status Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-500 mb-2">
                  All status transitions are audit-logged with timestamps and responsible actors.
                </div>

                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
                  {history.map((h, idx) => (
                    <div key={h.id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={h.new_status} />
                            {h.previous_status && (
                              <span className="text-xs text-slate-400">
                                (from {h.previous_status})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(h.created_at).toLocaleString()}</span>
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700">
                          Action By: <span className="font-normal text-slate-900">{h.action_by}</span>
                        </p>

                        {h.note && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-relaxed">
                            "{h.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Community Notes & Contributions */}
            {activeTab === 'contributions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Community Contributions ({contributions.length})
                  </h4>
                  <span className="text-xs text-slate-500">
                    Collaborate without exposing private personal credentials.
                  </span>
                </div>

                {/* Contribution list */}
                {contributions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    No community notes yet. Be the first to share an observation or update!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributions.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {c.author_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {c.contribution_type}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.comment}</p>
                        {c.photo_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 max-h-48">
                            <img
                              src={c.photo_url}
                              alt="Community contribution photo"
                              className="w-full h-44 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Contribution Form */}
                <form
                  onSubmit={handleAddContribution}
                  className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4"
                >
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Add Your Contribution
                  </h5>

                  {contribError && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                      {contribError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">
                        Your Name or Handle (Optional)
                      </label>
                      <input
                        type="text"
                        value={contribAuthor}
                        onChange={(e) => setContribAuthor(e.target.value)}
                        placeholder="e.g. Maria G. (Local Resident)"
                        className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">
                        Contribution Type
                      </label>
                      <select
                        value={contribType}
                        onChange={(e) => setContribType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="Observation">Observation / Field Note</option>
                        <option value="Update">Status Update</option>
                        <option value="Additional Photo">Additional Photo Proof</option>
                        <option value="Measurement">Measurement / Detail</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      Note or Observation Details <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={contribComment}
                      onChange={(e) => setContribComment(e.target.value)}
                      placeholder="Share what you observed, recent progress, or relevant notes..."
                      className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer">
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>{contribPhotoUrl ? 'Photo attached ✓' : 'Attach Photo (Max 5MB)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleContribPhoto}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmittingContrib}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg cursor-pointer"
                    >
                      {isSubmittingContrib ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Post Contribution</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 4: Resolution Evidence & Verification */}
            {activeTab === 'evidence' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Physical Resolution Evidence
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Change in Society requires verifiable physical proof before any issue can be marked Resolved.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {showEvidenceForm ? 'Cancel Submission' : '+ Submit Resolution Proof'}
                  </button>
                </div>

                {/* Evidence Submission Form */}
                {showEvidenceForm && (
                  <form
                    onSubmit={handleAddEvidence}
                    className="p-5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      <span>Submit Proof of Completed Resolution</span>
                    </div>

                    {evidenceError && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                        {evidenceError}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Your Role / Relationship
                        </label>
                        <input
                          type="text"
                          value={evidenceRole}
                          onChange={(e) => setEvidenceRole(e.target.value)}
                          placeholder="e.g. Resident, Fixer, Neighborhood Volunteer"
                          className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Proof Photo (Required or Recommended)
                        </label>
                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 border-dashed rounded bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>{evidencePhotoUrl ? 'Photo loaded ✓' : 'Upload Verification Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEvidencePhoto}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-semibold mb-1">
                        Description of Work Done / Resolution Details <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={evidenceDesc}
                        onChange={(e) => setEvidenceDesc(e.target.value)}
                        placeholder="Detail how the problem was resolved (e.g. road crew filled and steamrolled pothole; streetlight bulb replaced; trash cleared and bin installed)..."
                        className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {evidencePhotoUrl && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 max-h-48 w-48">
                        <img
                          src={evidencePhotoUrl}
                          alt="Evidence preview"
                          className="w-full h-36 object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowEvidenceForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingEvidence}
                        className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg cursor-pointer"
                      >
                        {isSubmittingEvidence ? 'Submitting Evidence...' : 'Submit for Reviewer Verification'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Evidence items list */}
                {evidenceList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
                    <p>No resolution evidence has been submitted yet for this report.</p>
                    <p className="text-slate-400">
                      When the problem is fixed, click "Submit Resolution Proof" above to upload evidence.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evidenceList.map((e) => (
                      <div
                        key={e.id}
                        className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {e.id}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                e.status === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : e.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {e.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Submitted {new Date(e.created_at).toLocaleString()} by {e.submitter_role}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed">
                          {e.description}
                        </p>

                        {e.photo_url && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-72">
                            <img
                              src={e.photo_url}
                              alt="Physical proof of resolution"
                              className="w-full h-64 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {e.reviewed_by && (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                              Reviewer Inspection: {e.reviewed_by}
                            </span>
                            {e.reviewer_feedback && (
                              <p className="text-slate-700 italic">
                                "{e.reviewer_feedback}"
                              </p>
                            )}
                            {e.reviewed_at && (
                              <p className="text-[10px] text-slate-400">
                                Verified on {new Date(e.reviewed_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Mock Email Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Automated Mock Email Notifications ({notifications.length})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Simulated emails dispatched to the citizen reporter when this report moves to <strong>In Progress</strong> or <strong>Resolved</strong>.
                    </p>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
                    <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>No email alerts have been triggered yet for this report.</p>
                    <p className="text-[11px] text-slate-400">
                      When a reviewer sets this report's status to <strong>In Progress</strong> or <strong>Resolved</strong>, an automated notification will be generated here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                n.event_type === 'STATUS_IN_PROGRESS'
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {n.event_type === 'STATUS_IN_PROGRESS' ? '● In Progress Alert' : '✓ Resolved Alert'}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {n.id}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Sent {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <p className="font-bold text-slate-900 text-sm">
                            Subject: {n.subject}
                          </p>
                          <p className="text-slate-500">
                            To: <strong className="text-slate-700">{n.recipient_email}</strong> · From: <code>alerts@changeinsociety.org</code>
                          </p>
                        </div>

                        {/* Render the HTML card */}
                        <div
                          className="rounded-lg overflow-hidden border border-slate-200 bg-white"
                          dangerouslySetInnerHTML={{ __html: n.body_html }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Change in Society Verification Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
