import { NavDropdown, Form, Button, InputGroup, NavItem } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";
import { useEffect, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Modal } from "@mui/material";
import { doDownload, doDownloadText } from "../BabyGruUtils";

export const BabyGruHistoryMenu = (props) => {
    const [showHistory, setShowHistory] = useState(false)
    const [sessionHistory, setSessionHistory] = useState({ commands: [] })

    useEffect(() => {
        setSessionHistory(props.journalState)
    }, [props.journalState])
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
        </NavDropdown>
        <Modal open={showHistory} onClose={() => { setShowHistory(false) }}>
            <TableContainer component={Paper} sx={{ width: "60rem" }}>
                <Table aria-label="caption table">
                    <caption>A basic table example with a caption</caption>
                    <TableHead>
                        <TableRow>
                            <TableCell align="right">Command</TableCell>
                            <TableCell align="right">commandArgs</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sessionHistory.commands.map((row) => (
                            <TableRow key={row.count}>
                                <TableCell align="right">{row.command}</TableCell>
                                <TableCell align="right">{JSON.stringify(row.commandArgs)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Modal>
    </>
}