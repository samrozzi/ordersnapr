import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  sectionName?: string;
  fallbackMessage?: string;
  showDetails?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isDismissed: boolean;
}

/**
 * SectionErrorBoundary - Error boundary for component sections
 * Provides inline error UI that doesn't disrupt the entire page
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isDismissed: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isDismissed: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { sectionName } = this.props;

    console.error('⚠️ SectionErrorBoundary caught an error:', {
      section: sectionName || 'Unknown section',
      message: error.message,
      name: error.name,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null,
      isDismissed: false
    });

    if (onReset) {
      onReset();
    }
  };

  handleDismiss = () => {
    this.setState({ isDismissed: true });
  };

  render() {
    const { children, sectionName, fallbackMessage, showDetails = false } = this.props;
    const { hasError, error, isDismissed } = this.state;

    if (hasError && !isDismissed) {
      return (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              {sectionName ? `Error in ${sectionName}` : 'Section Error'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              onClick={this.handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">
              {fallbackMessage ||
                "This section encountered an error and couldn't load properly."}
            </p>

            {showDetails && error && (
              <details className="text-xs">
                <summary className="cursor-pointer hover:underline font-medium">
                  Technical Details
                </summary>
                <div className="mt-2 p-2 bg-background/50 rounded border border-destructive/20">
                  <div className="font-mono">
                    <div className="font-semibold">{error.name}:</div>
                    <div className="text-muted-foreground">{error.message}</div>
                  </div>
                </div>
              </details>
            )}

            <Button
              onClick={this.handleReset}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    // If dismissed, don't render anything
    if (isDismissed) {
      return null;
    }

    return children;
  }
}
