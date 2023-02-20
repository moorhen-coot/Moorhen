import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const MoorhenBackupSelect = forwardRef((props, selectRef) => {
    const [backupOptions, setBackupOptions] = useState(null)

    useEffect(() => {
        async function fetchKeys() {
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            const sortedKeys = await props.timeCapsuleRef.current.getSortedKeys()
            const newStorageOptions = sortedKeys.map(key => {
                const keyString = JSON.stringify(key)
                const intK = parseInt(key.dateTime)
                const date = new Date(intK)
                const dateString = `${date.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale, dateOptions)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
                const moleculeNamesLabel = key.molNames.join(',').length > 10 ? key.molNames.join(',').slice(0, 8) + "..." : key.molNames.join(',')
                const keyLabel = `${moleculeNamesLabel} -- ${dateString} -- ${key.type === 'automatic' ? 'AUTO' : 'MANUAL'}`
                return <option key={keyString} value={keyString}>{keyLabel}</option>
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
