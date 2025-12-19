import { useSnackbar } from "notistack";
import { useDispatch, useStore } from "react-redux";
import { useCallback, useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMapList } from "../../store/mapsSlice";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton, MoorhenFileInput } from "../inputs";

export const AutoOpenMtz = () => {
    const filesRef = useRef<null | HTMLInputElement>(null);
    const commandCentre = useCommandCentre();

    const { enqueueSnackbar } = useSnackbar();

    const dispatch = useDispatch();
    const store = useStore();

    const onCompleted = useCallback(async () => {
        if (filesRef.current.files.length === 0) {
            return;
        }

        try {
            const file = filesRef.current.files[0];
            const newMaps = await MoorhenMap.autoReadMtz(file, commandCentre, store);
            if (newMaps.length === 0) {
                enqueueSnackbar("Error reading mtz file", { variant: "error" });
            } else {
                dispatch(addMapList(newMaps));
                dispatch(setActiveMap(newMaps[0]));
            }
        } catch (err) {
            console.warn(err);
            enqueueSnackbar("Error reading mtz file", { variant: "error" });
        }
    }, [filesRef.current, commandCentre]);

    return (
        <>
            <MoorhenFileInput ref={filesRef} multiple={false} accept=".mtz" label="Auto open MTZ file" />
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
("Auto open MTZ...");
