import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useCallback, useRef } from "react";
import { useDispatch, batch, useSelector } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { useSnackbar } from "notistack";

export const MoorhenAtomInfoButton = (props: moorhen.ContextButtonProps) => {

    const dispatch = useDispatch()
    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection)

    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<string[] | null>(null)
    const { enqueueSnackbar } = useSnackbar()

    const nonCootCommand = useCallback(async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode?: string) => {
        chosenMolecule.current = molecule
        props.setShowOverlay(false)
        props.setOpacity(1)
        props.setShowContextMenu(false)
        fragmentCid.current = [chosenAtom.cid]
        enqueueSnackbar("atoms-info", {
            variant: "atomInformation",
            persist: true,
            monomerLibraryPath: props.monomerLibraryPath,
            commandCentre: props.commandCentre,
            cidRef: fragmentCid,
            glRef: props.glRef,
            moleculeRef: chosenMolecule
        })
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
        })
    }, [refinementSelection])

    return <MoorhenContextButtonBase
        icon={<img className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/info.svg`} alt='Atom/Residue information' />}
        needsMapData={false}
        refineAfterMod={false}
        toolTipLabel={"Atom/Residue information"}
        nonCootCommand={nonCootCommand}
        {...props}
    />
}
