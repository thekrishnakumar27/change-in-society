import React from 'react';
import { ArrowRight, CheckCircle2, Users, FileText, Sparkles, MapPin, Search } from 'lucide-react';
import { NavTab } from './Navbar.tsx';
import { ImpactStats, Category } from '../types/index.ts';

interface LandingPageProps {
  onNavigate: (tab: NavTab, initialCategory?: Category) => void;
  stats: ImpactStats | null;
  loadingStats: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  stats,
  loadingStats,
}) => {
  const problems = [
    {
      title: 'Safer Roads',
      category: 'Roads and Potholes' as Category,
      desc: 'Repair hazardous potholes, cracked pavements, and missing speed cushions before accidents happen.',
      image: '/src/assets/images/civic_road_repair_1792222432359.jpg',
    },
    {
      title: 'Cleaner Neighborhoods',
      category: 'Garbage and Sanitation' as Category,
      desc: 'Clear overflowing garbage dumps, eliminate illegal litter piles, and restore neighborhood cleanliness.',
      image: '/src/assets/images/community_street_clean_1792222432580.jpg',
    },
    {
      title: 'Reliable Streetlights',
      category: 'Streetlights' as Category,
      desc: 'Restore dark street corners, fix broken fixtures, and ensure safe, illuminated evening commutes.',
    },
    {
      title: 'Improved Water & Drainage',
      category: 'Water and Drainage' as Category,
      desc: 'Stop freshwater pipe leaks, unblock clogged storm drains, and prevent stagnant water pooling.',
    },
    {
      title: 'Accessible Public Spaces',
      category: 'Accessibility' as Category,
      desc: 'Repair broken wheelchair access ramps, fix disconnected handrails, and remove mobility barriers.',
    },
    {
      title: 'Better Public Facilities',
      category: 'Public Facilities' as Category,
      desc: 'Upgrade park benches, maintain public sanitation facilities, and repair civic meeting spots.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-teal-800 uppercase">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                <span>Change in Society</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 font-normal">Small Actions. Real Change.</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight text-balance leading-tight">
                Your Community.{' '}
                <span className="text-teal-700">Your Voice.</span>{' '}
                Your Change.
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
                Report community problems, bring evidence together, and track progress toward meaningful change. Every report is an opportunity to make our surroundings better.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('report')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Report a Problem</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('explorer')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Explore Community Reports</span>
                </button>
              </div>

              {/* Core Promise Note */}
              <div className="pt-4 border-t border-slate-200/80 flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Evidence-based verification
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI-assisted problem organization
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" />
                  Community collaboration
                </span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-md">
                <img
                  src="/src/assets/images/hero_community_action_1792222431877.jpg"
                  alt="Community members and volunteers collaborating on neighborhood action plan"
                  className="w-full h-80 sm:h-96 object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback container if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="p-4 bg-white border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">
                    Community Action in Ward 4
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Residents, merchants, and local volunteers working together to log and solve neighborhood issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-semibold tracking-wider text-teal-700 uppercase">
            Transparent Workflow
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-base text-slate-600">
            A three-step civic framework turning everyday grievances into verified solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base border border-teal-100">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Report an Issue
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Share a community problem with details, location, and optional photographs. Our Gemini-powered assistant helps summarize keywords and identify potential duplicates.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-100">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Bring People Together
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Let community members contribute relevant observations, additional photos, and notes. Collective participation builds credible evidence and neighborhood priority.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base border border-emerald-100">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Track the Change
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Follow status updates and submit proof of completion. Physical resolution evidence must be inspected and verified by an authorized reviewer before closing.
            </p>
          </div>
        </div>
      </section>

      {/* Problems Worth Solving Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-teal-700 uppercase">
              Action Areas
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Problems Worth Solving
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select an area to explore current neighborhood reports or submit a new case.
            </p>
          </div>
          <button
            onClick={() => onNavigate('explorer')}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>View all categories</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              onClick={() => onNavigate('explorer', p.category)}
              className="group p-6 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-teal-700 tracking-tight">
                    {p.category}
                  </span>
                  <span className="text-slate-400 group-hover:text-teal-700 transition-colors">
                    →
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {p.desc}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Click to view reports</span>
                <span className="font-medium text-teal-700">Browse →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real-Time Database Community Impact Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-8 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-teal-400 uppercase">
                <span>Database Records</span>
                <span className="text-slate-600">·</span>
                <span>Verified SQLite Store</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Real Community Impact
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Calculated directly from live database submissions. Every statistic reflects actual reports and human-reviewed resolution evidence.
              </p>
            </div>
            <button
              onClick={() => onNavigate('impact')}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-teal-400 rounded-lg hover:bg-teal-300 transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto"
            >
              Open Impact Dashboard
            </button>
          </div>

          {loadingStats ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Loading current database impact metrics...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <p className="text-xs text-slate-400 font-medium">Total Reports Submitted</p>
                <p className="text-3xl font-extrabold text-white mt-1 tabular-nums">
                  {stats.totalReports}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {stats.realUserReports} resident submissions · {stats.syntheticReports} demo records
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <p className="text-xs text-slate-400 font-medium">Active In Progress</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-1 tabular-nums">
                  {stats.inProgress}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dispatched and underway
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <p className="text-xs text-slate-400 font-medium">Verified Resolved</p>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1 tabular-nums">
                  {stats.resolved}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Confirmed with physical proof
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <p className="text-xs text-slate-400 font-medium">Community Contributions</p>
                <p className="text-3xl font-extrabold text-teal-400 mt-1 tabular-nums">
                  {stats.totalContributions}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Observations & notes logged
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Unable to retrieve live statistics.</div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>Notice: Sample records are strictly identified as demonstration data in accordance with hackathon standards.</span>
            <span>No automated AI resolution without human reviewer sign-off.</span>
          </div>
        </div>
      </section>
    </div>
  );
};
