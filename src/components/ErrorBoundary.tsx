import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { publicText as uiText } from '../publicLocalization';
import { publicText } from '../publicLocalization';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private fallbackRef = React.createRef<HTMLDivElement>();
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.fallbackRef.current?.focus();
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div ref={this.fallbackRef} role="alert" tabIndex={-1} className="p-6 m-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4 shadow-xl max-w-xl mx-auto my-12">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-900 dark:text-rose-200">{uiText('Something went wrong')}</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              {uiText('The request could not be completed. Please try again.')}
            </p>
          </div>
          <button
            onClick={() => {
              this.handleReset();
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            {uiText('Refresh Page')}
          </button>
          <a href="/" className="ml-3 inline-flex min-h-11 items-center px-4 text-sm font-bold underline">{publicText('copy.home')}</a>
        </div>
      );
    }

    return this.props.children;
  }
}
