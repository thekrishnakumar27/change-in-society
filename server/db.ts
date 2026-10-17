import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'change_in_society.sqlite');

let dbInstance: Database | null = null;

// Password hashing helpers
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to read existing SQLite file, creating fresh DB:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb(dbInstance);

  return dbInstance;
}

export function saveDb(db: Database): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist database to file:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      city_locality TEXT NOT NULL,
      precise_location TEXT,
      latitude REAL,
      longitude REAL,
      photo_url TEXT,
      additional_info TEXT,
      reporter_email TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      is_synthetic INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mock_notifications (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      event_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_contributions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Community Member',
      contribution_type TEXT NOT NULL DEFAULT 'Observation',
      comment TEXT NOT NULL,
      photo_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resolution_evidence (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      submitter_role TEXT DEFAULT 'Civic Resident',
      description TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending Review',
      reviewer_feedback TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      action_by TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviewers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Civic Reviewer',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      reviewer_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reviewer_id) REFERENCES reviewers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_report ON mock_notifications(report_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON mock_notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_contributions_report ON community_contributions(report_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_report ON resolution_evidence(report_id);
    CREATE INDEX IF NOT EXISTS idx_history_report ON status_history(report_id);
  `);

  // Migration safeguard for existing databases: ensure reporter_email column exists
  try {
    db.run('ALTER TABLE reports ADD COLUMN reporter_email TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Check if default reviewer exists
  const reviewerCheck = db.exec("SELECT COUNT(*) as count FROM reviewers WHERE email = 'reviewer@changeinsociety.org'");
  const reviewerCount = reviewerCheck[0]?.values[0]?.[0] as number;

  if (reviewerCount === 0) {
    const salt = generateSalt();
    const hash = hashPassword('ChangeAdmin2026!', salt);
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO reviewers (id, email, password_hash, salt, name, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['REV-001', 'reviewer@changeinsociety.org', hash, salt, 'Elena Rostova (Civic Lead)', 'Senior Reviewer', now]
    );
  }

  // Check if reports exist; if empty, seed synthetic demo data
  const reportCheck = db.exec('SELECT COUNT(*) as count FROM reports');
  const count = reportCheck[0]?.values[0]?.[0] as number;

  if (count === 0) {
    seedDemoData(db);
  }
}

export function seedDemoData(db: Database) {
  // Clear existing demo data
  db.run('DELETE FROM mock_notifications');
  db.run('DELETE FROM status_history');
  db.run('DELETE FROM resolution_evidence');
  db.run('DELETE FROM community_contributions');
  db.run('DELETE FROM reports');

  const now = Date.now();
  const dayMs = 86400000;

  const demoReports = [
    {
      id: 'CIS-2026-1001',
      title: 'Deep hazardous pothole on 4th Avenue near Elm Street intersection',
      description: 'A 2-foot wide, 6-inch deep pothole in the right traffic lane right outside the grocery store. Causing tire damage to vehicles and forcing cyclists into oncoming traffic.',
      category: 'Roads and Potholes',
      city_locality: 'Metro District, Ward 4',
      precise_location: 'Corner of 4th Ave & Elm St, outside GreenMart',
      latitude: 40.7128,
      longitude: -74.006,
      photo_url: '',
      additional_info: 'Traffic is heavy during morning 8 AM rush hours.',
      status: 'In Progress',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 5).toISOString(),
      updated_at: new Date(now - dayMs * 1).toISOString(),
    },
    {
      id: 'CIS-2026-1002',
      title: 'Streetlights unlit for 4 blocks along Oakwood Boulevard',
      description: 'Multiple overhead streetlights have been completely dark for over a week from 12th Street to 16th Street. Dark stretch feels unsafe for evening commuters and pedestrians walking home from the transit station.',
      category: 'Streetlights',
      city_locality: 'Eastside Residential, Ward 7',
      precise_location: 'Oakwood Blvd between 12th & 16th Street',
      latitude: 40.7282,
      longitude: -73.9942,
      photo_url: '',
      additional_info: 'School bus stop is located at 14th Street.',
      status: 'Acknowledged',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 4).toISOString(),
      updated_at: new Date(now - dayMs * 2).toISOString(),
    },
    {
      id: 'CIS-2026-1003',
      title: 'Overflowing community garbage dump and blocked storm drain',
      description: 'Uncollected domestic waste spilling onto sidewalk and blocking the storm water drain inlet. Creating foul odor and potential flooding if rain occurs.',
      category: 'Garbage and Sanitation',
      city_locality: 'Highland Park, Ward 2',
      precise_location: 'Opposite Community Center, 74 Pine Ridge Road',
      latitude: 40.7306,
      longitude: -73.9352,
      photo_url: '',
      additional_info: 'Local merchant association is concerned about hygiene.',
      status: 'Submitted',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 2).toISOString(),
      updated_at: new Date(now - dayMs * 2).toISOString(),
    },
    {
      id: 'CIS-2026-1004',
      title: 'Main water line valve leakage flooding pedestrian walkway',
      description: 'Fresh clean drinking water bubbling up continuously from beneath paving stones near the public library entrance, creating a stagnant pool and muddy path.',
      category: 'Water and Drainage',
      city_locality: 'Civic Center, Ward 1',
      precise_location: 'Outside Central Library East Gate',
      latitude: 40.7589,
      longitude: -73.9851,
      photo_url: '',
      additional_info: 'Water pressure in surrounding buildings has dropped.',
      status: 'Under Review',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 3).toISOString(),
      updated_at: new Date(now - dayMs * 3).toISOString(),
    },
    {
      id: 'CIS-2026-1005',
      title: 'Broken wheelchair ramp at Sunset Community Health Clinic',
      description: 'The concrete access ramp has cracked and subsided, with the safety handrail disconnected on the left side, preventing wheelchair and stroller users from safely entering.',
      category: 'Accessibility',
      city_locality: 'West Sunset, Ward 9',
      precise_location: 'Sunset Community Clinic Main Entrance',
      latitude: 40.7484,
      longitude: -73.9857,
      photo_url: '',
      additional_info: 'Elderly patients are having difficulty accessing outpatient appointments.',
      status: 'Resolution Submitted',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 6).toISOString(),
      updated_at: new Date(now - 3600000 * 4).toISOString(),
    },
    {
      id: 'CIS-2026-1006',
      title: 'Severely damaged pedestrian sidewalk and dislodged curb stones',
      description: 'Tree roots and construction vehicles cracked and lifted 15 meters of sidewalk pavers outside Maplewood Elementary, creating trip hazards for schoolchildren.',
      category: 'Roads and Potholes',
      city_locality: 'Northfield, Ward 5',
      precise_location: 'Maplewood Elementary perimeter walkway',
      latitude: 40.7829,
      longitude: -73.9654,
      photo_url: '',
      additional_info: 'Parent-Teacher Association filed initial complaint.',
      status: 'Resolved',
      is_synthetic: 1,
      created_at: new Date(now - dayMs * 12).toISOString(),
      updated_at: new Date(now - dayMs * 1).toISOString(),
    },
  ];

  for (const r of demoReports) {
    db.run(
      `INSERT INTO reports (id, title, description, category, city_locality, precise_location, latitude, longitude, photo_url, additional_info, status, is_synthetic, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.title,
        r.description,
        r.category,
        r.city_locality,
        r.precise_location,
        r.latitude,
        r.longitude,
        r.photo_url,
        r.additional_info,
        r.status,
        r.is_synthetic,
        r.created_at,
        r.updated_at,
      ]
    );

    // Initial status history
    db.run(
      `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `HIST-${r.id}-01`,
        r.id,
        null,
        'Submitted',
        'Citizen Reporter',
        'Initial report logged into Change in Society verification registry.',
        r.created_at,
      ]
    );
  }

  // Add specific history & contributions for the demo records
  // For CIS-2026-1001: In Progress
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1001-02',
      'CIS-2026-1001',
      'Submitted',
      'Acknowledged',
      'Elena Rostova (Civic Lead)',
      'Verified severe hazard on municipal bus route. Escalated to roadway maintenance dispatch.',
      new Date(now - dayMs * 4).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1001-03',
      'CIS-2026-1001',
      'Acknowledged',
      'In Progress',
      'Elena Rostova (Civic Lead)',
      'Work crew dispatched with asphalt patch truck. Safety barrels installed.',
      new Date(now - dayMs * 1).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO community_contributions (id, report_id, author_name, contribution_type, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'CONT-1001-01',
      'CIS-2026-1001',
      'Marcus Chen (Local Cyclist)',
      'Observation',
      'I commute here daily. A cyclist blew a front tire yesterday at dusk. Added an orange marker cone beside the edge.',
      new Date(now - dayMs * 3).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO community_contributions (id, report_id, author_name, contribution_type, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'CONT-1001-02',
      'CIS-2026-1001',
      'Sarah Jenkins (Store Manager)',
      'Update',
      'Municipal road maintenance crew arrived this morning with temporary barriers.',
      new Date(now - dayMs * 1).toISOString(),
    ]
  );

  // For CIS-2026-1002: Streetlights Acknowledged
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1002-02',
      'CIS-2026-1002',
      'Submitted',
      'Acknowledged',
      'Elena Rostova (Civic Lead)',
      'Reviewer logged circuit breaker failure report with public lighting department.',
      new Date(now - dayMs * 2).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO community_contributions (id, report_id, author_name, contribution_type, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'CONT-1002-01',
      'CIS-2026-1002',
      'David K. (Oakwood Neighborhood Watch)',
      'Observation',
      'Pole numbers 412 through 416 have no voltage. Tested at 9 PM yesterday.',
      new Date(now - dayMs * 2).toISOString(),
    ]
  );

  // For CIS-2026-1005: Resolution Submitted
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1005-02',
      'CIS-2026-1005',
      'Submitted',
      'In Progress',
      'Elena Rostova (Civic Lead)',
      'Contractor assigned to pour new non-slip concrete grade and weld stainless handrail.',
      new Date(now - dayMs * 3).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1005-03',
      'CIS-2026-1005',
      'In Progress',
      'Resolution Submitted',
      'Community Contributor',
      'Contractor completed concrete pouring, non-slip treatment, and handrail re-installation. Verification requested.',
      new Date(now - 3600000 * 4).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO resolution_evidence (id, report_id, submitter_role, description, photo_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'EVID-1005-01',
      'CIS-2026-1005',
      'Clinic Facility Volunteer',
      'New reinforced ramp has been poured and cured, handrails securely bolted, tactile warning pads installed at top and bottom. ADA compliant gradient verified with digital level.',
      '',
      'Pending Review',
      new Date(now - 3600000 * 4).toISOString(),
    ]
  );

  // For CIS-2026-1006: Resolved
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1006-02',
      'CIS-2026-1006',
      'Submitted',
      'In Progress',
      'Elena Rostova (Civic Lead)',
      'Sidewalk leveling and root-guard installation underway.',
      new Date(now - dayMs * 8).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1006-03',
      'CIS-2026-1006',
      'In Progress',
      'Resolution Submitted',
      'PTA Committee Lead',
      'Sidewalk pavers repaved, leveling complete, curb stones anchored. Children walking safely.',
      new Date(now - dayMs * 3).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO status_history (id, report_id, previous_status, new_status, action_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'HIST-1006-04',
      'CIS-2026-1006',
      'Resolution Submitted',
      'Resolved',
      'Elena Rostova (Civic Lead)',
      'Physical inspection confirmed: Walkway is level, tree root barrier installed, curb stones reset. Issue marked Resolved with photographic verification.',
      new Date(now - dayMs * 1).toISOString(),
    ]
  );
  db.run(
    `INSERT INTO resolution_evidence (id, report_id, submitter_role, description, photo_url, status, reviewer_feedback, reviewed_by, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'EVID-1006-01',
      'CIS-2026-1006',
      'PTA Committee Lead',
      'Complete repaving of 15m stretch along the school zone with smooth concrete pavers and restored yellow curb line.',
      '',
      'Approved',
      'Inspected and verified against municipal sidewalk standard. Full clearance for pedestrian and school traffic.',
      'Elena Rostova (Civic Lead)',
      new Date(now - dayMs * 1).toISOString(),
      new Date(now - dayMs * 3).toISOString(),
    ]
  );

  // Seed demo notifications for CIS-2026-1001 (In Progress) and CIS-2026-1006 (Resolved)
  createMockNotification(
    db,
    'CIS-2026-1001',
    'In Progress',
    'Work crew dispatched with asphalt patch truck. Safety barrels installed.'
  );

  createMockNotification(
    db,
    'CIS-2026-1006',
    'Resolved',
    'Physical inspection confirmed: Walkway is level, tree root barrier installed, curb stones reset. Issue marked Resolved with photographic verification.'
  );

  saveDb(db);
}

