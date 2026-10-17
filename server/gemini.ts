import { GoogleGenAI, Type } from '@google/genai';

export const VALID_CATEGORIES = [
  'Roads and Potholes',
  'Garbage and Sanitation',
  'Streetlights',
  'Water and Drainage',
  'Public Facilities',
  'Accessibility',
  'Public Safety',
  'Other',
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

export interface AiReportAnalysis {
  suggestedCategory: Category;
  conciseSummary: string;
  keywords: string[];
  missingDetailsSuggestions: string[];
  categoryReasoning: string;
  isFallback: boolean;
  modelUsed: string;
  disclaimer: string;
}

export interface DuplicateCheckCandidate {
  title: string;
  description: string;
  category?: string;
  cityLocality?: string;
}

export interface ExistingReportSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  cityLocality: string;
  status: string;
}

export interface DuplicateMatchResult {
  hasPotentialDuplicate: boolean;
  matches: Array<{
    reportId: string;
    title: string;
    category: string;
    similarityScore: number; // 0 to 100
    similarityReason: string;
  }>;
  isFallback: boolean;
  explanation: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Fallback heuristic categorization and summary when Gemini API is unavailable
 */
function runFallbackAnalysis(input: {
  title: string;
  description: string;
  category?: string;
  cityLocality?: string;
}): AiReportAnalysis {
  const text = `${input.title} ${input.description}`.toLowerCase();
  let suggestedCategory: Category = 'Other';
  let categoryReasoning = 'Heuristic keyword match on civic infrastructure terms.';

  if (text.match(/pothole|crater|asphalt|road|tarmac|curb|pavement|sidewalk|traffic lane/)) {
    suggestedCategory = 'Roads and Potholes';
    categoryReasoning = 'Detected roadway/pavement and pothole keywords.';
  } else if (text.match(/garbage|trash|waste|dump|litter|bins|sanitation|debris|rubbish/)) {
    suggestedCategory = 'Garbage and Sanitation';
    categoryReasoning = 'Detected solid waste and sanitation related keywords.';
  } else if (text.match(/streetlight|lamp|lighting|dark|bulb|illumination|pole/)) {
    suggestedCategory = 'Streetlights';
    categoryReasoning = 'Detected street illumination and pole fixture keywords.';
  } else if (text.match(/water|leak|pipe|drain|drainage|flooding|sewage|burst|runoff/)) {
    suggestedCategory = 'Water and Drainage';
    categoryReasoning = 'Detected water flow, pipeline, or storm drainage terminology.';
  } else if (text.match(/ramp|wheelchair|disability|accessible|elevator|handrail|tactile|barrier/)) {
    suggestedCategory = 'Accessibility';
    categoryReasoning = 'Detected barrier-free accessibility and mobility accessibility terms.';
  } else if (text.match(/park|bench|toilet|restroom|playground|facility|community center|shelter/)) {
    suggestedCategory = 'Public Facilities';
    categoryReasoning = 'Detected civic park, sanitation facility, or public building amenities.';
  } else if (text.match(/safety|crime|blind spot|hazard|wires|exposed|danger|unlit alley/)) {
    suggestedCategory = 'Public Safety';
    categoryReasoning = 'Detected safety hazard indicators.';
  }

  // Keywords extraction
  const tokens = text.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const stopWords = new Set(['the', 'and', 'with', 'for', 'this', 'that', 'near', 'from', 'have', 'been', 'there', 'what', 'some', 'also']);
  const freq: Record<string, number> = {};
  for (const t of tokens) {
    if (t.length > 3 && !stopWords.has(t)) {
      freq[t] = (freq[t] || 0) + 1;
    }
  }
  const keywords = Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 5);

  const missingDetails: string[] = [];
  if (!text.match(/outside|corner|near|cross|street|avenue|blvd|rd|gate|block/)) {
    missingDetails.push('Specific landmark or cross-street to pinpoint exact spot');
  }
  if (!text.match(/morning|evening|night|rush|day|week|month|since/)) {
    missingDetails.push('Duration of problem (e.g. how many days it has persisted)');
  }
  if (!text.match(/photo|picture|camera|image/)) {
    missingDetails.push('Clear photographs showing close-up and wide environmental context');
  }
  if (missingDetails.length === 0) {
    missingDetails.push('Estimated dimensions or physical extent of the issue');
  }

