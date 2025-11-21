import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VoiceAssistantErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Voice Assistant Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Voice Assistant Error</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <Button
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
