import { Stack } from "react-bootstrap"
import { MoorhenNotification } from "./MoorhenNotification"
import { CheckOutlined, CloseOutlined } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { useCallback, useEffect, useRef } from "react"
import { cidToSpec, getAtomInfoLabel } from '../../utils/MoorhenUtils';
import { webGL } from "../../types/mgWebGL"
import { setIsDraggingAtoms } from "../../store/generalStatesSlice"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"

export const MoorhenAcceptRejectDragAtoms = (props: {
    onExit: () => void;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    moleculeRef: React.RefObject<moorhen.Molecule>;
    cidRef: React.RefObject<string[]>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
}) => {

    const moltenFragmentRef = useRef<null | moorhen.Molecule>(null)
    const busy = useRef<boolean>(false)
    const draggingDirty = useRef<boolean>(false)
    const refinementDirty = useRef<boolean>(false)
    const autoClearRestraintsRef = useRef<boolean>(true)
    
    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const finishDragging = async (acceptTransform: boolean) => {
        document.removeEventListener('atomDragged', atomDraggedCallback)
        document.removeEventListener('mouseup', mouseUpCallback)
        props.glRef.current.setDraggableMolecule(null)
        if (busy.current) {
            setTimeout(() => finishDragging(acceptTransform), 100)
            return
        }
        await props.moleculeRef.current.mergeFragmentFromRefinement(props.cidRef.current.join('||'), moltenFragmentRef.current, acceptTransform, false)
        if (acceptTransform) {
            dispatch( triggerUpdate(props.moleculeRef.current.molNo) )
        }
        dispatch( setIsDraggingAtoms(false) )
    }

    const atomDraggedCallback = useCallback(async (evt: moorhen.AtomDraggedEvent) => {
        draggingDirty.current = true
        if (!busy.current) {
            moltenFragmentRef.current.clearBuffersOfStyle('hover')
            await handleAtomDragged(evt)
        }
    }, [moltenFragmentRef])

    const mouseUpCallback = useCallback(async () => {
        if (refinementDirty.current) {
            await refineNewPosition()
        }
        moltenFragmentRef.current.displayObjectsTransformation.origin = [0, 0, 0]
        moltenFragmentRef.current.displayObjectsTransformation.quat = null
    }, [moltenFragmentRef])

    const handleAtomDragged = async (evt: moorhen.AtomDraggedEvent) => {
        const atomCid = getAtomInfoLabel(evt.detail.atom)
        if (draggingDirty.current && atomCid) {
            busy.current = true
            refinementDirty.current = true
            draggingDirty.current = false
            const movedAtoms = moltenFragmentRef.current.transformedCachedAtomsAsMovedAtoms(atomCid)
            if (movedAtoms.length < 1 || typeof movedAtoms[0][0] === 'undefined') {
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
            handleAtomDragged(evt)
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
                await moltenFragmentRef.current.animateRefine(10, 5)
            } else {
                await moltenFragmentRef.current.animateRefine(-1, 1)
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
        await moltenFragmentRef.current.animateRefine(10, 5)
        busy.current = false
    }

    useEffect(() => {
        
        document.addEventListener('atomDragged', atomDraggedCallback)
        
        return () => {
            document.removeEventListener('atomDragged', atomDraggedCallback)
        }
    }, [atomDraggedCallback])

    useEffect(() => {
        document.addEventListener('mouseup', mouseUpCallback)
    
        return () => {
            document.removeEventListener('mouseup', mouseUpCallback)
        }
    }, [mouseUpCallback])

    useEffect(() => {
        const startDragging = async () => { 
            if (moltenFragmentRef.current || props.glRef.current.draggableMolecule) {
                console.warn('There is already a draggable molecule... Doing nothing.')
                return
            }
            // This is only necessary in development because React.StrictMode mounts components twice
            // @ts-ignore
            moltenFragmentRef.current = 1
    
            /* Copy the component to move into a new molecule */
            const newMolecule = await props.moleculeRef.current.copyFragmentForRefinement(props.cidRef.current, activeMap)
            moltenFragmentRef.current = newMolecule
        
            /* Redraw with animation*/
            await moltenFragmentRef.current.animateRefine(10, 5, 10)
            props.glRef.current.setDraggableMolecule(newMolecule)
        }
        
        startDragging()    
    }, [])

    return  <MoorhenNotification>
                <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span>Accept changes?</span>
                    </div>
                    <div>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                            document.removeEventListener('atomDragged', atomDraggedCallback)
                            document.removeEventListener('mouseup', mouseUpCallback)
                            await finishDragging(true)
                            props.onExit()
                        }}>
                            <CheckOutlined />
                        </IconButton>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                            document.removeEventListener('atomDragged', atomDraggedCallback)
                            document.removeEventListener('mouseup', mouseUpCallback)
                            await finishDragging(false)
                            props.onExit()
                        }}>
                            <CloseOutlined />
                        </IconButton>
                    </div>
                </Stack>
            </MoorhenNotification>
}