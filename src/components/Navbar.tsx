import React from 'react';
import { ShieldCheck, Plus, Menu, X, Mail } from 'lucide-react';

export type NavTab = 'landing' | 'explorer' | 'report' | 'impact' | 'reviewer';

interface NavbarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  reviewerLoggedIn: boolean;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  reviewerLoggedIn,
  onOpenNotifications,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (tab: NavTab) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark (Single text element, no descriptor tags) */}
          <button
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 text-left text-slate-900 font-bold text-lg tracking-tight hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
              CS
            </span>
            <span className="font-extrabold text-slate-900">Change in Society</span>
          </button>

          {/* Zone 2: 4-5 Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleNavClick('landing')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'landing' ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('explorer')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'explorer' ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              Explore Reports
            </button>
            <button
              onClick={() => handleNavClick('impact')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'impact' ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              Community Impact
            </button>
            <button
              onClick={() => handleNavClick('reviewer')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reviewer' ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>{reviewerLoggedIn ? 'Reviewer Desk' : 'Reviewer Portal'}</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Email Alerts Outbox */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Open Mock Email Outbox"
            >
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              <span>Email Alerts</span>
            </button>

            <button
              onClick={() => handleNavClick('report')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Report a Problem</span>
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNavClick('landing')}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Overview
          </button>
          <button
            onClick={() => handleNavClick('explorer')}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore Reports
          </button>
          <button
            onClick={() => handleNavClick('impact')}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Community Impact
          </button>
          <button
            onClick={() => handleNavClick('reviewer')}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Reviewer Portal
          </button>
          <div className="pt-2">
            <button
              onClick={() => handleNavClick('report')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" />
              <span>Report a Problem</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
