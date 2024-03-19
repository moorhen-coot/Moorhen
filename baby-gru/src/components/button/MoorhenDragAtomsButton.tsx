import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useDispatch, batch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";
import { MoorhenAcceptRejectDragAtoms } from "../toasts/MoorhenAcceptRejectDragAtoms"

export const MoorhenDragAtomsButton = (props: moorhen.ContextButtonProps) => {       
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<string[] | null>(null)
    
    const dispatch = useDispatch()

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode: string = "SPHERE") => {
        chosenMolecule.current = molecule
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

        props.setShowOverlay(false)
        props.setOverrideMenuContents(contextMenuOverride)
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
            dispatch(setIsDraggingAtoms(true))
        })
    }

    const onExit = () => {
        props.setOverrideMenuContents(false)
        props.setOpacity(1)
        props.setShowContextMenu(false)
    }

    const contextMenuOverride = <MoorhenAcceptRejectDragAtoms
        monomerLibraryPath={props.monomerLibraryPath}
        commandCentre={props.commandCentre}
        onExit={onExit}
        cidRef={fragmentCid}
        glRef={props.glRef}
        moleculeRef={chosenMolecule}/>

    return <MoorhenContextButtonBase
        icon={<img alt="drag atoms" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/drag.svg`} />}
        toolTipLabel="Drag atoms"
        refineAfterMod={false}
        needsMapData={true}
        nonCootCommand={nonCootCommand}
        {...props}
    />
}
