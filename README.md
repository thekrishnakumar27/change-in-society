# Change in Society

> **Small Actions. Real Change.**  
> Turn community problems into trackable, evidence-based action.

Change in Society is a civic technology platform that empowers residents to report neighborhood problems, collaborate on supporting evidence, and track verified progress toward solutions. Rather than acting as an unmonitored complaint box, Change in Society enforces **evidence-based civic verification**: every reported resolution requires physical proof and human reviewer sign-off before an issue is closed.

---

## 🌟 Main Features

1. **User Reporting System**:
   - Streamlined civic reporting for 8 core infrastructure categories: Roads & Potholes, Garbage & Sanitation, Streetlights, Water & Drainage, Public Facilities, Accessibility, Public Safety, and Other.
   - Live field validation, GPS coordinate capture, and supporting photo uploads (up to 5MB).
   - Generates unique tracking IDs (e.g., `CIS-2026-1001`) with automatic timestamping in SQLite.

2. **AI-Assisted Report Analysis (Gemini 3.8 Flash)**:
   - Automated category suggestions with clear reasoning.
   - Concise 1–2 sentence problem summarization.
   - Civic keyword extraction.
   - Constructive missing details recommendations (e.g., cross-street landmarks, peak hours, dimension estimates).
   - **User-Editable & Fallback-Resilient**: Users retain full control to edit suggestions; runs in a clearly labeled local rule-based fallback mode if no Gemini API key is configured.

3. **Pre-Submission Duplicate Detection**:
   - Compares incoming report titles, descriptions, categories, and localities against database records.
   - Flags potential duplicates with percentage similarity scores and plain-language explanations.
   - Empowers users to view and contribute to existing cases rather than fragmenting community attention.

4. **Community Collaboration**:
   - Open participation without exposing private user credentials.
   - Residents can contribute field observations, status updates, additional photos, and measurements.

5. **Physical Resolution Evidence & Verification**:
   - Distinguishes the platform from basic complaint forms: residents and fixers can upload photographs and descriptions of completed repairs.
   - Submissions automatically transition the report to `"Resolution Submitted"`.
   - Authorized human reviewers inspect proof before marking the issue `"Resolved"`.

6. **Reviewer & Admin Dashboard**:
   - Server-side token authentication with scrypt password hashing.
   - Reviewer queue management, status transition logging, and evidence inspection modal.
   - Actions to **Approve & Resolve**, **Reject Evidence with Reason**, or **Request Additional Proof**.

7. **Live Impact Analytics**:
   - Real-time statistics calculated directly from stored SQLite database records.
   - Clear distinction between synthetic demonstration data (`[Demo]`) and real user submissions.
   - One-click "Reset Demo Data" control for hackathon judges to evaluate fresh reporting and verification flows.

8. **Mock Email Notification System**:
   - Dispatches simulated email alerts whenever a report's status transitions to **`In Progress`** or **`Resolved`**.
   - Citizen reporters can optionally provide their email address when submitting reports.
   - Built-in **Email Alerts Outbox** modal accessible from the top navigation bar with full HTML and plain text email previews.
   - Dedicated **Email Alerts** tab in the Report Details view displaying all notifications generated for that report.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express.js REST API
