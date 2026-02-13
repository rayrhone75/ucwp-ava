'use client';

import { useState, useCallback } from 'react';

export type AvatarState = 'idle' | 'thinking' | 'speaking';

export function useAvatar() {
  const [state, setState] = useState<AvatarState>('idle');
  const [lastText, setLastText] = useState('');

  const setIdle = useCallback(() => setState('idle'), []);
  const setThinking = useCallback(() => setState('thinking'), []);
  const setSpeaking = useCallback((text?: string) => {
    setState('speaking');
    if (text) setLastText(text);
  }, []);

  return { state, lastText, setIdle, setThinking, setSpeaking };
}
