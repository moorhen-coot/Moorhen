import { useCallback, useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenSlider } from "../inputs";
import { moorhen } from "../../types/moorhen";
import { MoorhenStore } from "../../moorhen";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { clearResidueSelection } from "../../store/generalStatesSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenRandomJiggleBlurMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    
    const commandCentre = MoorhenStore.getState().coreRefs.commandCentre;
    const dispatch = useDispatch()
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    
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

    const panelContent = <>
        <MoorhenMoleculeSelect
            ref={moleculeSelectRef}
            molecules={molecules}
            onChange={handleModelChange}
        />
        <MoorhenMapSelect
            ref={mapSelectRef}
            maps={maps}
            onChange={handleMapChange}
        />
        <MoorhenCidInputForm
            ref={cidSelectRef}
            margin="0.5rem"
            onChange={(evt) => setCid(evt.target.value)}
            allowUseCurrentSelection={true}
            placeholder={cidSelectRef.current ? "" : "Input custom selection e.g. //A,B"}
        />
        <MoorhenSlider
            sliderTitle="B-Factor"
            minVal={10}
            maxVal={400}
            showMinMaxVal={false}
            logScale={false}
            stepButtons= {25}
            externalValue={bFactor}
            setExternalValue={(value) => setBFactor(value)}
            decimalPlaces={0}
        />
        <MoorhenSlider
            sliderTitle="No. of trials"
            minVal={10}
            maxVal={5000}
            showMinMaxVal={false}
            logScale={false}
            stepButtons={100}
            externalValue={noTrials}
            setExternalValue={(value) => setNoTrials(value)}
            decimalPlaces={0}
        />
        <MoorhenSlider
            sliderTitle="Scale factor"
            minVal={1}
            maxVal={6}
            showMinMaxVal={false}
            logScale={false}
            stepButtons={1}
            externalValue={scaleFactor}
            setExternalValue={(value) => setScaleFactor(value)}
            decimalPlaces={0}
        />
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
        
        await commandCentre.current.cootCommand({
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

    }, [commandCentre])

    return <MoorhenBaseMenuItem
        id='jiggle-fit-blur-menu-item'
        popoverContent={panelContent}
        menuItemText="Jiggle Fit with Fourier Filtering..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={true}
    />

}
