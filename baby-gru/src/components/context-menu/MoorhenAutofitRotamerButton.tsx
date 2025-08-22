import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getTooltipShortcutLabel } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenAutofitRotamerButton = (props: ContextButtonProps) => {
    const [toolTipLabel, setToolTipLabel] = useState<string>("Auto-fit Rotamer");
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);

    const getCootCommandInput = (
        selectedMolecule: moorhen.Molecule,
        chosenAtom: moorhen.ResidueSpec,
        localParameters?: string
    ): moorhen.cootCommandKwargs => {
        return {
            message: "coot_command",
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [selectedMolecule.molNo, chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.ins_code],
            changesMolecules: [selectedMolecule.molNo],
        };
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
            cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
            {...props}
        />
    );
};
