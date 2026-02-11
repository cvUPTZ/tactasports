import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
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

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReset = () => {
        localStorage.removeItem('tacta_user');
        localStorage.removeItem('tacta_token');
        window.location.href = '/login';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 animate-in fade-in duration-300">
                    <div className="max-w-md w-full bg-card border border-destructive/20 rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-6 flex flex-col items-center text-center space-y-4">
                            <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                            </div>

                            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>

                            <p className="text-sm text-muted-foreground">
                                The application encountered an unexpected error. We've logged this issue.
                            </p>

                            {this.state.error && (
                                <div className="w-full bg-muted/50 p-3 rounded-md overflow-auto text-xs font-mono text-left max-h-32 border border-border/50">
                                    <p className="text-destructive font-semibold mb-1">{this.state.error.toString()}</p>
                                    {this.state.errorInfo && (
                                        <pre className="text-muted-foreground opacity-70 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="flex w-full gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 gap-2 border-primary/20 hover:bg-primary/5"
                                    onClick={() => window.location.reload()}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Reload Page
                                </Button>
                                <Button
                                    variant="default"
                                    className="flex-1 gap-2"
                                    onClick={this.handleReset}
                                >
                                    <Home className="h-4 w-4" />
                                    Reset & Login
                                </Button>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-3 border-t border-border/50 text-[10px] text-center text-muted-foreground">
                            Error ID: {Date.now().toString(36)} • Session: {localStorage.getItem('tacta_user') ? 'Active' : 'Guest'}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
