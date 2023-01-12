import React from 'react';
import { Modal, Button } from "react-bootstrap"
import { doDownload } from "./utils/MoorhenUtils"

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        console.log("Error boundary triggered ")
        return { hasError: true }

    }

    componentDidCatch(error, errorInfo) {
        // Also possible to log the error to an error reporting service
        console.log(error, errorInfo)
    }

    handleDownload() {
        doDownload([JSON.stringify(console.everything)], `session_logs.json`)
    }

    render() {
        // If there is an error render custom fallback UI otherwise render children
        if (this.state.hasError) {
            let head = document.head;
            let style = document.createElement("link");
            style.href = `${this.props.urlPrefix}/baby-gru/flatly.css`
            style.rel = "stylesheet";
            style.async = true
            style.type = 'text/css'
            head.appendChild(style);
    
            return  <Modal size="l" show={true} backdrop="static" keyboard={false}>
                        <Modal.Header>
                            <Modal.Title>Something went wrong...</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            An error has occurred in Moorhen. You will need to refresh the page to re-start the app.
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={this.handleDownload.bind(this)}>
                                Download logs
                            </Button>
                        </Modal.Footer>                        
                    </Modal>
        }

        return this.props.children
    }
}

ErrorBoundary.defaultProps = { urlPrefix: "." }
