import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useDispatch, useSelector } from "react-redux";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";

export const MoorhenRefineResiduesButton = (props: moorhen.ContextButtonProps) => {
    const dispatch = useDispatch()
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const animateRefine = useSelector((state: moorhen.State) => state.miscAppSettings.animateRefine)

    const [toolTipLabel, setToolTipLabel] = useState<string>("Refine Residues")
    
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

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        dispatch( setHoveredAtom({molecule: null, cid: null}) )
        props.setShowContextMenu(false)
        const cid = await molecule.getNeighborResiduesCids(chosenAtom.cid, 6)
        const newMolecule = await molecule.copyFragmentForRefinement(cid, activeMap)
        await newMolecule.animateRefine(50, 30, 50)
        await molecule.mergeFragmentFromRefinement(cid.join('||'), newMolecule, true, true)
    }
    
    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues' />}
        needsMapData={true}
        refineAfterMod={false}
        toolTipLabel={toolTipLabel}
        cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
        nonCootCommand={animateRefine ? nonCootCommand : null}
        {...props}
    />
}
