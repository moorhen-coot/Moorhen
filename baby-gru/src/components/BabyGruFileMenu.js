import { NavDropdown, Form, Button, InputGroup, Modal, FormSelect, Col, Row, Overlay, Card, FormCheck } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";
import { useEffect, useState, useRef, createRef } from "react";
import { BabyGruMtzWrapper, cootCommand, readTextFile } from '../BabyGruUtils';
import { InsertDriveFile } from "@mui/icons-material";
import { BabyGruMoleculeSelect } from "./BabyGruMoleculeSelect";

export const BabyGruFileMenu = (props) => {

    const { molecules, setMolecules, maps, setMaps, commandCentre, glRef } = props;
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState(null)
    const readMtzTarget = useRef(null);
    const readDictionaryTarget = useRef(null);
    const pdbCodeFetchInputRef = useRef(null);

    const awaitingPromiseRef = useRef({
        resolve: () => { },
        reject: () => { }
    })

    const loadPdbFiles = async (files) => {
        let readPromises = []
        for (const file of files) {
            readPromises.push(readPdbFile(file))
        }
        let newMolecules = await Promise.all(readPromises)

        let drawPromises = []
        for (const newMolecule of newMolecules) {
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true))
        }
        await Promise.all(drawPromises)

        setMolecules(molecules.concat(newMolecules))
        newMolecules.at(-1).centreOn(glRef)
    }

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        return newMolecule.loadToCootFromFile(file)
    }


    const loadMtzFiles = async (files) => {
        let readPromises = []
        for (const file of files) {
            readPromises.push(readMtzFile(file))
        }
        let newMaps = await Promise.all(readPromises)
        setMaps(maps.concat(newMaps))
        props.setActiveMap(newMaps.at(-1))
    }

    const readMtzFile = async (file) => {
        const newMap = new BabyGruMap(commandCentre)
        const babyGruMtzWrapper = new BabyGruMtzWrapper()
        const newColumns = await babyGruMtzWrapper.loadHeaderFromFile(file)
        setOverlayVisible(true)
        const selectedColumns = await selectColumns(newColumns)
        setOverlayVisible(false)
        return newMap.loadToCootFromFile(file, selectedColumns)
    }

    const selectColumns = async (newColumns) => {
        return new Promise((resolve, reject) => {
            awaitingPromiseRef.current = { resolve, reject };
            setOverlayVisible(true)
            setOverlayContent(<BabyGruDisambiguateColumns
                resolveOrReject={awaitingPromiseRef}
                columns={newColumns}
            />)
            setOverlayTarget(readMtzTarget.current)
            const fColumns = Object.keys(newColumns)
                .filter(key => newColumns[key] === 'F')
            const pColumns = Object.keys(newColumns)
                .filter(key => newColumns[key] === 'P')
            const wColumns = Object.keys(newColumns)
                .filter(key => newColumns[key] === 'W')
            if (fColumns.length === 1 && fColumns.includes('FWT') &&
                pColumns.length === 1 && pColumns.includes('PHWT')) {
                let result = { F: 'FWT', PHI: 'PHWT', W: '', isDifference: false, useWeight: false }
                resolve(result)
            }
        })
    }

    const loadMmcifFiles = async (files) => {
        let readPromises = []
        for (const file of files) {
            readPromises.push(readMmcifFile(file))
        }
        let mmcifReads = await Promise.all(readPromises)
    }

    const readMmcifFile = async (file) => {
        const selectedMolecule = await selectMolecule()
        setOverlayVisible(false)
        return readTextFile(file)
            .then(fileContent => {
                return props.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'shim_read_dictionary',
                    commandArgs: [fileContent, selectedMolecule]
                })
            }).then(result => {
                console.log('selected is', selectedMolecule)
                props.molecules
                    .filter(molecule => molecule.coordMolNo === parseInt(selectedMolecule.coordMolNo))
                    .forEach(molecule => {
                        console.log('redrawing, molecule')
                        molecule.redraw(props.glRef)
                    })
            })
    }

    const selectMolecule = async () => {
        return new Promise((resolve, reject) => {
            awaitingPromiseRef.current = { resolve, reject };
            setOverlayVisible(true)
            setOverlayContent(<BabyGruSelectMolecule
                resolveOrReject={awaitingPromiseRef}
                molecules={props.molecules}
            />)
            setOverlayTarget(readDictionaryTarget.current)
        })
    }

    const fetchFileFromEBI = () => {
        let pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        if (pdbCode) {
            return fetchFileFromURL(`https://www.ebi.ac.uk/pdbe/entry-files/download/pdb${pdbCode}.ent`, pdbCode)
        }
    }

    const fetchFileFromURL = (url, molName) => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        return newMolecule.loadToCootFromURL(url, molName)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                return Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    const loadTutorialData = () => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        const newMap = new BabyGruMap(commandCentre)
        const newDiffMap = new BabyGruMap(commandCentre)
        newMolecule.loadToCootFromURL(`./tutorials/moorhen-tutorial-structure-number-1.pdb`, "moorhen-tutorial-1")
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            }).then(_ => {
                return newMap.loadToCootFromURL(`./tutorials/moorhen-tutorial-map-number-1.mtz`, "moorhen-tutorial-1",
                    { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false })
            }).then(_ => {
                return newDiffMap.loadToCootFromURL(`./tutorials/moorhen-tutorial-map-number-1.mtz`, "moorhen-tutorial-1",
                    { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false })
            }).then(_ => {
                setMaps([...maps, newMap, newDiffMap])
                props.setActiveMap(newMap)
            })
    }

    return <>
        <NavDropdown title="File" id="basic-nav-dropdown">
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadCoords" className="mb-3">
                <Form.Label>Coordinates</Form.Label>
                <Form.Control type="file" accept=".pdb, .mmcif, .ent" multiple={true} onChange={(e) => { loadPdbFiles(e.target.files) }} />
            </Form.Group>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="downloadCoords" className="mb-3">
                <Form.Label>From PDBe</Form.Label>
                <InputGroup>
                    <Form.Control type="text" ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                        if (e.code === 'Enter') {
                            fetchFileFromEBI()
                        }
                    }} />
                    <Button variant="light" onClick={fetchFileFromEBI}>
                        Fetch
                    </Button>
                </InputGroup>
            </Form.Group>

            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadMTZs" className="mb-3">
                <Form.Label>Map coefficients</Form.Label>
                <Form.Control ref={readMtzTarget} type="file" accept=".mtz" multiple={true} onChange={(e) => { loadMtzFiles(e.target.files) }} />
            </Form.Group>

            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadMTZs" className="mb-3">
                <Form.Label>Dictionaries</Form.Label>
                <Form.Control ref={readDictionaryTarget} type="file" accept={[".pdb", ".cif", ".dict", ".mmcif"]} multiple={true} onChange={(e) => { loadMmcifFiles(e.target.files) }} />
            </Form.Group>

            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadMTZs" className="mb-3">
                <Form.Label>Tutorial data</Form.Label>
                <Form.Control
                    type="button"
                    value="Load"
                    placeholder="Load"
                    aria-label="Tutorial data"
                    onClick={(e) => {
                        loadTutorialData()
                    }}
                />
            </Form.Group>

        </NavDropdown>



        <Overlay
            target={overlayTarget}
            show={overlayVisible}
            placement={"right"}
        >
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute',
                        marginBottom: '0.5rem',
                        marginLeft: '1rem',
                        borderRadius: 3,
                        ...props.style,
                    }}
                >{overlayContent}
                </div>
            )}
        </Overlay>
    </>
}


