import { useCallback } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useSelector } from 'react-redux';

export const MoorhenMutateButton = (props: moorhen.ContextButtonProps) => {
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const mutateModes = [
        'ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS', 'ILE', 'LYS', 'LEU',
        'MET', 'ASN', 'PRO', 'GLN', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR'
    ]

    const autoFitRotamer = useCallback(async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        if (activeMap) {
            const formattedArgs = [
                molecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code,
                chosenAtom.alt_conf,
                activeMap.molNo
            ]
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "auto_fit_rotamer",
                commandArgs: formattedArgs,
                changesMolecules: [molecule.molNo]
            }, true)    
        } 
    }, [activeMap, props.commandCentre])

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'mutate',
            commandArgs: [
                selectedMolecule.molNo,
                `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`,
                selectedMode
            ],
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/mutate.svg`} alt='Mutate' />}
        needsMapData={false}
        onCompleted={autoFitRotamer}
        toolTipLabel="Mutate residue"
        popoverSettings={{
            label: 'Mutate to...',
            options: mutateModes,
            getCootCommandInput: getCootCommandInput,
            defaultValue: props.defaultActionButtonSettings['mutate'],
            setDefaultValue: (newValue: string) => {
                props.setDefaultActionButtonSettings({ key: 'mutate', value: newValue })
            }
        }}
        {...props}
    />
}
