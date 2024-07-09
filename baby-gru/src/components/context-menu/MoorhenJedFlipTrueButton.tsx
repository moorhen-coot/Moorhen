import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";

export const MoorhenJedFlipTrueButton = (props: moorhen.ContextButtonProps) => {

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, localParameters?: string): moorhen.cootCommandKwargs => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'jed_flip',
            commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, true],
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/jed-flip-reverse.svg`} alt='jed-flip-reverse' />}
        toolTipLabel="JED Flip: wag the dog"
        cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
        {...props}
    />
}
