import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  MessageSquare,
  Camera,
  CheckCircle2,
  RefreshCw,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { Report, Category, ReportStatus } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

const CATEGORIES = [
  'All',
  'Roads and Potholes',
  'Garbage and Sanitation',
  'Streetlights',
  'Water and Drainage',
  'Public Facilities',
  'Accessibility',
  'Public Safety',
  'Other',
];

const STATUSES = [
  'All',
  'Submitted',
  'Under Review',
  'Acknowledged',
  'In Progress',
  'Resolution Submitted',
  'Resolved',
  'Reopened',
];

interface ReportsExplorerProps {
  initialCategory?: Category;
  onOpenReport: (reportId: string) => void;
  onNavigateToReport: () => void;
}

export const ReportsExplorer: React.FC<ReportsExplorerProps> = ({
  initialCategory,
  onOpenReport,
  onNavigateToReport,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(initialCategory || 'All');
  const [status, setStatus] = useState<string>('All');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'contributions'>('newest');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (category && category !== 'All') params.append('category', category);
      if (status && status !== 'All') params.append('status', status);
      if (location.trim()) params.append('location', location.trim());
      params.append('sort', sort);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [category, status, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setStatus('All');
    setLocation('');
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
            <span>Community Registry</span>
            <span className="text-slate-300">·</span>
            <span>Public Evidence Database</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Explore Community Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse verified neighborhood issues, contribute observations, and monitor resolution evidence.
          </p>
        </div>

        <button
          onClick={onNavigateToReport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs cursor-pointer self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Problem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report title, description, or ID (e.g. CIS-2026-1001)..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="sm:w-56">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Filter by locality or ward..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="contributions">Most Community Notes</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reports Count and Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-semibold">{reports.length}</strong> reports in SQLite database
        </span>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Grid of Report Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse p-6 space-y-4"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-100 rounded" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">
            No matching community reports found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try adjusting your search query, clearing filters, or submit a new report if this problem hasn't been logged yet.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={onNavigateToReport}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
            >
              Report This Problem
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <article
              key={report.id}
              onClick={() => onOpenReport(report.id)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
            >
              <div className="p-5 space-y-3">
                {/* Meta line: Clean unboxed metadata with typographic separators */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700">
                    <span>{report.id}</span>
                    {report.is_synthetic === 1 && (
                      <span className="text-[10px] text-amber-700 font-sans font-medium px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200">
                        Demo
                      </span>
                    )}
                  </div>
                  <StatusBadge status={report.status} />
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors line-clamp-2 leading-snug">
                  {report.title}
                </h3>

                {/* Category & Locality */}
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-teal-800">{report.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{report.city_locality}</span>
                  </span>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {report.description}
                </p>

                {/* Photo preview thumbnail if present */}
                {report.photo_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-100 max-h-36 bg-slate-50">
                    <img
                      src={report.photo_url}
                      alt="Supporting civic evidence"
                      className="w-full h-32 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="tabular-nums font-medium text-slate-700">
                      {report.contributions_count || 0}
                    </span>{' '}
                    notes
                  </span>
                  {(report.evidence_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-teal-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Evidence</span>
                    </span>
                  )}
                </div>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
