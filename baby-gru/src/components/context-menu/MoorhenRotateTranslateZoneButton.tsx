import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { useDispatch, batch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setIsRotatingAtoms } from "../../store/generalStatesSlice";
import { useSnackbar } from "notistack";

export const MoorhenRotateTranslateZoneButton = (props: moorhen.ContextButtonProps) => {

    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<null | string>(null)
    const customCid = useRef<null | string>(null)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    const rotateTranslateModes = ['ATOM', 'RESIDUE', 'CHAIN', 'MOLECULE']

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
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
        props.setShowOverlay(false)
        props.setOverrideMenuContents(false)
        props.setOpacity(1)
        props.setShowContextMenu(false)
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
            dispatch(setIsRotatingAtoms(true))
        })
        enqueueSnackbar("accept-reject-translate", {
            variant: "acceptRejectRotateTranslateAtoms",
            persist: true,
            cidRef: fragmentCid,
            glRef: props.glRef,
            moleculeRef: chosenMolecule
        })
    }

    return <MoorhenContextButtonBase
        icon={<img alt="rotate/translate" className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/rtz.svg`} />}
        toolTipLabel="Rotate/Translate zone"
        nonCootCommand={nonCootCommand}
        popoverSettings={{
            label: 'Rotate/translate mode...',
            options: rotateTranslateModes,
            nonCootCommand: nonCootCommand,
            defaultValue: props.defaultActionButtonSettings['rotateTranslate'],
            setDefaultValue: (newValue: string) => {
                props.setDefaultActionButtonSettings({ key: 'rotateTranslate', value: newValue })
            }
        }}
        {...props}
    />
}

