import { Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { setEnableTimeCapsule, setMaxBackupCount, setModificationCountBackupThreshold } from "../../store/backupSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider } from "../inputs";

export const BackupPreferences = () => {
    const dispatch = useDispatch();
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule);
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount);
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold);

    return (
        <>
            <Form.Group style={{ maxWidth: "25rem" }}>
                <Form.Check
                    type="switch"
                    checked={enableTimeCapsule}
                    onChange={() => {
                        dispatch(setEnableTimeCapsule(!enableTimeCapsule));
                    }}
                    label="Make automatic backups"
                />
            </Form.Group>
            <hr></hr>
            <Form.Group className="mb-3" style={{ width: "18rem", margin: "0" }} controlId="MoorhenMaxBackupCount">
                <MoorhenSlider
                    isDisabled={!enableTimeCapsule}
                    minVal={1}
                    maxVal={30}
                    decimalPlaces={0}
                    logScale={false}
                    sliderTitle="Max. number of stored backups"
                    externalValue={maxBackupCount}
                    setExternalValue={(val: number) => dispatch(setMaxBackupCount(val))}
                />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: "18rem", margin: "0" }} controlId="MoorhenModifThresholdBackup">
                <MoorhenSlider
                    isDisabled={!enableTimeCapsule}
                    minVal={1}
                    maxVal={30}
                    decimalPlaces={0}
                    logScale={false}
                    sliderTitle="No. of modifications to trigger backup"
                    externalValue={modificationCountBackupThreshold}
                    setExternalValue={(val: number) => dispatch(setModificationCountBackupThreshold(val))}
                />
            </Form.Group>
        </>
    );
};

("Automatic backup settings...");
