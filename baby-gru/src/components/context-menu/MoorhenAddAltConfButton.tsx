import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenAddAltConfButton = (props: ContextButtonProps) => {
    const getCootCommandInput = (
        selectedMolecule: moorhen.Molecule,
        chosenAtom: moorhen.ResidueSpec,
        localParameters?: string
    ): moorhen.cootCommandKwargs => {
        return {
            message: "coot_command",
            returnType: "status",
            command: "add_alternative_conformation",
            commandArgs: [
                selectedMolecule.molNo,
                `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${
                    chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`,
            ],
            changesMolecules: [selectedMolecule.molNo],
        };
    };

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    alt="Add side chain"
                    src={`${props.urlPrefix}/pixmaps/add-alt-conf.svg`}
                />
            }
            refineAfterMod={false}
            toolTipLabel="Add alternative conformation"
            cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
            {...props}
        />
    );
};
