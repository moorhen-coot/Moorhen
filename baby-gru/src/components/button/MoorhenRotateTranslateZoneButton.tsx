import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { Button, Card, Container, FormGroup, FormLabel, FormSelect, Row, Stack } from "react-bootstrap";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import Draggable from "react-draggable";
import { getTooltipShortcutLabel } from "../../utils/MoorhenUtils";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";

export const MoorhenRotateTranslateZoneButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const [showAccept, setShowAccept] = useState<boolean>(false)
    const [tips, setTips] = useState<null | JSX.Element>(null)
    const [panelParameters, setPanelParameters] = useState<string>('RESIDUE')
    const draggableRef = useRef()
    const theButton = useRef<HTMLButtonElement | null>(null)
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<null | string>(null)
    const customCid = useRef<null | string>(null)

    const rotateTranslateModes = ['ATOM', 'RESIDUE', 'CHAIN', 'MOLECULE']

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts as string).residue_camera_wiggle
            setTips(<>
                <em>{"Hold <Shift><Alt> to translate"}</em>
                <br></br>
                <em>{`Hold ${getTooltipShortcutLabel(shortCut)} to move view`}</em>
                <br></br>
                <br></br>
            </>
            )
        }
    }, [props.shortCuts])

    const acceptTransform = useCallback(async () => {
        props.glRef.current.setActiveMolecule(null)
        const transformedAtoms = fragmentMolecule.current.transformedCachedAtomsAsMovedAtoms()
        await chosenMolecule.current.updateWithMovedAtoms(transformedAtoms)
        props.changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    }, [props, chosenMolecule, fragmentMolecule])

    const rejectTransform = useCallback(async () => {
        props.glRef.current.setActiveMolecule(null)
        props.changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
    }, [props, chosenMolecule, fragmentMolecule])

    const startRotateTranslate = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        chosenMolecule.current = molecule
        switch (selectedMode) {
            case 'ATOM':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
                break;
            case 'RESIDUE':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
                break;
            case 'CHAIN':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}`
                break;
            case 'MOLECULE':
                fragmentCid.current =
                    `/*/*`
                break;
            case 'CUSTOM':
                fragmentCid.current = customCid.current
                break;
            default:
                console.log('Unrecognised rotate/translate selection...')
                break;
        }
        if (!fragmentCid.current) {
            return
        }
        /* Copy the component to move into a new molecule */
        const newMolecule = await molecule.copyFragmentUsingCid(fragmentCid.current, false)
        await newMolecule.updateAtoms()
        /* redraw after delay so that the context menu does not refresh empty */
        setTimeout(async () => {
            chosenMolecule.current.hideCid(fragmentCid.current)
            await Promise.all(molecule.representations
                .filter(item => { return ['CRs', 'CBs', 'CAs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases', 'VdwSpheres', 'allHBonds','glycoBlocks'].includes(item.style) })
                .map(representation => {
                    if (representation.buffers.length > 0 && representation.buffers[0].visible) {
                        return newMolecule.addRepresentation(representation.style, representation.cid)
                    } else {
                        return Promise.resolve()
                    }
            }))
            fragmentMolecule.current = newMolecule
            props.changeMolecules({ action: "Add", item: newMolecule })
            props.glRef.current.setActiveMolecule(newMolecule)
        }, 1)
    }

    const MoorhenRotateTranslatePanel = (props: { panelParameters: string; setPanelParameters: React.Dispatch<React.SetStateAction<string>> }) => {
        return <Container>
            <Row style={{textAlign: 'center', justifyContent: 'center'}}>Please click an atom to define object</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Rotate/translate mode</FormLabel>
                    <FormSelect defaultValue={props.panelParameters}
                        onChange={(e) => {
                            props.setPanelParameters(e.target.value)
                        }}>
                        {rotateTranslateModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                        <option key={'CUSTOM'} value={'CUSTOM'}>CUSTOM</option>
                    </FormSelect>
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

        const contextMenuOverride = (
            <Draggable>
            <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => props.setOpacity(1)} onMouseOut={() => props.setOpacity(0.5)}>
            <Card.Header>Accept rotate/translate ?</Card.Header>
            <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                <em>{"Hold <Shift><Alt> to translate"}</em>
                <br></br>
                <em>{props.shortCuts ? `Hold ${getTooltipShortcutLabel(JSON.parse(props.shortCuts as string).residue_camera_wiggle)} to move view` : null}</em>
                <br></br>
                <br></br>
                <Stack direction='horizontal' gap={2} style={{ alignItems: 'center',  alignContent: 'center', justifyContent: 'center'}}>
                    <Button onClick={async () => {
                            await acceptTransform()
                            props.setOverrideMenuContents(false)
                            props.setOpacity(1)
                            props.setShowContextMenu(false)
                        }}><CheckOutlined /></Button>
                    <Button onClick={async() => {
                            await rejectTransform()
                            props.setOverrideMenuContents(false)
                            props.setOpacity(1)
                            props.setShowContextMenu(false)
                    }}><CloseOutlined /></Button>
                </Stack>
            </Card.Body>
            </Card>
        </Draggable>
        )

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
            await startRotateTranslate(molecule, chosenAtom, selectedMode)
            props.setShowOverlay(false)
            props.setOpacity(0.5)
            props.setOverrideMenuContents(contextMenuOverride)
        }

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="rotate/translate" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`}/>}
                    toolTipLabel="Rotate/Translate zone"
                    nonCootCommand={nonCootCommand}
                    popoverSettings={{
                        label: 'Rotate/translate mode...',
                        options: rotateTranslateModes,
                        nonCootCommand: nonCootCommand,
                        defaultValue: props.defaultActionButtonSettings['rotateTranslate'],
                        setDefaultValue: (newValue: string) => {
                            props.setDefaultActionButtonSettings({key: 'rotateTranslate', value: newValue})
                        }
                    }}
                    {...props}
                />
        
    } else {

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string) => {
            await startRotateTranslate(molecule, chosenAtom, p)
            setShowAccept(true)
        }
    
        return <><MoorhenEditButtonBase
                    ref={theButton}
                    toolTipLabel="Rotate/Translate zone"
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={false}
                    panelParameters={panelParameters}
                    prompt={
                        <MoorhenRotateTranslatePanel
                        setPanelParameters={setPanelParameters}
                        panelParameters={panelParameters} />
                    }
                    cootCommand={false}
                    nonCootCommand={nonCootCommand}
                    icon={<img style={{ width: '100%', height: '100%' }} alt="rotate/translate" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`} />}
                    {...props}
                />
                {showAccept &&
                <Draggable nodeRef={draggableRef} handle=".InnerHandle">
                    <Card ref={draggableRef} className="mx-2" style={{position: 'absolute'}}>
                        <Card.Header className="InnerHandle">Accept rotate/translate ?</Card.Header>
                        <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                            {tips}
                            <Stack direction='horizontal' gap={1} style={{ alignItems: 'center',  alignContent: 'center', justifyContent: 'center'}}>
                                <Button onClick={async () => {
                                    await acceptTransform()
                                    setShowAccept(false)
                                }}><CheckOutlined /></Button>
                                <Button className="mx-2" onClick={async() => {
                                    await rejectTransform()
                                    setShowAccept(false)
                                }}><CloseOutlined /></Button>
                            </Stack>
                        </Card.Body>
                    </Card>
                </Draggable>
                }
        </>
    }
}

