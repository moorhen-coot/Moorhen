import React, { useCallback, useEffect, useRef, useState } from "react";
import { Form, Stack } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { IconButton, LinearProgress } from "@mui/material";
import { setNotificationContent } from "../../moorhen";
import { PauseCircleOutlined, PlayCircleOutlined, StopCircleOutlined } from "@mui/icons-material";

const SteppedRefinementManager = (props: { molecule: moorhen.Molecule; timeCapsuleRef: React.RefObject<moorhen.TimeCapsule> }) => {
    const dispatch = useDispatch()
    const timeCapsuleIsEnabled = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [buffer, setBuffer] = useState<number>(1)
    const [cid, setCid] = useState<string | null>('Refining...')
    
    const isClosedRef = useRef<boolean>(false)
    const isRunningRef = useRef<boolean>(false)

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const exit = useCallback(async () => {
        props.timeCapsuleRef.current.disableBackups = !timeCapsuleIsEnabled
        props.molecule.clearBuffersOfStyle('rama')
        await props.timeCapsuleRef.current.addModification()
        dispatch( setNotificationContent(null) )
    }, [timeCapsuleIsEnabled])

    const init = () => {
        props.timeCapsuleRef.current.disableBackups = true
        props.molecule.fetchIfDirtyAndDraw('rama')
    }

    const steppedRefine = async () => {
        init()
        const nResidues = props.molecule.sequences.map(item => item.sequence.length).reduce((a, b) => a + b)
        const residuePercent = nResidues / 50
        const singleResiduePercent = 1 / residuePercent
        setProgress(0)
        for (let item of props.molecule.sequences) {
            for (let residue of item.sequence) {
                setBuffer((prev) => prev + singleResiduePercent)
                if (isClosedRef.current) {
                    await exit()
                    return
                }
                while (!isRunningRef.current) {
                    if (isClosedRef.current) {
                        exit()
                        return
                    } else {
                        await sleep(500)    
                    }    
                }
                setCid(residue.cid)
                await props.molecule.centreAndAlignViewOn(residue.cid, true)
                await props.molecule.refineResiduesUsingAtomCid(residue.cid, 'TRIPLE', 4000, true)
                setProgress((prev) => prev + singleResiduePercent)
                await sleep(600)
            }
        }
        await exit()
    }

    useEffect(() => {
        setIsRunning(true)
        isRunningRef.current = true
        steppedRefine()
    }, [])

    return <MoorhenNotification key={'stepped-refinement-controller'} width={15}>
                <Stack gap={2} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'space-between'}}>
                    <Stack gap={2} direction='vertical' style={{width: '100%'}}>
                        <span>{cid}</span>
                        <LinearProgress variant={isRunning ? 'buffer' : 'determinate'} value={progress} valueBuffer={buffer} style={{width: '100%', display: 'flex', justifyContent: 'start'}}/>
                    </Stack>
                    <div style={{display: 'flex', justifyContent: 'end'}}>
                        <IconButton style={{padding: '0.1rem'}} onClick={() => {
                            isRunningRef.current = !isRunningRef.current
                            setIsRunning(isRunningRef.current)
                        }}>
                            {isRunning ? <PauseCircleOutlined/> : <PlayCircleOutlined/>}
                        </IconButton>
                        <IconButton style={{padding: '0.1rem'}} onClick={() => {
                            isClosedRef.current = true
                        }}>
                            <StopCircleOutlined/>
                        </IconButton>
                    </div>
                </Stack>
    </MoorhenNotification>   
}

export const MoorhenStepRefinementMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
}) => {
    
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

    const panelContent = <>
        <Form.Group key="stepped-refinement-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="modelSelect" className="mb-3">
            <MoorhenMoleculeSelect width="" molecules={molecules} ref={moleculeSelectRef} />
        </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            dispatch( setNotificationContent(
                <SteppedRefinementManager molecule={selectedMolecule} timeCapsuleRef={props.timeCapsuleRef}/>
            ))
        } else {
            console.warn(`Unable to find molecule with molNo ${moleculeSelectRef.current.value} for stepped refinement...`)
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='step-refinement-menu-item'
        popoverContent={panelContent}
        menuItemText="Stepped refine..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
