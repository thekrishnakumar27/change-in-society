import React from 'react';
import { NavTab } from './Navbar.tsx';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded bg-teal-500 text-slate-950 font-black text-sm flex items-center justify-center">
                CS
              </span>
              <span className="text-white font-bold text-lg tracking-tight">Change in Society</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Turn community problems into trackable, evidence-based action. Every report is an opportunity to bring neighbors together and verify real physical improvements.
            </p>
            <p className="text-xs text-teal-400 font-medium">Small Actions. Real Change.</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('landing')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Overview & Mission
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explorer')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Browse Reports
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('report')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Submit a Problem
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('impact')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Live Impact Statistics
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-3">
              Civic Governance
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('reviewer')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Reviewer Portal
                </button>
              </li>
              <li className="text-xs text-slate-400 pt-1 leading-relaxed">
                All resolutions require physical photographic evidence and human reviewer sign-off.
              </li>
              <li className="text-xs text-slate-500 pt-1">
                Demo environment with persistent SQLite storage.
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Change in Society. Built for civic accountability and community empowerment.</p>
          <p className="text-slate-400">
            Real social change begins when people turn everyday problems into collective action.
          </p>
        </div>
      </div>
    </footer>
  );
};
