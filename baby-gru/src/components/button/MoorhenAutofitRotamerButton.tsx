import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";

export const MoorhenAutofitRotamerButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {

    const [toolTipLabel, setToolTipLabel] = useState<string>("Auto-fit Rotamer")

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, localParameters?: string): moorhen.cootCommandKwargs => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'fill_partial_residue',
            commandArgs:  [
                selectedMolecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code
            ],
            changesMolecules: [selectedMolecule.molNo]
        }   
    }

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts as string).auto_fit_rotamer
            setToolTipLabel(`Auto-fit Rotamer ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])


    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} alt='Auto-Fit rotamer'/>}
                    needsMapData={true}
                    toolTipLabel={toolTipLabel}
                    cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
                    {...props}
                />     

    } else {

        return <MoorhenEditButtonBase
                    id='auto-fit-rotamer-edit-button'
                    toolTipLabel={toolTipLabel}
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={true}
                    getCootCommandInput={getCootCommandInput}
                    prompt="Click atom in residue to fit rotamer"
                    icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} alt='Auto-Fit rotamer' />}
                    {...props}
                />
    
    }

}
