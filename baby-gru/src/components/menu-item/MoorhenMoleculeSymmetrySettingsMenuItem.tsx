import { useEffect, useRef, useState } from "react"
import { Form } from "react-bootstrap"
import MoorhenSlider from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenMoleculeSymmetrySettingsMenuItem = (props: {
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const [symmetryRadius, setSymmetryRadius] = useState<number>(25.0)
    const [symmetryOn, setSymmetryOn] = useState<boolean>(false)
    const [showUnitCell, setShowUnitCell] = useState<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const busyDrawing = useRef<boolean>(false)

    const drawSymmetryIfDirty = () => {
        if (isDirty.current) {
            busyDrawing.current = true
            isDirty.current = false
            props.molecule.drawSymmetry(props.glRef)
                .then(_ => {
                    busyDrawing.current = false
                    drawSymmetryIfDirty()
                })
        }
    }

    useEffect(() => {
        isDirty.current = true
        props.molecule.symmetryRadius = symmetryRadius
        if (!busyDrawing.current) {
            drawSymmetryIfDirty()
        }
    }, [symmetryRadius])

    useEffect(() => {
        if (props.molecule.symmetryOn !== symmetryOn) {
            props.molecule.toggleSymmetry(props.glRef)
        }
    }, [symmetryOn])

    useEffect(() => {
        if (showUnitCell) {
            props.molecule.drawUnitCell(props.glRef)
        } else {
            props.molecule.clearBuffersOfStyle('unitCell', props.glRef)
            props.glRef.current.drawScene()
        }
    }, [showUnitCell])

    const panelContent =
        <>
            <Form.Check
                type="switch"
                checked={showUnitCell}
                onChange={() => { setShowUnitCell(!showUnitCell) }}
                label="Show unit cell" />
            <Form.Check
                type="switch"
                checked={symmetryOn}
                onChange={() => { setSymmetryOn(!symmetryOn) }}
                label="Show symmetry mates" />
            <Form.Group className="mt-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSymmetryRadiusSigmaSlider">
                <MoorhenSlider minVal={0.01} maxVal={100} logScale={false} sliderTitle="Radius" initialValue={symmetryRadius} externalValue={symmetryRadius} setExternalValue={setSymmetryRadius} />
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        showOkButton={false}
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Symmetry settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

