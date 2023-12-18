import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { OverlayTrigger, Stack, Tooltip } from "react-bootstrap";
import { getTooltipShortcutLabel } from '../../utils/MoorhenUtils';
import { IconButton } from '@mui/material';
import { CheckOutlined, CloseOutlined, InfoOutlined } from "@mui/icons-material";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setIsRotatingAtoms } from "../../store/generalStatesSlice";

export const MoorhenRotateTranslateZoneButton = (props: moorhen.ContextButtonProps) => {

    const fragmentMolecule = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const fragmentCid = useRef<null | string>(null)
    const customCid = useRef<null | string>(null)

    const [tips, setTips] = useState<null | JSX.Element>(null)

    const dispatch = useDispatch()
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

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
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        dispatch(setIsRotatingAtoms(false))
    }, [props, chosenMolecule, fragmentMolecule])

    const rejectTransform = useCallback(async () => {
        props.glRef.current.setActiveMolecule(null)
        fragmentMolecule.current.delete()
        chosenMolecule.current.unhideAll()
        dispatch(setIsRotatingAtoms(false))
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
                .filter(item => { return ['CRs', 'CBs', 'CAs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases', 'VdwSpheres', 'allHBonds', 'glycoBlocks', 'MetaBalls'].includes(item.style) })
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

    const contextMenuOverride = (
        <MoorhenNotification>
            <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
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
                    <InfoOutlined />
                </OverlayTrigger>
                <div>
                    <span>Accept changes?</span>
                </div>
                <div>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                        await acceptTransform()
                        props.setOverrideMenuContents(false)
                        props.setOpacity(1)
                        props.setShowContextMenu(false)
                    }}>
                        <CheckOutlined />
                    </IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                        await rejectTransform()
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

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, selectedMode: string) => {
        await startRotateTranslate(molecule, chosenAtom, selectedMode)
        props.setShowOverlay(false)
        props.setOverrideMenuContents(contextMenuOverride)
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
            dispatch(setIsRotatingAtoms(true))
        })
    }

    return <MoorhenContextButtonBase
        icon={<img alt="rotate/translate" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`} />}
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

