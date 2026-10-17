/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { ReportForm } from './components/ReportForm.tsx';
import { ReportsExplorer } from './components/ReportsExplorer.tsx';
import { ReportDetailModal } from './components/ReportDetailModal.tsx';
import { ReviewerDashboard } from './components/ReviewerDashboard.tsx';
import { ImpactDashboard } from './components/ImpactDashboard.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { ReviewerUser, ImpactStats, Category } from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [explorerCategory, setExplorerCategory] = useState<Category | undefined>(undefined);
  const [activeModalReportId, setActiveModalReportId] = useState<string | null>(null);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  // Reviewer session state
  const [reviewerUser, setReviewerUser] = useState<ReviewerUser | null>(null);
  const [reviewerToken, setReviewerToken] = useState<string | null>(() => {
    return localStorage.getItem('cis_reviewer_token');
  });

  // Global impact statistics from SQLite
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Verify stored reviewer token on boot
  useEffect(() => {
    if (reviewerToken) {
      fetch('/api/reviewer/me', {
        headers: { Authorization: `Bearer ${reviewerToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          setReviewerUser(data.reviewer);
        })
        .catch(() => {
          setReviewerToken(null);
          setReviewerUser(null);
          localStorage.removeItem('cis_reviewer_token');
        });
    }
  }, [reviewerToken]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogin = (token: string, user: ReviewerUser) => {
    setReviewerToken(token);
    setReviewerUser(user);
    localStorage.setItem('cis_reviewer_token', token);
  };

  const handleLogout = () => {
    setReviewerToken(null);
    setReviewerUser(null);
    localStorage.removeItem('cis_reviewer_token');
  };

  const handleNavigate = (tab: NavTab, initialCategory?: Category) => {
    if (initialCategory) {
      setExplorerCategory(initialCategory);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReport = (reportId: string) => {
    setActiveModalReportId(reportId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Bar Contract Navigation */}
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        reviewerLoggedIn={Boolean(reviewerUser)}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
            stats={stats}
            loadingStats={loadingStats}
          />
        )}

        {activeTab === 'explorer' && (
          <ReportsExplorer
            initialCategory={explorerCategory}
            onOpenReport={handleOpenReport}
            onNavigateToReport={() => handleNavigate('report')}
          />
        )}

        {activeTab === 'report' && (
          <ReportForm
            onReportCreated={(newId) => {
              fetchStats();
              handleOpenReport(newId);
            }}
            onOpenReport={handleOpenReport}
          />
        )}

        {activeTab === 'impact' && (
          <ImpactDashboard
            stats={stats}
            loading={loadingStats}
            onRefresh={fetchStats}
            onOpenReport={handleOpenReport}
          />
        )}

        {activeTab === 'reviewer' && (
          <ReviewerDashboard
            reviewer={reviewerUser}
            reviewerToken={reviewerToken}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onOpenReportDetail={handleOpenReport}
          />
        )}
      </main>

      {/* Report Detail Modal */}
      {activeModalReportId && (
        <ReportDetailModal
          reportId={activeModalReportId}
          onClose={() => setActiveModalReportId(null)}
          onReportUpdated={() => {
            fetchStats();
          }}
        />
      )}

      {/* Mock Email Notifications Outbox Modal */}
      <NotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        onOpenReport={handleOpenReport}
      />

      {/* Clean Civic Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
