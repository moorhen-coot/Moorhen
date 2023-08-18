import { forwardRef, useEffect, useRef, useState } from "react"
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";
import { Container, FormGroup, FormLabel, FormSelect, Row } from "react-bootstrap";
import { webGL } from "../../types/mgWebGL";

export const MoorhenRefineResiduesButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const modeSelectRef = useRef<null | HTMLSelectElement>(null)
    const [panelParameters, setPanelParameters] = useState<string>('TRIPLE')
    const [toolTipLabel, setToolTipLabel] = useState<string>("Refine Residues")

    const refinementModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL']

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts as string).triple_refine
            setToolTipLabel(`Refine Residues ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    const getCootCommandInput = (selectedMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        return {
            message: 'coot_command',
            returnType: "status",
            command: 'refine_residues_using_atom_cid',
            commandArgs: [ selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, selectedMode, 4000 ],
            changesMolecules: [ selectedMolecule.molNo ]
        }
    }

    if (props.mode === 'context') {

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues'/>}
                    needsMapData={true}
                    refineAfterMod={false}
                    toolTipLabel={toolTipLabel}
                    popoverSettings={{
                        label: 'Refinement mode',
                        options: refinementModes,
                        getCootCommandInput: getCootCommandInput,
                        defaultValue: props.defaultActionButtonSettings['refine'],
                        setDefaultValue: (newValue: string) => {
                            props.setDefaultActionButtonSettings({key: 'refine', value: newValue})
                        }
                    }}
                    {...props}
                />

    } else {
    
        const MoorhenRefinementPanel = forwardRef<HTMLSelectElement, {panelParameters: string; setPanelParameters: React.Dispatch<React.SetStateAction<string>> ; glRef: React.RefObject<webGL.MGWebGL>}>((props, ref) => {
            return <Container>
                <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please click an atom for centre of refinement</Row>
                <Row>
                    <FormGroup>
                        <FormLabel>Refinement mode</FormLabel>
                        <FormSelect ref={ref} defaultValue={props.panelParameters}
                            onChange={(e) => {
                                props.setPanelParameters(e.target.value)
                            }}>
                            {refinementModes.map(optionName => {
                                return <option key={optionName} value={optionName}>{optionName}</option>
                            })}
                        </FormSelect>
                    </FormGroup>
                </Row>
            </Container>
        })   

        return <MoorhenEditButtonBase
                id='refine-residues-edit-button'
                toolTipLabel={toolTipLabel}
                setToolTip={props.setToolTip}
                buttonIndex={props.buttonIndex}
                selectedButtonIndex={props.selectedButtonIndex}
                setSelectedButtonIndex={props.setSelectedButtonIndex}
                needsMapData={true}
                getCootCommandInput={getCootCommandInput}
                panelParameters={panelParameters}
                refineAfterMod={false}
                prompt={<MoorhenRefinementPanel
                    ref={modeSelectRef}
                    glRef={props.glRef}
                    setPanelParameters={setPanelParameters}
                    panelParameters={panelParameters} />}
                icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues' />}
                    {...props}
                />
    
    }

}
