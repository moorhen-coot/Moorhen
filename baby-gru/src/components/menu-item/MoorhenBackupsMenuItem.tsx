import { useCallback, useRef } from "react"
import { Button, Row, Stack } from "react-bootstrap"
import { MoorhenBackupSelect } from "../select/MoorhenBackupSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen"

export const MoorhenBackupsMenuItem = (props: {
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    disabled: boolean;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    loadSessionJSON: (sessionDataString: string) => Promise<void>;
}) => {
    
    const backupSelectRef = useRef<null | HTMLSelectElement>(null)

    const retrieveSession = useCallback(async () => {
        if (backupSelectRef.current.value) {
            try {
                const key = backupSelectRef.current.value
                let backup = await props.timeCapsuleRef.current.retrieveBackup(key) as string
                props.loadSessionJSON(backup)
            } catch (err) {
                console.log(err)
            }
        }

        document.body.click()

    }, [props.setPopoverIsShown, props.loadSessionJSON, props.timeCapsuleRef])

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

