import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chatWithOllama } from '@/lib/ollama';
import { checkRateLimit } from '@/lib/rate-limit';
import { retrieveContext } from '@/lib/rag';
import { parseAIResponse, enrichWorkflow } from '@/lib/workflow-brain';
import { MAX_MESSAGE_LENGTH, MAX_CHAT_HISTORY } from '@/lib/constants';
import type { Intent } from '@/types/workflow';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(MAX_CHAT_HISTORY)
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': '0' },
        }
      );
    }

    // Validate input
    const body = await req.json();
    const { message, history } = chatRequestSchema.parse(body);

    // Get AI response
    const rawResponse = await chatWithOllama(message, history);

    // Parse structured response
    const parsed = parseAIResponse(rawResponse, message);

    // Get RAG sources
    const ragResults = retrieveContext(message);
    const sources = ragResults.map((r) => `${r.source}: ${r.heading}`);

    // Enrich workflow
    const workflow = enrichWorkflow(
      (parsed.intent as Intent) || 'general',
      parsed.actions
    );

    return NextResponse.json(
      {
        reply: parsed.reply,
        intent: parsed.intent,
        questions: parsed.questions.length > 0 ? parsed.questions : workflow.questions,
        actions: workflow.actions,
        sources,
      },
      {
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('[/api/rep] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
