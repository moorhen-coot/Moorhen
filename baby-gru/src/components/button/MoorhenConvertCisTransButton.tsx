import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";

export const MoorhenConvertCisTransButton = (props: moorhen.ContextButtonProps) => {

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, localParameters?: string): moorhen.cootCommandKwargs => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'cis_trans_convert',
            commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/cis-trans.svg`} alt='Cis/Trans' />}
        needsMapData={false}
        refineAfterMod={false}
        toolTipLabel={"Cis/Trans isomerisation"}
        cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
        {...props}
    />
}
