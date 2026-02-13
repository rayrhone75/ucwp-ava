import { OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_MS, SYSTEM_PROMPT } from './constants';
import { retrieveContext } from './rag';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: { role: string; content: string };
  done: boolean;
}

const FALLBACK_RESPONSES: Record<string, string> = {
  greeting: JSON.stringify({
    reply: "Hi there! I'm Ava, your U Choose We Print assistant. I can help with DTF printing questions, file preparation, pricing, and more. What can I help you with today?",
    intent: 'greeting',
    questions: ['What would you like to know about DTF printing?'],
    actions: [
      { label: 'Browse Products', url: 'https://uchooseweprint.com/shop', type: 'link' },
      { label: 'Start a Gang Sheet', url: 'https://uchooseweprint.com/builder', type: 'link' },
    ],
  }),
  pricing: JSON.stringify({
    reply: "Our gang sheet pricing is based on sheet size — not the number of designs. The more designs you fit on a sheet, the better value you get. Visit our shop for current pricing tiers.",
    intent: 'pricing',
    questions: ['What sheet size are you interested in?'],
    actions: [{ label: 'View Pricing', url: 'https://uchooseweprint.com/shop', type: 'link' }],
  }),
  file_prep: JSON.stringify({
    reply: "For the best DTF prints, use PNG files at 300 DPI with transparent backgrounds. You can use our preflight checker to verify your images before uploading.",
    intent: 'file_prep',
    questions: ['Would you like me to check an image for you?'],
    actions: [{ label: 'Check My Image', type: 'action' }],
  }),
  default: JSON.stringify({
    reply: "I'm having trouble connecting to my brain right now, but I'm still here to help! For DTF printing questions, file prep guidance, or order help, you can reach our team at support@uchooseweprint.com.",
    intent: 'general',
    questions: [],
    actions: [
      { label: 'Contact Support', url: 'mailto:support@uchooseweprint.com', type: 'link' },
      { label: 'Visit Shop', url: 'https://uchooseweprint.com/shop', type: 'link' },
    ],
  }),
};

function detectFallbackCategory(message: string): string {
  const lower = message.toLowerCase();
  if (/^(hi|hello|hey|sup|what'?s up|greetings)/.test(lower)) return 'greeting';
  if (/pric|cost|how much|rate|fee|cheap|expensive/.test(lower)) return 'pricing';
  if (/file|image|png|dpi|resolution|upload|format|prepare|prep/.test(lower)) return 'file_prep';
  return 'default';
}

export async function chatWithOllama(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  // Retrieve relevant knowledge
  const context = retrieveContext(userMessage);
  const contextBlock =
    context.length > 0
      ? `\n\nRelevant knowledge base context:\n${context
          .map((c) => `[Source: ${c.source} — ${c.heading}]\n${c.content}`)
          .join('\n\n')}`
      : '';

  const systemMessage = SYSTEM_PROMPT + contextBlock;

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userMessage },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return data.message.content;
  } catch (error) {
    const category = detectFallbackCategory(userMessage);
    return FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.default;
  }
}

export async function checkOllamaHealth(): Promise<{ status: 'ok' | 'down'; model?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return { status: 'down' };

    const data = await response.json();
    const models = (data.models || []) as { name: string }[];
    const hasModel = models.some((m) => m.name.startsWith(OLLAMA_MODEL.split(':')[0]));

    return { status: 'ok', model: hasModel ? OLLAMA_MODEL : 'model not found' };
  } catch {
    return { status: 'down' };
  }
}
