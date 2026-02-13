'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  voiceSupported: boolean;
  voiceListening: boolean;
  voiceTranscript: string;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onVoiceReset: () => void;
}

export default function ChatInterface({
  messages,
  loading,
  error,
  onSend,
  voiceSupported,
  voiceListening,
  voiceTranscript,
  onVoiceStart,
  onVoiceStop,
  onVoiceReset,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Fill input from voice transcript
  useEffect(() => {
    if (voiceTranscript) {
      setInput(voiceTranscript);
      onVoiceReset();
    }
  }, [voiceTranscript, onVoiceReset]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 ava-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm mt-8">
            <p>Hi! I&apos;m Ava, your DTF printing assistant.</p>
            <p className="mt-1">Ask me anything about printing, file prep, or ordering.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'ml-auto bg-violet-600 text-white rounded-br-md'
                : 'mr-auto bg-zinc-800 text-zinc-100 rounded-bl-md'
            )}
          >
            {msg.content}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-700/50">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Sources</p>
                {msg.sources.map((src, i) => (
                  <p key={i} className="text-[11px] text-zinc-500 mt-0.5">
                    {src}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-zinc-800 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm">
            <div className="flex gap-1 items-center text-zinc-400">
              <span className="ava-dot-1">.</span>
              <span className="ava-dot-2">.</span>
              <span className="ava-dot-3">.</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-1.5 inline-block">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t border-zinc-800"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ava anything..."
          maxLength={1000}
          disabled={loading}
          className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
        />

        {voiceSupported && (
          <button
            type="button"
            onClick={voiceListening ? onVoiceStop : onVoiceStart}
            className={cn(
              'p-2.5 rounded-xl transition-colors',
              voiceListening
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            )}
          >
            {voiceListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:hover:bg-violet-600"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
