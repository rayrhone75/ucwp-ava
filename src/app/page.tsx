'use client';

import AvaWidget from '@/components/AvaWidget';
import { ExternalLink, Sparkles, MessageCircle, ImageIcon, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero section */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-xs text-violet-300">AI-Powered Sales Assistant</span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Meet <span className="text-violet-400">Ava</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-8">
            Your intelligent DTF printing assistant. Get instant answers about file preparation,
            pricing, turnaround times, and more — powered by AI.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <a
              href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://uchooseweprint.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors text-sm font-medium"
            >
              Visit Shop
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-left">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-3">
                <MessageCircle size={20} className="text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">AI Chat</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ask anything about DTF printing, gang sheets, file prep, pricing, and shipping. Ava knows it all.
              </p>
            </div>

            <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-left">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3">
                <ImageIcon size={20} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Image Preflight</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Upload your design and get instant feedback on resolution, transparency, and print-readiness.
              </p>
            </div>

            <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-left">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
                <Zap size={20} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Smart Workflow</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ava detects your intent and suggests relevant actions, links, and follow-up questions automatically.
              </p>
            </div>
          </div>

          {/* Embed instructions */}
          <div className="max-w-2xl mx-auto text-left">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Embed on Your Site</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">JavaScript Widget</p>
                <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-x-auto">
                  {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ava.uchooseweprint.com'}/embed.js" defer></script>`}
                </pre>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Iframe</p>
                <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-x-auto">
                  {`<iframe src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ava.uchooseweprint.com'}/embed" width="400" height="650" style="border:none;border-radius:16px;" />`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live widget */}
      <AvaWidget />
    </div>
  );
}
