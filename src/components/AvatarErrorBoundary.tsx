'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary specifically for the 3D avatar.
 * If WebGL/Three.js/GLB loading crashes, shows the static fallback
 * instead of crashing the entire Ava widget.
 */
export class AvatarErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AvatarErrorBoundary] 3D avatar crashed — using fallback:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
