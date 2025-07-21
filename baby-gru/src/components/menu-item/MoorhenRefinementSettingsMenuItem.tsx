import { useEffect, useRef, useState } from "react"
import { MoorhenSlider } from "../inputs";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { Form, FormSelect, InputGroup, OverlayTrigger, Tooltip } from "react-bootstrap"
import { moorhen } from "../../types/moorhen"
import { useDispatch, useSelector } from "react-redux"
import { setAnimateRefine, setEnableRefineAfterMod, setRefinementSelection, setUseRamaRefinementRestraints, setuseTorsionRefinementRestraints } from "../../store/refinementSettingsSlice"
import { InfoOutlined } from "@mui/icons-material"

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
    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection)

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
        <Form.Group style={{ }}>
            <Form.Label>Default refinement selection</Form.Label>
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip id="tip-tooltip" className="moorhen-tooltip" style={{zIndex: 99999}}>
                        <em>
                            Specifies whether refinement should only be done for the clicked residue (Single res.), for the 
                            residues directly adjacent to the clicked residue (Adjacent res.) or for the residues within a spherical
                            selection around the clicked residue (Sphere).
                        </em>
                    </Tooltip>
                }>
                <InfoOutlined style={{marginLeft: '0.1rem', marginBottom: '0.2rem', width: '15px', height: '15px'}}/>
            </OverlayTrigger>
            <FormSelect size="sm" value={refinementSelection} onChange={(evt) => {
                dispatch( setRefinementSelection(evt.target.value as 'SINGLE' | 'TRIPLE' | 'SPHERE') )
            }}>
                <option value={'SINGLE'}>Single residue</option>
                <option value={'TRIPLE'}>Adjacent residues</option>
                <option value={'SPHERE'}>Sphere</option>
            </FormSelect>
        </Form.Group>
        <hr></hr>
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
        <hr></hr>
        <MoorhenSlider
            isDisabled={!useRamaRestraints}
            sliderTitle="Ramachandran restraints weight"
            minVal={0.1}
            maxVal={100}
            decimalPlaces={2}
            logScale={true}
            externalValue={ramaWeight}
            setExternalValue={(value)=> setRamaWeight(value)}/>
        <MoorhenSlider
            isDisabled={!useTorsionRestraints}
            sliderTitle="Torsion restraints weight"
            minVal={0.1}
            maxVal={10}
            decimalPlaces={2}
            logScale={true}
            externalValue={torsionWeight}
            setExternalValue={(value)=> setTorsionWeight(value)}/>
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