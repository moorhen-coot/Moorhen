import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";

export const MoorhenConvertCisTransButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, localParameters?: string): moorhen.cootCommandKwargs => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'cis_trans_convert',
            commandArgs:  [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`} alt='Cis/Trans'/>}
                    needsMapData={false}
                    toolTipLabel={"Cis/Trans isomerisation"}
                    cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
                    {...props}
                />     

    } else {

        return <MoorhenEditButtonBase
                    id='cis-trans-edit-button'
                    toolTipLabel="Cis/Trans isomerisation"
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={false}
                    getCootCommandInput={getCootCommandInput}
                    prompt="Click atom in residue to convert"
                    icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" alt="Cis/Trans" src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`} />}
                    {...props}
                />
    
    }

}
