import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const MoorhenBackupSelect = forwardRef((props, selectRef) => {
    const [backupOptions, setBackupOptions] = useState(null)

    useEffect(() => {
        async function fetchKeys() {
            const sortedKeys = await props.timeCapsuleRef.current.getSortedKeys()
            const newStorageOptions = sortedKeys.map((key, index) => {
                return <option key={`${key.label}-${index}`} value={JSON.stringify(key)}>{key.label}</option>
            })
            setBackupOptions(newStorageOptions)
        }

        if (props.timeCapsuleRef.current) {
            fetchKeys();
        }
    }, [props.backupType, props.timeCapsuleRef]);

    return <Form.Group style={{ width: props.width, height:props.height }}>
                <Form.Label>{props.label}</Form.Label>
                <FormSelect size="sm" ref={selectRef} defaultValue={-999999} >
                    {backupOptions}
                </FormSelect>
            </Form.Group>
})

MoorhenBackupSelect.defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Backup", filterFunction: () => true }
