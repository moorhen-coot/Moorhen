import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { Button, Card, Container, Form, FormGroup, FormLabel, FormSelect, Row, Stack } from "react-bootstrap";
import { CheckOutlined, CloseOutlined, DeleteSweepOutlined } from "@mui/icons-material";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import Draggable from "react-draggable";
import { cidToSpec } from "../../utils/MoorhenUtils";
import { libcootApi } from "../../types/libcoot";

export const MoorhenDragAtomsButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const [showAccept, setShowAccept] = useState<boolean>(false)
    const [panelParameters, setPanelParameters] = useState<string>('SINGLE')
    const draggableRef = useRef()
    const theButton = useRef<null | HTMLButtonElement>(null)
    const moltenFragmentRef = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<string[] | null>(null)
    const busy = useRef<boolean>(false)
    const draggingDirty = useRef<boolean>(false)
    const refinementDirty = useRef<boolean>(false)
    const autoClearRestraintsRef = useRef<boolean>(true)

    const dragModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE']

    const animateRefine = async (molecule: moorhen.Molecule, n_cyc: number, n_iteration: number, final_n_cyc: number = 100) => {
        for (let i = 0; i <= n_iteration; i++) {
            const result = await props.commandCentre.current.cootCommand({
                returnType: 'status_instanced_mesh_pair',
                command: 'refine',
                commandArgs: [molecule.molNo, i !== n_iteration ? n_cyc : final_n_cyc]
            }, false) as moorhen.WorkerResponse<{ status: number; mesh: libcootApi.InstancedMeshJS[]; }>
            
            if (result.data.result.result.status !== -2){
                return
            }
            
            if (i !== n_iteration) {
                await molecule.drawWithStyleFromMesh('CBs', [result.data.result.result.mesh])
            }
        }
        molecule.setAtomsDirty(true)
        await molecule.fetchIfDirtyAndDraw('CBs')
    }

    const startDragging = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode: string) => {
        const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
        let selectedResidueIndex: number;
        let start: number
        let stop: number
        let sphereResidueCids: string[]

        if (typeof selectedSequence === 'undefined') {
            dragMode = 'SINGLE'
        } else {
            selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
        }

        switch (dragMode) {
            case 'SINGLE':
                start = chosenAtom.res_no
                stop = chosenAtom.res_no
                break;
            case 'TRIPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 1].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 1 ? selectedSequence.sequence[selectedResidueIndex + 1].resNum : chosenAtom.res_no
                break;
            case 'QUINTUPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 2].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 2 ? selectedSequence.sequence[selectedResidueIndex + 2].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
                break;
            case 'HEPTUPLE':
                start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 3].resNum : chosenAtom.res_no
                stop = selectedResidueIndex < selectedSequence.sequence.length - 3 ? selectedSequence.sequence[selectedResidueIndex + 3].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
                break;
            case 'SPHERE':
                sphereResidueCids = await molecule.getNeighborResiduesCids(chosenAtom.cid, 10, 0.1, 6)
                break;    
            default:
                console.log('Unrecognised dragging atoms selection...')
                break;
        }
        if (!sphereResidueCids && (!start || !stop)) {
            return
        }

        if (dragMode !== 'SPHERE') {
            fragmentCid.current = [`//${chosenAtom.chain_id}/${start}-${stop}/*`]
        } else {
            fragmentCid.current = sphereResidueCids
        }
        
        chosenMolecule.current = molecule
        
        /* Copy the component to move into a new molecule */
        const copyResult = await props.commandCentre.current.cootCommand({
            returnType: 'int',
            command: 'copy_fragment_for_refinement_using_cid',
            commandArgs: [chosenMolecule.current.molNo, fragmentCid.current.join('||')]
        }, false)
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)
        newMolecule.molNo = copyResult.data.result.result
        moltenFragmentRef.current = newMolecule

        /* Initiate refinement */
        await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'init_refinement_of_molecule_as_fragment_based_on_reference',
            commandArgs: [moltenFragmentRef.current.molNo, chosenMolecule.current.molNo, props.activeMap.molNo]
        }, false)

        /* Redraw with animation after delay so that the context menu does not refresh empty*/
        setTimeout(async () => {
            await Promise.all(fragmentCid.current.map(cid => {
                return chosenMolecule.current.hideCid(cid)
            }))
            moltenFragmentRef.current.setAtomsDirty(true)
            await moltenFragmentRef.current.fetchIfDirtyAndDraw('CBs')
            await animateRefine(moltenFragmentRef.current, 10, 5, 10)
            props.changeMolecules({ action: "Add", item: newMolecule })
            props.glRef.current.setDraggableMolecule(newMolecule)        
        }, 1)
    }

    const finishDragging = async (acceptTransform: boolean) => {
        document.removeEventListener('atomDragged', atomDraggedCallback)
        document.removeEventListener('mouseup', mouseUpCallback)
        props.glRef.current.setDraggableMolecule(null)
        if (busy.current) {
            setTimeout(() => finishDragging(acceptTransform), 100)
            return
        }    
        if (acceptTransform) {
            console.log(chosenMolecule.current.molNo, moltenFragmentRef.current.molNo, fragmentCid.current.join('||'))
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'clear_refinement',
                commandArgs: [chosenMolecule.current.molNo],
            }, false)
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'replace_fragment',
                commandArgs: [chosenMolecule.current.molNo, moltenFragmentRef.current.molNo, fragmentCid.current.join('||')],
                changesMolecules: [chosenMolecule.current.molNo]
            }, true)
            chosenMolecule.current.atomsDirty = true
            await chosenMolecule.current.redraw()
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
        }
        props.changeMolecules({ action: 'Remove', item: moltenFragmentRef.current })
        moltenFragmentRef.current.delete()
        chosenMolecule.current.unhideAll()
    }

    const atomDraggedCallback = useCallback(async (evt: moorhen.AtomDraggedEvent) => {
        draggingDirty.current = true
        if (!busy.current) {
            moltenFragmentRef.current.clearBuffersOfStyle('hover')
            await handleAtomDragged(evt.detail.atom.atom.label)    
        }
    }, [moltenFragmentRef])

    const mouseUpCallback = useCallback(async () => {
        if(refinementDirty.current) {
            await refineNewPosition()
        }
        moltenFragmentRef.current.displayObjectsTransformation.origin = [0, 0, 0]
        moltenFragmentRef.current.displayObjectsTransformation.quat = null
    }, [moltenFragmentRef])

    const handleAtomDragged = async(atomCid: string) => {
        if(draggingDirty.current && atomCid) {
            busy.current = true
            refinementDirty.current = true
            draggingDirty.current = false
            const movedAtoms = moltenFragmentRef.current.transformedCachedAtomsAsMovedAtoms(atomCid)
            if(movedAtoms.length < 1 || typeof movedAtoms[0][0] === 'undefined') {
                // The atom dragged was not part of the molten molecule
                refinementDirty.current = false
                busy.current = false
                return
            }
            const chosenAtom = cidToSpec(atomCid)
            const result = await props.commandCentre.current.cootCommand({
                returnType: 'instanced_mesh',
                command: 'add_target_position_restraint_and_refine',
                commandArgs: [moltenFragmentRef.current.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, movedAtoms[0][0].x, movedAtoms[0][0].y, movedAtoms[0][0].z, 10],
            }, false)
            await moltenFragmentRef.current.drawWithStyleFromMesh('CBs', [result.data.result.result])
            busy.current = false
            handleAtomDragged(atomCid)
        }
    }

    const refineNewPosition = async () => {
        if (!busy.current) {
            busy.current = true
            refinementDirty.current = false
            if (autoClearRestraintsRef.current) {
                await props.commandCentre.current.cootCommand({
                    returnType: 'status',
                    command: 'clear_target_position_restraints',
                    commandArgs: [moltenFragmentRef.current.molNo]
                }, false)
                await animateRefine(moltenFragmentRef.current, 10, 5)
            } else {
                await animateRefine(moltenFragmentRef.current, -1, 1)
            }
            busy.current = false    
        } else {
            setTimeout(() => refineNewPosition(), 100)
        }
    }

    const clearRestraints = async () => {
        busy.current = true
        refinementDirty.current = false
        await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'clear_target_position_restraints',
            commandArgs: [moltenFragmentRef.current.molNo]
        }, false)
        await animateRefine(moltenFragmentRef.current, 10, 5)
        busy.current = false
    }

    useEffect(() => {
        if (showAccept) {
            document.addEventListener('atomDragged', atomDraggedCallback)
            document.addEventListener('mouseup', mouseUpCallback)
        } else {
            document.removeEventListener('atomDragged', atomDraggedCallback)
            document.removeEventListener('mouseup', mouseUpCallback)
        }
    }, [showAccept])

    if (props.mode === 'context') {

        const contextMenuOverride = (
            <Draggable>
                <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => props.setOpacity(1)} onMouseOut={() => props.setOpacity(0.5)}>
                <Card.Header>Atom dragging mode</Card.Header>
                <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                    <Stack gap={2} direction="vertical" style={{ alignItems: 'center'}}>
                        <span>Accept dragging ?</span>
                        <Stack gap={2} direction="horizontal" style={{ alignItems: 'center',  alignContent: 'center', justifyContent: 'center'}}>
                            <Button onClick={async () => {
                                document.removeEventListener('atomDragged', atomDraggedCallback)
                                document.removeEventListener('mouseup', mouseUpCallback)
                                await finishDragging(true)
                                props.setOverrideMenuContents(false)
                                props.setOpacity(1)
                                props.setShowContextMenu(false)                  
                            }}><CheckOutlined /></Button>
                            <Button onClick={async () => {
                                document.removeEventListener('atomDragged', atomDraggedCallback)
                                document.removeEventListener('mouseup', mouseUpCallback)
                                await finishDragging(false)
                                props.setOverrideMenuContents(false)
                                props.setOpacity(1)
                                props.setShowContextMenu(false)                  
                            }}><CloseOutlined /></Button>
                        </Stack>                    
                    </Stack>
                    <hr></hr>
                    <Stack gap={2} direction="vertical" style={{ alignItems: 'center'}}>
                        <span>Atom pull restraints</span>
                        <Button style={{width: '80%'}} onClick={clearRestraints}><DeleteSweepOutlined /></Button>
                        <Form.Check
                            style={{paddingTop: '0.1rem'}} 
                            type="switch"
                            defaultChecked={true}
                            onChange={(evt) => autoClearRestraintsRef.current = evt.target.checked}
                            label="Auto clear"/>
                    </Stack>
                </Card.Body>
                </Card>
            </Draggable>
        )

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
            await startDragging(molecule, chosenAtom, selectedMode)       
            props.setShowOverlay(false)
            props.setOpacity(0.5)
            document.addEventListener('atomDragged', atomDraggedCallback)
            document.addEventListener('mouseup', mouseUpCallback)
            props.setOverrideMenuContents(contextMenuOverride)
        }

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="drag atoms" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/drag.svg`}/>}
                    toolTipLabel="Drag atoms"
                    refineAfterMod={false}
                    needsMapData={true}
                    popoverSettings={{
                        label: 'Drag mode...',
                        options: ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE'],
                        nonCootCommand: nonCootCommand,
                        defaultValue: props.defaultActionButtonSettings['drag'],
                        setDefaultValue: (newValue: string) => {
                            props.setDefaultActionButtonSettings({key: 'drag', value: newValue})
                        }
                    }}
                    {...props}
                />

    } else {

        const nonCootCommand = async(molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode: string) => {
            await startDragging(molecule, chosenAtom, dragMode)
            setShowAccept(true)
        }

        const MoorhenDragPanel = (props: { panelParameters: string; setPanelParameters: React.Dispatch<React.SetStateAction<string>> }) => {
            return <Container>
                <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please click an atom to define object</Row>
                <Row>
                    <FormGroup>
                        <FormLabel>Dragging atom mode</FormLabel>
                        <FormSelect defaultValue={props.panelParameters}
                            onChange={(e) => {
                                props.setPanelParameters(e.target.value)
                            }}>
                            {dragModes.map(optionName => {
                                return <option key={optionName} value={optionName}>{optionName}</option>
                            })}
                        </FormSelect>
                    </FormGroup>
                </Row>
            </Container>
        }
        
        return <><MoorhenEditButtonBase
                    ref={theButton}
                    toolTipLabel="Drag zone"
                    setToolTip={props.setToolTip}
                    refineAfterMod={false}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={true}
                    panelParameters={panelParameters}
                    prompt={
                        <MoorhenDragPanel
                        setPanelParameters={setPanelParameters}
                        panelParameters={panelParameters} />
                    }
                    cootCommand={false}
                    nonCootCommand={nonCootCommand}
                    icon={<img style={{ width: '100%', height: '100%' }} alt="drag atoms" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/drag.svg`} />}
                    {...props}
                />
                {showAccept &&
                <Draggable nodeRef={draggableRef} handle=".InnerHandle">
                    <Card ref={draggableRef} className="mx-2" style={{position: 'absolute'}}>
                        <Card.Header className="InnerHandle">Atom dragging mode</Card.Header>
                        <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                            <Stack gap={2} direction="vertical" style={{ alignItems: 'center'}}>
                                <span>Accept dragging ?</span>
                                <Stack gap={2} direction="horizontal" style={{ alignItems: 'center',  alignContent: 'center', justifyContent: 'center'}}>
                                    <Button onClick={async () => {
                                        await finishDragging(true)
                                        setShowAccept(false)
                                    }}><CheckOutlined /></Button>
                                    <Button className="mx-2" onClick={async () => {
                                        await finishDragging(false)
                                        setShowAccept(false)
                                    }}><CloseOutlined /></Button>
                                </Stack>
                            </Stack>
                            <hr></hr>
                            <Stack gap={2} direction="vertical" style={{ alignItems: 'center'}}>
                                <span>Atom pull restraints</span>
                                <Button style={{width: '100%'}} onClick={clearRestraints}><DeleteSweepOutlined /></Button>
                                <Form.Check
                                    defaultChecked={true}
                                    style={{paddingTop: '0.1rem'}} 
                                    type="switch"
                                    onChange={(evt) => autoClearRestraintsRef.current = evt.target.checked}
                                    label="Auto clear"/>
                            </Stack>
                        </Card.Body>
                    </Card>
                </Draggable>
                
                }
        </>
    }
}
