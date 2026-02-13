'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, ChatResponse } from '@/types/chat';
import { generateId } from '@/lib/utils';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      setError(null);

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/rep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim(), history }),
        });

        if (res.status === 429) {
          setError('Too many messages. Please wait a moment.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const data: ChatResponse = await res.json();

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          sources: data.sources,
          intent: data.intent || undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        return data;
      } catch (err) {
        setError('Something went wrong. Please try again.');
        console.error('[useChat]', err);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
}
