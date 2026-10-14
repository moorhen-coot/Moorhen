import React, { ErrorInfo } from "react";
import { MoorhenButton } from "../../inputs";
import type { ModalKey } from "./ModalsContainer";
import { MoorhenDraggableModalBase } from "./DraggableModalBase";

type ModalErrorBoundaryProps = {
    children: React.ReactNode;
    modalId?: ModalKey;
    headerTitle?: string;
};

type ModalErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

export class ModalErrorBoundary extends React.Component<ModalErrorBoundaryProps, ModalErrorBoundaryState> {
    constructor(props: ModalErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ModalErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error in modal ${this.props.modalId ?? "unknown"}:`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const errorBody = (
                <div style={{ padding: "1rem" }}>
                    <p>Something went wrong rendering this modal.</p>
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
                            <b>Error rendering modal {this.props.modalId ?? "unknown"}: </b><br/>
                            {this.state.error.message}
                        </p>
                    )}
                    <MoorhenButton variant="secondary" onClick={this.handleRetry}>
                        Try again
                    </MoorhenButton>
                </div>
            );

            if (this.props.modalId) {
                return (
                    <MoorhenDraggableModalBase
                        modalId={this.props.modalId}
                        headerTitle={this.props.headerTitle ?? "Error"}
                        body={errorBody}
                    />
                );
            }
            return errorBody;
        }
        return this.props.children;
    }
}
