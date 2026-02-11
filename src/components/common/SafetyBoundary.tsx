import React, { Component, ErrorInfo, type ReactNode } from 'react';

export class SafetyBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode; name: string }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[SafetyBoundary] Error in ${this.props.name}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-2 m-1 bg-destructive/20 border border-destructive/50 rounded text-destructive text-[10px] font-mono overflow-auto max-h-[100px]">
                    <strong>{this.props.name} Crash:</strong> {this.state.error?.message}
                </div>
            );
        }
        return this.props.children;
    }
}
