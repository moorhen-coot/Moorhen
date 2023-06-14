import { Form, FormSelect } from "react-bootstrap"
import MoorhenSlider from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { useRef } from "react"

export const MoorhenMoleculeBondSettingsMenuItem = (props: { 
    bondWidth: number;
    setBondWidth: React.Dispatch<React.SetStateAction<number>>;
    atomRadiusBondRatio: number;
    setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
    bondSmoothness: number;
    setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    
    const smoothnesSelectRef = useRef<null | HTMLSelectElement>(null)

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenBondWidthSlider">
                <MoorhenSlider minVal={0.05} maxVal={0.5} logScale={false} sliderTitle="Bond width" initialValue={0.1} externalValue={props.bondWidth} setExternalValue={props.setBondWidth} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenRadiusBondRatioSlider">
                <MoorhenSlider minVal={1.0} maxVal={3.5} logScale={false} sliderTitle="Radius-Bond ratio" initialValue={1.5} externalValue={props.atomRadiusBondRatio} setExternalValue={props.setAtomRadiusBondRatio} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={props.bondSmoothness} onChange={(evt) => { props.setBondSmoothness(Number(evt.target.value)) }}>
                    <option value={1} key={1}>Coarse</option>
                    <option value={2} key={2}>Nice</option>
                    <option value={3} key={3}>Smooth</option>
                </FormSelect>
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Bond settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

