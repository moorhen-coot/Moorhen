import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const MoorhenBackupSelect = forwardRef((props, selectRef) => {

    const [storageKeys, setStorageKeys] = useState([]);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    useEffect(() => {
         async function getKeys() {
            let keysLF = await props.timeCapsuleRef.current.storageInstance.keys()
            const keys = keysLF.filter(key => key.indexOf("backup-") == 0).sort((a,b)=>{return parseInt(a.substr(7))-parseInt(b.substr(7))}).reverse()
            let theKeys = []
                keys.forEach(key => {
                    const intK = parseInt(key.substr(7))
                    const d = new Date(intK)
                    const dateString = d.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale ,dateOptions) + " " + d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()
                    theKeys.push([key,dateString])
                })
            setStorageKeys(theKeys)
        }

        if (storageKeys.length===0 || props.storageKeysDirty) {
            getKeys();
            props.setStorageKeysDirty(false)
        }
    }, [props.storageKeysDirty]);

    const getBackupOptions = () => {
        let backupOptions = []
        storageKeys.forEach(key => {
            backupOptions.push(<option key={key[0]} value={key[0]}>{key[1]}</option>)
        })
        return backupOptions.length > 0 ? backupOptions : null
    }

    return <Form.Group style={{ width: props.width, margin: '0.5rem', height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} >
            {getBackupOptions()}
        </FormSelect>
    </Form.Group>
})

MoorhenBackupSelect.defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Backup", filterFunction: () => true }
