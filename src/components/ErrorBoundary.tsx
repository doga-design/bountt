import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-container bg-background items-center justify-center">
          <div className="text-center px-8">
            <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
              bountt<span className="text-primary">.</span>
            </h1>
            <div className="bg-destructive/10 text-destructive rounded-2xl px-5 py-4 text-sm font-medium mb-6">
              Something went wrong. Please try again.
            </div>
            <button
              onClick={this.handleReset}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-bold text-sm"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
