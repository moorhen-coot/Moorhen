import { useEffect, useRef, useState } from "react"
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { Form, InputGroup } from "react-bootstrap"
import { moorhen } from "../../types/moorhen"
import { useDispatch, useSelector } from "react-redux"
import { setAnimateRefine, setEnableRefineAfterMod, setUseRamaRefinementRestraints, setuseTorsionRefinementRestraints } from "../../store/refinementSettingsSlice"

export const MoorhenRefinementSettingsMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const useRamaRestraintsCheckRef = useRef<null | HTMLInputElement>(null)
    const useTorsionRestraintsCheckRef = useRef<null | HTMLInputElement>(null)
    const ramaWeightSliderRef = useRef<number>(null)
    const torsionWeightSliderRef = useRef<number>(null)

    const [ramaWeight, setRamaWeight] = useState<number>(null)
    const [torsionWeight, setTorsionWeight] = useState<number>(null)

    const dispatch = useDispatch()
    const useRamaRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useRamaRefinementRestraints)
    const useTorsionRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useTorsionRefinementRestraints)
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine)

    useEffect(() => {
        const fetchInitialData = async () => {
            const torsion = await props.commandCentre.current.cootCommand({
                command: 'get_torsion_restraints_weight',
                commandArgs: [ ],
                returnType: "int"
            }, false)
            const rama = await props.commandCentre.current.cootCommand({
                command: 'get_rama_plot_restraints_weight',
                commandArgs: [ ],
                returnType: "int"
            }, false)

            ramaWeightSliderRef.current = rama.data.result.result
            torsionWeightSliderRef.current = torsion.data.result.result
            setRamaWeight(rama.data.result.result)
            setTorsionWeight(torsion.data.result.result)
        }

        if (!ramaWeight && !torsionWeight) {
            fetchInitialData()
        }

        return () => {
            if (ramaWeightSliderRef.current) {
                props.commandCentre.current.cootCommand({
                    command: 'set_rama_plot_restraints_weight',
                    commandArgs: [ramaWeightSliderRef.current],
                    returnType: "status"
                }, false)    
            }
            if (torsionWeightSliderRef.current) {
                props.commandCentre.current.cootCommand({
                    command: 'set_torsion_restraints_weight',
                    commandArgs: [torsionWeightSliderRef.current],
                    returnType: "status"
                }, false)    
            }
        }
    }, [])

    useEffect(()=> {
        props.commandCentre.current.cootCommand({
            command: 'set_use_rama_plot_restraints',
            commandArgs: [useRamaRestraints],
            returnType: "status"
        }, false)
    }, [useRamaRestraints])

    useEffect(()=> {
        props.commandCentre.current.cootCommand({
            command: 'set_use_torsion_restraints',
            commandArgs: [useTorsionRestraints],
            returnType: "status"
        }, false)
    }, [useTorsionRestraints])

    const panelContent = (torsionWeight !== null && ramaWeight !== null) ?
    <>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={animateRefine}
                onChange={() => {dispatch( setAnimateRefine(!animateRefine) )}}
                label="Show animation during refinement"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={enableRefineAfterMod}
                onChange={() => {dispatch( setEnableRefineAfterMod(!enableRefineAfterMod) )}}
                label="Automatic refinement post-modification"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                ref={useRamaRestraintsCheckRef}
                type="switch"
                checked={useRamaRestraints}
                onChange={() => {
                    dispatch(setUseRamaRefinementRestraints( !useRamaRestraints ))
                }}
                label="Use ramachandran restraints"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                ref={useTorsionRestraintsCheckRef}
                type="switch"
                checked={useTorsionRestraints}
                onChange={() => {
                    dispatch(setuseTorsionRefinementRestraints( !useTorsionRestraints ))
                }}
                label="Use torsion restraints"/>
        </InputGroup>
        <div style={{display: useRamaRestraints ? "" : "none"}}>
            <MoorhenSlider
                ref={ramaWeightSliderRef}
                isDisabled={!useRamaRestraints}
                sliderTitle="Ramachandran restraints weight"
                minVal={0.1}
                maxVal={100}
                decimalPlaces={2}
                logScale={true}
                allowFloats={true}
                initialValue={ramaWeight}
                externalValue={ramaWeight}
                setExternalValue={setRamaWeight}/>
        </div>
        <div style={{display: useTorsionRestraints ? "" : "none"}}>
            <MoorhenSlider
                ref={torsionWeightSliderRef}
                isDisabled={!useTorsionRestraints}
                sliderTitle="Torsion restraints weight"
                minVal={0.1}
                maxVal={10}
                decimalPlaces={2}
                logScale={true}
                allowFloats={true}
                initialValue={torsionWeight}
                externalValue={torsionWeight}
                setExternalValue={setTorsionWeight}/>
        </div>
    </>
    : <span>Please wait</span>
    
    return <MoorhenBaseMenuItem
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText={"Refinement settings..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={() => {}}
    />
}