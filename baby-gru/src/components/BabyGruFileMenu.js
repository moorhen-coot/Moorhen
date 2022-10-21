import { NavDropdown, Form, Button, InputGroup } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";

export const BabyGruFileMenu = (props) => {

    const { molecules, setMolecules, maps, setMaps, cootWorker, glRef } = props;

    const loadPdbFiles = async (files) => {
        let loadPromises = []
        for (const file of files) {
            loadPromises.push(readPdbFile(file))
        }
        let newMolecules = await Promise.all(loadPromises)
        
        let drawPromises = []
        for (const newMolecule of newMolecules){
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true))
        }
        await Promise.all(drawPromises)
        
        setMolecules(molecules.concat(newMolecules))
        newMolecules.at(-1).centreOn(glRef)
    }

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(cootWorker)
        return newMolecule.loadToCootFromFile(file)
    }

    const readMtzFile = (file) => {
        const newMap = new BabyGruMap(cootWorker)
        newMap.loadToCootFromFile(file)
            .then(result => {
                setMaps([...maps, newMap])
                props.setActiveMap(newMap)
            })
    }

    const fetchFileFromEBI = (pdbCode) => {
        return fetchFileFromURL(`/download/${pdbCode}.cif`, pdbCode)
    }

    const fetchFileFromURL = (url, molName) => {
        const newMolecule = new BabyGruMolecule(cootWorker)
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
        const newMolecule = new BabyGruMolecule(cootWorker)
        const newMap = new BabyGruMap(cootWorker)
        newMolecule.loadToCootFromURL(`./tutorials/moorhen-tutorial-structure-number-1.pdb`, "moorhen-tutorial-1")
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            }).then(_ => {
                return newMap.loadToCootFromURL(`./tutorials/moorhen-tutorial-map-number-1.mtz`, "moorhen-tutorial-1")
            })
            .then(result => {
                setMaps([...maps, newMap])
                props.setActiveMap(newMap)
                newMap.cootContourInPlace(glRef.current, 15)
            })
    }

    return <NavDropdown title="File" id="basic-nav-dropdown">
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadCoords" className="mb-3">
            <Form.Label>Coordinates</Form.Label>
            <Form.Control type="file" accept=".pdb, .mmcif, .ent" multiple={true} onChange={(e) => {loadPdbFiles(e.target.files)}} />
        </Form.Group>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="downloadCoords" className="mb-3">
            <Form.Label>From PDBe</Form.Label>
            <Form.Control type="text" onKeyDown={(e) => {
                if (e.code === 'Enter') {
                    fetchFileFromEBI(e.target.value.toUpperCase())
                }
            }} />
        </Form.Group>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadMTZs" className="mb-3">
            <Form.Label>Map coefficients</Form.Label>
            <Form.Control type="file" accept=".mtz" onChange={(e) => {
                for (const file of e.target.files) {
                    readMtzFile(file)
                }
            }} />
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
}