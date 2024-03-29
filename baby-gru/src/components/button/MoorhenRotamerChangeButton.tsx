import { useCallback, useRef } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { libcootApi } from "../../types/libcoot";
import { Stack } from "react-bootstrap";
import { CheckOutlined, CloseOutlined, FirstPageOutlined, NavigateBeforeOutlined, NavigateNextOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { removeMolecule } from "../../store/moleculesSlice";
import { setIsChangingRotamers } from "../../store/generalStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";

export const MoorhenRotamerChangeButton = (props: moorhen.ContextButtonProps) => {
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const selectedFragmentRef = useRef<{ cid: string; alt_conf: string; }>({ cid: '', alt_conf: '' })
    
    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    
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
        fragmentMolecule.current.delete(true)
        chosenMolecule.current.unhideAll()

        dispatch( triggerUpdate(chosenMolecule.current.molNo) )
        dispatch(setIsChangingRotamers(false))

    }, [props.commandCentre, props.glRef])

    const rejectTransform = async () => {
        dispatch(removeMolecule(fragmentMolecule.current))
        fragmentMolecule.current.delete(true)
        chosenMolecule.current.unhideAll()
        dispatch(setIsChangingRotamers(false))
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
                .filter(item => { return ['CRs', 'CBs', 'CAs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases', 'VdwSpheres', 'allHBonds', 'glycoBlocks', 'MetaBalls'].includes(item.style) })
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

    const getPopOverContents = (rotamerInfo: moorhen.WorkerResponse<libcootApi.RotamerInfoJS>) => {
        const rotamerName = rotamerInfo.data.result.result.name
        const rotamerRank = rotamerInfo.data.result.result.rank
        const rotamerProbability = rotamerInfo.data.result.result.richardson_probability

        return <MoorhenNotification width={20}>
            <Stack direction="vertical" gap={1}>
                <div>
                    <span>Current rotamer: {rotamerName} ({rotamerRank + 1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                </div>
                <div>
                    <span>Probability: {rotamerProbability}%</span>
                </div>
                <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_first_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><FirstPageOutlined /></IconButton>
                    <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_previous_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><NavigateBeforeOutlined /></IconButton>
                    <IconButton onClick={async () => {
                        const rotamerInfo = await changeRotamer('change_to_next_rotamer')
                        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                    }}><NavigateNextOutlined /></IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                        acceptTransform()
                        props.setOpacity(1)
                        props.setOverrideMenuContents(false)
                        props.setShowContextMenu(false)
                    }}>
                        <CheckOutlined />
                    </IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                        rejectTransform()
                        props.setOpacity(1)
                        props.setOverrideMenuContents(false)
                        props.setShowContextMenu(false)
                    }}>
                        <CloseOutlined />
                    </IconButton>
                </Stack>
            </Stack>
        </MoorhenNotification>
    }

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string) => {
        const rotamerInfo = await doRotamerChange(molecule, chosenAtom, p)
        props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
        batch(() => {
            dispatch(setHoveredAtom({ molecule: null, cid: null }))
            dispatch(setIsChangingRotamers(true))
        })
    }

    return <MoorhenContextButtonBase
        icon={<img alt="change rotamer" className="moorhen-context-button__icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`} />}
        toolTipLabel="Change rotamers"
        nonCootCommand={nonCootCommand}
        {...props}
    />

}

