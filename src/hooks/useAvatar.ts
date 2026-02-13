'use client';

import { useState, useCallback } from 'react';

export type AvatarState = 'idle' | 'thinking' | 'speaking';

export function useAvatar() {
  const [state, setState] = useState<AvatarState>('idle');

  const setIdle = useCallback(() => setState('idle'), []);
  const setThinking = useCallback(() => setState('thinking'), []);
  const setSpeaking = useCallback(() => setState('speaking'), []);

  return { state, setIdle, setThinking, setSpeaking };
}
