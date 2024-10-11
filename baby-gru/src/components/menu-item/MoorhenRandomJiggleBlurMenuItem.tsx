import { useCallback, useRef, useState, useEffect } from "react";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { IconButton } from "@mui/material";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { useDispatch, useSelector } from "react-redux";
import { clearResidueSelection } from "../../store/generalStatesSlice";

export const MoorhenRandomJiggleBlurMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    
    const dispatch = useDispatch()
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidSelectRef = useRef<HTMLInputElement | null>(null)
    const bFactorSliderRef = useRef<number>(200)
    const noTrialsSliderRef = useRef<number>(500)
    const scaleFactorSliderRef = useRef<number>(3)
    
    const [selectedMap, setSelectedMap] = useState<number | null>(null)
    const [selectedMolNo, setSelectedMolNo] = useState<null | number>(null)
    const [bFactor, setBFactor] = useState<number>(200)
    const [noTrials, setNoTrials] = useState<number>(50)
    const [scaleFactor, setScaleFactor] = useState<number>(3)
    const [cid, setCid] = useState<string>('')

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedMolNo(null)
        } else if (selectedMolNo === null || !molecules.map(molecule => molecule.molNo).includes(selectedMolNo)) {
            setSelectedMolNo(molecules[0].molNo)
        }
    }, [molecules.length])

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (selectedMolecule) {
            setSelectedMolNo(parseInt(evt.target.value))
        } 
    }

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMap = maps.find(map => map.molNo === parseInt(evt.target.value))
        if (selectedMap) {
            setSelectedMap(parseInt(evt.target.value))
        } 
    }

    const increaseBfactorButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                        const newVal = bFactor + 25
                                        setBFactor(newVal)
                                        bFactorSliderRef.current = newVal
                                    }}>
                                        <AddCircleOutline/>
                                    </IconButton>
    const decreaseBfactorButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                        const newVal = bFactor - 25
                                        setBFactor(newVal)
                                        bFactorSliderRef.current = newVal
                                    }}>
                                        <RemoveCircleOutline/>
                                    </IconButton>

    const increaseNoTrialsButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                        const newVal = noTrials + 100
                                        setNoTrials(newVal)
                                        noTrialsSliderRef.current = newVal
                                    }}>
                                        <AddCircleOutline/>
                                    </IconButton>
    const decreaseNoTrialsButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                        const newVal = noTrials - 100
                                        setNoTrials(newVal)
                                        noTrialsSliderRef.current = newVal
                                    }}>
                                        <RemoveCircleOutline/>
                                    </IconButton>

    const increaseScaleFactorButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                            const newVal = scaleFactor + 1
                                            setScaleFactor(newVal)
                                            scaleFactorSliderRef.current = newVal
                                        }}>
                                            <AddCircleOutline/>
                                        </IconButton>
    const decreaseScaleFactorButton =  <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={() => {
                                            const newVal = scaleFactor - 1
                                            setScaleFactor(newVal)
                                            scaleFactorSliderRef.current = newVal
                                        }}>
                                            <RemoveCircleOutline/>
                                        </IconButton>

    const panelContent = <>
        <MoorhenMoleculeSelect
            ref={moleculeSelectRef}
            molecules={molecules}
            onChange={handleModelChange}/>
        <MoorhenMapSelect
            ref={mapSelectRef}
            maps={maps}
            onChange={handleMapChange}/>
        <MoorhenCidInputForm
            ref={cidSelectRef}
            margin="0.5rem"
            onChange={(evt) => setCid(evt.target.value)}
            allowUseCurrentSelection={true}
            placeholder={cidSelectRef.current ? "" : "Input custom selection e.g. //A,B"}/>
        <MoorhenSlider
            ref={bFactorSliderRef}
            sliderTitle="B-Factor"
            decrementButton={decreaseBfactorButton}
            incrementButton={increaseBfactorButton}
            minVal={10}
            maxVal={400}
            showMinMaxVal={false}
            logScale={false}
            initialValue={bFactor}
            externalValue={bFactor}
            setExternalValue={setBFactor}/>
        <MoorhenSlider
            ref={noTrialsSliderRef}
            sliderTitle="No. of trials"
            decrementButton={decreaseNoTrialsButton}
            incrementButton={increaseNoTrialsButton}
            minVal={10}
            maxVal={5000}
            showMinMaxVal={false}
            logScale={false}
            allowFloats={false}
            initialValue={noTrials}
            externalValue={noTrials}
            setExternalValue={setNoTrials}/>
        <MoorhenSlider
            ref={scaleFactorSliderRef}
            sliderTitle="Scale factor"
            decrementButton={decreaseScaleFactorButton}
            incrementButton={increaseScaleFactorButton}
            minVal={1}
            maxVal={6}
            showMinMaxVal={false}
            logScale={false}
            initialValue={scaleFactor}
            externalValue={scaleFactor}
            setExternalValue={setScaleFactor}/>
    </>

    const onCompleted = useCallback(async () => {
        if (!moleculeSelectRef.current.value || !mapSelectRef.current.value || !cidSelectRef.current.value) {
            return
        }
        
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if(!selectedMolecule) {
            return
        }

        if (cidSelectRef.current.value === residueSelection?.cid) {
            dispatch( clearResidueSelection() )
        }
        
        await props.commandCentre.current.cootCommand({
            command: "fit_to_map_by_random_jiggle_with_blur_using_cid",
            returnType: 'status',
            commandArgs: [
                parseInt(moleculeSelectRef.current.value),
                parseInt(mapSelectRef.current.value),
                cidSelectRef.current.value,
                bFactorSliderRef.current,
                noTrialsSliderRef.current,
                scaleFactorSliderRef.current
            ],
        }, false)

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()

    }, [props.commandCentre])

    return <MoorhenBaseMenuItem
        id='jiggle-fit-blur-menu-item'
        popoverContent={panelContent}
        menuItemText="Jiggle Fit with Fourier Filtering..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={true}
    />

}
