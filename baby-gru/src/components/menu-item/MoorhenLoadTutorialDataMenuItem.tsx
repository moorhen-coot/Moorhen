import { useRef } from "react";
import { Form } from "react-bootstrap";
import { useSelector, useDispatch, batch } from 'react-redux';
import { Store } from "@reduxjs/toolkit";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { addMapList } from "../../store/mapsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenLoadTutorialDataMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    store: Store;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const tutorialNumberSelectorRef = useRef<HTMLSelectElement | null>(null);

    const allTutorialNumbers = ['1', '2', '3']
    const tutorialMtzColumnNames = {
        1: { Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        2: { Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        3: { Fobs: 'F', SigFobs: 'SIGF', FreeR: 'FREER' }
    }

    const panelContent = <>
        <Form.Group className='moorhen-form-group' controlId="loadTutorialData">
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
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath);
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        const newMap = new MoorhenMap(props.commandCentre);
        const newDiffMap = new MoorhenMap(props.commandCentre);
        await newMolecule.loadToCootFromURL(`${props.urlPrefix}/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`, `mol-${tutorialNumber}`)
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        await newMolecule.centreOn('/*/*/*/*', true)
        await newMap.loadToCootFromMtzURL(
            `${props.urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `map-${tutorialNumber}`,
            { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber] }
        )
        await newDiffMap.loadToCootFromMtzURL(
            `${props.urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `diff-map-${tutorialNumber}`,
            { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber] }
        )
        batch(() => {
            dispatch( addMolecule(newMolecule) )
            dispatch( addMapList([newMap, newDiffMap]) )
            dispatch( setActiveMap(newMap) )   
        })
    }

    return <MoorhenBaseMenuItem
        id='load-tutorial-data-menu-item'
        popoverContent={panelContent}
        menuItemText="Load tutorial data..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

