'use client';

import { Printer, FileImage, Clock, HelpCircle } from 'lucide-react';

interface QuickIntentButtonsProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const QUICK_INTENTS = [
  {
    icon: Printer,
    label: 'What is DTF?',
    message: 'What is DTF printing and how does it work?',
  },
  {
    icon: FileImage,
    label: 'File Prep',
    message: 'What file format and resolution do I need for my designs?',
  },
  {
    icon: Clock,
    label: 'Turnaround',
    message: 'How long does it take to get my order?',
  },
  {
    icon: HelpCircle,
    label: 'Gang Sheets',
    message: 'How do gang sheets work and how can they save me money?',
  },
];

export default function QuickIntentButtons({ onSend, disabled }: QuickIntentButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {QUICK_INTENTS.map((intent) => (
        <button
          key={intent.label}
          onClick={() => onSend(intent.message)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800 hover:border-violet-500/30 hover:text-violet-300 transition-all disabled:opacity-40"
        >
          <intent.icon size={14} className="shrink-0 text-violet-400" />
          <span>{intent.label}</span>
        </button>
      ))}
    </div>
  );
}