- **Database**: SQLite (via `sql.js` WebAssembly engine with persistent disk storage in `/data/change_in_society.sqlite`)
- **AI Integration**: Google Gen AI SDK (`@google/genai`) with `gemini-3.8-flash` model, server-side only
- **Authentication**: Token-based reviewer sessions with Node.js crypto (salted scrypt hashing)
- **Testing**: Node / TSX test runner covering database persistence, duplicate detection, auth, and AI fallback

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- Optional: Gemini API key (from [Google AI Studio](https://aistudio.google.com/))

---

## 🚀 Installation & Setup

### 1. Clone or Open the Project
Navigate to the project root directory.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:

**On Linux / macOS / Bash:**
```bash
cp .env.example .env
```

**On Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

Edit `.env` and set your optional Gemini API key:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
PORT=3000
```
> *Note: If no API key is provided, the application automatically runs in **Offline Fallback Mode** with rule-based categorization and duplicate matching.*

---

## 💻 Running the Application

### Running with Windows PowerShell

```powershell
# Step 1: Install dependencies
npm install

# Step 2: Start the fullstack development server
npm run dev
```

### Running with Standard Bash / Linux / macOS

```bash
# Step 1: Install dependencies
npm install

# Step 2: Start the fullstack development server
npm run dev
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 🧪 Running Automated Tests

Run the test suite to verify database initialization, duplicate detection, status transitions, reviewer authentication, and AI fallback:

```bash
npm test
```

**Expected output:**
```
--- Starting Change in Society API & Core Logic Tests ---
Test 1: Testing SQLite database initialization & seeding...
✓ Seeded demo reports verified: 6 records.
Test 2: Testing report creation and validation...
✓ Report creation and persistence verified.
Test 3: Testing search and filtering query...
✓ Search & filtering verified: 1 matches found.
Test 4: Testing duplicate detection engine...
✓ Duplicate detection verified. Found match: Deep hazardous pothole on 4th Avenue near Elm Street intersection (Score: 95)
Test 5: Testing community contribution recording...
✓ Community contribution recorded and linked correctly.
Test 6: Testing resolution evidence submission and status transition...
✓ Report status correctly transitioned to "Resolution Submitted".
Test 7: Testing reviewer password hashing & evidence approval...
✓ Reviewer authorized verification successfully resolved report.
Test 8: Testing AI analysis fallback mode without Gemini API key...
✓ AI Fallback functional: category="Garbage and Sanitation", keywords=overflowing, trash, dumpster, market, street
--- ALL 8 TEST SUITES PASSED SUCCESSFULLY ---
```

---

## 🧭 Hackathon Demonstration Workflow for Judges

Follow this 5-minute walkthrough to test all features:

1. **Explore Existing Reports**:
   - Go to **Explore Reports**.
   - Filter by category (e.g., *Roads and Potholes*) or search *"pothole"*.
   - Click report `CIS-2026-1001` to view its history timeline and community comments.

2. **Test Duplicate Detection & AI Assistance**:
   - Click **Report a Problem** in the top bar.
   - Enter:
     - Title: `Deep hazardous pothole on 4th Avenue near Elm Street`
     - Description: `Large crater damaging car tires outside GreenMart groceries.`
     - Locality: `Metro District, Ward 4`
   - Click **Analyze with Gemini AI**: Observe suggested category, keywords, and missing detail tips.
   - Click **Check Duplicates**: Observe the duplicate detection banner identifying `CIS-2026-1001` with a high similarity score and explanation.
   - Click **Continue Submitting Separate Report** (or change title to a new issue like `Broken park bench at Green Park`).
   - Submit the report: Notice the newly created unique report ID.

3. **Add Community Contribution**:
   - In any report details view, switch to the **Community Notes** tab.
   - Post an observation note (e.g., *"Work crew spotted setting up cones this afternoon"*).
   - Verify the note appears immediately with an audit timestamp.

4. **Submit Resolution Evidence**:
   - In report `CIS-2026-1001` (or your newly submitted report), switch to **Verification** tab.
   - Click **+ Submit Resolution Proof**.
   - Provide a description of the completed physical fix and attach an optional photo.
   - Submit: Notice the report status immediately changes to `"Resolution Submitted"`.

5. **Log in to the Reviewer Portal & Verify Evidence**:
   - Click **Reviewer Portal** in the navigation bar.
   - Sign in using pre-filled demo reviewer credentials:
     - **Email**: `reviewer@changeinsociety.org`
     - **Password**: `ChangeAdmin2026!`
   - Notice the table highlights reports with `"Resolution Submitted"`.
   - Click **Verify Evidence**: Inspect the submitted photo and description.
   - Enter inspector audit notes and click **✓ Approve & Resolve**.
   - Observe the report status permanently update to `"Resolved"`.

6. **Examine Live Impact Metrics**:
   - Click **Community Impact** in the navigation bar.
   - Verify the live counts update directly from SQLite database records.
   - Test the **Reset Demo Data** button to restore initial baseline data.

---

## 🔐 Security & Responsible AI Considerations

- **Server-Side API Keys**: Gemini API calls are executed strictly from server-side Node.js routes (`/api/ai/*`). The key is never exposed to browser bundles.
- **Server-Enforced Authorization**: Reviewer status updates and evidence approvals are authenticated via Bearer session tokens validated on the server.
- **No Hallucinated Resolutions**: AI never marks an issue resolved; human reviewer sign-off on physical evidence is strictly required.
- **Privacy Protection**: Citizen contributors are not required to submit sensitive personal data or passwords to log reports.
- **Persistent Storage**: Data is saved to SQLite disk storage (`data/change_in_society.sqlite`) and persists across server restarts.

---

## 🚧 Limitations & Future Roadmap

- **Municipal API Connectors**: Future versions could integrate standard Open311 APIs for bi-directional dispatch with municipal work order systems.
- **Geographic Map Visualization**: Adding interactive MapLibre/Leaflet maps for geospatial cluster heatmaps across city wards.
- **Multi-Role RBAC**: Expanding reviewer tiers (Ward Inspectors, Municipal Engineers, Community Organizers) with custom approval thresholds.

---

## 📜 License

Licensed under the Apache-2.0 License.
