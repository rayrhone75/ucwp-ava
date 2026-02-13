'use client';

import { ExternalLink, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionItem } from '@/types/chat';

interface WorkflowPanelProps {
  intent: string | null;
  questions: string[];
  actions: ActionItem[];
  sources: string[];
  onQuestionClick?: (question: string) => void;
}

const INTENT_COLORS: Record<string, string> = {
  pricing: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  file_prep: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  turnaround: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  dtf_info: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  gang_sheet: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  refund: 'bg-red-500/15 text-red-400 border-red-500/30',
  order_status: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  general: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  greeting: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const INTENT_LABELS: Record<string, string> = {
  pricing: 'Pricing',
  file_prep: 'File Prep',
  turnaround: 'Turnaround',
  dtf_info: 'DTF Info',
  gang_sheet: 'Gang Sheets',
  refund: 'Returns',
  order_status: 'Order Status',
  general: 'General',
  greeting: 'Hello',
};

export default function WorkflowPanel({
  intent,
  questions,
  actions,
  sources,
  onQuestionClick,
}: WorkflowPanelProps) {
  if (!intent && actions.length === 0 && questions.length === 0) return null;

  return (
    <div className="px-3 pb-3 space-y-2">
      {/* Intent badge */}
      {intent && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border',
              INTENT_COLORS[intent] || INTENT_COLORS.general
            )}
          >
            {INTENT_LABELS[intent] || intent}
          </span>
        </div>
      )}

      {/* Follow-up questions */}
      {questions.length > 0 && (
        <div className="space-y-1.5">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => onQuestionClick?.(q)}
              className="flex items-start gap-2 w-full text-left px-2.5 py-2 bg-zinc-800/30 border border-zinc-700/30 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-violet-500/30 transition-colors"
            >
              <Info size={12} className="shrink-0 mt-0.5 text-violet-400" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action, i) => {
            if (action.type === 'link' && action.url) {
              return (
                <a
                  key={i}
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/15 border border-violet-500/30 rounded-lg text-xs text-violet-300 hover:bg-violet-600/25 transition-colors"
                >
                  <ExternalLink size={11} />
                  {action.label}
                </a>
              );
            }
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-400"
              >
                <Zap size={11} />
                {action.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Knowledge Base</p>
          <div className="flex flex-wrap gap-1">
            {sources.map((src, i) => (
              <span
                key={i}
                className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
