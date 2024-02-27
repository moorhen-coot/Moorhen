import { useCallback, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenModelTrajectoryManager } from "../misc/MoorhenModelTrajectoryManager"
import { setNotificationContent } from "../../store/generalStatesSlice"
import { Form, FormSelect } from "react-bootstrap";
import { representationLabelMapping } from "../../utils/MoorhenUtils";

const animationRepresentations = [ 'CBs', 'CAs', 'CRs', 'gaussian', 'MolecularSurface', 'VdwSpheres' ]

export const MoorhenCalculateTrajectoryMenuItem = (props: {
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const styleSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const [representationStyle, setRepresentationStyle] = useState<string>("CBs")

    const panelContent = <>
        <Form.Group style={{ margin: '0.5rem', width: '20rem' }}>
            <Form.Label>Style</Form.Label>
            <FormSelect ref={styleSelectRef} size="sm" value={representationStyle} onChange={(evt) => setRepresentationStyle(evt.target.value)}>
                {animationRepresentations.map(key => {
                    return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                })}
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
    </>

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null || styleSelectRef.current.value === null) {
            return
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            dispatch( setNotificationContent(
                <MoorhenModelTrajectoryManager
                    representationStyle={styleSelectRef.current.value as moorhen.RepresentationStyles}
                    molecule={selectedMolecule}
                    commandCentre={props.commandCentre}
                    glRef={props.glRef}/>
            ))
        } else {
            console.warn(`Cannot fin molecule with imol ${moleculeSelectRef.current.value}`)
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='calculate-trajectory-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText="Animate multi-model trajectory..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenCalculateTrajectoryMenuItem.defaultProps = {
    popoverPlacement: "right",
}

