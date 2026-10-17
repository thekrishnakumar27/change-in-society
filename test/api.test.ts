import assert from 'assert';
import { getDb, seedDemoData, hashPassword, createMockNotification } from '../server/db.js';
import { detectDuplicateReports, analyzeReportWithGemini } from '../server/gemini.js';

async function runTests() {
  console.log('--- Starting Change in Society API & Core Logic Tests ---');

  // Test 1: SQLite Database Initialization & Seeding
  console.log('Test 1: Testing SQLite database initialization & seeding...');
  const db = await getDb();
  assert(db !== null, 'Database instance should be initialized');

  seedDemoData(db);
  const countRes = db.exec('SELECT COUNT(*) as count FROM reports');
  const count = countRes[0]?.values[0]?.[0] as number;
  assert(count >= 5, `Expected at least 5 seeded demo reports, got ${count}`);
  console.log(`✓ Seeded demo reports verified: ${count} records.`);

  // Test 2: Report Creation and Validation
  console.log('Test 2: Testing report creation and validation...');
  const testId = 'CIS-2026-9999';
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO reports (id, title, description, category, city_locality, status, is_synthetic, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      testId,
      'Test broken sidewalk outside community center',
      'Extensive crumbling pavement posing safety risk for pedestrians and seniors.',
      'Roads and Potholes',
      'Testville District 3',
      'Submitted',
      0,
      now,
      now,
    ]
  );

  const fetchStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
  fetchStmt.bind([testId]);
  assert(fetchStmt.step(), 'Newly created report should exist');
  const fetched = fetchStmt.getAsObject() as any;
  fetchStmt.free();

  assert.strictEqual(fetched.id, testId);
  assert.strictEqual(fetched.status, 'Submitted');
  assert.strictEqual(fetched.is_synthetic, 0);
  console.log('✓ Report creation and persistence verified.');

  // Test 3: Search and Filtering
  console.log('Test 3: Testing search and filtering query...');
  const searchStmt = db.prepare(`
    SELECT * FROM reports
    WHERE category = ? AND (title LIKE ? OR description LIKE ?)
  `);
  searchStmt.bind(['Roads and Potholes', '%pothole%', '%pothole%']);
  const searchResults: any[] = [];
  while (searchStmt.step()) {
    searchResults.push(searchStmt.getAsObject());
  }
  searchStmt.free();
  assert(searchResults.length > 0, 'Should find at least 1 Roads and Potholes report matching "pothole"');
  console.log(`✓ Search & filtering verified: ${searchResults.length} matches found.`);

  // Test 4: Duplicate Report Detection
  console.log('Test 4: Testing duplicate detection engine...');
  const existingStmt = db.prepare('SELECT id, title, description, category, city_locality as cityLocality, status FROM reports');
  const existingList: any[] = [];
  while (existingStmt.step()) {
    existingList.push(existingStmt.getAsObject());
  }
  existingStmt.free();

  const dupResult = await detectDuplicateReports(
    {
      title: 'Pothole on 4th Ave near Elm Street',
      description: 'Dangerous road hole in the right lane damaging cars near Elm',
      category: 'Roads and Potholes',
      cityLocality: 'Metro District, Ward 4',
    },
    existingList
  );

  assert(dupResult.hasPotentialDuplicate, 'Should detect potential duplicate for 4th Ave pothole');
  assert(dupResult.matches.length > 0, 'Should return matching candidates');
  console.log(`✓ Duplicate detection verified. Found match: ${dupResult.matches[0].title} (Score: ${dupResult.matches[0].similarityScore})`);

  // Test 5: Community Contributions
  console.log('Test 5: Testing community contribution recording...');
  const contribId = 'CONT-TEST-01';
  db.run(
    `INSERT INTO community_contributions (id, report_id, author_name, contribution_type, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [contribId, testId, 'Civic Neighbor', 'Observation', 'Confirmed the issue is still active this morning.', now]
  );
  const countContrib = db.exec(`SELECT COUNT(*) FROM community_contributions WHERE report_id = '${testId}'`);
  assert.strictEqual(countContrib[0]?.values[0]?.[0], 1);
  console.log('✓ Community contribution recorded and linked correctly.');

  // Test 6: Resolution Evidence Submission & Status Transition
  console.log('Test 6: Testing resolution evidence submission and status transition...');
  const evidId = 'EVID-TEST-01';
  db.run(
    `INSERT INTO resolution_evidence (id, report_id, submitter_role, description, photo_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [evidId, testId, 'Fixer Volunteer', 'Pavement leveled and smooth concrete cured.', '', 'Pending Review', now]
  );
  db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', ['Resolution Submitted', now, testId]);

  const verifyStmt = db.prepare('SELECT status FROM reports WHERE id = ?');
  verifyStmt.bind([testId]);
  verifyStmt.step();
  const updatedStatus = (verifyStmt.getAsObject() as any).status;
  verifyStmt.free();
  assert.strictEqual(updatedStatus, 'Resolution Submitted');
  console.log('✓ Report status correctly transitioned to "Resolution Submitted".');

  // Test 7: Reviewer Authorization and Decision (Approve / Reject)
  console.log('Test 7: Testing reviewer password hashing & evidence approval...');
  const reviewerRow = db.exec("SELECT * FROM reviewers WHERE email = 'reviewer@changeinsociety.org'");
  assert(reviewerRow.length > 0, 'Default reviewer account should exist');
  const user = reviewerRow[0].values[0];
  const salt = user[3] as string;
  const storedHash = user[2] as string;

  const validPasswordCheck = hashPassword('ChangeAdmin2026!', salt);
  assert.strictEqual(validPasswordCheck, storedHash, 'Reviewer password verification must pass');

  const invalidPasswordCheck = hashPassword('WrongPassword', salt);
  assert.notStrictEqual(invalidPasswordCheck, storedHash, 'Invalid password must be rejected');

  // Reviewer approves evidence
  db.run(
    `UPDATE resolution_evidence SET status = 'Approved', reviewer_feedback = 'Verified clean repair', reviewed_by = 'Elena Rostova', reviewed_at = ?
     WHERE id = ?`,
    [now, evidId]
  );
  db.run("UPDATE reports SET status = 'Resolved' WHERE id = ?", [testId]);

  const resolvedCheck = db.prepare('SELECT status FROM reports WHERE id = ?');
  resolvedCheck.bind([testId]);
  resolvedCheck.step();
  const finalStatus = (resolvedCheck.getAsObject() as any).status;
  resolvedCheck.free();
  assert.strictEqual(finalStatus, 'Resolved');
  console.log('✓ Reviewer authorized verification successfully resolved report.');

  // Test 8: AI Graceful Fallback Mode (No API Key Required)
  console.log('Test 8: Testing AI analysis fallback mode without Gemini API key...');
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY; // Simulate missing key

  const fallbackAnalysis = await analyzeReportWithGemini({
    title: 'Overflowing trash dumpster on Market Street',
    description: 'Piles of solid waste and plastic bags scattered near transit stop.',
  });

  assert.strictEqual(fallbackAnalysis.suggestedCategory, 'Garbage and Sanitation');
  assert(fallbackAnalysis.isFallback, 'Should flag as fallback analysis');
  assert(fallbackAnalysis.keywords.length > 0, 'Should extract fallback keywords');
  assert(fallbackAnalysis.missingDetailsSuggestions.length > 0, 'Should provide constructive missing details suggestions');
  console.log(`✓ AI Fallback functional: category="${fallbackAnalysis.suggestedCategory}", keywords=${fallbackAnalysis.keywords.join(', ')}`);

  // Restore env key if previously set
  if (originalKey) process.env.GEMINI_API_KEY = originalKey;

  // Test 9: Mock Email Notification System for 'In Progress' and 'Resolved'
  console.log('Test 9: Testing mock email notifications on "In Progress" and "Resolved" status changes...');
  const notifReportId = 'CIS-2026-8888';
  db.run(
    `INSERT INTO reports (id, title, description, category, city_locality, reporter_email, status, is_synthetic, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notifReportId,
      'Test dark walkway streetlight fixture',
      'Streetlight flickering and completely out.',
      'Streetlights',
      'North Ward 2',
      'resident.test@neighborhood.org',
      'Submitted',
      0,
      now,
      now,
    ]
  );

  // 1. Trigger 'In Progress' notification
  const inProgressNotif = createMockNotification(db, notifReportId, 'In Progress', 'Field crew dispatched with replacement LED fixture.');
  assert(inProgressNotif !== null, 'Notification should be created for In Progress');
  assert.strictEqual(inProgressNotif.recipient_email, 'resident.test@neighborhood.org');
  assert.strictEqual(inProgressNotif.event_type, 'STATUS_IN_PROGRESS');
  assert(inProgressNotif.subject.includes(notifReportId), 'Subject should include report ID');
  assert(inProgressNotif.body_text.includes('IN PROGRESS'), 'Body should specify IN PROGRESS status');

  // 2. Trigger 'Resolved' notification
  const resolvedNotif = createMockNotification(db, notifReportId, 'Resolved', 'Inspector verified lamp is brightly illuminated.');
  assert(resolvedNotif !== null, 'Notification should be created for Resolved');
  assert.strictEqual(resolvedNotif.recipient_email, 'resident.test@neighborhood.org');
  assert.strictEqual(resolvedNotif.event_type, 'STATUS_RESOLVED');
  assert(resolvedNotif.body_html.includes('VERIFIED RESOLVED'), 'HTML email should celebrate verified resolution');

  // Verify persistence in SQLite table
  const notifRows = db.exec(`SELECT COUNT(*) FROM mock_notifications WHERE report_id = '${notifReportId}'`);
  assert.strictEqual(notifRows[0]?.values[0]?.[0], 2, 'Should persist exactly 2 mock notifications for this report');
  console.log('✓ Mock email notification system verified for both "In Progress" and "Resolved" transitions.');

  // Clean up test reports & notifications
  db.run('DELETE FROM mock_notifications WHERE report_id = ?', [notifReportId]);
  db.run('DELETE FROM reports WHERE id = ?', [notifReportId]);
  db.run('DELETE FROM resolution_evidence WHERE id = ?', [evidId]);
  db.run('DELETE FROM community_contributions WHERE id = ?', [contribId]);
  db.run('DELETE FROM reports WHERE id = ?', [testId]);

  console.log('--- ALL 9 TEST SUITES PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
