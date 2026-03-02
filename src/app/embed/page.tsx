'use client';

import { useEffect } from 'react';
import AvaWidget from '@/components/AvaWidget';
import { AvatarErrorBoundary } from '@/components/AvatarErrorBoundary';

export default function EmbedPage() {
  // Signal the parent AvaLauncher that the embed iframe is loaded and ready
  useEffect(() => {
    try {
      window.parent.postMessage({ type: 'ava-ready' }, '*');
    } catch {
      // Ignore if no parent (standalone browsing)
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent">
      <AvatarErrorBoundary
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f] text-zinc-400 text-sm p-6 text-center">
            <div>
              <p className="font-semibold text-zinc-200 mb-1">Ava is temporarily unavailable</p>
              <p className="text-xs">Please refresh or try again in a moment.</p>
            </div>
          </div>
        }
      >
        <AvaWidget embedded />
      </AvatarErrorBoundary>
    </div>
  );
}
