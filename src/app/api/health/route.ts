import { NextResponse } from 'next/server';
import { checkOllamaHealth } from '@/lib/ollama';

export async function GET() {
  const ollama = await checkOllamaHealth();

  return NextResponse.json({
    status: 'ok',
    ollama,
    timestamp: new Date().toISOString(),
  });
}
