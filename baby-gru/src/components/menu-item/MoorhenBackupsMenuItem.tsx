import { useCallback, useRef } from "react"
import { Button, Row, Stack } from "react-bootstrap"
import { useSnackbar } from "notistack"
import { MoorhenBackupSelect } from "../select/MoorhenBackupSelect"
import { moorhen } from "../../types/moorhen"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenBackupsMenuItem = (props: {
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    disabled: boolean;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    loadSession: (sessionDataString: string) => Promise<void>;
}) => {
    
    const backupSelectRef = useRef<null | HTMLSelectElement>(null)
    
    const { enqueueSnackbar } = useSnackbar()

    const retrieveSession = useCallback(async () => {
        if (backupSelectRef.current.value) {
            try {
                const key = backupSelectRef.current.value
                const backupData = await props.timeCapsuleRef.current.retrieveBackup(key) as string
                props.commandCentre.current.history.reset()
                props.loadSession(backupData)
            } catch (err) {
                enqueueSnackbar("Error loading the session", {variant: "error"})
                console.log(err)
            }
        }

        document.body.click()

    }, [props.setPopoverIsShown, props.loadSession, props.timeCapsuleRef])

    const panelContent = <>
        <Row style={{ width: '30rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <MoorhenBackupSelect {...props} ref={backupSelectRef} width='100%' label='Select backup' />
        </Row>
        <Row>
            <Stack direction='horizontal' gap={2}>
                <Button variant='primary' onClick={retrieveSession}>
                    OK
                </Button>
            </Stack>
        </Row>
    </>

    return <MoorhenBaseMenuItem
        id="recover-backup-menu-item"
        disabled={props.disabled}
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Recover session backup..."
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

