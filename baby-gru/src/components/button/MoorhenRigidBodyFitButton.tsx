import { useCallback, useRef, useState } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { Form } from "react-bootstrap";
import { useSelector } from 'react-redux';

export const MoorhenRigidBodyFitButton = (props: moorhen.ContextButtonProps) => {
    const [randomJiggleMode, setRandomJiggleMode] = useState<boolean>(false)
    const customCid = useRef<null | string>(null)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const rigidBodyModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'CHAIN', 'ALL']

    const rigidBodyFitFormatArgs = (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string, activeMapMolNo: number) => {
        const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
        let selectedResidueIndex: number = -1
        let commandArgs: [number, string, number]
        let start: number
        let stop: number

        if (typeof selectedSequence !== 'undefined') {
            selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
        }

        if (selectedResidueIndex === -1) {
            selectedMode = 'SINGLE'
        }

        switch (selectedMode) {
            case 'SINGLE':
                commandArgs = [
                    molecule.molNo,
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                    activeMapMolNo
                ]
                break
            case 'TRIPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 1].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 1 ? selectedSequence.sequence[selectedResidueIndex + 1].resNum : chosenAtom.res_no
                commandArgs = [
                    molecule.molNo,
                    `//${chosenAtom.chain_id}/${start}-${stop}`,
                    activeMapMolNo
                ]
                break
            case 'QUINTUPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 2].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 2 ? selectedSequence.sequence[selectedResidueIndex + 2].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
                commandArgs = [
                    molecule.molNo,
                    `//${chosenAtom.chain_id}/${start}-${stop}`,
                    activeMapMolNo
                ]
                break
            case 'HEPTUPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 3].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 3 ? selectedSequence.sequence[selectedResidueIndex + 3].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
                commandArgs = [
                    molecule.molNo,
                    `//${chosenAtom.chain_id}/${start}-${stop}`,
                    activeMapMolNo
                ]
                break
            case 'CHAIN':
                commandArgs = [
                    molecule.molNo,
                    `//${chosenAtom.chain_id}/*`,
                    activeMapMolNo
                ]
                break
            case 'ALL':
                commandArgs = [
                    molecule.molNo,
                    `//*/*`,
                    activeMapMolNo
                ]
                break
            case 'CUSTOM':
                commandArgs = [
                    molecule.molNo,
                    customCid.current,
                    activeMapMolNo
                ]
                break;
            default:
                console.log('Unrecognised rigid body fit mode...')
                break
        }
        return commandArgs
    }

    const getCootCommandInput = useCallback((selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string, randomJiggleModeSelectRef?: React.RefObject<HTMLInputElement>) => {
        const commandArgs = rigidBodyFitFormatArgs(selectedMolecule, chosenAtom, selectedMode, activeMap.molNo)

        let command: string;
        if (typeof randomJiggleModeSelectRef !== 'undefined') {
            if (randomJiggleModeSelectRef.current.checked) {
                command = 'fit_to_map_by_random_jiggle_using_cid'
            } else {
                command = 'rigid_body_fit'
            }
        } else if (randomJiggleMode) {
            command = 'fit_to_map_by_random_jiggle_using_cid'
        } else {
            command = 'rigid_body_fit'
        }

        return {
            message: 'coot_command',
            returnType: "status",
            command: command,
            commandArgs: command === 'rigid_body_fit' ? commandArgs : [...commandArgs.slice(0, 2), 0, -1],
            changesMolecules: [selectedMolecule.molNo]
        }
    }, [activeMap, randomJiggleMode])

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit' />}
        refineAfterMod={false}
        needsMapData={true}
        toolTipLabel="Rigid body fit"
        popoverSettings={{
            label: 'Rigid body fit',
            options: rigidBodyModes,
            getCootCommandInput: getCootCommandInput,
            defaultValue: props.defaultActionButtonSettings['rigidBodyFit'],
            setDefaultValue: (newValue: string) => {
                props.setDefaultActionButtonSettings({ key: 'rigidBodyFit', value: newValue })
            },
            extraInput: (ref) => {
                return <Form.Check
                    ref={ref}
                    style={{ paddingTop: '0.1rem' }}
                    type="switch"
                    label="Use random jiggle fit" />
            },
        }}
        {...props}
    />
}

