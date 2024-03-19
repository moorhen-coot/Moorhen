import { Stack } from "react-bootstrap"
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { CheckOutlined, CloseOutlined, WarningOutlined } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"
import { hideAcceptMatchingLigandPopUp } from "../../store/activePopUpsSlice"
import { useCallback, useEffect, useRef } from "react"
import { setNotificationContent } from "../../moorhen"
import { guid } from "../../utils/MoorhenUtils"

export const MoorhenAcceptRejectMatchingLigand = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    show: boolean;
    setShow: (arg: boolean) => void;
}) => {

    const copyMovingMoleculeRef = useRef<moorhen.Molecule | null>(null)

    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const refMolNo = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.refMolNo)
    const movingMolNo = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.movingMolNo)
    const refLigandCid = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.refLigandCid)
    const movingLigandCid = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.movingLigandCid)

    const getWarningToast = (message: string) => <MoorhenNotification key={guid()} hideDelay={3000} width={20}>
        <><WarningOutlined style={{margin: 0}}/>
            <h4 className="moorhen-warning-toast">
                {message}
            </h4>
        <WarningOutlined style={{margin: 0}}/></>
    </MoorhenNotification>

    const matchLigands = useCallback(async () => {

        const movingMolecule = molecules.find(molecule => molecule.molNo === movingMolNo)
        const referenceMolecule = molecules.find(molecule => molecule.molNo === refMolNo)

        if (!movingMolecule || !referenceMolecule) {
            return
        }

        copyMovingMoleculeRef.current = await movingMolecule.copyFragmentUsingCid(movingLigandCid, false)

        const result = await props.commandCentre.current.cootCommand({
            command: "match_ligand_torsions_and_position_using_cid",
            commandArgs: [copyMovingMoleculeRef.current.molNo, referenceMolecule.molNo, refLigandCid],
            returnType: "boolean"
        }, false) as moorhen.WorkerResponse<boolean>

        if (result.data.result.result) {
            copyMovingMoleculeRef.current.setAtomsDirty(true)
            await copyMovingMoleculeRef.current.fetchIfDirtyAndDraw('ligands')
            await copyMovingMoleculeRef.current.centreOn('/*/*/*/*', true, true)    
        } else {
            await copyMovingMoleculeRef.current.delete(true)
            dispatch(hideAcceptMatchingLigandPopUp())
            dispatch(setNotificationContent(getWarningToast(`Failed to match ligands`)))
        }
    }, [molecules, refMolNo, movingMolNo, refLigandCid, movingLigandCid])

    useEffect(() => {
        matchLigands()
    }, [ ])

    const exit = useCallback(async (acceptTransform: boolean = false) => {
        if (!copyMovingMoleculeRef.current) {
            return
        }

        const movingMolecule = molecules.find(molecule => molecule.molNo === movingMolNo)
        const referenceMolecule = molecules.find(molecule => molecule.molNo === refMolNo)

        if (!movingMolecule || !referenceMolecule) {
            return
        }

        if (acceptTransform) {
            await referenceMolecule.deleteCid(refLigandCid, false)
            await referenceMolecule.mergeMolecules([copyMovingMoleculeRef.current], false)
            referenceMolecule.setAtomsDirty(true)
            await copyMovingMoleculeRef.current.delete()
            await referenceMolecule.redraw()
            dispatch( triggerUpdate(refMolNo) )
        } else {
            await copyMovingMoleculeRef.current.delete()
        }
        await props.commandCentre.current.cootCommand({
            command: 'end_delete_closed_molecules',
            commandArgs: [ ],
            returnType: 'void'
        }, false)
        dispatch(hideAcceptMatchingLigandPopUp())
    }, [refMolNo, refLigandCid, movingLigandCid, movingMolNo])

    return  <MoorhenNotification>
                <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span>Replace ligand?</span>
                    </div>
                    <div>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                            await exit(true)
                        }}>
                            <CheckOutlined />
                        </IconButton>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                            await exit()
                        }}>
                            <CloseOutlined />
                        </IconButton>
                    </div>
                </Stack>
            </MoorhenNotification>
}