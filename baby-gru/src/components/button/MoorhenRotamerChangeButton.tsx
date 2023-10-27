import { useCallback, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { libcootApi } from "../../types/libcoot";
import { Button, Card, Stack } from "react-bootstrap";
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, CheckOutlined, CloseOutlined, FirstPageOutlined, NavigateBeforeOutlined, NavigateNextOutlined } from "@mui/icons-material";
import Draggable from "react-draggable";
import { IconButton } from "@mui/material";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice";
import { removeMolecule } from "../../store/moleculesSlice";

export const MoorhenRotamerChangeButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const theButton = useRef<null | HTMLButtonElement>(null)
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const draggableRef = useRef(null)
    const selectedFragmentRef = useRef<{ cid: string; alt_conf: string; }>({ cid: '', alt_conf: '' })
    const [showAccept, setShowAccept] = useState<boolean>(false)
    const [rotamerName, setRotamerName] = useState<string>('')
    const [rotamerRank, setRotamerRank] = useState<number| null>(null)
    const [rotamerProbability, setRotamerProbability] = useState<number | null>(null)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const dispatch = useDispatch()

    const changeRotamer = useCallback(async (command: string) => {
        const rotamerInfo = await props.commandCentre.current.cootCommand({
            returnType: 'rotamer_info_t',
            command: command,
            commandArgs: [fragmentMolecule.current.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
        }, false) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>
        
        fragmentMolecule.current.atomsDirty = true
        await fragmentMolecule.current.redraw()
        
        return rotamerInfo
    
    }, [props.commandCentre])

    const acceptTransform = useCallback(async () => {
        await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'replace_fragment',
            commandArgs: [chosenMolecule.current.molNo, fragmentMolecule.current.molNo, selectedFragmentRef.current.cid],
            changesMolecules: [chosenMolecule.current.molNo]
        }, true)
        
        chosenMolecule.current.atomsDirty = true
        await chosenMolecule.current.redraw()
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        dispatch( setEnableAtomHovering(true) )

    }, [props.commandCentre, props.glRef])

    const rejectTransform = async () => {
        dispatch( removeMolecule(fragmentMolecule.current) )
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        dispatch( setEnableAtomHovering(true) )
    }

    const doRotamerChange = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string = '') => {
        chosenMolecule.current = molecule
        selectedFragmentRef.current.cid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
        selectedFragmentRef.current.alt_conf = chosenAtom.alt_conf === "" ? "" : chosenAtom.alt_conf
        if (!selectedFragmentRef.current.cid) {
            return
        }
        
        /* Copy the component to move into a new molecule */
        const newMolecule = await molecule.copyFragmentUsingCid(selectedFragmentRef.current.cid, false)
        
        /* Next rotaner */
        const rotamerInfo = await props.commandCentre.current.cootCommand({
            returnType: 'rotamer_info_t',
            command: 'change_to_next_rotamer',
            commandArgs: [newMolecule.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
        }, true) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>
        await newMolecule.updateAtoms()
        
        /* redraw after delay so that the context menu does not refresh empty */
        setTimeout(async () => {
            chosenMolecule.current.hideCid(selectedFragmentRef.current.cid)
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
        }, 1)
        
        return rotamerInfo
    }

    if (props.mode === 'context') {

        const getPopOverContents = (rotamerInfo: moorhen.WorkerResponse<libcootApi.RotamerInfoJS>) =>{
            const rotamerName = rotamerInfo.data.result.result.name
            const rotamerRank = rotamerInfo.data.result.result.rank
            const rotamerProbability = rotamerInfo.data.result.result.richardson_probability
            
            return <MoorhenNotification width={20}>
            <Stack direction="vertical" gap={1}>
                <div>
                    <span>Current rotamer: {rotamerName} ({rotamerRank+1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                </div>
                <div>
                    <span>Probability: {rotamerProbability}%</span>
                </div>
                <Stack gap={2} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'center'}}>
                <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_first_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><FirstPageOutlined/></IconButton>
                    <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_previous_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><NavigateBeforeOutlined/></IconButton>
                    <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_next_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><NavigateNextOutlined/></IconButton>
                    <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                        acceptTransform()
                        props.setOpacity(1)
                        props.setOverrideMenuContents(false)
                        props.setShowContextMenu(false)
                    }}>
                        <CheckOutlined/>
                    </IconButton>
                    <IconButton style={{padding: 0, color: isDark ? 'white' : 'grey'}} onClick={async() => {
                        rejectTransform()
                        props.setOpacity(1)
                        props.setOverrideMenuContents(false)
                        props.setShowContextMenu(false)
                    }}>
                        <CloseOutlined/>
                    </IconButton>
                </Stack>
            </Stack>
            </MoorhenNotification>
        }
    
        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string) => {
            const rotamerInfo = await doRotamerChange(molecule, chosenAtom, p)
            props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
            batch( () => {
                dispatch( setHoveredAtom({molecule: null, cid: null}) )
                dispatch( setEnableAtomHovering(false) )    
            })
        }

        return <MoorhenContextButtonBase 
                    icon={<img alt="change rotamer" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`}/>}
                    toolTipLabel="Change rotamers"
                    nonCootCommand={nonCootCommand}
                    {...props}
                />

    } else {

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            const rotamerInfo = await doRotamerChange(molecule, chosenAtom)
            setRotamerName(rotamerInfo.data.result.result.name)
            setRotamerRank(rotamerInfo.data.result.result.rank)
            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)
            setShowAccept(true)
        }
    
        return <><MoorhenEditButtonBase
                    ref={theButton}
                    toolTipLabel="Next rotamer"
                    setToolTip={props.setToolTip}
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={false}
                    cootCommand={false}
                    nonCootCommand={nonCootCommand}
                    prompt="Click atom in residue to change rotamers"
                    icon={<img style={{ width: '100%', height: '100%' }} alt="change rotamer" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`} />}
                    {...props}
                />
                {showAccept && 
                <Draggable nodeRef={draggableRef} handle=".InnerHandle">
                    <Card ref={draggableRef} className="mx-2" style={{position: 'absolute'}}>
                        <Card.Header className="InnerHandle">Accept rotamer ?</Card.Header>
                        <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                    <span>Current rotamer: {rotamerName} ({rotamerRank + 1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                                    <br></br>
                                    <span>Probability: {rotamerProbability}%</span>
                                    <Stack gap={2} direction='horizontal' style={{ paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_first_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><FirstPageOutlined /></Button>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_previous_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><ArrowBackIosOutlined /></Button>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_next_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><ArrowForwardIosOutlined /></Button>
                                    </Stack>
                                    <Stack gap={2} direction='horizontal' style={{ paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                        <Button onClick={() => {
                                            acceptTransform()
                                            setShowAccept(false)
                                        }}><CheckOutlined /></Button>
                                        <Button className="mx-2" onClick={() => {
                                            rejectTransform()
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

