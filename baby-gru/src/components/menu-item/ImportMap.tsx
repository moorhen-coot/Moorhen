import { useSnackbar } from "notistack";
import { Button, Col, Form, Row } from "react-bootstrap";
import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";

export const ImportMap = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const filesRef = useRef<null | HTMLInputElement>(null);
    const isDiffRef = useRef<undefined | HTMLInputElement>(null);
    const [isActiveButton, setIsActiveButton] = useState(true);

    const menuItemText = "CCP4/MRC map...";

    const { enqueueSnackbar } = useSnackbar();

    const readMaps = useCallback(async () => {
        if (filesRef.current.files.length > 0) {
            setIsActiveButton(false);
            const files = Array.from(filesRef.current.files);
            const newMaps = [];
            try {
                for (const file of files) {
                    const newMap = new MoorhenMap(commandCentre, store);
                    try {
                        await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked);
                    } catch (err) {
                        // Try again if this is a compressed file...
                        if (file.name.includes(".gz")) {
                            await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked, true);
                        } else {
                            console.warn(err);
                            throw new Error("Cannot read the fetched map...");
                        }
                    }
                    if (newMap.molNo === -1) {
                        throw new Error("Cannot read the map file!");
                    }
                    newMaps.push(newMap);
                }

                if (molecules.length === 0 && maps.length === 0 && newMaps.length > 0) {
                    await newMaps[0].centreOnMap();
                }

                batch(() => {
                    newMaps.forEach(map => {
                        dispatch(addMap(map));
                    });
                    if (newMaps.length > 0) {
                        dispatch(setActiveMap(newMaps[0]));
                    }
                });
            } catch (err) {
                console.warn(err);
                enqueueSnackbar("Error reading map files", { variant: "error" });
                console.log(`Cannot read files`);
            } finally {
                document.body.click();
            }
        }
    }, [filesRef.current, isDiffRef.current, commandCentre, molecules, maps]);

    return (
        <>
            <Row>
                <Form.Group style={{ width: "30rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadCCP4Map" className="mb-3">
                    <Form.Label>CCP4/MRC Map...</Form.Label>
                    <Form.Control ref={filesRef} type="file" multiple={true} accept=".map, .mrc, .map.gz, .mrc.gz, .ccp4" />
                </Form.Group>
            </Row>
            <Row style={{ marginBottom: "1rem" }}>
                <Col>
                    <Form.Check label={"is diff map"} name={`isDifference`} type="checkbox" ref={isDiffRef} />
                </Col>
            </Row>
            <MoorhenButton variant="primary" onClick={readMaps} disabled={!isActiveButton}>
                OK
            </MoorhenButton>
        </>
    );
};
