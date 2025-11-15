import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  routeName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * RouteErrorBoundary - Error boundary for route-level error handling
 * Provides better UX with navigation options and error recovery
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { routeName } = this.props;

    console.error('🔴 RouteErrorBoundary caught an error:', {
      route: routeName || 'Unknown',
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Update error count
    this.setState(prev => ({
      errorCount: prev.errorCount + 1
    }));
  }

  handleReset = () => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null
    });

    // Call custom reset handler if provided
    if (onReset) {
      onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { children, fallbackMessage, routeName } = this.props;
    const { hasError, error, errorCount } = this.state;

    if (hasError) {
      const isPersistentError = errorCount > 2;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {isPersistentError ? 'Persistent Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {routeName && `Error in ${routeName} page`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {fallbackMessage ||
                  "We encountered an unexpected error while loading this page. You can try again or return to the dashboard."}
              </p>

              {isPersistentError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    This error is persisting. Please try reloading the page or contact support if the issue continues.
                  </p>
                </div>
              )}

              {error && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium hover:underline">
                    Error Details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="p-3 bg-muted rounded-lg text-xs font-mono">
                      <div className="font-semibold mb-1 text-destructive">
                        {error.name || 'Error'}:
                      </div>
                      <div className="text-foreground">{error.message}</div>
                    </div>
                    {error.stack && (
                      <div className="p-3 bg-muted rounded-lg text-xs font-mono max-h-64 overflow-auto">
                        <div className="font-semibold mb-1">Stack Trace:</div>
                        <pre className="whitespace-pre-wrap text-muted-foreground">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>

                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>

                {isPersistentError && (
                  <Button onClick={this.handleReload} variant="secondary">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                If this problem persists, please contact support with the error details above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}
