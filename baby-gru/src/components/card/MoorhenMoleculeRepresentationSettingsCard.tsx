import { useEffect, useState } from "react"
import { Form, FormSelect, InputGroup, Stack } from "react-bootstrap";
import { IconButton, Popover, Slider } from '@mui/material';
import { MoorhenSlider } from '../misc/MoorhenSlider';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { moorhen } from "../../types/moorhen";
import { webGL } from '../../types/mgWebGL';
import { useSelector } from "react-redux";

const SliderButton = (props: {
    stateSetter: React.Dispatch<React.SetStateAction<number>>;
    step: number
}) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const { stateSetter, step } = props

    return <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => stateSetter((prev) => { return prev + step})} >
                {step > 0 ? <AddCircleOutline/> : <RemoveCircleOutline/>}
            </IconButton>
}

export const BondSettingsPanel = (props: {
    bondWidth: number;
    setBondWidth: React.Dispatch<React.SetStateAction<number>>;
    atomRadiusBondRatio: number;
    setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
    showAniso: boolean;
    setShowAniso: React.Dispatch<React.SetStateAction<boolean>>;
    showOrtep: boolean;
    setShowOrtep: React.Dispatch<React.SetStateAction<boolean>>;
    showHs: boolean;
    setShowHs: React.Dispatch<React.SetStateAction<boolean>>;
    bondSmoothness: number;
    setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
}) => {

    const {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness,
        showAniso, setShowAniso, showOrtep, setShowOrtep, showHs, setShowHs
    } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
        <MoorhenSlider
            sliderTitle="Bond width"
            initialValue={bondWidth}
            externalValue={bondWidth}
            setExternalValue={setBondWidth}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setBondWidth} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setBondWidth} step={0.1}/>}
            minVal={0.05}
            maxVal={0.5}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Radius-Bond ratio"
            initialValue={atomRadiusBondRatio}
            externalValue={atomRadiusBondRatio}
            setExternalValue={setAtomRadiusBondRatio} 
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setAtomRadiusBondRatio} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setAtomRadiusBondRatio} step={0.1}/>}
            minVal={1.0}
            maxVal={3.5}
            logScale={false}/>
        <Form.Check 
            type="switch"
            checked={showAniso}
            onChange={() => setShowAniso((prev) => !prev)}
            label="Show Thermal ellipsoids"/>
        <Form.Check 
            type="switch"
            checked={showOrtep}
            onChange={() => setShowOrtep((prev) => !prev)}
            label="Ortep style"/>
        <Form.Check 
            type="switch"
            checked={showHs}
            onChange={() => setShowHs((prev) => !prev)}
            label="Show Hs"/>
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
}

const SurfaceSettingsPanel = (props: {
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
}) => {

    const {
        surfaceSigma, setSurfaceSigma, surfaceLevel, setSurfaceLevel, surfaceBFactor,
        surfaceRadius, setSurfaceRadius, surfaceGridScale, setSurfaceGridScale, setSurfaceBFactor
    } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
        <MoorhenSlider
            sliderTitle="Gauss. Surf. Sigma"
            initialValue={surfaceSigma}
            externalValue={surfaceSigma}
            setExternalValue={setSurfaceSigma}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceSigma} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceSigma} step={1}/>}
            minVal={0.01}
            maxVal={10}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Gauss. Surf. Contour Level"
            initialValue={surfaceLevel}
            externalValue={surfaceLevel}
            setExternalValue={setSurfaceLevel} 
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceLevel} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceLevel} step={1}/>}
            minVal={0.01}
            maxVal={10}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Gauss. Surf. Box Radius"
            initialValue={surfaceRadius}
            externalValue={surfaceRadius}
            setExternalValue={setSurfaceRadius} 
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceRadius} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceRadius} step={1}/>}
            minVal={0.01}
            maxVal={10}
            logScale={false}/>
        <MoorhenSlider 
            sliderTitle="Gauss. Surf. Grid Scale"
            initialValue={surfaceGridScale}
            externalValue={surfaceGridScale}
            setExternalValue={setSurfaceGridScale} 
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceGridScale} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceGridScale} step={0.1}/>}
            minVal={0.01}
            maxVal={1.5}
            logScale={false}/>
        <MoorhenSlider 
            sliderTitle="Gauss. Surf. B-Factor"
            initialValue={surfaceBFactor}
            externalValue={surfaceBFactor}
            setExternalValue={setSurfaceBFactor} 
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceBFactor} step={-10}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceBFactor} step={10}/>}
            minVal={0}
            maxVal={100}
            logScale={false}/>
    </div>
}

