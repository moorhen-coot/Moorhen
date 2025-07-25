import { useState, useRef, useEffect } from "react";
import { Modal, Button, Card, Row, Col } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { moorhen } from "../../types/moorhen"
import { setShortCuts } from "../../store/shortCutsSlice";
import { MoorhenPreferences } from "../../utils/MoorhenPreferences";

export const MoorhenShortcutConfigModal = (props: {
    setShowModal: React.Dispatch<React.SetStateAction<boolean>>; 
    showModal: boolean; 
}) => {

    const dispatch = useDispatch()
    const _shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const shortCuts = JSON.parse(_shortCuts as string)
    const newShortCutModalRef = useRef<React.JSX.Element>(null);
    const [waitingNewShortCut, setWaitingNewShortCut] = useState<boolean | string>(false);
    const [stagedShortCuts, setStagedShortCuts] = useState(shortCuts);
    const [shortCutMessage, setShortCutMessage] = useState<string>("... Press something ...");

    const cancelChanges = () => {
        props.setShowModal(false)
        setStagedShortCuts(shortCuts)
    }

    const restoreDefaults = () => {
        const defaultValues = MoorhenPreferences.defaultPreferencesValues
        props.setShowModal(false)
        setStagedShortCuts(defaultValues.shortCuts as {[label: string]: moorhen.Shortcut})
        dispatch(
            setShortCuts(JSON.stringify(defaultValues.shortCuts))
        )
    }

    const handleSaveChanges = () => {
        props.setShowModal(false)
        dispatch(
            setShortCuts(JSON.stringify(stagedShortCuts))
        )
    }
    
    const handleKeyUp = (evt: KeyboardEvent): void => {
        const modifiers: string[] = []
        if (evt.shiftKey) modifiers.push("shiftKey")
        if (evt.ctrlKey) modifiers.push("ctrlKey")
        if (evt.metaKey) modifiers.push("metaKey")
        if (evt.altKey) modifiers.push("altKey")

        setStagedShortCuts((prev) => {
            prev[waitingNewShortCut as string].keyPress = evt.key.toLowerCase()
            prev[waitingNewShortCut as string].modifiers = modifiers
            return prev
        })

        setWaitingNewShortCut(false)
        setShortCutMessage("... Press something ...")
    }
    
    const handleKeyDown = (evt: KeyboardEvent): void => {
        const modifiers: string[] = []
        if (evt.shiftKey) modifiers.push("<Shift>")
        if (evt.ctrlKey) modifiers.push("<Ctrl>")
        if (evt.metaKey) modifiers.push("<Meta>")
        if (evt.altKey) modifiers.push("<Alt>")
        if (evt.key === " ") modifiers.push("<Space>")

        setShortCutMessage(`${modifiers.join("-")} ${evt.key.toLowerCase()}`)
    }

    useEffect(() => {
        if (newShortCutModalRef.current && waitingNewShortCut) {
            document.addEventListener("keydown", handleKeyDown)
            document.addEventListener("keyup", handleKeyUp)    
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("keyup", handleKeyUp)    
        }

    }, [waitingNewShortCut])

    return <>
                <Modal show={props.showModal} backdrop="static" size='lg' style={{zIndex: 99999}}>
                    <Modal.Header>
                        <Modal.Title>Shortcuts</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{height:'65vh', overflowY: 'scroll'}}>
                        {Object.keys(stagedShortCuts).map(key => {
                            const modifiers = []
                            if (stagedShortCuts[key].modifiers.includes('shiftKey')) modifiers.push("<Shift>")
                            if (stagedShortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
                            if (stagedShortCuts[key].modifiers.includes('metaKey')) modifiers.push("<Meta>")
                            if (stagedShortCuts[key].modifiers.includes('altKey')) modifiers.push("<Alt>")                
                            if (stagedShortCuts[key].keyPress === " ") modifiers.push("<Space>")
                            return <Card key={key} style={{margin:'0.5rem'}}>
                                        <Card.Body style={{padding:'0.5rem'}}>
                                            <Row className="align-items-center">
                                                <Col style={{justifyContent: 'left', display:'flex'}}>
                                                    <span style={{fontWeight:'bold'}}>
                                                        {`${stagedShortCuts[key].label}`} 
                                                    </span>
                                                    <i>
                                                        {`: ${modifiers.join("-")} ${stagedShortCuts[key].keyPress} `}
                                                    </i>
                                                </Col>
                                                <Col style={{justifyContent: 'right', display:'flex'}}>
                                                    <Button size='sm' value={key} onClick={evt => setWaitingNewShortCut((evt.target as HTMLInputElement).value)}>
                                                        Change
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                            })}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={restoreDefaults}>
                            Restore Defaults
                        </Button>
                        <Button variant="primary" onClick={handleSaveChanges}>
                            Save Changes
                        </Button>
                        <Button variant="danger" onClick={cancelChanges}>
                            Cancel
                        </Button>
                    </Modal.Footer>                    
                </Modal>
                <Modal ref={newShortCutModalRef} centered backdrop="static" size='sm' keyboard={false} show={waitingNewShortCut as boolean} style={{zIndex: 999999999}}>
                    <Modal.Header>
                        <b>Define a new shortcut</b>
                    </Modal.Header>
                    <Modal.Body>
                        {shortCutMessage}
                    </Modal.Body>
                </Modal>
            </>
}
