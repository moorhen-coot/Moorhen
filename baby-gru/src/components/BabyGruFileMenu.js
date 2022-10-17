import { NavDropdown, Form } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";

export const BabyGruFileMenu = (props) => {

    const { molecules, setMolecules, maps, setMaps, cootWorker, glRef } = props;

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromFile(file)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    const readMtzFile = (file) => {
        const newMap = new BabyGruMap(cootWorker)
        newMap.loadToCootFromFile(file)
            .then(result => {
                Promise.resolve(true)
            }).then(result => {
                setMaps([...maps, newMap])
                props.setActiveMap(newMap)
                Promise.resolve(newMap)
            })
    }

    const fetchFileFromEBI = (pdbCode) => {
        console.log(pdbCode)
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromEBI(pdbCode)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    return <NavDropdown title="File" id="basic-nav-dropdown">
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
}