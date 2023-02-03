import { useEffect,useState,forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import localforage from 'localforage';

export const MoorhenBackupSelect = forwardRef((props, selectRef) => {

  const [storageKeys, setStorageKeys] = useState([]);
    

    useEffect(() => {
         async function getKeys() {
            const ContactTable = localforage.createInstance({
               name: "Moorhen-SessionStorage",
               storeName: "Moorhen-SessionStorageTable"
            });
            let keys = await ContactTable.keys()
            let theKeys = []
                keys.forEach(key => {
                    if(key.startsWith("backup-")){
                        const intK = parseInt(key.substr(7))
                        const d = "" + new Date(intK)
                        theKeys.push([key,d])
                    }
                })
            setStorageKeys(theKeys)
        }

        if (storageKeys.length===0||props.storageKeysDirty) {
            getKeys();
            props.setStorageKeysDirty(false)
        }
    }, []);

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
