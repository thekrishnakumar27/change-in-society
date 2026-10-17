export type ReportStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolution Submitted'
  | 'Resolved'
  | 'Reopened';

export type Category =
  | 'Roads and Potholes'
  | 'Garbage and Sanitation'
  | 'Streetlights'
  | 'Water and Drainage'
  | 'Public Facilities'
  | 'Accessibility'
  | 'Public Safety'
  | 'Other';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  city_locality: string;
  precise_location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  additional_info?: string | null;
  reporter_email?: string | null;
  status: ReportStatus;
  is_synthetic: number;
  created_at: string;
  updated_at: string;
  contributions_count?: number;
  evidence_count?: number;
}

export interface MockNotification {
  id: string;
  report_id: string;
  recipient_email: string;
  event_type: 'STATUS_IN_PROGRESS' | 'STATUS_RESOLVED';
  subject: string;
  body_text: string;
  body_html: string;
  status: string;
  created_at: string;
  report_title?: string;
  report_category?: string;
  report_current_status?: string;
}

export interface CommunityContribution {
  id: string;
  report_id: string;
  author_name: string;
  contribution_type: 'Observation' | 'Additional Photo' | 'Update' | 'Measurement';
  comment: string;
  photo_url?: string | null;
  created_at: string;
}

export interface ResolutionEvidence {
  id: string;
  report_id: string;
  submitter_role: string;
  description: string;
  photo_url: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'More Evidence Requested';
  reviewer_feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  report_id: string;
  previous_status?: string | null;
  new_status: ReportStatus;
  action_by: string;
  note?: string | null;
  created_at: string;
}

export interface ReviewerUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ImpactStats {
  totalReports: number;
  realUserReports: number;
  syntheticReports: number;
  awaitingReview: number;
  inProgress: number;
  acknowledged: number;
  resolutionSubmitted: number;
  resolved: number;
  reopened: number;
  totalContributions: number;
  verifiedEvidenceCount: number;
  categories: Array<{ category: Category; count: number; percentage: number }>;
  recentActivity: Array<{
    id: string;
    report_id: string;
    previous_status?: string | null;
    new_status: ReportStatus;
    action_by: string;
    note?: string | null;
    created_at: string;
    title: string;
    category: Category;
  }>;
}

export interface AiAnalysisResult {
  suggestedCategory: Category;
  conciseSummary: string;
  keywords: string[];
  missingDetailsSuggestions: string[];
  categoryReasoning: string;
  isFallback: boolean;
  modelUsed: string;
  disclaimer: string;
}

export interface DuplicateDetectionResult {
  hasPotentialDuplicate: boolean;
  matches: Array<{
    reportId: string;
    title: string;
    category: string;
    similarityScore: number;
    similarityReason: string;
  }>;
  isFallback: boolean;
  explanation: string;
}
