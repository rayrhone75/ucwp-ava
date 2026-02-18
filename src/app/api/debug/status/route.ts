import { NextResponse } from 'next/server';
import { checkOllamaHealth } from '@/lib/ollama';
import { OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_MS } from '@/lib/constants';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Check Ollama
  const ollama = await checkOllamaHealth();

  // Check avatar assets
  const publicDir = path.join(process.cwd(), 'public');
  const avatarAssets = {
    'models/ava-real.vrm': fs.existsSync(path.join(publicDir, 'models', 'ava-real.vrm')),
    'fallback-avatar.svg': fs.existsSync(path.join(publicDir, 'fallback-avatar.svg')),
    'embed.js': fs.existsSync(path.join(publicDir, 'embed.js')),
  };

  // Memory
  const mem = process.memoryUsage();

  // Environment check
  const envCheck = {
    OLLAMA_API_URL: OLLAMA_API_URL,
    OLLAMA_MODEL: OLLAMA_MODEL,
    OLLAMA_TIMEOUT_MS: OLLAMA_TIMEOUT_MS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    NEXT_PUBLIC_MAIN_SITE_URL: process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
  };

  const allAssetsPresent = Object.values(avatarAssets).every(Boolean);
  const ok = ollama.status === 'ok' && allAssetsPresent;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      ollama,
      avatarAssets,
      environment: envCheck,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      checks: {
        ollamaReachable: ollama.status === 'ok',
        modelLoaded: ollama.model !== 'model not found',
        avatarVRM: avatarAssets['models/ava-real.vrm'],
        fallbackSVG: avatarAssets['fallback-avatar.svg'],
      },
    },
    { status: ok ? 200 : 503 }
  );
}
