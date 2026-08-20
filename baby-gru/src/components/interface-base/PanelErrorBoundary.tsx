import React, { ErrorInfo } from "react";

type PanelErrorBoundaryProps = {
    children: React.ReactNode;
    panelName?: string;
};

type PanelErrorBoundaryState = {
    hasError: boolean;
};

export class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
    constructor(props: PanelErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): PanelErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error in bottom panel${this.props.panelName ? ` ${this.props.panelName}` : ""}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "1rem" }}>
                    <p>Something went wrong rendering this panel.</p>
                    <button onClick={() => this.setState({ hasError: false })}>Try again</button>
                </div>
            );
        }
        return this.props.children;
    }
}
