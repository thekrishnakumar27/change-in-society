import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Upload,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import { Category, AiAnalysisResult, DuplicateDetectionResult } from '../types/index.ts';

const CATEGORIES: Category[] = [
  'Roads and Potholes',
  'Garbage and Sanitation',
  'Streetlights',
  'Water and Drainage',
  'Public Facilities',
  'Accessibility',
  'Public Safety',
  'Other',
];

interface ReportFormProps {
  onReportCreated: (newReportId: string) => void;
  onOpenReport: (reportId: string) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  onReportCreated,
  onOpenReport,
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Roads and Potholes');
  const [cityLocality, setCityLocality] = useState('');
  const [preciseLocation, setPreciseLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // UI States
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Duplicate detection state
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateWarningDismissed, setDuplicateWarningDismissed] = useState(false);

  // Submission success
  const [createdReport, setCreatedReport] = useState<{
    id: string;
    title: string;
    category: string;
    created_at: string;
  } | null>(null);

  // Geolocation helper
  const handleGetCoordinates = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
      }
    );
  };

  // Photo file upload helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationErrors((prev) => ({
        ...prev,
        photo: 'Please upload a valid image file (PNG, JPG, WebP).',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        photo: 'Photo exceeds 5MB size limit. Please upload a smaller image.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy.photo;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // AI Analysis with Gemini
  const handleAiAnalysis = async () => {
    if (!title && !description) {
      setValidationErrors((prev) => ({
        ...prev,
        general: 'Please enter at least a title or description before requesting AI analysis.',
      }));
      return;
    }

    setIsAnalyzingAi(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          cityLocality,
        }),
      });

      if (!res.ok) {
        throw new Error('AI analysis failed.');
      }

      const data: AiAnalysisResult = await res.json();
      setAiResult(data);
      if (data.suggestedCategory) {
        setCategory(data.suggestedCategory);
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err);
      setAiError('AI analysis service is temporarily busy. Fallback categorization active.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Duplicate Check
  const checkForDuplicates = async (): Promise<boolean> => {
    if (!title || !description) return false;

    setIsCheckingDuplicates(true);
    try {
      const res = await fetch('/api/reports/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          cityLocality,
        }),
      });

      if (res.ok) {
        const data: DuplicateDetectionResult = await res.json();
        setDuplicateResult(data);
        if (data.hasPotentialDuplicate && data.matches.length > 0) {
          setShowDuplicateModal(true);
          return true; // duplicates found
        }
      }
    } catch (err) {
      console.warn('Duplicate check error:', err);
    } finally {
      setIsCheckingDuplicates(false);
    }
    return false;
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters long.';
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long.';
    }
    if (!cityLocality.trim() || cityLocality.trim().length < 3) {
      errors.cityLocality = 'City or locality is required (at least 3 characters).';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Final Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check duplicates before submitting unless already dismissed by user
    if (!duplicateWarningDismissed) {
      const hasDuplicates = await checkForDuplicates();
      if (hasDuplicates) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        cityLocality: cityLocality.trim(),
        preciseLocation: preciseLocation.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        additionalInfo: additionalInfo.trim() || undefined,
        reporterEmail: reporterEmail.trim() || undefined,
        photoUrl: photoDataUrl || undefined,
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      setCreatedReport(data.report);
      onReportCreated(data.reportId);
    } catch (err: any) {
      setValidationErrors((prev) => ({
        ...prev,
        submission: err.message || 'Server error occurred during submission.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (createdReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Report Submitted Successfully
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Evidence Logged into Registry
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your community report has been assigned a permanent unique tracking ID.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-medium">Tracking Report ID</span>
              <span className="font-mono text-sm font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {createdReport.id}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Title</span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {createdReport.title}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500">Category:</span>{' '}
                <span className="font-medium text-slate-800">{createdReport.category}</span>
              </div>
              <div>
                <span className="text-slate-500">Initial Status:</span>{' '}
                <span className="font-semibold text-blue-700">Submitted</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenReport(createdReport.id)}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
            >
              View Report & Timeline
            </button>
            <button
              onClick={() => {
                setCreatedReport(null);
                setTitle('');
                setDescription('');
                setCityLocality('');
                setPreciseLocation('');
                setAdditionalInfo('');
                setPhotoDataUrl(null);
                setAiResult(null);
                setDuplicateWarningDismissed(false);
              }}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
          <span>Civic Intake</span>
          <span className="text-slate-300">·</span>
          <span>Verified Citizen Registry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Report a Community Problem
        </h1>
        <p className="text-sm text-slate-600">
          Provide accurate information and optional photos. Your report will be recorded persistently and open for community evidence.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Validation Errors banner */}
        {validationErrors.submission && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to submit report</p>
              <p className="text-xs mt-0.5">{validationErrors.submission}</p>
            </div>
          </div>
        )}

        {validationErrors.general && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            {validationErrors.general}
          </div>
        )}

        {/* Section 1: Issue Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              01. Issue Description & AI Analysis
            </h2>
            <button
              type="button"
              onClick={handleAiAnalysis}
              disabled={isAnalyzingAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isAnalyzingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  <span>Analyze with Gemini AI</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Report Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hazardous deep pothole in right lane on 4th Avenue"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                validationErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-teal-500`}
            />
            {validationErrors.title && (
              <p className="text-xs text-rose-600 mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the nature of the hazard, who it affects, physical dimensions, or immediate risks..."
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                validationErrors.description ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-teal-500`}
            />
            {validationErrors.description && (
              <p className="text-xs text-rose-600 mt-1">{validationErrors.description}</p>
            )}
          </div>

          {/* AI Suggestion Box */}
          {aiResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Analysis Results ({aiResult.modelUsed})
                </span>
                <span className="text-[11px] text-slate-500">
                  {aiResult.isFallback ? 'Fallback Engine' : 'Gemini 3.8 Flash'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Suggested Category:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{aiResult.suggestedCategory}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{aiResult.categoryReasoning}</p>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Concise Summary:</span>
                  <p className="text-slate-800 font-medium mt-0.5">{aiResult.conciseSummary}</p>
                </div>
              </div>

              {aiResult.keywords && aiResult.keywords.length > 0 && (
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Identified Civic Keywords:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {aiResult.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.missingDetailsSuggestions && aiResult.missingDetailsSuggestions.length > 0 && (
                <div className="text-xs bg-amber-50/70 border border-amber-200/80 rounded p-3">
                  <span className="font-semibold text-amber-900 flex items-center gap-1 mb-1">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    Helpful Missing Details You Might Want to Add:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                    {aiResult.missingDetailsSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic">
                {aiResult.disclaimer}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Issue Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              AI suggestions are pre-filled above; you can manually adjust to any category.
            </p>
          </div>
        </div>

        {/* Section 2: Location Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              02. Location Details
            </h2>
            <button
              type="button"
              onClick={handleGetCoordinates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>Use Current GPS Coordinates</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              City or Locality <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={cityLocality}
              onChange={(e) => setCityLocality(e.target.value)}
              placeholder="e.g. Metro District, Ward 4, or High St Corridor"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                validationErrors.cityLocality ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-teal-500`}
            />
            {validationErrors.cityLocality && (
              <p className="text-xs text-rose-600 mt-1">{validationErrors.cityLocality}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Precise Location or Landmark (Optional)
            </label>
            <input
              type="text"
              value={preciseLocation}
              onChange={(e) => setPreciseLocation(e.target.value)}
              placeholder="e.g. Corner of 4th Ave & Elm St, outside GreenMart groceries"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Latitude (Optional)
              </label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 40.7128"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Longitude (Optional)
              </label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. -74.0060"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Evidence Photograph & Additional Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">
            03. Supporting Evidence & Notes
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Photograph (Optional, Max 5MB)
            </label>
            <div className="mt-1 flex flex-col sm:flex-row items-center gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 border-dashed rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Local Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photoDataUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={photoDataUrl}
                    alt="Upload preview"
                    className="w-14 h-14 object-cover rounded-md border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>
            {validationErrors.photo && (
              <p className="text-xs text-rose-600 mt-1">{validationErrors.photo}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address for Status Alerts (Optional)
            </label>
            <input
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="e.g. resident@neighborhood.org (Receive alerts when status changes to In Progress or Resolved)"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Our mock email system automatically generates simulated alerts whenever this report updates to <strong>In Progress</strong> or <strong>Resolved</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Additional Context or Affected Groups (Optional)
            </label>
            <input
              type="text"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="e.g. Near school bus stop; affects evening commuters; persists since last heavy rain."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            No private passwords required. Reports are openly verifiable for civic transparency.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={checkForDuplicates}
              disabled={isCheckingDuplicates || !title || !description}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {isCheckingDuplicates ? 'Checking Duplicates...' : 'Check Duplicates'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Registering Report...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </form>

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && duplicateResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Potential Duplicate Reports Detected</span>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Our analysis discovered existing community reports that may describe the same issue or location:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {duplicateResult.matches.map((m) => (
                <div
                  key={m.reportId}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-800">{m.reportId}</span>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      {m.similarityScore}% Similarity
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{m.title}</p>
                  <p className="text-slate-600 text-[11px]">{m.similarityReason}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDuplicateModal(false);
                        onOpenReport(m.reportId);
                      }}
                      className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <span>Open and contribute to this existing report</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 italic">
              {duplicateResult.explanation}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Return to Edit Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateWarningDismissed(true);
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                Continue Submitting Separate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
