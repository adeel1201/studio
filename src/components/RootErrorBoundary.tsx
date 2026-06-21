'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Zynqo Runtime Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            The application encountered an unexpected error.
          </p>
          <div className="bg-muted p-4 rounded-xl text-left text-[10px] font-mono overflow-auto max-w-full mb-6 border border-border">
            {this.state.error?.name}: {this.state.error?.message}
          </div>
          <button 
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
            onClick={() => window.location.reload()}
          >
            Reload Zynqo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
