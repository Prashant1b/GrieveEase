const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const anthropicKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_claude_api_key_here'
  ? process.env.ANTHROPIC_API_KEY
  : null;
const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
const huggingFaceKey = process.env.HUGGINGFACE_API_KEY || process.env.HuggingFace_API_KEY || null;
const huggingFaceModel = process.env.HUGGINGFACE_MODEL || 'deepseek-ai/DeepSeek-R1:fastest';

const DEPARTMENT_MAP = {
  'Water Supply': 'Municipal Water Board',
  'Electricity': 'State Electricity Board (DISCOM)',
  'Roads': 'Public Works Department (PWD)',
  'Sanitation': 'Municipal Sanitation Dept',
  'Ration / PDS': 'Food & Civil Supplies Dept',
  'Hospital / Health': 'District Health Office',
  'Police': 'Local Police Station',
  'Property Tax': 'Municipal Revenue Dept',
  'Street Lights': 'Municipal Electrical Dept',
  'Drainage': 'Municipal Drainage Dept',
  'Other': 'General Administration'
};

function buildAnalysisPrompt(text) {
  return `
You are an AI assistant for GrievEase, an Indian public grievance platform.

Analyze this citizen complaint and respond ONLY in valid JSON. Do not add markdown or explanation.

Complaint: "${text}"

Return this exact JSON structure:
{
  "languageDetected": "Hindi" or "English" or "Tamil" etc,
  "aiSummary": "Clear internal summary in English in 1-2 sentences",
  "citizenMessage": "Helpful, polished message for the citizen in simple English, 1-2 sentences, stating what issue was understood and that it will be routed",
  "category": "One of: Water Supply, Electricity, Roads, Sanitation, Ration / PDS, Hospital / Health, Police, Property Tax, Street Lights, Drainage, Other",
  "subcategory": "Specific issue e.g. No Supply, Billing Error, Pothole, Garbage Not Collected",
  "department": "Relevant government department name",
  "priority": "Low or Medium or High or Critical",
  "priorityReason": "One short sentence explaining why this priority",
  "location": {
    "areaName": "Locality or neighbourhood name mentioned in the complaint, or null if not mentioned",
    "pinCode": "6-digit Indian PIN code if explicitly mentioned in the complaint, or null",
    "district": "District name if mentioned or clearly inferable from the area, or null",
    "state": "Indian state name if mentioned or clearly inferable from the area/district, or null"
  }
}

Rules:
- Return valid JSON only
- Extract only what is mentioned or clearly inferable
- If department is unclear, use the best matching department from the allowed categories
- citizenMessage must read naturally and be ready to show directly in the UI
- If location is not available, keep location fields null
`;
}

function buildPlainLanguagePrompt(status, officerNote) {
  return `
Convert this government complaint status update into simple, friendly language
that a common citizen can understand. Keep it under 2 sentences.

Status: ${status}
Officer note: ${officerNote || 'No note provided'}

Reply with only the plain language message.
`;
}

function extractTextFromHFResponse(data) {
  if (typeof data?.choices?.[0]?.message?.content === 'string') {
    return data.choices[0].message.content;
  }
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (Array.isArray(data) && data[0]?.summary_text) return data[0].summary_text;
  if (typeof data?.generated_text === 'string') return data.generated_text;
  if (typeof data === 'string') return data;
  return '';
}

function extractJSONObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return text.slice(start, end + 1);
}

function normalizeAnalysis(parsed, originalText) {
  const category = parsed.category && DEPARTMENT_MAP[parsed.category] ? parsed.category : 'Other';
  const priority = ['Low', 'Medium', 'High', 'Critical'].includes(parsed.priority) ? parsed.priority : 'Medium';
  const location = parsed.location || {};
  const aiSummary = (parsed.aiSummary || '').trim() || `Citizen reported: ${originalText.trim().slice(0, 180)}`;
  const citizenMessage = (parsed.citizenMessage || '').trim() ||
    `We understood your complaint about ${category.toLowerCase()} and will route it to the concerned department.`;

  return {
    languageDetected: (parsed.languageDetected || 'English').trim(),
    aiSummary,
    citizenMessage,
    category,
    subcategory: (parsed.subcategory || 'General Issue').trim(),
    department: (parsed.department || DEPARTMENT_MAP[category] || DEPARTMENT_MAP.Other).trim(),
    priority,
    priorityReason: (parsed.priorityReason || 'Priority assigned based on complaint impact.').trim(),
    location: {
      areaName: location.areaName || null,
      pinCode: location.pinCode || null,
      district: location.district || null,
      state: location.state || null
    }
  };
}

function inferLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  return 'English';
}

function heuristicAnalysis(text) {
  const lower = text.toLowerCase();
  let category = 'Other';
  let subcategory = 'General Issue';
  let priority = 'Medium';

  if (/(water|pani|paani|tap|supply)/i.test(lower)) {
    category = 'Water Supply';
    subcategory = 'No Supply';
    priority = 'High';
  } else if (/(light|street light|electric|bijli|power|voltage|bill)/i.test(lower)) {
    category = 'Electricity';
    subcategory = 'Power or Billing Issue';
  } else if (/(road|pothole|sadak|gadda|street)/i.test(lower)) {
    category = 'Roads';
    subcategory = 'Road Damage';
  } else if (/(garbage|kooda|waste|sanitation|drain|sewer)/i.test(lower)) {
    category = 'Sanitation';
    subcategory = 'Waste or Drainage Issue';
  } else if (/(hospital|health|doctor|opd|ambulance)/i.test(lower)) {
    category = 'Hospital / Health';
    subcategory = 'Health Service Issue';
    priority = 'High';
  } else if (/(police|crime|theft|harassment)/i.test(lower)) {
    category = 'Police';
    subcategory = 'Law and Order Issue';
    priority = 'High';
  }

  if (/(3 day|three day|urgent|emergency|danger|accident|injury|critical)/i.test(lower)) {
    priority = 'Critical';
  }

  const pinMatch = text.match(/\b\d{6}\b/);
  const areaMatch = text.match(/\b(?:in|at|near|from)\s+([A-Za-z][A-Za-z\s-]{2,40})/i);

  return normalizeAnalysis({
    languageDetected: inferLanguage(text),
    aiSummary: `Citizen reported a ${category.toLowerCase()} issue: ${text.trim()}`,
    citizenMessage: `We understood your complaint about ${category.toLowerCase()}. It will be routed to the concerned department for review and action.`,
    category,
    subcategory,
    department: DEPARTMENT_MAP[category] || DEPARTMENT_MAP.Other,
    priority,
    priorityReason: priority === 'Critical'
      ? 'The complaint appears urgent or safety-related.'
      : 'Priority assigned based on the reported impact of the issue.',
    location: {
      areaName: areaMatch ? areaMatch[1].trim() : null,
      pinCode: pinMatch ? pinMatch[0] : null,
      district: null,
      state: null
    }
  }, text);
}

async function callHuggingFace(prompt) {
  const response = await axios.post(
    'https://router.huggingface.co/v1/chat/completions',
    {
      model: huggingFaceModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500,
      stream: false,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        Authorization: `Bearer ${huggingFaceKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    }
  );

  return extractTextFromHFResponse(response.data).trim();
}

async function callAnthropic(prompt, maxTokens = 700) {
  if (!anthropicClient) {
    throw new Error('Anthropic client not configured');
  }

  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text.trim();
}

async function analyzeComplaint(text) {
  const prompt = buildAnalysisPrompt(text);
  let raw;

  try {
    if (huggingFaceKey) {
      raw = await callHuggingFace(prompt);
    } else {
      raw = await callAnthropic(prompt);
    }

    const parsed = JSON.parse(extractJSONObject(raw));
    return normalizeAnalysis(parsed, text);
  } catch (err) {
    console.error('AI structured parse failed, using heuristic fallback:', err.message);
    return heuristicAnalysis(text);
  }
}

async function checkSystemicIssue(pinCode, category) {
  const Complaint = require('../models/Complaint');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const count = await Complaint.countDocuments({
    pinCode,
    category,
    createdAt: { $gte: sevenDaysAgo }
  });

  return count >= 5;
}

async function convertStatusToPlainLanguage(status, officerNote) {
  const prompt = buildPlainLanguagePrompt(status, officerNote);

  if (huggingFaceKey) {
    try {
      const text = await callHuggingFace(prompt);
      return text.split('\n').filter(Boolean)[0]?.trim() || `Your complaint status is now ${status}.`;
    } catch {
      return `Your complaint status is now ${status}.${officerNote ? ` ${officerNote}` : ''}`.trim();
    }
  }

  return callAnthropic(prompt, 100);
}

module.exports = { analyzeComplaint, checkSystemicIssue, convertStatusToPlainLanguage };
