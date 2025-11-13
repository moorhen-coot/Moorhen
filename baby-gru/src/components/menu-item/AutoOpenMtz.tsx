import { useSnackbar } from "notistack";
import { Form, Row } from "react-bootstrap";
import { useDispatch, useStore } from "react-redux";
import { useCallback, useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMapList } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";

export const AutoOpenMtz = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
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
            <Row>
                <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadMTZ" className="mb-3">
                    <Form.Label>Auto open MTZ file</Form.Label>
                    <Form.Control ref={filesRef} type="file" multiple={false} accept=".mtz" />
                </Form.Group>
            </Row>
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
("Auto open MTZ...");
