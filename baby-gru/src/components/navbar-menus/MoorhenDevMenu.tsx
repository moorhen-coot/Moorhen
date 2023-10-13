import { Form, InputGroup } from "react-bootstrap";
import { useContext, useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { cidToSpec } from "../../utils/MoorhenUtils";
import { MoorhenContext } from "../../utils/MoorhenContext";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenMoleculeRepresentation } from "../../utils/MoorhenMoleculeRepresentation";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { startRecording } from "../../utils/MoorhenScreenshot"

const doColourMapByOtherMap = async (imol_ref: number, imol_colour: number, maps: moorhen.Map[]) => {
    const map = maps.find(map => map.molNo === imol_ref)
    const response = await map.commandCentre.current.cootCommand({
        command: "get_map_contours_mesh_using_other_map_for_colours",
        returnType: 'mesh_perm',
        commandArgs: [imol_ref, imol_colour, ...map.glRef.current.origin.map(x => -x), 90, 0.86, 0.3, 2.0, false]
    }, false)
    const objects = [response.data.result.result]
    map.setupContourBuffers(objects, true)
}

const doRestraintsMeshTest = async (commandCentre, glRef, molecules, moleculeSelectRef) => {
    const selectedMolecule = molecules.find(item => item.molNo === parseInt(moleculeSelectRef.current.value))
    console.log(`Running test for imol - ${selectedMolecule.molNo}`)
    
    const result = await commandCentre.current.cootCommand({
        returnType: 'instanced_mesh',
        command: 'get_extra_restraints_mesh',
        commandArgs: [selectedMolecule.molNo, 0]
    }, true)
    console.log('Moorhen got this result:')
    console.log(result.data.result.result)

    const representation = new MoorhenMoleculeRepresentation('CBs', '//', commandCentre, glRef)
    representation.isCustom = true
    representation.setParentMolecule(selectedMolecule)
    representation.setUseDefaultColourRules(true)
    representation.useDefaultBondOptions = true
    await representation.buildBuffers([result.data.result.result])
}

const doTest = async (props: any) => {
    let TRIAL_COUNT = 0
    TRIAL_COUNT += 1
    console.log(`########################################## ${TRIAL_COUNT}`)
    const molecule = props.molecules.find(molecule => molecule.molNo === 0)
    const chosenAtom = cidToSpec('/1/A/14/C')
    try {
        const result = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'flipPeptide_cid',
            commandArgs: [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, ''],
            changesMolecules: [molecule.molNo]
        }, true)

        console.log(result.data.timeMainThreadToWorker)
        console.log(result.data.timelibcootAPI)
        console.log(result.data.timeconvertingWASMJS)
        console.log(result)
        console.log(`Message from worker back to main thread took ${Date.now() - result.data.messageSendTime} ms (flipPeptide_cid) - (${result.data.messageId.slice(0, 5)})`)
                    
        const test = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'refine_residues_using_atom_cid',
            commandArgs: [ molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE', 4000],
            changesMolecules: [molecule.molNo]
        }, true)
                    
        console.log(test.data.timeMainThreadToWorker)
        console.log(test.data.timelibcootAPI)
        console.log(test.data.timeconvertingWASMJS)
        console.log(test)
        console.log(`Message from worker back to main thread took ${Date.now() - test.data.messageSendTime} ms (refine_residues_using_atom_cid) - (${test.data.messageId.slice(0, 5)})`)

        molecule.setAtomsDirty(true)
        await molecule.redraw()
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        
        if (TRIAL_COUNT <= 99) {
            setTimeout(() => doTest(props), 8000)
        }
    } catch (err) {
            console.log('Encountered', err)
    }
}

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const customCid = useRef<string>('')
    const mapASelectRef = useRef<HTMLSelectElement>()
    const mapBSelectRef = useRef<HTMLSelectElement>()
    const context = useContext<undefined | moorhen.Context>(MoorhenContext);

    const menuItemProps = {setPopoverIsShown, customCid, mapASelectRef, ...props}
    const { doShadow, setDoShadow, doOutline, setDoOutline, doSpinTest, setDoSpinTest, doSSAO, setDoSSAO, ssaoBias, setSsaoBias, ssaoRadius, setSsaoRadius } = context

    const doVideo = async () => {
        startRecording(props.glRef)
    }

    return <>
                    <MenuItem onClick={() => doTest(menuItemProps)}>
                        Do a timing test...
                    </MenuItem>
                    <MenuItem onClick={() => props.maps[0].getHistogram()}>
                        Do a histogram test...
                    </MenuItem>
                    <hr></hr>
                    <Form.Group>
                    <MoorhenMapSelect width="" maps={props.maps} ref={mapASelectRef}/>
                    <MoorhenMapSelect width="" maps={props.maps} ref={mapBSelectRef}/>
                        <MenuItem onClick={() => doColourMapByOtherMap(parseInt(mapASelectRef.current.value), parseInt(mapBSelectRef.current.value), props.maps)}>
                            Colour map by another map
                        </MenuItem>
                    </Form.Group>
                    <hr></hr>                  
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doShadow}
                            onChange={() => { setDoShadow(!doShadow) }}
                            label="Shadows"/>
                    </InputGroup>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doSSAO}
                            onChange={() => { setDoSSAO(!doSSAO) }}
                            label="Occlusion"/>
                    </InputGroup>
                    <MoorhenSlider minVal={0.0} maxVal={10} logScale={false}
                        sliderTitle="Occlusion radius"
                        initialValue={ssaoRadius}
                        externalValue={ssaoRadius}
                        setExternalValue={setSsaoRadius} />
                    <MoorhenSlider minVal={0.0} maxVal={.2} logScale={false}
                        sliderTitle="Occlusion bias"
                        initialValue={ssaoBias}
                        externalValue={ssaoBias}
                        setExternalValue={setSsaoBias} />
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doOutline}
                            onChange={() => { setDoOutline(!doOutline) }}
                            label="Outlines"/>
                    </InputGroup>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doSpinTest}
                            onChange={() => { setDoSpinTest(!doSpinTest) }}
                            label="Spin test"/>
                    </InputGroup>
                    <MenuItem id='vide-menu-item' onClick={doVideo}>
                        Record video
                    </MenuItem>

        </>
    }