const BabyGruDisambiguateColumns = (props) => {
    const fRef = createRef()
    const pRef = createRef()
    const wRef = createRef()
    const isDif = createRef()
    const useWeight = createRef()

    useEffect(() => {
    }, [props.resolveOrReject])

    return <div>
        <Card>
            <Card.Title>
                Select columns
            </Card.Title>
            <Card.Body>
                <Row key="Row1" style={{ marginBottom: "1rem" }}>
                    <Col key="F">
                        Amplitude
                        <FormSelect size="sm" ref={fRef} defaultValue="FWT" onChange={(val) => { }}>
                            {Object.keys(props.columns)
                                .filter(key => props.columns[key] === 'F')
                                .map(key => <option value={key} key={key}>{key}</option>
                                )}
                        </FormSelect>
                    </Col>
                    <Col key="Phi">
                        Phase
                        <FormSelect size="sm" ref={pRef} defaultValue="PHWT" onChange={(val) => { }}>
                            {Object.keys(props.columns)
                                .filter(key => props.columns[key] === 'P')
                                .map(key => <option value={key} key={key}>{key}</option>
                                )}
                        </FormSelect>
                    </Col>
                    <Col key="Weight">
                        Weight
                        <FormSelect size="sm" ref={wRef} defaultValue="FOM" onChange={(val) => { }}>
                            {Object.keys(props.columns)
                                .filter(key => props.columns[key] === 'W')
                                .map(key => <option value={key} key={key}>{key}</option>
                                )}
                        </FormSelect>
                    </Col>
                </Row>
                <Row style={{ marginBottom: "1rem" }}>
                    <Col>
                        <Form.Check
                            label={'is diff map'}
                            name={`isDifference`}
                            type="checkbox"
                            ref={isDif}
                            variant="outline" />
                    </Col>
                    <Col>
                        <Form.Check
                            label={'use weight'}
                            name={`useWeight`}
                            type="checkbox"
                            ref={useWeight}
                            variant="outline" />
                    </Col>
                </Row>
                <Row key="Row3" style={{ marginBottom: "1rem" }}>
                    <Button onClick={() => {
                        const result = {
                            F: fRef.current.value,
                            PHI: pRef.current.value,
                            WEIGHT: wRef.current.value,
                            isDifference: isDif.current.checked,
                            useWeight: useWeight.current.checked
                        }
                        console.log(result)
                        props.resolveOrReject.current.resolve(result)
                    }}>OK</Button>
                </Row>
            </Card.Body>
        </Card>
    </div>
}

const BabyGruSelectMolecule = (props) => {

    const moleculeSelectRef = useRef(null)

    return <div>
        <Card>
            <Card.Title>
                Select molecule
            </Card.Title>
            <Card.Body>
                <Row key="Row1" style={{ marginBottom: "1rem" }}>
                    <Col key="F">
                        <BabyGruMoleculeSelect {...props} ref={moleculeSelectRef} />
                    </Col>
                </Row>
                <Row key="Row3" style={{ marginBottom: "1rem" }}>
                    <Button onClick={() => {
                        const result = {
                            coordMolNo: moleculeSelectRef.current.value
                        }
                        console.log(result)
                        props.resolveOrReject.current.resolve(result)
                    }}>OK</Button>
                </Row>
            </Card.Body>
        </Card>
    </div>
}