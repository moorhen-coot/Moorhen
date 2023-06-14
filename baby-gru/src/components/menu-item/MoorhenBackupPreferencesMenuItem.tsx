import { Form } from "react-bootstrap";
import MoorhenSlider from "../misc/MoorhenSlider";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenBackupPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    enableTimeCapsule: boolean;
    setEnableTimeCapsule: React.Dispatch<React.SetStateAction<boolean>>;
    maxBackupCount: number;
    setMaxBackupCount: React.Dispatch<React.SetStateAction<number>>;
    modificationCountBackupThreshold: number;
    setModificationCountBackupThreshold: React.Dispatch<React.SetStateAction<number>>; 
}) => {

    const {
        enableTimeCapsule, setEnableTimeCapsule, maxBackupCount, setMaxBackupCount, modificationCountBackupThreshold, setModificationCountBackupThreshold
    } = props

    const panelContent =
        <>
            <Form.Group style={{ width: '25rem' }}>
                <Form.Check
                    type="switch"
                    checked={enableTimeCapsule}
                    onChange={() => { setEnableTimeCapsule(!enableTimeCapsule) }}
                    label="Make automatic backups" />
            </Form.Group>
            <hr></hr>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenMaxBackupCount">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="Max. number of stored backups" initialValue={maxBackupCount} externalValue={maxBackupCount} setExternalValue={setMaxBackupCount} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenModifThresholdBackup">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="No. of modifications to trigger backup" initialValue={modificationCountBackupThreshold} externalValue={modificationCountBackupThreshold} setExternalValue={setModificationCountBackupThreshold} />
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        id="auto-backup-settings-menu-item"
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Automatic backup settings..."}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />
}
