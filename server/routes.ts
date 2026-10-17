import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb, saveDb, hashPassword, seedDemoData, createMockNotification } from './db.js';
import {
  analyzeReportWithGemini,
  detectDuplicateReports,
  VALID_CATEGORIES,
} from './gemini.js';

export const router = express.Router();

// Middleware to authenticate reviewer token
async function requireReviewerAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in as an authorized reviewer.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const db = await getDb();

  const stmt = db.prepare(`
    SELECT s.token, s.expires_at, r.id, r.email, r.name, r.role
    FROM sessions s
    JOIN reviewers r ON s.reviewer_id = r.id
    WHERE s.token = ?
  `);
  stmt.bind([token]);

  let reviewer: any = null;
  if (stmt.step()) {
    reviewer = stmt.getAsObject();
  }
  stmt.free();

  if (!reviewer) {
    res.status(401).json({ error: 'Invalid session token. Please log in again.' });
    return;
  }

  if (Date.now() > reviewer.expires_at) {
    db.run('DELETE FROM sessions WHERE token = ?', [token]);
    saveDb(db);
    res.status(401).json({ error: 'Session expired. Please log in again.' });
    return;
  }

  (req as any).reviewer = reviewer;
  next();
}

/**
 * Health check & runtime status
 */
router.get('/health', (_req: Request, res: Response) => {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    status: 'ok',
    service: 'Change in Society API',
    aiStatus: {
      hasGeminiKey,
      model: hasGeminiKey ? 'gemini-3.8-flash' : 'Rule-Based Fallback Engine',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public Reviewer Login
 */
router.post('/reviewer/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM reviewers WHERE email = ?');
    stmt.bind([email.trim().toLowerCase()]);

    let user: any = null;
    if (stmt.step()) {
      user = stmt.getAsObject();
    }
    stmt.free();

    if (!user) {
      res.status(401).json({ error: 'Invalid reviewer credentials.' });
      return;
    }

    const calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash !== user.password_hash) {
      res.status(401).json({ error: 'Invalid reviewer credentials.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    db.run(
      'INSERT INTO sessions (token, reviewer_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [token, user.id, expiresAt, new Date().toISOString()]
    );
    saveDb(db);

    res.json({
      success: true,
      token,
      reviewer: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

router.get('/reviewer/me', requireReviewerAuth, (req: Request, res: Response) => {
  const r = (req as any).reviewer;
  res.json({
    reviewer: {
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
    },
  });
});

router.post('/reviewer/logout', requireReviewerAuth, async (req: Request, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  const db = await getDb();
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
  saveDb(db);
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * Get Reports with search, filter, sort
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { search, category, status, location, sort } = req.query;
    const db = await getDb();

    let query = `
      SELECT r.*,
        (SELECT COUNT(*) FROM community_contributions WHERE report_id = r.id) as contributions_count,
        (SELECT COUNT(*) FROM resolution_evidence WHERE report_id = r.id) as evidence_count
      FROM reports r
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && category !== 'All') {
      query += ' AND r.category = ?';
      params.push(category);
    }

    if (status && status !== 'All') {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (location && typeof location === 'string' && location.trim()) {
      query += ' AND (r.city_locality LIKE ? OR r.precise_location LIKE ?)';
      params.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }

    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Sort order
    if (sort === 'oldest') {
      query += ' ORDER BY r.created_at ASC';
    } else if (sort === 'contributions') {
      query += ' ORDER BY contributions_count DESC, r.created_at DESC';
    } else {
      // Default: newest
      query += ' ORDER BY r.created_at DESC';
    }

    const stmt = db.prepare(query);
    stmt.bind(params);

    const reports: any[] = [];
    while (stmt.step()) {
      reports.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ reports, count: reports.length });
  } catch (err: any) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

/**
 * Get single report by ID with history and contributions
 */
router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const reportStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    reportStmt.bind([id]);
    let report: any = null;
    if (reportStmt.step()) {
      report = reportStmt.getAsObject();
    }
    reportStmt.free();

    if (!report) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    // Contributions
    const contribStmt = db.prepare(
      'SELECT * FROM community_contributions WHERE report_id = ? ORDER BY created_at ASC'
    );
    contribStmt.bind([id]);
    const contributions: any[] = [];
    while (contribStmt.step()) {
      contributions.push(contribStmt.getAsObject());
    }
    contribStmt.free();

    // Resolution evidence
    const evidStmt = db.prepare(
      'SELECT * FROM resolution_evidence WHERE report_id = ? ORDER BY created_at DESC'
    );
    evidStmt.bind([id]);
    const resolutionEvidence: any[] = [];
    while (evidStmt.step()) {
      resolutionEvidence.push(evidStmt.getAsObject());
    }
    evidStmt.free();

    // Status timeline history
    const histStmt = db.prepare(
      'SELECT * FROM status_history WHERE report_id = ? ORDER BY created_at ASC'
    );
    histStmt.bind([id]);
    const history: any[] = [];
    while (histStmt.step()) {
      history.push(histStmt.getAsObject());
    }
    histStmt.free();

    // Mock notifications for this report
    const notifStmt = db.prepare(
      'SELECT * FROM mock_notifications WHERE report_id = ? ORDER BY created_at DESC'
    );
    notifStmt.bind([id]);
    const notifications: any[] = [];
    while (notifStmt.step()) {
      notifications.push(notifStmt.getAsObject());
    }
    notifStmt.free();

    res.json({
      report,
      contributions,
      resolutionEvidence,
      history,
      notifications,
    });
  } catch (err: any) {
    console.error('Error fetching report detail:', err);
    res.status(500).json({ error: 'Failed to retrieve report details.' });
  }
});

/**
 * Create new report
 */
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      cityLocality,
      preciseLocation,
      latitude,
      longitude,
      photoUrl,
      additionalInfo,
      reporterEmail,
    } = req.body;

    // Server-side validation
    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      res.status(400).json({ error: 'Report title must be at least 5 characters.' });
      return;
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({ error: 'Detailed description must be at least 10 characters.' });
      return;
    }
    if (!category || !(VALID_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({
        error: `Please select a valid issue category from: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }
    if (!cityLocality || typeof cityLocality !== 'string' || cityLocality.trim().length < 3) {
      res.status(400).json({ error: 'City or locality is required (at least 3 characters).' });
      return;
    }

    // Photo payload size check (max ~5MB base64)
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 7 * 1024 * 1024) {
      res.status(400).json({ error: 'Uploaded photograph exceeds maximum 5MB size limit.' });
      return;
    }

    const db = await getDb();

    // Generate unique Report ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `CIS-2026-${randomSuffix}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO reports (
        id, title, description, category, city_locality, precise_location,
        latitude, longitude, photo_url, additional_info, reporter_email, status, is_synthetic, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        title.trim(),
        description.trim(),
        category,
        cityLocality.trim(),
        preciseLocation ? preciseLocation.trim() : null,
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        photoUrl || null,
        additionalInfo ? additionalInfo.trim() : null,
        reporterEmail && typeof reporterEmail === 'string' ? reporterEmail.trim() : null,
        'Submitted',
        0, // Real user submission
        now,
        now,
      ]
    );

    // Initial status history
    db.run(
      `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `HIST-${reportId}-01`,
        reportId,
        null,
        'Submitted',
        'Citizen Reporter',
        'Problem reported and registered in civic verification queue.',
        now,
      ]
    );

    saveDb(db);

    res.status(201).json({
      success: true,
      reportId,
      message: 'Report submitted successfully. Your civic issue has been logged into the registry.',
      report: {
        id: reportId,
        title: title.trim(),
        description: description.trim(),
        category,
        city_locality: cityLocality.trim(),
        precise_location: preciseLocation || null,
        status: 'Submitted',
        created_at: now,
      },
    });
  } catch (err: any) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

/**
 * Check for duplicate reports before submission
 */
router.post('/reports/check-duplicates', async (req: Request, res: Response) => {
  try {
    const { title, description, category, cityLocality } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required for duplicate check.' });
      return;
    }

    const db = await getDb();
    const stmt = db.prepare(`
      SELECT id, title, description, category, city_locality as cityLocality, status
      FROM reports
      ORDER BY created_at DESC
      LIMIT 25
    `);

    const existing: any[] = [];
    while (stmt.step()) {
      existing.push(stmt.getAsObject());
    }
    stmt.free();

    const result = await detectDuplicateReports(
      { title, description, category, cityLocality },
      existing
    );

    res.json(result);
  } catch (err: any) {
    console.error('Error during duplicate check:', err);
    res.status(500).json({ error: 'Failed to perform duplicate check.' });
  }
});

/**
 * Gemini AI report analysis
 */
router.post('/ai/analyze-report', async (req: Request, res: Response) => {
  try {
    const { title, description, category, cityLocality } = req.body;

    if (!title && !description) {
      res.status(400).json({ error: 'Please provide at least a title or description for AI analysis.' });
      return;
    }

    const analysis = await analyzeReportWithGemini({
      title: title || '',
      description: description || '',
      category,
      cityLocality,
    });

    res.json(analysis);
  } catch (err: any) {
    console.error('Error analyzing report:', err);
    res.status(500).json({ error: 'AI analysis service temporarily unavailable.' });
  }
});

/**
 * Add Community Contribution
 */
router.post('/reports/:id/contributions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { authorName, contributionType, comment, photoUrl } = req.body;

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      res.status(400).json({ error: 'Contribution note must be at least 5 characters.' });
      return;
    }

    const db = await getDb();

    // Verify report exists
    const checkStmt = db.prepare('SELECT id FROM reports WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const contribId = `CONT-${id.replace('CIS-2026-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO community_contributions (id, report_id, author_name, contribution_type, comment, photo_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contribId,
        id,
        authorName && authorName.trim() ? authorName.trim() : 'Community Member',
        contributionType || 'Observation',
        comment.trim(),
        photoUrl || null,
        now,
      ]
    );

    // Update report's updated_at
    db.run('UPDATE reports SET updated_at = ? WHERE id = ?', [now, id]);

    saveDb(db);

    res.status(201).json({
      success: true,
      message: 'Community contribution recorded.',
      contribution: {
        id: contribId,
        report_id: id,
        author_name: authorName?.trim() || 'Community Member',
        contribution_type: contributionType || 'Observation',
        comment: comment.trim(),
        photo_url: photoUrl || null,
        created_at: now,
      },
    });
  } catch (err: any) {
    console.error('Error adding contribution:', err);
    res.status(500).json({ error: 'Failed to record contribution.' });
  }
});

/**
 * Submit Resolution Evidence
 */
router.post('/reports/:id/resolution-evidence', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, photoUrl, submitterRole } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({ error: 'Resolution evidence description must be at least 10 characters.' });
      return;
    }

    const db = await getDb();

    // Get report
    const checkStmt = db.prepare('SELECT id, status FROM reports WHERE id = ?');
    checkStmt.bind([id]);
    let currentStatus: string | null = null;
    if (checkStmt.step()) {
      currentStatus = (checkStmt.getAsObject() as any).status;
    }
    checkStmt.free();

    if (!currentStatus) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const evidenceId = `EVID-${id.replace('CIS-2026-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const histId = `HIST-${id.replace('CIS-2026-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    // Insert evidence
    db.run(
      `INSERT INTO resolution_evidence (id, report_id, submitter_role, description, photo_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        evidenceId,
        id,
        submitterRole?.trim() || 'Civic Resident',
        description.trim(),
        photoUrl || '',
        'Pending Review',
        now,
      ]
    );

    // Transition report status to "Resolution Submitted"
    db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', [
      'Resolution Submitted',
      now,
      id,
    ]);

    // Record timeline change
    db.run(
      `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        histId,
        id,
        currentStatus,
        'Resolution Submitted',
        submitterRole?.trim() || 'Community Member',
        `Resolution evidence submitted for verification: "${description.trim().slice(0, 80)}..."`,
        now,
      ]
    );

    saveDb(db);

    res.status(201).json({
      success: true,
      message: 'Resolution evidence submitted. The report is now queued for authorized reviewer verification.',
      status: 'Resolution Submitted',
      evidenceId,
    });
  } catch (err: any) {
    console.error('Error submitting resolution evidence:', err);
    res.status(500).json({ error: 'Failed to submit resolution evidence.' });
  }
});

