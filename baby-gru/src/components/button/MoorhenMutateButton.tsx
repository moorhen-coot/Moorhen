import { useCallback, useState } from "react"
import { residueCodesThreeToOne } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";
import { Container, FormGroup, FormLabel, FormSelect, Row } from "react-bootstrap";
import { useSelector } from 'react-redux';

export const MoorhenMutateButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const [panelParameters, setPanelParameters] = useState<string>('ALA')
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const mutateModes = [
        'ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS', 'ILE', 'LYS', 'LEU',
        'MET', 'ASN', 'PRO', 'GLN', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR'
    ]

    const autoFitRotamer = useCallback(async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
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
    }, [activeMap, props.commandCentre])

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'mutate',
            commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, selectedMode],
            changesMolecules: [selectedMolecule.molNo]
          }
    }

    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/mutate.svg`} alt='Mutate'/>}
                    refineAfterMod={false}
                    needsMapData={true}
                    onCompleted={autoFitRotamer}
                    toolTipLabel="Mutate residue"
                    popoverSettings={{
                        label: 'Mutate to...',
                        options: mutateModes,
                        getCootCommandInput: getCootCommandInput,
                        defaultValue: props.defaultActionButtonSettings['mutate'],
                        setDefaultValue: (newValue: string) => {
                            props.setDefaultActionButtonSettings({key: 'mutate', value: newValue})
                        }
                    }}
                    {...props}
                />

    } else {
            
        const MoorhenMutatePanel = (props: { panelParameters: string; setPanelParameters: React.Dispatch<React.SetStateAction<string>> }) => {
            return <Container>
                <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please identify residue to mutate</Row>
                <Row>
                    <FormGroup>
                        <FormLabel>To residue of type</FormLabel>
                        <FormSelect defaultValue={props.panelParameters}
                            onChange={(e) => {
                                props.setPanelParameters(e.target.value)
                            }}>
                            {mutateModes.map(optionName => {
                                return <option key={optionName} value={optionName}>{`${optionName} (${residueCodesThreeToOne[optionName]})`}</option>
                            })}
                        </FormSelect>
                    </FormGroup>
                </Row>
            </Container>
        }
        
        return <MoorhenEditButtonBase
                    id='mutate-residue-edit-button'
                    toolTipLabel="Simple Mutate"
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={true}
                    onCompleted={autoFitRotamer}
                    panelParameters={panelParameters}
                    getCootCommandInput={getCootCommandInput}
                    prompt={
                        <MoorhenMutatePanel
                            setPanelParameters={setPanelParameters}
                            panelParameters={panelParameters} />
                    }
                    icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/mutate.svg`} alt='Mutate' />}
                    {...props}
                />
    }
}
