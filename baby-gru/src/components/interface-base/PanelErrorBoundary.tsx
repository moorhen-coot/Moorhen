import React, { ErrorInfo } from "react";

type PanelErrorBoundaryProps = {
    children: React.ReactNode;
    panelName?: string;
};

type PanelErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

export class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
    constructor(props: PanelErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error in panel${this.props.panelName ? ` ${this.props.panelName}` : ""}:`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "1rem" }}>
                    <p>Something went wrong rendering this panel.</p>
                    <p>You can post an <a href="https://github.com/moorhen-coot/Moorhen/issues" target="_blank" rel="noopener noreferrer">issue on GitHub</a> with the following error message:</p>
                    
                    {this.state.error && (
                        <p
                            style={{
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                                color: "#b00020",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            <b>Error rendering panel {this.props.panelName ?? "unknown"}: </b><br/>
                            {this.state.error.message}
                        </p>
                    )}
                    <button onClick={this.handleRetry}>Try again</button>
                </div>
            );
        }
        return this.props.children;
    }
}