export function createMockNotification(
  db: Database,
  reportId: string,
  newStatus: 'In Progress' | 'Resolved',
  actionNote?: string
) {
  // Query report
  const stmt = db.prepare('SELECT id, title, category, city_locality, reporter_email FROM reports WHERE id = ?');
  stmt.bind([reportId]);
  let report: any = null;
  if (stmt.step()) {
    report = stmt.getAsObject();
  }
  stmt.free();

  if (!report) return null;

  const recipientEmail =
    report.reporter_email && report.reporter_email.trim()
      ? report.reporter_email.trim()
      : 'citizen.reporter@changeinsociety.org';

  const notificationId = `NOTIF-${reportId.replace('CIS-2026-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const eventType = newStatus === 'In Progress' ? 'STATUS_IN_PROGRESS' : 'STATUS_RESOLVED';

  let subject = '';
  let bodyText = '';
  let bodyHtml = '';

  if (newStatus === 'In Progress') {
    subject = `[Change in Society] Action Initiated on Report #${report.id}: ${report.title}`;
    bodyText = `Hello,

Your community problem report "${report.title}" (ID: ${report.id}) has been updated to IN PROGRESS.

Category: ${report.category}
Location: ${report.city_locality}
Status: IN PROGRESS
Reviewer Action: ${actionNote || 'Dispatched to civic maintenance crew.'}

Community members can track live updates and submit observations on the Change in Society verification portal.

Thank you for taking action in your community!
Change in Society Team
https://changeinsociety.org`;

    bodyHtml = `
      <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f172a; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Change in Society</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #2dd4bf;">Small Actions. Real Change.</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <div style="display: inline-block; padding: 4px 10px; background: #ccfbf1; color: #0f766e; border-radius: 6px; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
            ● STATUS: IN PROGRESS
          </div>
          <h3 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Action Dispatched for Your Report</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
            Good news! Your report <strong>"${report.title}"</strong> (Tracking ID: <code>${report.id}</code>) has been reviewed and active remediation is now underway.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;"><strong>Category:</strong> ${report.category}</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;"><strong>Location:</strong> ${report.city_locality}</p>
            <p style="margin: 0; font-size: 12px; color: #0f172a;"><strong>Reviewer Action:</strong> "${actionNote || 'Dispatched to civic maintenance crew.'}"</p>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Once work is finished, residents or fixers can upload photographic resolution evidence for final inspector verification.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from Change in Society civic verification network.
        </div>
      </div>
    `;
  } else {
    // Resolved
    subject = `[Change in Society] Verified Resolved: Report #${report.id}`;
    bodyText = `Hello,

Your community problem report "${report.title}" (ID: ${report.id}) has been marked as VERIFIED RESOLVED.

Category: ${report.category}
Location: ${report.city_locality}
Status: VERIFIED RESOLVED
Reviewer Decision: ${actionNote || 'Physical repair inspected and approved against municipal standards.'}

Photographic evidence has been checked and accepted by an authorized reviewer.

Thank you for helping make our community better!
Change in Society Team
https://changeinsociety.org`;

    bodyHtml = `
      <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f172a; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Change in Society</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #2dd4bf;">Small Actions. Real Change.</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <div style="display: inline-block; padding: 4px 10px; background: #d1fae5; color: #065f46; border-radius: 6px; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
            ✓ STATUS: VERIFIED RESOLVED
          </div>
          <h3 style="margin: 0 0 12px; font-size: 18px; color: #065f46;">Problem Successfully Resolved</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
            We are pleased to inform you that <strong>"${report.title}"</strong> (Tracking ID: <code>${report.id}</code>) has been physically repaired and officially verified.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;"><strong>Category:</strong> ${report.category}</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;"><strong>Location:</strong> ${report.city_locality}</p>
            <p style="margin: 0; font-size: 12px; color: #065f46;"><strong>Inspector Finding:</strong> "${actionNote || 'Physical repair inspected and approved against municipal standards.'}"</p>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Thank you for bringing this issue to light and driving real, measurable improvement in our surroundings.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from Change in Society civic verification network.
        </div>
      </div>
    `;
  }

  db.run(
    `INSERT INTO mock_notifications (
      id, report_id, recipient_email, event_type, subject, body_text, body_html, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [notificationId, reportId, recipientEmail, eventType, subject, bodyText, bodyHtml, 'SENT', now]
  );

  saveDb(db);

  return {
    id: notificationId,
    report_id: reportId,
    recipient_email: recipientEmail,
    event_type: eventType,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    status: 'SENT',
    created_at: now,
  };
}

