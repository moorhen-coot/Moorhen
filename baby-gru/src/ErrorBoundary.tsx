import React, { ErrorInfo } from 'react';
import { Modal, Button } from "react-bootstrap"
import { doDownload, createLocalStorageInstance } from "./utils/utils"
import { MoorhenTimeCapsule } from "./utils/MoorhenTimeCapsule"
import { MoorhenMolecule } from './utils/MoorhenMolecule';
import { moorhen } from './types/moorhen';

type ErrorBoundaryPropsType = {
    urlPrefix: string;
    children: JSX.Element;
}
type ErrorBoundaryStateType = {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryPropsType, ErrorBoundaryStateType> {
    static defaultProps: Partial<ErrorBoundaryPropsType>;
    
    constructor(props) {
        super(props);
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        console.log("Error boundary triggered ")
        return { hasError: true }

    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Also possible to log the error to an error reporting service
        console.log(error, errorInfo)
    }

    doAsyncDownload (data: BlobPart[], targetName: string) {
        return new Promise((resolve, reject) => {
            doDownload(data, targetName)
            resolve(targetName)
        })
    }
    
    async handleBackupDownload() {
        const timeCapsule = new MoorhenTimeCapsule(null, null, null, null, null)
        timeCapsule.storageInstance = createLocalStorageInstance('Moorhen-TimeCapsule') 
        await timeCapsule.init()
        const backup = await timeCapsule.retrieveLastBackup() as string
        const sessionData: moorhen.backupSession = JSON.parse(backup)
        const promises = sessionData.moleculeData.map(molData => {
            const format = MoorhenMolecule.guessCoordFormat(molData.coordString)
            return this.doAsyncDownload([molData.coordString], `${molData.name}.${format}`)
        })
        await Promise.all(promises)
    }

    render() {
        // If there is an error render custom fallback UI otherwise render children
        if (this.state.hasError) {
            let head = document.head;
            let style: any = document.createElement("link");
            style.href = `${this.props.urlPrefix}/baby-gru/flatly.css`
            style.rel = "stylesheet";
            style.async = true
            style.type = 'text/css'
            head.appendChild(style);
    
            return  <Modal size="lg" show={true} backdrop="static" keyboard={false}>
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
