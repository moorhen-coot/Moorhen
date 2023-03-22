import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenSearchBar } from './MoorhenSearchBar';
import { MenuItem } from "@mui/material";
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";
import { cidToSpec } from "../utils/MoorhenUtils";

var TRIAL_COUNT = 0

const doTest = async (props) => {
    TRIAL_COUNT += 1
    console.log(`########################################## ${TRIAL_COUNT}`)
    props.molecules.forEach(async (molecule) => {
        let result
        try {
            if (molecule.molNo === 0) {
                const chosenAtom = cidToSpec('/1/A/14/C')
                    result = await props.commandCentre.current.cootCommand({
                        returnType: props.returnType,
                        command: 'flipPeptide_cid',
                        commandArgs: [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, ''],
                        changesMolecules: [molecule.molNo]
                    }, true)

                    console.log(result.data.timeMainThreadToWorker)
                    console.log(result.data.timelibcootAPI)
                    console.log(result.data.timeconvertingWASMJS)
                    console.log(`Message from worker back to main thread took ${Date.now() - result.data.messageSendTime} ms (${props.cootCommand}) - (${result.data.messageId.slice(0, 5)})`)
                    
                    molecule.setAtomsDirty(true)
                    await molecule.redraw(props.glRef)
                    const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
                    document.dispatchEvent(scoresUpdateEvent)
        
                if (TRIAL_COUNT <= 99) {
                    setTimeout(() => doTest(props), 8000)
                }
            }
        } catch (err) {
            console.log('Encountered', err)
        }
    })
}

export const MoorhenHelpMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            < NavDropdown 
                title="Help" 
                id="help-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                    <MoorhenSearchBar {...props}/>
                    <hr></hr>
                    <MoorhenAboutMenuItem {...menuItemProps} />
                    <MenuItem>
                        More items will be added here...
                    </MenuItem>
                    <MenuItem onClick={() => doTest(menuItemProps)}>
                        Do a test...
                    </MenuItem>
            </NavDropdown >
        </>
    }
