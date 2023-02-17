import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const MoorhenBackupSelect = forwardRef((props, selectRef) => {
    const [backupOptions, setBackupOptions] = useState(null)
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    useEffect(() => {
         async function fetchKeys() {
            let storageInstance
            if (props.backupType === 'automatic') {
                storageInstance = props.timeCapsuleRef.current.autoBackupsStorageInstance
            } else {
                storageInstance = props.timeCapsuleRef.current.manualBackupsStorageInstance
            }
            let keysLF = await storageInstance.keys()
            const newStorageOptions = keysLF.map((key, index) => <option key={index} value={key}>{key}</option>)
            setBackupOptions(newStorageOptions)
        }

        if (props.timeCapsuleRef.current) {
            fetchKeys();
        }
    }, [props.backupType]);

    return <Form.Group style={{ width: props.width, height:props.height }}>
                <Form.Label>{props.label}</Form.Label>
                <FormSelect size="sm" ref={selectRef} defaultValue={-999999} >
                    {backupOptions}
                </FormSelect>
            </Form.Group>
})

MoorhenBackupSelect.defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Backup", filterFunction: () => true }
