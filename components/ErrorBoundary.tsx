import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string; // For identifying which boundary caught the error
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}] Caught error:`, error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-scout-800/50 rounded-2xl border border-scout-700 min-h-[200px]">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-400 text-center mb-4 max-w-md">
            {this.props.name
              ? `The ${this.props.name} section encountered an error.`
              : 'This section encountered an unexpected error.'}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400/70 font-mono mb-4 max-w-md truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-scout-accent text-scout-900 rounded-lg font-bold text-sm hover:bg-scout-accent/90 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Compact error boundary for smaller sections
export const CompactErrorBoundary: React.FC<{ children: ReactNode; name?: string }> = ({ children, name }) => {
  return (
    <ErrorBoundary
      name={name}
      fallback={
        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300">Failed to load {name || 'content'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Reload
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