const SymmetrySettingsPanel = (props: {
    symmetryRadius: number;
    setSymmetryRadius: React.Dispatch<React.SetStateAction<number>>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const [symmetryOn, setSymmetryOn] = useState<boolean>(props.molecule.symmetryOn)
    const [biomolOn, setBiomolOn] = useState<boolean>(props.molecule.biomolOn)
    const [showUnitCell, setShowUnitCell] = useState<boolean>(props.molecule.unitCellRepresentation?.visible)

    const {
        symmetryRadius, setSymmetryRadius
    } = props

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

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
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
            decrementButton={<SliderButton stateSetter={setSymmetryRadius} step={-5}/>}
            incrementButton={<SliderButton stateSetter={setSymmetryRadius} step={5}/>}
            minVal={0.01}
            maxVal={100}
            logScale={false}/>
    </div>
}

export const RibbonSettingsPanel = (props: {
    ribbonCoilThickness: number;
    setRibbonCoilThickness: React.Dispatch<React.SetStateAction<number>>;
    ribbonHelixWidth: number;
    setRibbonHelixWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonStrandWidth: number;
    setRibbonStrandWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonArrowWidth: number;
    setRibbonArrowWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonDNARNAWidth: number;
    setRibbonDNARNAWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonAxialSampling: number;
    setRibbonAxialSampling: React.Dispatch<React.SetStateAction<number>>;
    nucleotideRibbonStyle: "DishyBases" | "StickBases";
    setNucleotideRibbonStyle: React.Dispatch<React.SetStateAction<"DishyBases" | "StickBases">>;
    dishStyleAngularSampling: number;
    setDishStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
    ssUsageScheme: number;
    setSsUsageScheme: React.Dispatch<React.SetStateAction<number>>;
}) => {

    const {
        ribbonCoilThickness, setRibbonCoilThickness, ribbonHelixWidth, 
        setRibbonHelixWidth, ribbonStrandWidth, setRibbonStrandWidth, 
        ribbonArrowWidth, setRibbonArrowWidth, ribbonDNARNAWidth, 
        setRibbonDNARNAWidth, ribbonAxialSampling, setRibbonAxialSampling,
        nucleotideRibbonStyle, setNucleotideRibbonStyle, dishStyleAngularSampling,
        setDishStyleAngularSampling, ssUsageScheme, setSsUsageScheme
    } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
        <MoorhenSlider
            sliderTitle="Ribbon Coil Thickness"
            initialValue={ribbonCoilThickness}
            externalValue={ribbonCoilThickness}
            setExternalValue={setRibbonCoilThickness}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonCoilThickness} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonCoilThickness} step={0.1}/>}
            minVal={0.01}
            maxVal={2}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Ribbon Helix Width"
            initialValue={ribbonHelixWidth}
            externalValue={ribbonHelixWidth}
            setExternalValue={setRibbonHelixWidth}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonHelixWidth} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonHelixWidth} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Ribbon Strand Width"
            initialValue={ribbonStrandWidth}
            externalValue={ribbonStrandWidth}
            setExternalValue={setRibbonStrandWidth}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonStrandWidth} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonStrandWidth} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Ribbon Arrow Width"
            initialValue={ribbonArrowWidth}
            externalValue={ribbonArrowWidth}
            setExternalValue={setRibbonArrowWidth}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonArrowWidth} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonArrowWidth} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Ribbon Nucleotides Width"
            initialValue={ribbonDNARNAWidth}
            externalValue={ribbonDNARNAWidth}
            setExternalValue={setRibbonDNARNAWidth}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonDNARNAWidth} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonDNARNAWidth} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Ribbon Axial Sampling"
            initialValue={ribbonAxialSampling}
            externalValue={ribbonAxialSampling}
            setExternalValue={setRibbonAxialSampling}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setRibbonAxialSampling} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setRibbonAxialSampling} step={1}/>}
            minVal={0}
            maxVal={15}
            allowFloats={false}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Nucl. Dish Angular Sampling"
            initialValue={dishStyleAngularSampling}
            externalValue={dishStyleAngularSampling}
            setExternalValue={setDishStyleAngularSampling}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setDishStyleAngularSampling} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setDishStyleAngularSampling} step={1}/>}
            minVal={1}
            maxVal={64}
            allowFloats={false}
            logScale={false}/>
        <Form.Group style={{ margin: '0px', width: '100%' }}>
            <Form.Label>Secondary structure method</Form.Label>
            <FormSelect size="sm" value={ssUsageScheme} onChange={(evt) => setSsUsageScheme(parseInt(evt.target.value))}>
                <option value={'0'}>Use header</option>
                <option value={'1'}>Do not use header</option>
                <option value={'2'}>Calculate secondary structure</option>
            </FormSelect>
        </Form.Group>
        <Form.Group style={{ margin: '0px', width: '100%' }}>
            <Form.Label>Nucleotide ribbon style</Form.Label>
            <FormSelect size="sm" value={nucleotideRibbonStyle} onChange={(evt) => setNucleotideRibbonStyle(evt.target.value as "DishyBases" | "StickBases")}>
                <option value={'StickBases'}>Sticks</option>
                <option value={'DishyBases'}>Dishes</option>
            </FormSelect>
        </Form.Group>
    </div>
}