/**
 * Reviewer updates report status (Protected)
 */
router.post('/reviewer/reports/:id/status', requireReviewerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const reviewer = (req as any).reviewer;

    const allowedStatuses = ['Under Review', 'Acknowledged', 'In Progress', 'Reopened', 'Resolved'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Allowed statuses: ${allowedStatuses.join(', ')}`,
      });
      return;
    }

    if (!note || typeof note !== 'string' || note.trim().length < 5) {
      res.status(400).json({ error: 'Reviewer action note is required (minimum 5 characters).' });
      return;
    }

    const db = await getDb();
    const checkStmt = db.prepare('SELECT id, status FROM reports WHERE id = ?');
    checkStmt.bind([id]);
    let currentStatus: string | null = null;
    if (checkStmt.step()) {
      currentStatus = (checkStmt.getAsObject() as any).status;
    }
    checkStmt.free();

    if (!currentStatus) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const now = new Date().toISOString();
    const histId = `HIST-${id.replace('CIS-2026-', '')}-${Math.floor(100 + Math.random() * 900)}`;

    db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);

    db.run(
      `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [histId, id, currentStatus, status, `${reviewer.name} (${reviewer.role})`, note.trim(), now]
    );

    // Trigger mock email notification if status is 'In Progress' or 'Resolved'
    let notification: any = null;
    if (status === 'In Progress' || status === 'Resolved') {
      notification = createMockNotification(db, id, status, note.trim());
    }

    saveDb(db);

    res.json({
      success: true,
      message: `Report status updated to "${status}".${notification ? ' Mock email notification dispatched to reporter.' : ''}`,
      newStatus: status,
      notification,
    });
  } catch (err: any) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update report status.' });
  }
});

