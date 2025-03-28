import { useCallback, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';
import { Form, FormSelect } from "react-bootstrap";
import { representationLabelMapping } from "../../utils/enums";
import { useSnackbar } from "notistack";

const animationRepresentations = [ 'CBs', 'CAs', 'CRs', 'gaussian', 'MolecularSurface', 'VdwSpheres' ]

export const MoorhenCalculateTrajectoryMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const styleSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const [representationStyle, setRepresentationStyle] = useState<string>("CBs")

    const { enqueueSnackbar } = useSnackbar()

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
            enqueueSnackbar("model-trajectory", {
                variant: "modelTrajectory",
                persist: true,
                glRef: props.glRef,
                commandCentre: props.commandCentre,
                moleculeMolNo: selectedMolecule.molNo,
                representationStyle: styleSelectRef.current.value,
                anchorOrigin: { vertical: "bottom", horizontal: "center" }
            })
        } else {
            console.warn(`Cannot find molecule with imol ${moleculeSelectRef.current.value}`)
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='calculate-trajectory-menu-item'
        popoverContent={panelContent}
        menuItemText="Animate multi-model trajectory..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}


