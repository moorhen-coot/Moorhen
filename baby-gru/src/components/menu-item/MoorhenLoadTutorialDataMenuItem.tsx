import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenLoadTutorialDataMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    backgroundColor: [number, number, number, number];
    defaultBondSmoothness: number;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
    setActiveMap: React.Dispatch<React.SetStateAction<moorhen.Map>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const tutorialNumberSelectorRef = useRef<HTMLSelectElement | null>(null);
    const allTutorialNumbers = ['1', '2', '3']
    const tutorialMtzColumnNames = {
        1: { F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        2: { F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        3: { F: "FWT", PHI: "PHWT", Fobs: 'F', SigFobs: 'SIGF', FreeR: 'FREER' }
    }

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="loadTutorialData" className="mb-3">
            <Form.Label>Select tutorial number</Form.Label>
            <Form.Select ref={tutorialNumberSelectorRef} >
                {allTutorialNumbers.map(tutorialNumber => {
                    return <option key={tutorialNumber} value={tutorialNumber}>{`Tutorial ${tutorialNumber}`}</option>
                })}
            </Form.Select>
        </Form.Group>
    </>

    const onCompleted = async () => {
        if (tutorialNumberSelectorRef.current === null) {
            return
        }
        const tutorialNumber = tutorialNumberSelectorRef.current.value
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.defaultBondOptions.smoothness = props.defaultBondSmoothness
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)
        const newDiffMap = new MoorhenMap(props.commandCentre, props.glRef)
        await newMolecule.loadToCootFromURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`, `mol-${tutorialNumber}`)
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        props.changeMolecules({ action: "Add", item: newMolecule })
        await newMolecule.centreOn('/*/*/*/*', false)
        await newMap.loadToCootFromMtzURL(
            `${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `map-${tutorialNumber}`,
            { isDifference: false, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber] }
        )
        await newDiffMap.loadToCootFromMtzURL(
            `${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `diff-map-${tutorialNumber}`,
            { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false }
        )
        props.changeMaps({ action: 'AddList', items: [newMap, newDiffMap] })
        props.setActiveMap(newMap)
    }

    return <MoorhenBaseMenuItem
        id='load-tutorial-data-menu-item'
        popoverContent={panelContent}
        menuItemText="Load tutorial data..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

