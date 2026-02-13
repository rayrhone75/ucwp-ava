import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage } from '@/lib/image-analyzer';
import { checkRateLimit } from '@/lib/rate-limit';
import { MAX_IMAGE_SIZE_BYTES, ACCEPTED_IMAGE_TYPES } from '@/lib/constants';
import { formatBytes } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Accepted: ${ACCEPTED_IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${formatBytes(file.size)}). Maximum: ${formatBytes(MAX_IMAGE_SIZE_BYTES)}` },
        { status: 400 }
      );
    }

    // Analyze image
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeImage(buffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/preflight] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
