import type { Intent, WorkflowResult } from '@/types/workflow';
import { MAIN_SITE_URL } from './constants';

interface ParsedAIResponse {
  reply: string;
  intent: string | null;
  questions: string[];
  actions: { label: string; url?: string; type: 'link' | 'info' | 'action' }[];
}

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  pricing: ['price', 'cost', 'how much', 'rate', 'fee', 'cheap', 'expensive', 'discount', 'coupon'],
  file_prep: ['file', 'image', 'png', 'dpi', 'resolution', 'upload', 'format', 'prepare', 'prep', 'photoshop', 'transparent'],
  turnaround: ['turnaround', 'shipping', 'delivery', 'how long', 'when', 'time', 'days', 'rush', 'fast', 'quick', 'track'],
  dtf_info: ['dtf', 'direct to film', 'sublimation', 'screen print', 'heat press', 'transfer', 'vinyl'],
  gang_sheet: ['gang sheet', 'sheet', 'builder', 'canvas', 'arrange', 'layout', 'size'],
  refund: ['refund', 'return', 'cancel', 'wrong', 'defect', 'damage', 'money back', 'complaint'],
  order_status: ['order', 'status', 'tracking', 'where', 'shipped', 'package'],
  general: [],
  greeting: ['hi', 'hello', 'hey', 'sup', 'greetings', 'good morning', 'good afternoon', 'good evening'],
};

const INTENT_ACTIONS: Record<Intent, { label: string; url?: string; type: 'link' | 'info' | 'action' }[]> = {
  pricing: [{ label: 'View Pricing', url: `${MAIN_SITE_URL}/shop`, type: 'link' }],
  file_prep: [
    { label: 'Check My Image', type: 'action' },
    { label: 'File Prep Guide', url: `${MAIN_SITE_URL}/help/file-prep`, type: 'link' },
  ],
  turnaround: [{ label: 'Track Order', url: `${MAIN_SITE_URL}/track`, type: 'link' }],
  dtf_info: [{ label: 'Browse Products', url: `${MAIN_SITE_URL}/shop`, type: 'link' }],
  gang_sheet: [{ label: 'Open Builder', url: `${MAIN_SITE_URL}/builder`, type: 'link' }],
  refund: [{ label: 'Contact Support', url: `mailto:support@uchooseweprint.com`, type: 'link' }],
  order_status: [
    { label: 'My Orders', url: `${MAIN_SITE_URL}/account/orders`, type: 'link' },
    { label: 'Track Shipment', url: `${MAIN_SITE_URL}/track`, type: 'link' },
  ],
  general: [{ label: 'Visit Shop', url: `${MAIN_SITE_URL}/shop`, type: 'link' }],
  greeting: [
    { label: 'Browse Products', url: `${MAIN_SITE_URL}/shop`, type: 'link' },
    { label: 'Start a Gang Sheet', url: `${MAIN_SITE_URL}/builder`, type: 'link' },
  ],
};

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();

  // Check greeting first (short messages)
  if (lower.length < 20) {
    for (const keyword of INTENT_KEYWORDS.greeting) {
      if (lower.startsWith(keyword) || lower === keyword) return 'greeting';
    }
  }

  // Score each intent by keyword matches
  let bestIntent: Intent = 'general';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'general' || intent === 'greeting') continue;
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as Intent;
    }
  }

  return bestIntent;
}

export function parseAIResponse(rawResponse: string, userMessage: string): ParsedAIResponse {
  // Try to extract JSON from the response
  try {
    // Look for JSON object in the response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reply: parsed.reply || rawResponse,
        intent: parsed.intent || detectIntent(userMessage),
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      };
    }
  } catch {
    // JSON parse failed — use keyword-based detection
  }

  // Fallback: use the raw text as reply and detect intent from keywords
  const intent = detectIntent(userMessage);
  return {
    reply: rawResponse.replace(/```json[\s\S]*?```/g, '').trim() || rawResponse,
    intent,
    questions: [],
    actions: [],
  };
}

export function enrichWorkflow(intent: Intent, aiActions: { label: string; url?: string; type: 'link' | 'info' | 'action' }[]): WorkflowResult {
  // Merge AI-suggested actions with default intent actions
  const defaultActions = INTENT_ACTIONS[intent] || [];
  const actionLabels = new Set(aiActions.map((a) => a.label));
  const mergedActions = [
    ...aiActions,
    ...defaultActions.filter((a) => !actionLabels.has(a.label)),
  ];

  return {
    intent,
    questions: [],
    actions: mergedActions.slice(0, 4),
  };
}
