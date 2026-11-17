import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useMoorhenInstance } from "@/hooks"; 
import { getTooltipShortcutLabel } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenAutofitRotamerButton = (props: ContextButtonProps) => {
    const [toolTipLabel, setToolTipLabel] = useState<string>("Auto-fit Rotamer");
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const moorhenInstance = useMoorhenInstance();

    // Only fill a residue that is actually partial: fill_partial_residue rebuilds the side chain
    // without alt conf, so on a complete residue with alt confs it adds a third copy of the side chain.
    // Otherwise fit the rotamer, of the clicked alt conf only.
    const fillOrAutoFit = async (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        const { chain_id, res_no, ins_code, alt_conf } = chosenAtom;
        if (await selectedMolecule.residueHasMissingAtoms(chain_id, res_no, ins_code)) {
            return selectedMolecule.commandCentre.cootCommand(
                {
                    returnType: "status",
                    command: "fill_partial_residue",
                    commandArgs: [selectedMolecule.molNo, chain_id, res_no, ins_code],
                    changesMolecules: [selectedMolecule.molNo],
                },
                true
            );
        }
        return selectedMolecule.autoFitRotamer(chain_id, res_no, ins_code, alt_conf, activeMap);
    };

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).auto_fit_rotamer;
            setToolTipLabel(`Auto-fit Rotamer ${getTooltipShortcutLabel(shortCut)}`);
        }
    }, [shortCuts]);

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/auto-fit-rotamer.svg`}
                    alt="Auto-Fit rotamer"
                />
            }
            needsMapData={true}
            toolTipLabel={toolTipLabel}
            editCommand={fillOrAutoFit}
            onExit={() => moorhenInstance.triggerMoleculeChanged(props.selectedMolecule.uniqueId, "refine")}
            {...props}
        />
    );
};
