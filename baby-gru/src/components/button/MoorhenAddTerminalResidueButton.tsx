import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/utils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useSelector } from "react-redux";

export const MoorhenAddTerminalResidueButton = (props: moorhen.ContextButtonProps) => {

    const [toolTip, setToolTip] = useState<string>("Add Residue")
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, localParameters?: string): moorhen.cootCommandKwargs => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'add_terminal_residue_directly_using_cid',
            commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).add_terminal_residue
            setToolTip(`Add Residue ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [shortCuts])

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/add-peptide-1.svg`} alt='Add Residue' />}
        needsMapData={true}
        toolTipLabel={toolTip}
        cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
        {...props}
    />
}

MoorhenAddTerminalResidueButton.defaultProps = { mode: 'edit' }
