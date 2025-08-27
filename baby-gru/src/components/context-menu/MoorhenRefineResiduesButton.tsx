import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTooltipShortcutLabel } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenRefineResiduesButton = (props: ContextButtonProps) => {
    const dispatch = useDispatch();
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine);
    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection);

    const [toolTipLabel, setToolTipLabel] = useState<string>("Refine Residues");

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).sphere_refine;
            setToolTipLabel(`Refine Residues ${getTooltipShortcutLabel(shortCut)}`);
        }
    }, [shortCuts]);

    const nonCootCommand = useCallback(
        async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }));
            props.setShowContextMenu(false);
            if (animateRefine) {
                const dist = refinementSelection === "SPHERE" ? 6 : refinementSelection === "TRIPLE" ? 2 : -1;
                await molecule.refineResiduesUsingAtomCidAnimated(
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                    activeMap,
                    dist
                );
            } else {
                await molecule.refineResiduesUsingAtomCid(
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                    refinementSelection,
                    4000
                );
            }
            dispatch(triggerUpdate(molecule.molNo));
        },
        [animateRefine, refinementSelection]
    );

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/refine-1.svg`}
                    alt="Refine Residues"
                />
            }
            needsMapData={true}
            refineAfterMod={false}
            toolTipLabel={toolTipLabel}
            nonCootCommand={nonCootCommand}
            {...props}
        />
    );
};
