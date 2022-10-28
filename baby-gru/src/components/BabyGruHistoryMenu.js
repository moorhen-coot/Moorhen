import { NavDropdown, Form, Button, InputGroup, NavItem, Modal, Table } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";
import { useEffect, useState } from "react";
import { cootCommand, doDownload, doDownloadText, readTextFile } from "../BabyGruUtils";


export const BabyGruHistoryMenu = (props) => {
    const [showHistory, setShowHistory] = useState(false)
    const [sessionHistory, setSessionHistory] = useState({ commands: [] })

    useEffect(() => {
        setSessionHistory(props.journalState)
    }, [props.journalState])

    const executeJournalFiles = (files) => {
        console.log(files)
        for (const source of files) {
            readTextFile(source)
                .then(contents => {
                    const journalStructure = JSON.parse(contents)
                    executeSessionHistory(journalStructure.commands)
                })
        }
    }

    const executeSessionHistory = (commands) => {
        commands.filter(command => command.returnType === "status").reduce(
            (p, nextCommand) => {
                //console.log(`Redrawing ${style}`, $this.atomsDirty)
                return p.then(() => cootCommand(props.cootWorker, {
                    returnType: nextCommand.returnType,
                    command: nextCommand.command,
                    commandArgs: nextCommand.commandArgs
                }))
            },
            Promise.resolve()
        ).then(_ => {
            console.log('Done editing', props.glRef.current)
            props.molecules.forEach(molecule => {
                molecule.atomsDirty = true
                molecule.redraw(props.glRef)
            })
            props.glRef.current.drawScene()
        })
    }

    return <>
        <NavDropdown title="History" id="basic-nav-dropdown">
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="showHistory" className="mb-3">
                <Form.Label>Show command history</Form.Label>
                <Form.Control
                    type="button"
                    value="Show"
                    placeholder="Show"
                    aria-label="Session history"
                    onClick={(e) => {
                        setShowHistory(true)
                    }}
                />
            </Form.Group>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="downloadHistory" className="mb-3">
                <Form.Label>Download history as JSON</Form.Label>
                <Form.Control
                    type="button"
                    value="Download"
                    placeholder="Download"
                    aria-label="Download history"
                    onClick={(e) => {
                        const json = JSON.stringify(sessionHistory, null, 2)
                        doDownloadText(json, "BabyGruSession.json")
                    }}
                />
            </Form.Group>

            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadJournal" className="mb-3">
                <Form.Label>Execute history</Form.Label>
                <Form.Control type="file" accept=".json" multiple={true} onChange={(e) => {
                    executeJournalFiles(e.target.files)
                }} />
            </Form.Group>

        </NavDropdown>
        <Modal size="xl" show={showHistory} onHide={() => { setShowHistory(false) }}>
            <Modal.Header closeButton>
                <Modal.Title>Command history</Modal.Title>
            </Modal.Header>
            <div style={{ height: "40rem", overflow: "auto" }}>
                {sessionHistory.commands.length > 0 && <Table>
                    <thead>
                        <tr>
                            {Object.keys(sessionHistory.commands[0]).filter(key => key !== "result").map(key =>
                                <th align="right">{key}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sessionHistory.commands.map((row) => {
                            return <tr key={row.count}>
                                {Object.keys(row).filter(key => key !== "result").map(key =>
                                    <td align="right">{JSON.stringify(row[key], null, 2)}</td>
                                )}
                            </tr>
                        })}
                    </tbody>
                </Table>}
            </div>
            <Modal.Footer><Button onClick={() => {
                executeSessionHistory(sessionHistory.commands)
            }}>Replay</Button></Modal.Footer>
        </Modal>
    </>
}