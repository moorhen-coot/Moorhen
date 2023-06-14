import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import MoorhenSlider from "../misc/MoorhenSlider"

export const MoorhenMoleculeGaussianSurfaceSettingsMenuItem = (props: {
    surfaceSigma: number;
    setSurfaceSigma: React.Dispatch<React.SetStateAction<number>>;
    surfaceLevel: number;
    setSurfaceLevel: React.Dispatch<React.SetStateAction<number>>;
    surfaceRadius: number;
    setSurfaceRadius: React.Dispatch<React.SetStateAction<number>>;
    surfaceGridScale: number;
    setSurfaceGridScale: React.Dispatch<React.SetStateAction<number>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfSigmaSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Sigma" initialValue={props.surfaceSigma} externalValue={props.surfaceSigma} setExternalValue={props.setSurfaceSigma} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfLevelSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Contour level" initialValue={props.surfaceLevel} externalValue={props.surfaceLevel} setExternalValue={props.setSurfaceLevel} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfRadiusSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Box radius" initialValue={props.surfaceRadius} externalValue={props.surfaceRadius} setExternalValue={props.setSurfaceRadius} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSurfGridScaleSlider">
                <MoorhenSlider minVal={0.01} maxVal={1.5} logScale={false} sliderTitle="Grid scale" initialValue={props.surfaceGridScale} externalValue={props.surfaceGridScale} setExternalValue={props.setSurfaceGridScale} />
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Gaussian surface settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

