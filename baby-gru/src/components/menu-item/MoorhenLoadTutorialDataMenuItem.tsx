import { useRef } from "react";
import { Form } from "react-bootstrap";
import { useSelector, useDispatch, useStore } from 'react-redux';
import { moorhenGlobalInstance } from "../../InstanceManager/MoorhenGlobalInstance";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { moorhen } from "../../types/moorhen";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { addMapList } from "../../store/mapsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"


export const MoorhenLoadTutorialDataMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const store = useStore()
    const commandCentre = moorhenGlobalInstance.getCommandCentreRef()
    const monomerLibraryPath = moorhenGlobalInstance.paths.monomerLibrary
    
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const tutorialNumberSelectorRef = useRef<HTMLSelectElement | null>(null);
    const urlPrefix = moorhenGlobalInstance.paths.urlPrefix;  

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
        const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        const newMap = new MoorhenMap(props.commandCentre, store);
        const newDiffMap = new MoorhenMap(props.commandCentre, store);
        await newMolecule.loadToCootFromURL(`${urlPrefix}/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`, `mol-${tutorialNumber}`)
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        await newMolecule.centreOn('/*/*/*/*', true)
        await newMap.loadToCootFromMtzURL(
            `${urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `map-${tutorialNumber}`,
            { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber] }
        )
        await newDiffMap.loadToCootFromMtzURL(
            `${urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `diff-map-${tutorialNumber}`,
            { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber] }
        )
        dispatch( addMolecule(newMolecule) )
        dispatch( addMapList([newMap, newDiffMap]) )
        dispatch( setActiveMap(newMap) )   
    }

    return <MoorhenBaseMenuItem
        id='load-tutorial-data-menu-item'
        popoverContent={panelContent}
        menuItemText="Load tutorial data..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

