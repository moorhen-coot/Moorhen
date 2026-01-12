import { useSnackbar } from "notistack";
import { useEffect, useRef, useState } from "react";
import { useCommandAndCapsule, useTimeCapsule } from "../../InstanceManager";
import { MoorhenButton, MoorhenPopoverButton, MoorhenSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const Backups = (props: { disabled: boolean; loadSession: (sessionDataString: string) => Promise<void> }) => {
    const backupSelectRef = useRef<null | HTMLSelectElement>(null);
    const { commandCentre, timeCapsuleRef } = useCommandAndCapsule();
    const timeCapsule = useTimeCapsule();

    const { enqueueSnackbar } = useSnackbar();

    const retrieveSession = async () => {
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
    };

    return (
        <MoorhenStack gap="1rem">
            <MoorhenBackupSelect ref={backupSelectRef} width="100%" label="Select backup" />
            <MoorhenButton variant="primary" onClick={retrieveSession}>
                Load
            </MoorhenButton>

            <MoorhenPopoverButton type="default" label="Clear all backup" icon="MatSymDelete">
                <MoorhenButton variant="danger" onClick={() => timeCapsule.current.dropAllBackups()}>
                    {" "}
                    Confirm Delete All Backups
                </MoorhenButton>
            </MoorhenPopoverButton>
        </MoorhenStack>
    );
};
("Recover session backup...");

type MoorhenBackupSelectPropsType = {
    height?: string;
    width?: string;
    label?: string;
    ref?: React.Ref<HTMLSelectElement>;
};

export const MoorhenBackupSelect = (props: MoorhenBackupSelectPropsType) => {
    const timeCapsule = useTimeCapsule();
    const { ref, label } = props;

    const [backupOptions, setBackupOptions] = useState<null | React.JSX.Element[]>(null);

    useEffect(() => {
        async function fetchKeys(): Promise<void> {
            const sortedKeys = await timeCapsule.current.getSortedKeys();
            const newStorageOptions = sortedKeys.map((key, index) => {
                return (
                    <option key={`${key.label}-${index}`} value={JSON.stringify(key)}>
                        {key.label}
                    </option>
                );
            });
            setBackupOptions(newStorageOptions);
        }

        if (timeCapsule.current) {
            fetchKeys();
        }
    }, [timeCapsule]);

    return (
        <MoorhenSelect label={label} ref={ref} defaultValue={-999999} inline={false}>
            {backupOptions}
        </MoorhenSelect>
    );
};
