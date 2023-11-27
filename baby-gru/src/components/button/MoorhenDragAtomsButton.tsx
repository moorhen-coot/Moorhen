import { useCallback, useEffect, useRef, useState } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { Stack } from "react-bootstrap";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { cidToSpec } from "../../utils/MoorhenUtils";
import { IconButton } from "@mui/material";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";

export const MoorhenDragAtomsButton = (props: moorhen.ContextButtonProps) => {       
    const moltenFragmentRef = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<string[] | null>(null)
    const busy = useRef<boolean>(false)
    const draggingDirty = useRef<boolean>(false)
    const refinementDirty = useRef<boolean>(false)
    const autoClearRestraintsRef = useRef<boolean>(true)
    
    const [showAccept, setShowAccept] = useState<boolean>(false)

    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const startDragging = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode: string) => {
        const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
        let selectedResidueIndex: number = -1;
        let start: number
        let stop: number
        let sphereResidueCids: string[]

        if (typeof selectedSequence !== 'undefined') {
            selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
        }

        if (selectedResidueIndex === -1) {
            dragMode = 'SINGLE'
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
                sphereResidueCids = await molecule.getNeighborResiduesCids(chosenAtom.cid, 6)
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
            commandArgs: [moltenFragmentRef.current.molNo, chosenMolecule.current.molNo, activeMap.molNo]
        }, false)

        /* Redraw with animation after delay so that the context menu does not refresh empty*/
        setTimeout(async () => {
            await Promise.all(fragmentCid.current.map(cid => {
                return chosenMolecule.current.hideCid(cid)
            }))
            moltenFragmentRef.current.setAtomsDirty(true)
            await moltenFragmentRef.current.fetchIfDirtyAndDraw('CBs')
            await moltenFragmentRef.current.animateRefine(10, 5, 10)
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
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { modifiedMolecule: chosenMolecule.current.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
        }
        moltenFragmentRef.current.delete()
        chosenMolecule.current.unhideAll()
        dispatch(setIsDraggingAtoms(false))
    }

    const atomDraggedCallback = useCallback(async (evt: moorhen.AtomDraggedEvent) => {
        draggingDirty.current = true
        if (!busy.current) {
            moltenFragmentRef.current.clearBuffersOfStyle('hover')
            await handleAtomDragged(evt.detail.atom.atom.label)
        }
    }, [moltenFragmentRef])

    const mouseUpCallback = useCallback(async () => {
        if (refinementDirty.current) {
            await refineNewPosition()
        }
        moltenFragmentRef.current.displayObjectsTransformation.origin = [0, 0, 0]
        moltenFragmentRef.current.displayObjectsTransformation.quat = null
    }, [moltenFragmentRef])

    const handleAtomDragged = async (atomCid: string) => {
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
        if (showAccept) {
            document.addEventListener('atomDragged', atomDraggedCallback)
            document.addEventListener('mouseup', mouseUpCallback)
        } else {
            document.removeEventListener('atomDragged', atomDraggedCallback)
            document.removeEventListener('mouseup', mouseUpCallback)
        }
    }, [showAccept])

    const contextMenuOverride = (
        <MoorhenNotification>
            <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <span>Accept changes?</span>
                </div>
                <div>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                        document.removeEventListener('atomDragged', atomDraggedCallback)
                        document.removeEventListener('mouseup', mouseUpCallback)
                        await finishDragging(true)
                        props.setOverrideMenuContents(false)
                        props.setOpacity(1)
                        props.setShowContextMenu(false)
                    }}>
                        <CheckOutlined />
                    </IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                        document.removeEventListener('atomDragged', atomDraggedCallback)
                        document.removeEventListener('mouseup', mouseUpCallback)
                        await finishDragging(false)
                        props.setOverrideMenuContents(false)
                        props.setOpacity(1)
                        props.setShowContextMenu(false)
                    }}>
                        <CloseOutlined />
                    </IconButton>
                </div>
            </Stack>
        </MoorhenNotification>
    )

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string = 'SPHERE') => {
        await startDragging(molecule, chosenAtom, selectedMode)
        props.setShowOverlay(false)
        document.addEventListener('atomDragged', atomDraggedCallback)
        document.addEventListener('mouseup', mouseUpCallback)
        props.setOverrideMenuContents(contextMenuOverride)
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
            dispatch(setIsDraggingAtoms(true))
        })
    }

    return <MoorhenContextButtonBase
        icon={<img alt="drag atoms" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/drag.svg`} />}
        toolTipLabel="Drag atoms"
        refineAfterMod={false}
        needsMapData={true}
        nonCootCommand={nonCootCommand}
        {...props}
    />
}
