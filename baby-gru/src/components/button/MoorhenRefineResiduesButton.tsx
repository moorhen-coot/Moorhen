import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useSelector } from "react-redux";

export const MoorhenRefineResiduesButton = (props: moorhen.ContextButtonProps) => {
    const [toolTipLabel, setToolTipLabel] = useState<string>("Refine Residues")
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).sphere_refine
            setToolTipLabel(`Refine Residues ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [shortCuts])

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string = 'SPHERE') => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'refine_residues_using_atom_cid',
            commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, selectedMode, 4000],
            changesMolecules: [selectedMolecule.molNo]
        }
    }
    
    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues' />}
        needsMapData={true}
        refineAfterMod={false}
        toolTipLabel={toolTipLabel}
        cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
        {...props}
    />
}
