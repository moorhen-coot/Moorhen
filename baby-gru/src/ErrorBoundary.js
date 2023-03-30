import React from 'react';
import { Modal, Button } from "react-bootstrap"
import { doDownload } from "./utils/MoorhenUtils"
import { MoorhenTimeCapsule } from "./utils/MoorhenTimeCapsule"

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

    doAsyncDownload (data, targetName) {
        return new Promise((resolve, reject) => {
            doDownload(data, targetName)
            resolve(targetName)
        })
    }
    
    async handleBackupDownload() {
        const timeCapsule = new MoorhenTimeCapsule()
        await timeCapsule.init()
        const backup = await timeCapsule.retrieveLastBackup()
        const sessionData = JSON.parse(backup)
        const promises = sessionData.moleculesPdbData.map((pdbData, index) => {
            return this.doAsyncDownload([pdbData], `${sessionData.moleculesNames[index]}.pdb`)
        })
        await Promise.all(promises)
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
                            <Button variant="primary" onClick={this.handleBackupDownload.bind(this)}>
                                Download last molecule backup
                            </Button>                            
                        </Modal.Footer>                        
                    </Modal>
        }

        return this.props.children
    }
}

ErrorBoundary.defaultProps = { urlPrefix: "." }
