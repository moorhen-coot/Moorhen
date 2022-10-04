import { useRef, useState, useEffect } from 'react';
import { Navbar, Container, NavDropdown, Nav, Row, Col } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { BabyGruMolecules } from './BabyGruMolecules';
import { BabyGruMaps } from './BabyGruMaps';
import { BabyGruWebMG } from './BabyGruWebMG';
import {v4 as uuidv4} from 'uuid';

export const BabyGruContainer = (props) => {
    const cootWorker = useRef(null)
    const [consoleOutput, setConsoleOutput] = useState("")
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        cootWorker.current.onmessage = (e) => {
            handleResponse(e)
        }
        cootWorker.current.postMessage({ messageId:uuidv4(), message: 'CootInitialize', data: {} })
        return () => {
            cootWorker.current.terminate()
        }
    }, [])

    const handleResponse = (e) => {
        let newOutput = 'Response>'.concat(e.data.response).concat('\n')
        setConsoleOutput(newOutput)
        if (e.data.message === 'read_pdb') {
            const newMolecules = molecules
            newMolecules.push(e.data.result)
            setMolecules(newMolecules)
        }
        if (e.data.message === 'read_mtz') {
            const newMaps = maps
            newMaps.push(e.data.result)
            setMaps(newMaps)
        }
    }

    const readPdbFile = (file) => {
        
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            cootWorker.current.postMessage({ message: 'read_pdb', name: file.name, text: reader.result })
        }, false);
        reader.readAsText(file);
    }

    const readMtzFile = (file) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const mtzData = new Uint8Array(reader.result)
            cootWorker.current.postMessage({ message: 'read_mtz', name: file.name, data: mtzData })
        }, false);
        reader.readAsArrayBuffer(file);
    }

    return <div>
        <Navbar>
            <Container >
                <Navbar.Brand href="#home">Baby Gru</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <NavDropdown title="File" id="basic-nav-dropdown">
                            <Form.Group style={{ width: '20rem' }} controlId="uploadCoords" className="mb-3">
                                <Form.Label>Coordinates</Form.Label>
                                <Form.Control type="file" accept=".pdb, .mmcif, .ent" onChange={(e) => {
                                    for (const file of e.target.files) {
                                        readPdbFile(file)
                                    }
                                }} />
                            </Form.Group>
                            <Form.Group style={{ width: '20rem' }} controlId="uploadMTZs" className="mb-3">
                                <Form.Label>Map coefficients</Form.Label>
                                <Form.Control type="file" accept=".mtz" onChange={(e) => {
                                    for (const file of e.target.files) {
                                        readMtzFile(file)
                                    }
                                }} />
                            </Form.Group>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
        <Container fluid>
            <div style={{ backgroundColor: "#eee", height: "calc(100vh - 15rem)" }}>
                <div style={{
                    backgroundColor: "black",
                    float: "left",
                    width: "calc(100vw - 35rem)",
                    height: "calc(100vh - 15rem)"
                }}>
                    <BabyGruWebMG 
                        molecules={molecules}
                        maps={maps}
                        width={() => { return window.innerWidth - 580 }}
                        height={() => { return window.innerHeight - 250 }}
                    />
                </div>
                <div style={{
                    overflow: "auto",
                    float: "left",
                    backgroundColor: "pink",
                    width: "33rem",
                    height: "calc(100vh - 15rem)"
                }}>
                    <BabyGruMolecules molecules={molecules} />
                    <BabyGruMaps maps={maps} />
                </div>
            </div>
            <textarea readOnly={true} rows={7} value={consoleOutput} style={{ width: "100vw" }} />
        </Container>
    </div>
}