export const MolSurfSettingsPanel = (props: {
    surfaceStyleProbeRadius: number;
    setSurfaceStyleProbeRadius: React.Dispatch<React.SetStateAction<number>>;
    ballsStyleRadiusMultiplier: number;
    setBallsStyleRadiusMultiplier: React.Dispatch<React.SetStateAction<number>>;
}) => {

    const {
        surfaceStyleProbeRadius, setSurfaceStyleProbeRadius,
        ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier
    } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
        <MoorhenSlider
            sliderTitle="Mol. Surf. Probe Radius"
            initialValue={surfaceStyleProbeRadius}
            externalValue={surfaceStyleProbeRadius}
            setExternalValue={setSurfaceStyleProbeRadius}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setSurfaceStyleProbeRadius} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setSurfaceStyleProbeRadius} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Mol. Surf. Radius Multiplier"
            initialValue={ballsStyleRadiusMultiplier}
            externalValue={ballsStyleRadiusMultiplier}
            setExternalValue={setBallsStyleRadiusMultiplier}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setBallsStyleRadiusMultiplier} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setBallsStyleRadiusMultiplier} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
    </div>
}

const CylinderSettingsPanel = (props: {
    cylindersStyleAngularSampling: number;
    setCylindersStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
    cylindersStyleCylinderRadius: number;
    setCylindersStyleCylinderRadius: React.Dispatch<React.SetStateAction<number>>;
    cylindersStyleBallRadius: number;
    setCylindersStyleBallRadius: React.Dispatch<React.SetStateAction<number>>;
}) => {
    
    const {
        cylindersStyleAngularSampling, setCylindersStyleAngularSampling, cylindersStyleCylinderRadius, 
        setCylindersStyleCylinderRadius, cylindersStyleBallRadius, setCylindersStyleBallRadius
    } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
        <MoorhenSlider
            sliderTitle="Cylinder Angular Sampling"
            initialValue={cylindersStyleAngularSampling}
            externalValue={cylindersStyleAngularSampling}
            setExternalValue={setCylindersStyleAngularSampling}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setCylindersStyleAngularSampling} step={-1}/>}
            incrementButton={<SliderButton stateSetter={setCylindersStyleAngularSampling} step={1}/>}
            minVal={0.01}
            maxVal={10}
            allowFloats={false}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Cylinder Radius"
            initialValue={cylindersStyleCylinderRadius}
            externalValue={cylindersStyleCylinderRadius}
            setExternalValue={setCylindersStyleCylinderRadius}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setCylindersStyleCylinderRadius} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setCylindersStyleCylinderRadius} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
        <MoorhenSlider
            sliderTitle="Cylinder Ball Radius"
            initialValue={cylindersStyleBallRadius}
            externalValue={cylindersStyleBallRadius}
            setExternalValue={setCylindersStyleBallRadius}
            showMinMaxVal={false}
            decrementButton={<SliderButton stateSetter={setCylindersStyleBallRadius} step={-0.1}/>}
            incrementButton={<SliderButton stateSetter={setCylindersStyleBallRadius} step={0.1}/>}
            minVal={0.01}
            maxVal={3}
            logScale={false}/>
    </div>
}

