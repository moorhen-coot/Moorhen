import { useEffect, useState } from "react"
import { Form, Stack } from "react-bootstrap";
import { IconButton, Popover, Slider } from '@mui/material';
import { MoorhenSlider } from '../misc/MoorhenSlider';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { moorhen } from "../../types/moorhen";
import { webGL } from '../../types/mgWebGL';
import { useSelector } from "react-redux";

export const MoorhenMoleculeRepresentationSettingsCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean;
    anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    symmetrySettingsProps: {
        symmetryRadius: number;
        setSymmetryRadius: React.Dispatch<React.SetStateAction<number>>;
    };
    gaussianSettingsProps: {
        surfaceSigma: number;
        setSurfaceSigma: React.Dispatch<React.SetStateAction<number>>;
        surfaceLevel: number;
        setSurfaceLevel: React.Dispatch<React.SetStateAction<number>>;
        surfaceRadius: number;
        setSurfaceRadius: React.Dispatch<React.SetStateAction<number>>;
        surfaceGridScale: number;
        setSurfaceGridScale: React.Dispatch<React.SetStateAction<number>>;
        surfaceBFactor: number;
        setSurfaceBFactor: React.Dispatch<React.SetStateAction<number>>;
    };
    bondSettingsProps: {
        bondWidth: number;
        setBondWidth: React.Dispatch<React.SetStateAction<number>>;
        atomRadiusBondRatio: number;
        setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
        bondSmoothness: number;
        setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    };
}) => {

    const [symmetryOn, setSymmetryOn] = useState<boolean>(false)
    const [biomolOn, setBiomolOn] = useState<boolean>(false)
    const [showUnitCell, setShowUnitCell] = useState<boolean>(false)
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    } = props.bondSettingsProps

    const {
        surfaceSigma, setSurfaceSigma, surfaceLevel, setSurfaceLevel, surfaceBFactor,
        surfaceRadius, setSurfaceRadius, surfaceGridScale, setSurfaceGridScale, setSurfaceBFactor
    } = props.gaussianSettingsProps

    const {
        symmetryRadius, setSymmetryRadius
    } = props.symmetrySettingsProps

    const getSliderButton = (state: number, stateSetter: React.Dispatch<React.SetStateAction<number>>, step: number) => {
        return <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => stateSetter((prev) => { return prev + step})} >
                    {step > 0 ? <AddCircleOutline/> : <RemoveCircleOutline/>}
                </IconButton>
    }

    useEffect(() => {
        if (props.molecule.symmetryOn !== symmetryOn) {
            props.molecule.toggleSymmetry()
        }
    }, [symmetryOn])

    useEffect(() => {
        if (props.molecule.biomolOn !== biomolOn) {
            props.molecule.toggleBiomolecule()
        }
    }, [biomolOn])

    useEffect(() => {
        if (showUnitCell) {
            props.molecule.drawUnitCell()
        } else {
            props.molecule.clearBuffersOfStyle('unitCell')
            props.glRef.current.drawScene()
        }
    }, [showUnitCell])

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: isDark ? 'grey' : 'white', marginTop: '0.1rem', borderRadius: '1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px'}}}
            >
            <Stack gap={2} direction='vertical' style={{width: '25rem', margin: '0.5rem'}}>
                <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
                <MoorhenSlider
                    sliderTitle="Bond width"
                    initialValue={bondWidth}
                    externalValue={bondWidth}
                    setExternalValue={setBondWidth}
                    showMinMaxVal={false}
                    decrementButton={getSliderButton(bondWidth, setBondWidth, -0.1)}
                    incrementButton={getSliderButton(bondWidth, setBondWidth, 0.1)}
                    minVal={0.05}
                    maxVal={0.5}
                    logScale={false}/>
                <MoorhenSlider
                    sliderTitle="Radius-Bond ratio"
                    initialValue={atomRadiusBondRatio}
                    externalValue={atomRadiusBondRatio}
                    setExternalValue={setAtomRadiusBondRatio} 
                    showMinMaxVal={false}
                    decrementButton={getSliderButton(atomRadiusBondRatio, setAtomRadiusBondRatio, -0.1)}
                    incrementButton={getSliderButton(atomRadiusBondRatio, setAtomRadiusBondRatio, 0.1)}
                    minVal={1.0}
                    maxVal={3.5}
                    logScale={false}/>
                <span>Bond Smoothness</span>        
                <Slider
                    aria-label="Smoothness"
                    value={bondSmoothness}
                    onChange={(evt, value: number) => { setBondSmoothness(value) }}
                    valueLabelFormat={(value) => {
                        switch(value) {
                            case 1:
                                return "Coarse"
                            case 50:
                                return "Nice"
                            default: 
                                return "Smooth"
                        }
                    }}
                    getAriaValueText={(value) => {
                        switch(value) {
                            case 1:
                                return "Coarse"
                            case 50:
                                return "Nice"
                            default: 
                                return "Smooth"
                        }
                    }}
                    step={null}
                    valueLabelDisplay="auto"
                    marks={[
                        {value: 1, label: 'Coarse'},
                        {value: 50, label: 'Nice'},
                        {value: 100, label: 'Smooth'}
                    ]}
                />
                </div>
                <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
                    <MoorhenSlider
                        sliderTitle="Gauss. Surf. Sigma"
                        initialValue={surfaceSigma}
                        externalValue={surfaceSigma}
                        setExternalValue={setSurfaceSigma}
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(surfaceSigma, setSurfaceSigma, -1)}
                        incrementButton={getSliderButton(surfaceSigma, setSurfaceSigma, 1)}
                        minVal={0.01}
                        maxVal={10}
                        logScale={false}/>
                    <MoorhenSlider
                        sliderTitle="Gauss. Surf. Contour Level"
                        initialValue={surfaceLevel}
                        externalValue={surfaceLevel}
                        setExternalValue={setSurfaceLevel} 
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(surfaceLevel, setSurfaceLevel, -1)}
                        incrementButton={getSliderButton(surfaceLevel, setSurfaceLevel, 1)}
                        minVal={0.01}
                        maxVal={10}
                        logScale={false}/>
                    <MoorhenSlider
                        sliderTitle="Gauss. Surf. Box Radius"
                        initialValue={surfaceRadius}
                        externalValue={surfaceRadius}
                        setExternalValue={setSurfaceRadius} 
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(surfaceRadius, setSurfaceRadius, -1)}
                        incrementButton={getSliderButton(surfaceRadius, setSurfaceRadius, 1)}
                        minVal={0.01}
                        maxVal={10}
                        logScale={false}/>
                    <MoorhenSlider 
                        sliderTitle="Gauss. Surf. Grid Scale"
                        initialValue={surfaceGridScale}
                        externalValue={surfaceGridScale}
                        setExternalValue={setSurfaceGridScale} 
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(surfaceGridScale, setSurfaceGridScale, -0.1)}
                        incrementButton={getSliderButton(surfaceGridScale, setSurfaceGridScale, 0.1)}
                        minVal={0.01}
                        maxVal={1.5}
                        logScale={false}/>
                    <MoorhenSlider 
                        sliderTitle="Gauss. Surf. B-Factor"
                        initialValue={surfaceBFactor}
                        externalValue={surfaceBFactor}
                        setExternalValue={setSurfaceBFactor} 
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(surfaceBFactor, setSurfaceBFactor, -10)}
                        incrementButton={getSliderButton(surfaceBFactor, setSurfaceBFactor, 10)}
                        minVal={0}
                        maxVal={100}
                        logScale={false}/>
                </div>
                <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
                    <Form.Check
                        type="switch"
                        checked={showUnitCell}
                        onChange={() => { setShowUnitCell(!showUnitCell) }}
                        label="Show unit cell" />
                    <Form.Check
                        type="switch"
                        checked={symmetryOn}
                        onChange={() => { 
                            if(biomolOn && !symmetryOn) setBiomolOn(false)
                            setSymmetryOn(!symmetryOn)
                        }}
                        label="Show symmetry mates" />
                    <Form.Check
                        type="switch"
                        checked={biomolOn}
                        onChange={() => { 
                            if(symmetryOn && !biomolOn) setSymmetryOn(false)
                            setBiomolOn(!biomolOn)
                        }}
                        label="Show biomolecule" />
                    <MoorhenSlider
                        isDisabled={!symmetryOn}
                        sliderTitle="Symmetry Radius"
                        initialValue={symmetryRadius}
                        externalValue={symmetryRadius}
                        setExternalValue={setSymmetryRadius}
                        showMinMaxVal={false}
                        decrementButton={getSliderButton(symmetryRadius, setSymmetryRadius, -5)}
                        incrementButton={getSliderButton(symmetryRadius, setSymmetryRadius, +5)}
                        minVal={0.01}
                        maxVal={100}
                        logScale={false}/>
                </div>
            </Stack>
        </Popover>
}
