import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/utils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { libcootApi } from "../../types/libcoot";
import { useSelector, useDispatch } from 'react-redux';
import { removeMolecule } from "../../store/moleculesSlice";

export const MoorhenDeleteButton = (props: moorhen.ContextButtonProps) => {
    const [toolTipLabel, setToolTipLabel] = useState<string>("Delete Item")
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const dispatch = useDispatch()

    const deleteModes = ['ATOM', 'RESIDUE', 'RESIDUE HYDROGENS', 'RESIDUE SIDE-CHAIN', 'CHAIN', 'CHAIN HYDROGENS', 'MOLECULE HYDROGENS']

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).delete_residue
            setToolTipLabel(`Delete Item ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [shortCuts])


    const deleteFormatArgs = (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, pp: string) => {
        let commandArgs: [number, string, string]
        if (pp === 'CHAIN') {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/*/*:*`, 'LITERAL']
        } else if (pp === 'RESIDUE') {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 'LITERAL']
        } else if (pp === 'ATOM') {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 'LITERAL']
        } else if (pp === 'RESIDUE SIDE-CHAIN') {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/!N,CA,CB,C,O,HA,H`, 'LITERAL']
        } else if (pp === 'RESIDUE HYDROGENS') {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/[H,D]`, 'LITERAL']
        } else if (pp === 'MOLECULE HYDROGENS') {
            commandArgs = [molecule.molNo, `/1/*/*/[H,D]`, 'LITERAL']
        } else {
            commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/*/[H,D]`, 'LITERAL']
        }
        return commandArgs
    }

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'delete_using_cid',
            commandArgs: deleteFormatArgs(selectedMolecule, chosenAtom, selectedMode),
            changesMolecules: [selectedMolecule.molNo]
        }
    }

    const deleteMoleculeIfEmpty = (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, cootResult: moorhen.WorkerResponse<libcootApi.PairType<number, number>>) => {
        if (cootResult.data.result.result.second < 1) {
            console.log('Empty molecule detected, deleting it now...')
            molecule.delete()
            dispatch(removeMolecule(molecule))
        }
    }

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/delete.svg`} alt="delete-item" />}
        refineAfterMod={false}
        needsMapData={false}
        toolTipLabel={toolTipLabel}
        onExit={deleteMoleculeIfEmpty}
        popoverSettings={{
            label: 'Delete mode',
            options: deleteModes,
            getCootCommandInput: getCootCommandInput,
            defaultValue: props.defaultActionButtonSettings['delete'],
            setDefaultValue: (newValue: string) => {
                props.setDefaultActionButtonSettings({ key: 'delete', value: newValue })
            }
        }}
        {...props}
    />
}
