import { useEffect, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";
import { Container, FormGroup, FormLabel, FormSelect, Row } from "react-bootstrap";
import { libcootApi } from "../../types/libcoot";

export const MoorhenDeleteButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const [panelParameters, setPanelParameters] = useState<string>('RESIDUE')
    const [toolTipLabel, setToolTipLabel] = useState<string>("Delete Item")

    const deleteModes = ['ATOM', 'RESIDUE', 'RESIDUE HYDROGENS', 'RESIDUE SIDE-CHAIN', 'CHAIN', 'CHAIN HYDROGENS', 'MOLECULE HYDROGENS']

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts as string).delete_residue
            setToolTipLabel(`Delete Item ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])


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
            props.changeMolecules({ action: 'Remove', item: molecule })
        }
    }

    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} alt="delete-item"/>}
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
                            props.setDefaultActionButtonSettings({key: 'delete', value: newValue})
                        }
                    }}
                    {...props}
                />

    } else {
            
        const MoorhenDeletePanel = (props: { panelParameters: string; setPanelParameters: React.Dispatch<React.SetStateAction<string>>; }) => {
            return <Container>
                <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please click an atom for core of deletion</Row>
                <Row>
                    <FormGroup>
                        <FormLabel>Delete mode</FormLabel>
                        <FormSelect defaultValue={props.panelParameters}
                            onChange={(e) => {
                                props.setPanelParameters(e.target.value)
                            }}>
                            {deleteModes.map(optionName => {
                                return <option key={optionName} value={optionName}>{optionName}</option>
                            })}
                        </FormSelect>
                    </FormGroup>
                </Row>
            </Container>
        }
    
        return <MoorhenEditButtonBase
                    toolTipLabel={toolTipLabel}
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={false}
                    onExit={deleteMoleculeIfEmpty}
                    getCootCommandInput={getCootCommandInput}
                    panelParameters={panelParameters}
                    refineAfterMod={false}
                    prompt={
                        <MoorhenDeletePanel
                            setPanelParameters={setPanelParameters}
                            panelParameters={panelParameters} />
                    }
                    icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} alt="delete-item" />}
                    {...props}
                />
    }
}
