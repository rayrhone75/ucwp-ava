'use client';

import { useState, useCallback } from 'react';
import { MessageCircle, X, Minimize2, ImageIcon, MessagesSquare, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/useChat';
import { useAvatar } from '@/hooks/useAvatar';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import ChatInterface from './ChatInterface';
import QuickIntentButtons from './QuickIntentButtons';
import WorkflowPanel from './WorkflowPanel';
import PreflightChecker from './PreflightChecker';
import { cn } from '@/lib/utils';
import type { ChatResponse } from '@/types/chat';

const RealAvatar = dynamic(() => import('./RealAvatar'), { ssr: false });

type Tab = 'chat' | 'preflight';

interface AvaWidgetProps {
  embedded?: boolean;
}

export default function AvaWidget({ embedded = false }: AvaWidgetProps) {
  const [open, setOpen] = useState(embedded);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

  const { messages, loading, error, sendMessage, clearChat } = useChat();
  const { state: avatarState, lastText: avatarLastText, setThinking, setSpeaking, setIdle } = useAvatar();
  const { listening, supported, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();

  const handleSend = useCallback(
    async (message: string) => {
      setThinking();
      const response = await sendMessage(message);
      if (response) {
        setLastResponse(response);
        setSpeaking(response.reply);
        // Dynamic speaking duration based on response length
        const wordCount = response.reply.split(/\s+/).length;
        const speakDuration = Math.min(Math.max(wordCount * 50, 2000), 12000);
        setTimeout(setIdle, speakDuration);
      } else {
        setIdle();
      }
    },
    [sendMessage, setThinking, setSpeaking, setIdle]
  );

  const handleQuestionClick = useCallback(
    (question: string) => {
      handleSend(question);
    },
    [handleSend]
  );

  // Floating button (not shown when embedded)
  if (!open && !embedded) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-violet-600 rounded-full shadow-2xl shadow-violet-500/25 flex items-center justify-center hover:bg-violet-500 hover:scale-105 transition-all group"
      >
        <MessageCircle size={24} className="text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0a0f]" />
      </button>
    );
  }

  if (minimized && !embedded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-3 bg-ava-surface border border-ava-border rounded-2xl px-4 py-3 shadow-2xl hover:border-violet-500/40 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center">
            <MessageCircle size={16} className="text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-200">Ava</p>
            <p className="text-[10px] text-zinc-500">Click to expand</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-ava-surface border border-ava-border shadow-2xl shadow-black/40',
        embedded
          ? 'w-full h-full rounded-none'
          : 'fixed bottom-6 right-6 z-50 w-[380px] h-[600px] rounded-2xl'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ava-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center overflow-hidden">
            <RealAvatar speaking={avatarState === 'speaking'} state={avatarState} lastText={avatarLastText} className="w-full h-full scale-150" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Ava</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear chat"
          >
            <RotateCcw size={14} />
          </button>
          {!embedded && (
            <>
              <button
                onClick={() => setMinimized(true)}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Avatar area */}
      <div className="relative h-32 shrink-0 bg-gradient-to-b from-violet-950/30 to-transparent flex items-center justify-center overflow-hidden">
        <RealAvatar speaking={avatarState === 'speaking'} state={avatarState} lastText={avatarLastText} className="w-full h-full" />
        {avatarState === 'thinking' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-[10px] text-zinc-300">Thinking</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-ava-border shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'chat'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          <MessagesSquare size={13} />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('preflight')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'preflight'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          <ImageIcon size={13} />
          Image Check
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            {messages.length === 0 && (
              <QuickIntentButtons onSend={handleSend} disabled={loading} />
            )}
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                messages={messages}
                loading={loading}
                error={error}
                onSend={handleSend}
                voiceSupported={supported}
                voiceListening={listening}
                voiceTranscript={transcript}
                onVoiceStart={startListening}
                onVoiceStop={stopListening}
                onVoiceReset={resetTranscript}
              />
            </div>
            {lastResponse && (
              <WorkflowPanel
                intent={lastResponse.intent}
                questions={lastResponse.questions}
                actions={lastResponse.actions}
                sources={lastResponse.sources}
                onQuestionClick={handleQuestionClick}
              />
            )}
          </div>
        ) : (
          <PreflightChecker />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-ava-border text-center shrink-0">
        <a
          href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://uchooseweprint.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Powered by U Choose We Print
        </a>
      </div>
    </div>
  );
}
