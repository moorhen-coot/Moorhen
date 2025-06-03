import { Form } from "react-bootstrap";
import { MoorhenSlider } from "../inputs/MoorhenSlider";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useSelector, useDispatch } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { setEnableTimeCapsule, setMaxBackupCount, setModificationCountBackupThreshold } from "../../store/backupSettingsSlice";

export const MoorhenBackupPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount)
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold)

    const panelContent =
        <>
            <Form.Group style={{ maxWidth: '25rem' }}>
                <Form.Check
                    type="switch"
                    checked={enableTimeCapsule}
                    onChange={() => { dispatch(
                        setEnableTimeCapsule(!enableTimeCapsule)
                    )}}
                    label="Make automatic backups" />
            </Form.Group>
            <hr></hr>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenMaxBackupCount">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} decimalPlaces={0} logScale={false} sliderTitle="Max. number of stored backups" externalValue={maxBackupCount} setExternalValue={(val: number) => dispatch(setMaxBackupCount(val))} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenModifThresholdBackup">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} decimalPlaces={0} logScale={false} sliderTitle="No. of modifications to trigger backup"  externalValue={modificationCountBackupThreshold} setExternalValue={(val: number) => dispatch(setModificationCountBackupThreshold(val))} />
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