export const ResidueEnvironmentSettingsPanel = (props: {
    maxDist: number;
    setMaxDist: React.Dispatch<React.SetStateAction<number>>;
    labelled: boolean;
    setLabelled: React.Dispatch<React.SetStateAction<boolean>>;
    showHBonds: boolean;
    setShowHBonds: React.Dispatch<React.SetStateAction<boolean>>;
    showContacts: boolean;
    setShowContacts: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const { maxDist, setMaxDist, showContacts, setShowContacts, showHBonds, setShowHBonds, labelled, setLabelled } = props

    return <div style={{paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem'}}>
                <Form.Check 
                    type="switch"
                    checked={labelled}
                    onChange={() => setLabelled((prev) => !prev)}
                    label="Show labels"/>
                <Form.Check 
                    type="switch"
                    checked={showHBonds}
                    onChange={() => setShowHBonds((prev) => !prev)}
                    label="Show H bonds"/>
                <Form.Check 
                    type="switch"
                    checked={showContacts}
                    onChange={() => setShowContacts((prev) => !prev)}
                    label="Show contacts"/>
                <MoorhenSlider
                    sliderTitle="Neighbouring Res. Dist."
                    initialValue={maxDist}
                    externalValue={maxDist}
                    setExternalValue={setMaxDist}
                    showMinMaxVal={false}
                    decrementButton={<SliderButton stateSetter={setMaxDist} step={-0.5}/>}
                    incrementButton={<SliderButton stateSetter={setMaxDist} step={0.5}/>}
                    minVal={1}
                    maxVal={15}
                    logScale={false}/>
            </div> 
}

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
        showAniso: boolean;
        setShowAniso: React.Dispatch<React.SetStateAction<boolean>>;
        showOrtep: boolean;
        setShowOrtep: React.Dispatch<React.SetStateAction<boolean>>;
        showHs: boolean;
        setShowHs: React.Dispatch<React.SetStateAction<boolean>>;
        bondSmoothness: number;
        setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    };
    ribbonSettingsProps: {
        ribbonCoilThickness: number;
        setRibbonCoilThickness: React.Dispatch<React.SetStateAction<number>>;
        ribbonHelixWidth: number;
        setRibbonHelixWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonStrandWidth: number;
        setRibbonStrandWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonArrowWidth: number;
        setRibbonArrowWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonDNARNAWidth: number;
        setRibbonDNARNAWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonAxialSampling: number;
        setRibbonAxialSampling: React.Dispatch<React.SetStateAction<number>>;
        nucleotideRibbonStyle: "DishyBases" | "StickBases";
        setNucleotideRibbonStyle: React.Dispatch<React.SetStateAction<"DishyBases" | "StickBases">>;
        dishStyleAngularSampling: number;
        setDishStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
        ssUsageScheme: number;
        setSsUsageScheme: React.Dispatch<React.SetStateAction<number>>;
    };
    molSurfSettingsProps: {
        surfaceStyleProbeRadius: number;
        setSurfaceStyleProbeRadius: React.Dispatch<React.SetStateAction<number>>;
        ballsStyleRadiusMultiplier: number;
        setBallsStyleRadiusMultiplier: React.Dispatch<React.SetStateAction<number>>;    
    };
    cylinderSettingsProps: {
        cylindersStyleAngularSampling: number;
        setCylindersStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
        cylindersStyleCylinderRadius: number;
        setCylindersStyleCylinderRadius: React.Dispatch<React.SetStateAction<number>>;
        cylindersStyleBallRadius: number;
        setCylindersStyleBallRadius: React.Dispatch<React.SetStateAction<number>>;
    };
    residueEnvironmentSettingsProps: {
        maxDist: number;
        setMaxDist: React.Dispatch<React.SetStateAction<number>>;
        labelled: boolean;
        setLabelled: React.Dispatch<React.SetStateAction<boolean>>;
        showHBonds: boolean;
        setShowHBonds: React.Dispatch<React.SetStateAction<boolean>>;
        showContacts: boolean;
        setShowContacts: React.Dispatch<React.SetStateAction<boolean>>;    
    };
}) => {
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: isDark ? 'grey' : 'white', marginTop: '0.1rem', borderRadius: '1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px'}}}
            >
            <Stack gap={1} direction="horizontal">
                <Stack gap={1} direction='vertical' style={{width: '23rem', margin: '0.5rem', display: "flex", flexDirection: "column", justifyContent: "center"}}>
                    <BondSettingsPanel {...props.bondSettingsProps}/>
                    <SurfaceSettingsPanel {...props.gaussianSettingsProps}/>
                    <SymmetrySettingsPanel {...props.symmetrySettingsProps} molecule={props.molecule} glRef={props.glRef}/>
                    <ResidueEnvironmentSettingsPanel {...props.residueEnvironmentSettingsProps}/>
                </Stack>
                <Stack gap={1} direction='vertical' style={{width: '23rem', margin: '0.5rem', display: "flex", flexDirection: "column", justifyContent: "center"}}>
                    <RibbonSettingsPanel {...props.ribbonSettingsProps}/>
                    <MolSurfSettingsPanel {...props.molSurfSettingsProps}/>
                    <CylinderSettingsPanel {...props.cylinderSettingsProps}/>
                </Stack>
            </Stack>
        </Popover>
}
