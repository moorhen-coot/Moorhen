import { useCallback, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { Container, Form, FormGroup, FormLabel, FormSelect, Row } from "react-bootstrap";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";

export const MoorhenRigidBodyFitButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const [panelParameters, setPanelParameters] = useState<string>('TRIPLE')
    const [randomJiggleMode, setRandomJiggleMode] = useState<boolean>(false)
    const customCid = useRef<null | string>(null)


    const rigidBodyModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'CHAIN', 'ALL']

    const rigidBodyFitFormatArgs = (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string, activeMapMolNo: number) => {
        const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
        let selectedResidueIndex: number = 0
        let commandArgs: [number, string, number]
        let start: number
        let stop: number
    
        if (typeof selectedSequence === 'undefined') {
            selectedMode = 'SINGLE'
        } else {
            selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
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
        const commandArgs = rigidBodyFitFormatArgs(selectedMolecule, chosenAtom, selectedMode, props.activeMap.molNo)

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
    }, [props.activeMap, randomJiggleMode])

    const MoorhenRigidBodyFitPanel = (props: {
        panelParameters: string;
        setPanelParameters: React.Dispatch<React.SetStateAction<string>> 
        randomJiggleMode: boolean;
        setRandomJiggleMode: React.Dispatch<React.SetStateAction<boolean>>;
    }) => {
        
        const [innerRandomJiggleMode, setInnerRandomJiggleMode] = useState<boolean>(props.randomJiggleMode)
        
        return <Container>
            <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please click an atom for rigid body fitting</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Residue selection</FormLabel>
                    <FormSelect defaultValue={props.panelParameters}
                        onChange={(e) => {
                            props.setPanelParameters(e.target.value)
                        }}>
                        {rigidBodyModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                        <option key={'CUSTOM'} value={'CUSTOM'}>CUSTOM</option>
                    </FormSelect>
                    <Form.Check
                        style={{ paddingTop: '0.1rem' }}
                        type="switch"
                        checked={innerRandomJiggleMode}
                        onChange={() => { 
                            setInnerRandomJiggleMode(!innerRandomJiggleMode)
                            props.setRandomJiggleMode(!props.randomJiggleMode)
                         }}
                        label="Use random jiggle fit" />
                </FormGroup>
            </Row>
            <Row>
                {props.panelParameters === 'CUSTOM' &&
                    <MoorhenCidInputForm defaultValue={customCid.current} onChange={(e) => { customCid.current = e.target.value }} placeholder={customCid.current ? "" : "Input custom cid e.g. //A,B"} />
                }
            </Row>
        </Container>
    }

    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit'/>}
                    refineAfterMod={false}
                    needsMapData={true}
                    toolTipLabel="Rigid body fit"
                    popoverSettings={{
                        label: 'Rigid body fit',
                        options: rigidBodyModes,
                        getCootCommandInput: getCootCommandInput,
                        defaultValue: props.defaultActionButtonSettings['rigidBodyFit'],
                        setDefaultValue: (newValue: string) => {
                            props.setDefaultActionButtonSettings({key: 'rigidBodyFit', value: newValue})
                        },
                        extraInput: (ref) => {
                            return <Form.Check
                                        ref={ref}
                                        style={{paddingTop: '0.1rem'}} 
                                        type="switch"
                                        label="Use random jiggle fit"/>
                          },
                    }}
                    {...props}
                />     
        
    } else {

        return <><MoorhenEditButtonBase
            id='rigid-body-fit-button'
            toolTipLabel="Rigid body fit"
            setToolTip={props.setToolTip}
            buttonIndex={props.buttonIndex}
            selectedButtonIndex={props.selectedButtonIndex}
            setSelectedButtonIndex={props.setSelectedButtonIndex}
            needsMapData={true}
            refineAfterMod={false}
            prompt={<MoorhenRigidBodyFitPanel
                        randomJiggleMode={randomJiggleMode}
                        setRandomJiggleMode={setRandomJiggleMode}
                        setPanelParameters={setPanelParameters}
                        panelParameters={panelParameters} />}
            icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit' />}
            panelParameters={panelParameters}
            getCootCommandInput={getCootCommandInput}
            {...props}
            />
        </>
    }
}

