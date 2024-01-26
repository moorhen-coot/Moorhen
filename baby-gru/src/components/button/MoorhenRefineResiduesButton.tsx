import { useCallback, useEffect, useState } from "react"
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

    const nonCootCommand = useCallback(async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        dispatch( setHoveredAtom({molecule: null, cid: null}) )
        props.setShowContextMenu(false)
        if (animateRefine) {
            molecule.refineResiduesUsingAtomCidAnimated(`//${chosenAtom.chain_id}/${chosenAtom.res_no}`, activeMap, 6)
        } else  {
            molecule.refineResiduesUsingAtomCid(`//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'SPHERE', 4000)
        }
    }, [animateRefine])
    
    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues' />}
        needsMapData={true}
        refineAfterMod={false}
        toolTipLabel={toolTipLabel}
        nonCootCommand={nonCootCommand}
        {...props}
    />
}