/**
 * Reviewer Evidence Verification Decision (Protected)
 */
router.post(
  '/reviewer/evidence/:evidenceId/decision',
  requireReviewerAuth,
  async (req: Request, res: Response) => {
    try {
      const { evidenceId } = req.params;
      const { decision, feedback } = req.body; // decision: 'Approve' | 'Reject' | 'Request More Evidence'
      const reviewer = (req as any).reviewer;

      if (!['Approve', 'Reject', 'Request More Evidence'].includes(decision)) {
        res.status(400).json({
          error: 'Invalid decision. Must be Approve, Reject, or Request More Evidence.',
        });
        return;
      }

      if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 5) {
        res.status(400).json({ error: 'Reviewer feedback is required (minimum 5 characters).' });
        return;
      }

      const db = await getDb();
      const evidStmt = db.prepare('SELECT * FROM resolution_evidence WHERE id = ?');
      evidStmt.bind([evidenceId]);
      let evidence: any = null;
      if (evidStmt.step()) {
        evidence = evidStmt.getAsObject();
      }
      evidStmt.free();

      if (!evidence) {
        res.status(404).json({ error: `Evidence ${evidenceId} not found.` });
        return;
      }

      const now = new Date().toISOString();
      const reportId = evidence.report_id;
      let newEvidenceStatus = 'Pending Review';
      let newReportStatus = 'Resolution Submitted';

      if (decision === 'Approve') {
        newEvidenceStatus = 'Approved';
        newReportStatus = 'Resolved';
      } else if (decision === 'Reject') {
        newEvidenceStatus = 'Rejected';
        newReportStatus = 'In Progress';
      } else {
        newEvidenceStatus = 'More Evidence Requested';
        newReportStatus = 'In Progress';
      }

      // Update evidence
      db.run(
        `UPDATE resolution_evidence
         SET status = ?, reviewer_feedback = ?, reviewed_by = ?, reviewed_at = ?
         WHERE id = ?`,
        [newEvidenceStatus, feedback.trim(), `${reviewer.name} (${reviewer.role})`, now, evidenceId]
      );

      // Update report status
      db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', [
        newReportStatus,
        now,
        reportId,
      ]);

      // Record timeline change
      const histId = `HIST-${reportId.replace('CIS-2026-', '')}-${Math.floor(100 + Math.random() * 900)}`;
      db.run(
        `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          histId,
          reportId,
          'Resolution Submitted',
          newReportStatus,
          `${reviewer.name} (${reviewer.role})`,
          `Evidence decision: ${decision}. Reviewer Note: "${feedback.trim()}"`,
          now,
        ]
      );

      // Trigger mock email notification if status transitioned to 'Resolved' or 'In Progress'
      let notification: any = null;
      if (newReportStatus === 'Resolved') {
        notification = createMockNotification(db, reportId, 'Resolved', feedback.trim());
      } else if (newReportStatus === 'In Progress') {
        notification = createMockNotification(db, reportId, 'In Progress', feedback.trim());
      }

      saveDb(db);

      res.json({
        success: true,
        message: `Evidence verification decision recorded: ${decision}. Report updated to "${newReportStatus}".${notification ? ' Mock email notification dispatched to reporter.' : ''}`,
        evidenceStatus: newEvidenceStatus,
        reportStatus: newReportStatus,
        notification,
      });
    } catch (err: any) {
      console.error('Error processing evidence decision:', err);
      res.status(500).json({ error: 'Failed to record evidence decision.' });
    }
  }
);

/**
 * List all mock email notifications
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { reportId, limit } = req.query;
    const db = await getDb();

    let query = `
      SELECT n.*, r.title as report_title, r.category as report_category, r.status as report_current_status
      FROM mock_notifications n
      JOIN reports r ON n.report_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (reportId && typeof reportId === 'string' && reportId.trim()) {
      query += ' AND n.report_id = ?';
      params.push(reportId.trim());
    }

    query += ' ORDER BY n.created_at DESC';

    const maxRows = limit ? Math.min(Number(limit) || 20, 100) : 50;
    query += ` LIMIT ${maxRows}`;

    const stmt = db.prepare(query);
    stmt.bind(params);

    const notifications: any[] = [];
    while (stmt.step()) {
      notifications.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ notifications, count: notifications.length });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to retrieve notification records.' });
  }
});

