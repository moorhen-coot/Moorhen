import { useSnackbar } from "notistack";
import { Button, Row, Stack } from "react-bootstrap";
import { useCallback, useRef } from "react";
import { useCommandAndCapsule } from "../../InstanceManager";
import { MoorhenButton } from "../inputs";
import { MoorhenBackupSelect } from "../select/MoorhenBackupSelect";

export const Backups = (props: { disabled: boolean; loadSession: (sessionDataString: string) => Promise<void> }) => {
    const backupSelectRef = useRef<null | HTMLSelectElement>(null);
    const { commandCentre, timeCapsuleRef } = useCommandAndCapsule();

    const { enqueueSnackbar } = useSnackbar();

    const retrieveSession = useCallback(async () => {
        if (backupSelectRef.current.value) {
            try {
                const key = backupSelectRef.current.value;
                const backupData = (await timeCapsuleRef.current.retrieveBackup(key)) as string;
                commandCentre.current.history.reset();
                props.loadSession(backupData);
            } catch (err) {
                enqueueSnackbar("Error loading the session", { variant: "error" });
                console.log(err);
            }
        }

        document.body.click();
    }, [props.loadSession, timeCapsuleRef]);

    return (
        <>
            <Row style={{ width: "30rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                <MoorhenBackupSelect ref={backupSelectRef} width="100%" label="Select backup" />
            </Row>
            <Row>
                <Stack direction="horizontal" gap={2}>
                    <MoorhenButton variant="primary" onClick={retrieveSession}>
                        OK
                    </MoorhenButton>
                </Stack>
            </Row>
        </>
    );
};
("Recover session backup...");
