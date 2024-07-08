import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";

type MoorhenBackupSelectPropsType = {
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    height?: string;
    width?: string;
    label?: string;
}

export const MoorhenBackupSelect = forwardRef<HTMLSelectElement, MoorhenBackupSelectPropsType>((props, selectRef) => {
    
    const defaultProps = { height: '4rem', width: '20rem', label: "Backup" }

    const { height, width, label } = { ...defaultProps, ...props }
    
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

    return <Form.Group style={{ width: width, height:height }}>
                <Form.Label>{label}</Form.Label>
                <FormSelect size="sm" ref={selectRef} defaultValue={-999999} >
                    {backupOptions}
                </FormSelect>
            </Form.Group>
})