/**
 * List mock email notifications for a specific report
 */
router.get('/reports/:id/notifications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const stmt = db.prepare(`
      SELECT * FROM mock_notifications
      WHERE report_id = ?
      ORDER BY created_at DESC
    `);
    stmt.bind([id]);

    const notifications: any[] = [];
    while (stmt.step()) {
      notifications.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ notifications, count: notifications.length });
  } catch (err: any) {
    console.error('Error fetching report notifications:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications for this report.' });
  }
});

/**
 * Community Impact Statistics (Calculated directly from SQLite database)
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Total counts
    const totalStmt = db.exec('SELECT COUNT(*) FROM reports');
    const totalReports = (totalStmt[0]?.values[0]?.[0] as number) || 0;

    const syntheticStmt = db.exec('SELECT COUNT(*) FROM reports WHERE is_synthetic = 1');
    const syntheticReports = (syntheticStmt[0]?.values[0]?.[0] as number) || 0;
    const realUserReports = totalReports - syntheticReports;

    // Status counts
    const statusRows = db.exec(`
      SELECT status, COUNT(*) as count
      FROM reports
      GROUP BY status
    `);
    const statusMap: Record<string, number> = {
      Submitted: 0,
      'Under Review': 0,
      Acknowledged: 0,
      'In Progress': 0,
      'Resolution Submitted': 0,
      Resolved: 0,
      Reopened: 0,
    };

    if (statusRows.length > 0) {
      for (const row of statusRows[0].values) {
        statusMap[row[0] as string] = row[1] as number;
      }
    }

    // Category distribution
    const catRows = db.exec(`
      SELECT category, COUNT(*) as count
      FROM reports
      GROUP BY category
      ORDER BY count DESC
    `);
    const categories: Array<{ category: string; count: number; percentage: number }> = [];
    if (catRows.length > 0) {
      for (const row of catRows[0].values) {
        const count = row[1] as number;
        categories.push({
          category: row[0] as string,
          count,
          percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
        });
      }
    }

    // Recent activity timeline
    const activityRows = db.exec(`
      SELECT h.id, h.report_id, h.previous_status, h.new_status, h.action_by, h.note, h.created_at, r.title, r.category
      FROM status_history h
      JOIN reports r ON h.report_id = r.id
      ORDER BY h.created_at DESC
      LIMIT 8
    `);
    const recentActivity: any[] = [];
    if (activityRows.length > 0) {
      const cols = activityRows[0].columns;
      for (const row of activityRows[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => (obj[c] = row[idx]));
        recentActivity.push(obj);
      }
    }

    // Verified resolutions with proof count
    const verifiedStmt = db.exec(`
      SELECT COUNT(*) FROM resolution_evidence WHERE status = 'Approved'
    `);
    const verifiedEvidenceCount = (verifiedStmt[0]?.values[0]?.[0] as number) || 0;

    // Total community contributions
    const contribStmt = db.exec('SELECT COUNT(*) FROM community_contributions');
    const totalContributions = (contribStmt[0]?.values[0]?.[0] as number) || 0;

    res.json({
      totalReports,
      realUserReports,
      syntheticReports,
      awaitingReview: (statusMap['Submitted'] || 0) + (statusMap['Under Review'] || 0),
      inProgress: statusMap['In Progress'] || 0,
      acknowledged: statusMap['Acknowledged'] || 0,
      resolutionSubmitted: statusMap['Resolution Submitted'] || 0,
      resolved: statusMap['Resolved'] || 0,
      reopened: statusMap['Reopened'] || 0,
      totalContributions,
      verifiedEvidenceCount,
      categories,
      recentActivity,
    });
  } catch (err: any) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to calculate community stats.' });
  }
});

/**
 * Reset Demo Data for Hackathon Judges
 */
router.post('/admin/reset-demo', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    seedDemoData(db);
    res.json({
      success: true,
      message: 'Demo dataset has been restored with labeled synthetic civic records.',
    });
  } catch (err: any) {
    console.error('Error resetting demo data:', err);
    res.status(500).json({ error: 'Failed to reset demo data.' });
  }
});
