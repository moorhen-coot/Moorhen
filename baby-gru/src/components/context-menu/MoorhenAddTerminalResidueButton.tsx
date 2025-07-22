import { useEffect, useState } from "react"
import { useSelector } from "react-redux";
import { getTooltipShortcutLabel } from "../../utils/utils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";

export const MoorhenAddTerminalResidueButton = (props: moorhen.ContextButtonProps) => {

    const [toolTip, setToolTip] = useState<string>("Add Residue")
    
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)

    const { selectedMolecule, chosenAtom, urlPrefix } = { ...props }

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
        icon={<img className="moorhen-context-button__icon" src={`${urlPrefix}/pixmaps/add-peptide-1.svg`} alt='Add Residue' />}
        needsMapData={true}
        toolTipLabel={toolTip}
        cootCommandInput={getCootCommandInput(selectedMolecule, chosenAtom)}
        {...props}
    />
}
