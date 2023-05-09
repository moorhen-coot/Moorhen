import { Form, InputGroup, NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MenuItem } from "@mui/material";
import { cidToSpec } from "../utils/MoorhenUtils";

var TRIAL_COUNT = 0

const doTest = async (props) => {
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
            commandArgs: [ molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE'],
            changesMolecules: [molecule.molNo]
        }, true)
                    
        console.log(test.data.timeMainThreadToWorker)
        console.log(test.data.timelibcootAPI)
        console.log(test.data.timeconvertingWASMJS)
        console.log(test)
        console.log(`Message from worker back to main thread took ${Date.now() - test.data.messageSendTime} ms (refine_residues_using_atom_cid) - (${test.data.messageId.slice(0, 5)})`)

        molecule.setAtomsDirty(true)
        await molecule.redraw(props.glRef)
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        
        if (TRIAL_COUNT <= 99) {
            setTimeout(() => doTest(props), 8000)
        }
    } catch (err) {
            console.log('Encountered', err)
    }
}

const doColourTest = async (props) => {
    const molecule = props.molecules.find(molecule => molecule.molNo === 0)
    if (typeof molecule !== 'undefined') {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_do_colour_test',
            commandArgs: [molecule.molNo],
        }, true)
        molecule.setAtomsDirty(true)
        await molecule.redraw(props.glRef)
    }
}

export const MoorhenDevMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            < NavDropdown 
                title="Dev" 
                id="dev-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                    <MenuItem onClick={() => doTest(menuItemProps)}>
                        Do a timing test...
                    </MenuItem>
                    <MenuItem onClick={() => doColourTest(menuItemProps)}>
                        Do colouring test
                    </MenuItem>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doShadowDepthDebug}
                            onChange={() => { props.setDoShadowDepthDebug(!props.doShadowDepthDebug) }}
                            label="Shadow depth"/>
                    </InputGroup>
            </NavDropdown >
        </>
    }
