import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Inbox,
  Send,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { MockNotification } from '../types/index.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: (reportId: string) => void;
  filterReportId?: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onOpenReport,
  filterReportId,
}) => {
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<MockNotification | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filterReportId
        ? `/api/reports/${filterReportId}/notifications`
        : '/api/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: MockNotification[] = data.notifications || [];
        setNotifications(list);
        if (list.length > 0 && !selectedNotification) {
          setSelectedNotification(list[0]);
        } else if (list.length > 0 && selectedNotification) {
          const stillThere = list.find((n) => n.id === selectedNotification.id);
          setSelectedNotification(stillThere || list[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching mock notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filterReportId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Mock Email Notification Outbox
                </h3>
                <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Simulation Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Automated alerts triggered when reports move to <strong>In Progress</strong> or <strong>Resolved</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content: Split Pane View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane: Email List */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Dispatched Emails ({notifications.length})</span>
              {filterReportId && (
                <span className="text-[10px] text-teal-700 font-mono">
                  {filterReportId}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Loading mock notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No email alerts generated yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Change a report status to 'In Progress' or 'Resolved' in the Reviewer Portal to trigger an email.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isSelected = selectedNotification?.id === n.id;
                  const isInProgress = n.event_type === 'STATUS_IN_PROGRESS';
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNotification(n)}
                      className={`p-3.5 text-left transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-white border-l-4 border-l-teal-600 shadow-2xs'
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                            isInProgress
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isInProgress ? '● In Progress' : '✓ Resolved'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {n.subject}
                      </p>

                      <p className="text-[11px] text-slate-500 truncate">
                        To: <span className="text-slate-700">{n.recipient_email}</span>
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span>{n.report_id}</span>
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Email Reader */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedNotification ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Email Meta Header */}
                <div className="p-5 border-b border-slate-200 space-y-3 bg-white shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {selectedNotification.subject}
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs bg-slate-50">
                        <button
                          onClick={() => setViewMode('html')}
                          className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                            viewMode === 'html' ? 'bg-white shadow-2xs text-teal-800 font-bold' : 'text-slate-600'
                          }`}
                        >
                          HTML Card
                        </button>
                        <button
                          onClick={() => setViewMode('text')}
                          className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                            viewMode === 'text' ? 'bg-white shadow-2xs text-teal-800 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Plain Text
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenReport(selectedNotification.report_id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md cursor-pointer"
                        title="View Report in Explorer"
                      >
                        <span>View Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400">From:</span>{' '}
                      <strong className="text-slate-700">Change in Society Alerts &lt;alerts@changeinsociety.org&gt;</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">To:</span>{' '}
                      <strong className="text-slate-900">{selectedNotification.recipient_email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Date:</span>{' '}
                      <span className="text-slate-700">{new Date(selectedNotification.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Report ID:</span>{' '}
                      <span className="font-mono text-teal-800 font-bold">{selectedNotification.report_id}</span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  {viewMode === 'html' ? (
                    <div
                      className="shadow-xs rounded-xl overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: selectedNotification.body_html }}
                    />
                  ) : (
                    <pre className="p-6 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                      {selectedNotification.body_text}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs p-8">
                Select an email notification on the left to read details.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Simulated SMTP Dispatch · Recorded in SQLite</span>
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
