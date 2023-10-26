import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { Button, Card, Container, FormGroup, FormLabel, FormSelect, OverlayTrigger, Row, Stack, Tooltip } from "react-bootstrap";
import { getTooltipShortcutLabel } from '../../utils/MoorhenUtils';
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { IconButton } from '@mui/material';
import { CheckOutlined, CloseOutlined, InfoOutlined } from "@mui/icons-material";
import Draggable from "react-draggable";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice";

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
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const dispatch = useDispatch()

    const rotateTranslateModes = ['ATOM', 'RESIDUE', 'CHAIN', 'MOLECULE']

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).residue_camera_wiggle
            setTips(<>
                <em>{"Hold <Shift><Alt> to translate"}</em>
                <br></br>
                <em>{`Hold ${getTooltipShortcutLabel(shortCut)} to move view`}</em>
                <br></br>
                <br></br>
            </>
            )
        }
    }, [shortCuts])

    const acceptTransform = useCallback(async () => {
        props.glRef.current.setActiveMolecule(null)
        const transformedAtoms = fragmentMolecule.current.transformedCachedAtomsAsMovedAtoms()
        await chosenMolecule.current.updateWithMovedAtoms(transformedAtoms)
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        dispatch( setEnableAtomHovering(true) )
    }, [props, chosenMolecule, fragmentMolecule])

    const rejectTransform = useCallback(async () => {
        props.glRef.current.setActiveMolecule(null)
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        dispatch( setEnableAtomHovering(true) )
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
                    `/*/${chosenAtom.chain_id}`
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
            <MoorhenNotification>
                <Stack gap={2} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'space-between'}}>
                    <OverlayTrigger
                        placement="bottom"
                        overlay={
                            <Tooltip id="tip-tooltip" className="moorhen-tooltip">
                            <div>
                                <em>{"Hold <Shift><Alt> to translate"}</em>
                                <br></br>
                                <em>{shortCuts ? `Hold ${getTooltipShortcutLabel(JSON.parse(shortCuts as string).residue_camera_wiggle)} to move view` : null}</em>
                            </div>
                            </Tooltip>
                        }>
                    <InfoOutlined/>
                    </OverlayTrigger>
                    <div>
                        <span>Accept changes?</span>
                    </div>
                    <div>
                    <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                        await acceptTransform()
                        props.setOverrideMenuContents(false)
                        props.setOpacity(1)
                        props.setShowContextMenu(false)
                    }}>
                        <CheckOutlined/>
                    </IconButton>
                    <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={async() => {
                        await rejectTransform()
                        props.setOverrideMenuContents(false)
                        props.setOpacity(1)
                        props.setShowContextMenu(false)
                    }}>
                        <CloseOutlined/>
                    </IconButton>
                    </div>
                </Stack>
            </MoorhenNotification>
        )

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
            await startRotateTranslate(molecule, chosenAtom, selectedMode)
            props.setShowOverlay(false)
            //props.setOpacity(0.5)
            props.setOverrideMenuContents(contextMenuOverride)
            batch( () => {
                dispatch( setHoveredAtom({molecule: null, cid: null}) )
                dispatch( setEnableAtomHovering(false) )    
            })
        }

        return <MoorhenContextButtonBase 
                    icon={<img alt="rotate/translate" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`}/>}
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

