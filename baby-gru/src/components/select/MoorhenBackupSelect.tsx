import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenTimeCapsuleInterface } from "../../utils/MoorhenTimeCapsule";

type MoorhenBackupSelectPropsType = {
    timeCapsuleRef: React.RefObject<MoorhenTimeCapsuleInterface>;
    height: string;
    width: string;
    label: string;
}

export const MoorhenBackupSelect = forwardRef<HTMLSelectElement, MoorhenBackupSelectPropsType>((props, selectRef) => {
    const [backupOptions, setBackupOptions] = useState<null | JSX.Element[]>(null)

    useEffect(() => {
        async function fetchKeys(): Promise<void> {
            const sortedKeys = await props.timeCapsuleRef.current.getSortedKeys()
            const newStorageOptions = sortedKeys.map((key, index) => {
                return <option key={`${key.label}-${index}`} value={JSON.stringify(key)}>{key.label}</option>
            })
            setBackupOptions(newStorageOptions)
        }

        if (props.timeCapsuleRef.current) {
            fetchKeys();
        }
    }, [props.timeCapsuleRef]);

    return <Form.Group style={{ width: props.width, height:props.height }}>
                <Form.Label>{props.label}</Form.Label>
                <FormSelect size="sm" ref={selectRef} defaultValue={-999999} >
                    {backupOptions}
                </FormSelect>
            </Form.Group>
})

MoorhenBackupSelect.defaultProps = { height: '4rem', width: '20rem', label: "Backup" }
