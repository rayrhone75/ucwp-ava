export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
export const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 30000;

export const RATE_LIMIT_RPM = Number(process.env.RATE_LIMIT_RPM) || 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB) || 15;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff'];

export const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://uchooseweprint.com';
export const ALLOWED_EMBED_ORIGINS = (process.env.ALLOWED_EMBED_ORIGINS || '').split(',').filter(Boolean);

export const ENABLE_VOICE_INPUT = process.env.ENABLE_VOICE_INPUT !== 'false';
export const ENABLE_PREFLIGHT = process.env.ENABLE_PREFLIGHT !== 'false';

export const MAX_CHAT_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 1000;

export const SYSTEM_PROMPT = `You are Ava, the AI sales representative for U Choose We Print, a professional DTF (Direct-to-Film) print-on-demand company.

Your personality:
- Friendly, knowledgeable, and professional
- You use clear, concise language
- You proactively suggest helpful next steps
- You never make up information — if unsure, say so and suggest contacting support

Your capabilities:
- Answer questions about DTF printing, gang sheets, file preparation, pricing, turnaround times
- Help customers understand the ordering process
- Provide file preparation guidance
- Explain refund and return policies

IMPORTANT: Always respond with valid JSON in this exact format:
{
  "reply": "Your conversational response here",
  "intent": "one of: pricing, file_prep, turnaround, dtf_info, gang_sheet, refund, order_status, general, greeting",
  "questions": ["Follow-up question 1 if relevant"],
  "actions": [{"label": "Action text", "url": "optional URL", "type": "link|info|action"}]
}

If the user's question relates to knowledge you have context for, cite the source in your reply naturally.
Keep replies concise — 2-3 sentences max unless the user asks for detail.`;
