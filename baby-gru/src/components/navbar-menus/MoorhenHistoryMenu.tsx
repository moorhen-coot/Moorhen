import { useCallback, useState } from "react";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { convertViewtoPx, guid, loadSessionData } from "../../utils/MoorhenUtils";
import { Stepper, Step, StepButton, StepLabel } from "@mui/material";
import { moorhen } from "../../types/moorhen";
import { SaveOutlined, WarningOutlined } from "@mui/icons-material";
import { Stack } from "react-bootstrap";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { useSelector, useDispatch } from 'react-redux';
import { setNotificationContent } from "../../store/generalStatesSlice";

export const MoorhenHistoryMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const [historyHead, setHistoryHead] = useState(0)

    const dispatch = useDispatch()
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const getWarningToast = (message: string) => <MoorhenNotification key={guid()} hideDelay={3000} width={20}>
            <><WarningOutlined style={{margin: 0}}/>
                <h4 className="moorhen-warning-toast">
                    {message}
                </h4>
            <WarningOutlined style={{margin: 0}}/></>
        </MoorhenNotification>

    const loadSession = useCallback(async (sessionData: string) => {
        try {
            const status = await loadSessionData(
                sessionData as string,
                props.monomerLibraryPath,
                molecules, 
                maps,
                props.commandCentre,
                props.timeCapsuleRef,
                props.glRef,
                dispatch
            )
            if (status === -1) {
                dispatch(setNotificationContent(getWarningToast(`Failed to read backup (deprecated format)`)))
            }
        } catch (err) {
            console.log(err)
            dispatch(setNotificationContent(getWarningToast("Error loading session")))
        }
    }, [props])

    const getHistoryStep = useCallback((historyEntry: moorhen.HistoryEntry, index: number) => {
        const moleculeNames = []
        if (historyEntry.changesMolecules?.length > 0) {
            historyEntry.changesMolecules.forEach(imol => {
                const molecule = molecules.find(mol => mol.molNo === imol)
                if (molecule) {
                    moleculeNames.push(molecule.name)
                }
            })
        }

        if(historyEntry.uniqueId === props.commandCentre.current.history.headId && historyHead !== index) {
            setHistoryHead(index)
        }

        const handleClick = async () => {
            if (historyEntry.associatedBackupKey) {
                props.commandCentre.current.history.setSkipTracking(true)
                let backup = await props.timeCapsuleRef.current.retrieveBackup(historyEntry.associatedBackupKey) as string
                await loadSession(backup)
                props.commandCentre.current.history.setSkipTracking(false)
                props.commandCentre.current.history.setCurrentHead(historyEntry.uniqueId)
            }
        }

        return <Step key={index} completed={false}>
            <StepButton color="inherit" onClick={handleClick}>
                <StepLabel>
                    <Stack gap={3} direction="horizontal">
                        {historyEntry.label ? historyEntry.label : historyEntry.command}
                        {historyEntry.associatedBackupKey &&
                            <div key={index} style={{
                                borderStyle: 'solid',
                                borderColor: 'grey',
                                borderWidth: '1px',
                                borderRadius: '1.5rem',
                                padding: '0.5rem',
                            }}>
                                <SaveOutlined/>
                            </div>}
                    </Stack>                   
                </StepLabel>
            </StepButton>
        </Step>
    }, [props.commandCentre, historyHead, molecules, props.timeCapsuleRef, loadSession])

    return <div style={{maxHeight: convertViewtoPx(65, height), maxWidth: '20rem', overflowY: 'auto', overflowX: 'hidden'}}>
        {props.commandCentre.current.history.entries.length === 0 ? 
        <span>No command history</span>
        :
        <Stepper nonLinear activeStep={historyHead} orientation="vertical">
            { props.commandCentre.current.history.entries.map((entry, index) => getHistoryStep(entry, index)) }
        </Stepper>
        }
    </div>
}

