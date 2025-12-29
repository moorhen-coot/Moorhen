import { useDispatch, useSelector } from "react-redux";
import { setEnableTimeCapsule, setMaxBackupCount, setModificationCountBackupThreshold } from "../../store/backupSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const BackupPreferences = () => {
    const dispatch = useDispatch();
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule);
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount);
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold);

    return (
        <MoorhenStack gap="0.5rem">
            <MoorhenToggle
                type="switch"
                checked={enableTimeCapsule}
                onChange={() => {
                    dispatch(setEnableTimeCapsule(!enableTimeCapsule));
                }}
                label="Make automatic backups"
            />
            <hr></hr>
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
        </MoorhenStack>
    );
};

("Automatic backup settings...");