  const conciseSummary = input.title.length > 10 ? input.title.trim() : input.description.slice(0, 120).trim();

  return {
    suggestedCategory,
    conciseSummary,
    keywords: keywords.length > 0 ? keywords : ['civic-issue', 'community', 'infrastructure'],
    missingDetailsSuggestions: missingDetails,
    categoryReasoning,
    isFallback: true,
    modelUsed: 'Heuristic Rule-Based Fallback Engine (No Gemini API Key)',
    disclaimer: 'Generated by civic rule-based system. Verify and adjust category before submitting.',
  };
}

/**
 * Analyzes report title and description using Gemini 3.8 Flash
 */
export async function analyzeReportWithGemini(input: {
  title: string;
  description: string;
  category?: string;
  cityLocality?: string;
}): Promise<AiReportAnalysis> {
  const client = getGeminiClient();

  if (!client) {
    return runFallbackAnalysis(input);
  }

  try {
    const prompt = `You are a civic infrastructure analysis assistant for "Change in Society".
Analyze this citizen-submitted community problem report:
Title: "${input.title}"
Description: "${input.description}"
Location: "${input.cityLocality || 'Not specified'}"
Current Chosen Category: "${input.category || 'Not chosen yet'}"

Allowed categories:
- Roads and Potholes
- Garbage and Sanitation
- Streetlights
- Water and Drainage
- Public Facilities
- Accessibility
- Public Safety
- Other

Provide a structured assessment:
1. suggestedCategory: Must strictly be one of the 8 allowed categories above.
2. categoryReasoning: 1 concise sentence explaining why this category fits.
3. conciseSummary: A professional, objective 1-2 sentence summary of the reported issue.
4. keywords: 3-5 concise civic tags (e.g., "pothole hazard", "drain blockage", "pedestrian safety").
5. missingDetailsSuggestions: 2-3 specific, constructive details the reporter could add to help civic reviewers or repair crews.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCategory: {
              type: Type.STRING,
              description: 'One of the 8 allowed categories',
            },
            categoryReasoning: {
              type: Type.STRING,
            },
            conciseSummary: {
              type: Type.STRING,
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            missingDetailsSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'suggestedCategory',
            'categoryReasoning',
            'conciseSummary',
            'keywords',
            'missingDetailsSuggestions',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const validCategory = (VALID_CATEGORIES as readonly string[]).includes(parsed.suggestedCategory)
      ? (parsed.suggestedCategory as Category)
      : 'Other';

    return {
      suggestedCategory: validCategory,
      conciseSummary: parsed.conciseSummary || input.title,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      missingDetailsSuggestions: Array.isArray(parsed.missingDetailsSuggestions)
        ? parsed.missingDetailsSuggestions
        : [],
      categoryReasoning: parsed.categoryReasoning || 'AI analysis based on provided issue details.',
      isFallback: false,
      modelUsed: 'gemini-3.8-flash',
      disclaimer: 'AI-assisted suggestions may be imperfect. Please review and edit before submitting.',
    };
  } catch (err) {
    console.warn('Gemini API call failed, using graceful fallback:', err);
    return runFallbackAnalysis(input);
  }
}

/**
 * Checks for potential duplicate reports
 */
export async function detectDuplicateReports(
  candidate: DuplicateCheckCandidate,
  existingReports: ExistingReportSummary[]
): Promise<DuplicateMatchResult> {
  if (existingReports.length === 0) {
    return {
      hasPotentialDuplicate: false,
      matches: [],
      isFallback: false,
      explanation: 'No existing reports in database to compare against.',
    };
  }

  // Calculate local word similarity first to narrow down candidates
  const candidateWords = new Set(
    `${candidate.title} ${candidate.description} ${candidate.cityLocality || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const scoredList = existingReports.map((item) => {
    const itemWords = new Set(
      `${item.title} ${item.description} ${item.cityLocality || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    let commonCount = 0;
    candidateWords.forEach((word) => {
      if (itemWords.has(word)) commonCount++;
    });

    const totalWords = new Set([...candidateWords, ...itemWords]).size;
    const jaccard = totalWords > 0 ? (commonCount / totalWords) * 100 : 0;

    let score = jaccard * 1.5;
    if (candidate.category && candidate.category === item.category) {
      score += 25;
    }
    if (
      candidate.cityLocality &&
      item.cityLocality &&
      (candidate.cityLocality.toLowerCase().includes(item.cityLocality.toLowerCase()) ||
        item.cityLocality.toLowerCase().includes(candidate.cityLocality.toLowerCase()))
    ) {
      score += 20;
    }

    return {
      item,
      score: Math.min(Math.round(score), 99),
    };
  });

  // Filter possible matches with score >= 40
  const likelyMatches = scoredList.filter((s) => s.score >= 38).sort((a, b) => b.score - a.score);

  if (likelyMatches.length === 0) {
    return {
      hasPotentialDuplicate: false,
      matches: [],
      isFallback: false,
      explanation: 'No similar existing reports detected in this locality or category.',
    };
  }

  const topMatches = likelyMatches.slice(0, 3);
  const client = getGeminiClient();

  if (client) {
    try {
      const topContext = topMatches
        .map(
          (m) =>
            `Report ID: ${m.item.id}\nTitle: "${m.item.title}"\nDescription: "${m.item.description}"\nLocation: "${m.item.cityLocality}"\nCategory: "${m.item.category}"`
        )
        .join('\n\n');

      const prompt = `You are a civic duplicate detection assistant for "Change in Society".
A citizen is drafting a new community problem report:
New Report Title: "${candidate.title}"
New Report Description: "${candidate.description}"
Location: "${candidate.cityLocality || 'Not specified'}"
Category: "${candidate.category || 'Not specified'}"

Compare this against these existing database reports:
${topContext}

Determine if this new submission appears to describe the SAME real-world problem or location.
For each existing report, provide:
- reportId
- similarityScore (integer 0 to 100)
- similarityReason (1-2 sentences explaining why they may be similar or distinct)
- overallDuplicateFound (true if similarityScore >= 60 for any report)`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallDuplicateFound: { type: Type.BOOLEAN },
              overallExplanation: { type: Type.STRING },
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reportId: { type: Type.STRING },
                    similarityScore: { type: Type.INTEGER },
                    similarityReason: { type: Type.STRING },
                  },
                  required: ['reportId', 'similarityScore', 'similarityReason'],
                },
              },
            },
            required: ['overallDuplicateFound', 'overallExplanation', 'matches'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const matches = (parsed.matches || []).map((m: any) => {
        const original = topMatches.find((tm) => tm.item.id === m.reportId);
        return {
          reportId: m.reportId,
          title: original ? original.item.title : 'Report ' + m.reportId,
          category: original ? original.item.category : '',
          similarityScore: m.similarityScore || 50,
          similarityReason: m.similarityReason || 'Similar keywords and neighborhood context.',
        };
      });

      return {
        hasPotentialDuplicate: Boolean(parsed.overallDuplicateFound) || matches.some((m: any) => m.similarityScore >= 60),
        matches,
        isFallback: false,
        explanation: parsed.overallExplanation || 'Semantic comparison completed via Gemini 3.8 Flash.',
      };
    } catch (err) {
      console.warn('Gemini duplicate check failed, using heuristic comparison:', err);
    }
  }

  // Fallback explanation if Gemini is unavailable
  const matches = topMatches.map((m) => ({
    reportId: m.item.id,
    title: m.item.title,
    category: m.item.category,
    similarityScore: m.score,
    similarityReason: `Shares similar civic terminology in category "${m.item.category}" and location "${m.item.cityLocality}".`,
  }));

  return {
    hasPotentialDuplicate: matches.some((m) => m.similarityScore >= 50),
    matches,
    isFallback: true,
    explanation: 'Checked via local vocabulary and category matching engine.',
  };
}
