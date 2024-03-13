import { useCallback, useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { setNotificationContent } from '../../store/generalStatesSlice';
import { MoorhenResidueSteps } from "../misc/MoorhenResidueSteps"

export const MoorhenStepRefinementMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
}) => {
    
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

    const panelContent = <>
        <Form.Group key="stepped-refinement-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="modelSelect" className="mb-3">
            <MoorhenMoleculeSelect width="" molecules={molecules} ref={moleculeSelectRef} />
        </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {

            const handleStepRefine = async (cid: string) => {
                await selectedMolecule.centreAndAlignViewOn(cid, true)
                await selectedMolecule.refineResiduesUsingAtomCid(cid, 'TRIPLE', 4000, true)
            }

            const residueList = selectedMolecule.sequences.map(item => item.sequence).map(sequence => sequence.map(residue => residue)).flat()
        
            dispatch( setNotificationContent(
                <MoorhenResidueSteps 
                    timeCapsuleRef={props.timeCapsuleRef}
                    residueList={residueList}
                    onStep={handleStepRefine}
                    onStart={async () => {
                        await selectedMolecule.fetchIfDirtyAndDraw('rama')
                    }}
                    onStop={() => {
                        selectedMolecule.clearBuffersOfStyle('rama')
                    }}
                />
            ))
        } else {
            console.warn(`Unable to find molecule with molNo ${moleculeSelectRef.current.value} for stepped refinement...`)
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='step-refinement-menu-item'
        popoverContent={panelContent}
        menuItemText="Stepped refine..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
