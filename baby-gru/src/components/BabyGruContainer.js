import { useRef, useState, useEffect, createRef } from 'react';
import { Navbar, Container, NavDropdown, Nav, Tabs, Tab } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { BabyGruMolecules } from './BabyGruMoleculeUI';
import { BabyGruMaps } from './BabyGruMapUI';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { BabyGruMolecule } from './BabyGruMolecule';
import { postCootMessage } from '../BabyGruUtils';
import { BabyGruMap } from './BabyGruMap';

export const BabyGruContainer = (props) => {
    const glRef = useRef(null)
    const cootWorker = useRef(null)
    const [consoleOutput, setConsoleOutput] = useState("")
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        postCootMessage(cootWorker, { messageId: uuidv4(), message: 'CootInitialize', data: {} })
        cootWorker.current.addEventListener("message", (e) => { handleResponse(e) })
        return () => {
            cootWorker.current.terminate()
        }
    }, [])

    const handleResponse = (e) => {
        let newOutput = 'Response > '.concat(e.data.response).concat('\n')
        setConsoleOutput(newOutput)
    }

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromFile(file)
            .then(result => {
                newMolecule.fetchCoordsAndDraw('ribbons', glRef)
            }).then(result => {
                const newMolecules = molecules
                newMolecules.push(newMolecule)
                setMolecules(newMolecules)
                Promise.resolve(newMolecule)
            })
    }

    const readMtzFile = (file) => {
        const newMap = new BabyGruMap(cootWorker)
        newMap.loadToCootFromFile(file)
            .then(result => {
                Promise.resolve(true)
            }).then(result => {
                const newMaps = maps
                newMaps.push(newMap)
                setMaps(newMaps)
                Promise.resolve(newMap)
            })
    }

    const fetchFileFromEBI = (pdbCode) => {
        console.log(pdbCode)
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromEBI(pdbCode)
            .then(result => {
                newMolecule.fetchCoordsAndDraw('ribbons', glRef)
            }).then(result => {
                const newMolecules = molecules
                newMolecules.push(newMolecule)
                setMolecules(newMolecules)
                Promise.resolve(newMolecule)
            })
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
                            <Form.Group style={{ width: '20rem' }} controlId="downloadCoords" className="mb-3">
                                <Form.Label>From PDBe</Form.Label>
                                <Form.Control type="text" onKeyDown={(e) => {
                                    if (e.code === 'Enter') {
                                        fetchFileFromEBI(e.target.value.toUpperCase())
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
                        ref={glRef}
                        maps={maps}
                        width={() => { return window.innerWidth - 580 }}
                        height={() => { return window.innerHeight - 250 }}
                    />
                </div>
                <div style={{
                    overflow: "auto",
                    float: "left",
                    width: "33rem",
                    backgroundColor: "white",
                    height: "calc(100vh - 15rem)"
                }}>
                    <Tabs defaultActiveKey="models">
                        <Tab title="Models" eventKey="models">
                            <div style={{ width: "33rem" }}>
                                <BabyGruMolecules molecules={molecules} glRef={glRef} />
                            </div>
                        </Tab>
                        <Tab title="Maps" eventKey="maps" >
                            <div style={{ width: "33rem" }}>
                                <BabyGruMaps maps={maps} />
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
            <textarea readOnly={true} rows={7} value={consoleOutput} style={{ width: "100vw" }} />
        </Container>
    </div>
}