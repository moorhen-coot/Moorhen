import { useSnackbar } from "notistack";
import { Col, Form, FormSelect, Row } from "react-bootstrap";
import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { Dispatch, RefObject, SetStateAction, useCallback, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMtzWrapper } from "../../utils/MoorhenMtzWrapper";
import { MoorhenButton } from "../inputs";

export const ImportMapCoefficients = (props: {
    commandCentre: RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: Dispatch<SetStateAction<boolean>>;
}) => {
    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);

    const filesRef = useRef<null | HTMLInputElement>(null);
    const fSelectRef = useRef<null | HTMLSelectElement>(null);
    const phiSelectRef = useRef<null | HTMLSelectElement>(null);
    const wSelectRef = useRef<null | HTMLSelectElement>(null);
    const sigFobsSelectRef = useRef<null | HTMLSelectElement>(null);
    const fobsSelectRef = useRef<null | HTMLSelectElement>(null);
    const freeRSelectRef = useRef<null | HTMLSelectElement>(null);
    const isDiffRef = useRef<null | HTMLInputElement>(null);
    const useWeightRef = useRef<null | HTMLInputElement>(null);
    const calcStructFactRef = useRef<null | HTMLInputElement>(null);

    const [calcStructFact, setCalcStructFact] = useState<boolean>(false);
    const [columns, setColumns] = useState<{ [colType: string]: string }>({});

    const menuItemText = "Map coefficients...";

    const { enqueueSnackbar } = useSnackbar();

    const handleFileRead = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const babyGruMtzWrapper = new MoorhenMtzWrapper();
        try {
            const allColumnNames = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0]);
            setColumns(allColumnNames);
        } catch (err) {
            enqueueSnackbar("Error reading mtz file", { variant: "error" });
            document.body.click();
        }
    };

    const onCompleted = useCallback(async () => {
        if (filesRef.current.files.length > 0) {
            const file = filesRef.current.files[0];
            const selectedColumns = {
                F: fSelectRef.current.value,
                PHI: phiSelectRef.current.value,
                W: wSelectRef.current.value,
                isDifference: isDiffRef.current.checked,
                useWeight: useWeightRef.current.checked,
                Fobs: fobsSelectRef.current.value,
                SigFobs: sigFobsSelectRef.current.value,
                FreeR: freeRSelectRef.current.value,
                calcStructFact: calcStructFactRef.current.checked,
            };
            const newMap = new MoorhenMap(commandCentre, store);
            try {
                await newMap.loadToCootFromMtzFile(file, selectedColumns);
                if (newMap.molNo === -1) {
                    throw new Error("Cannot read the mtz file!");
                }
                if (molecules.length === 0 && maps.length === 0) {
                    await newMap.centreOnMap();
                }
                batch(() => {
                    dispatch(addMap(newMap));
                    dispatch(setActiveMap(newMap));
                });
                setCalcStructFact(false);
            } catch (err) {
                enqueueSnackbar("Error reading mtz file", { variant: "warning" });
                console.log(`Cannot read file`);
            }
        }
    }, [filesRef.current, isDiffRef.current, commandCentre, molecules, maps]);

    return (
        <>
            <Row>
                <Form.Group style={{ width: "30rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadDicts" className="mb-3">
                    <Form.Label>Map coefficient files</Form.Label>
                    <Form.Control
                        ref={filesRef}
                        type="file"
                        multiple={false}
                        accept=".mtz"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            handleFileRead(e);
                        }}
                    />
                </Form.Group>
            </Row>
            <Row key="Row1" style={{ marginBottom: "1rem" }}>
                <Col key="F">
                    Amplitude
                    <FormSelect size="sm" ref={fSelectRef} defaultValue="FWT" onChange={() => {}}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === "F")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
                <Col key="Phi">
                    Phase
                    <FormSelect size="sm" ref={phiSelectRef} defaultValue="PHWT" onChange={() => {}}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === "P")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
                <Col key="Weight">
                    Weight
                    <FormSelect size="sm" ref={wSelectRef} defaultValue="FOM" onChange={() => {}}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === "W")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
            </Row>
            <Row style={{ marginBottom: "1rem" }}>
                <Col>
                    <Form.Check label="is diff map" name="isDifference" type="checkbox" ref={isDiffRef} />
                </Col>
                <Col>
                    <Form.Check label="use weight" name="useWeight" type="checkbox" ref={useWeightRef} />
                </Col>
                <Row key="Row4" style={{ marginTop: "1rem" }}>
                    <Col>
                        <Form.Check
                            ref={calcStructFactRef}
                            label="assign labels for structure factor calculation?"
                            name="calcStructFactors"
                            type="checkbox"
                            onChange={() =>
                                setCalcStructFact(prev => {
                                    return !prev;
                                })
                            }
                        />
                    </Col>
                </Row>
            </Row>
            <Row key="Row3" style={{ marginBottom: "1rem" }}>
                <Col key="F">
                    Fobs
                    <FormSelect
                        size="sm"
                        disabled={!calcStructFactRef.current?.checked}
                        ref={fobsSelectRef}
                        defaultValue="FP"
                        onChange={() => {}}
                    >
                        {Object.keys(columns)
                            .filter(key => columns[key] === "F")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
                <Col key="SigF">
                    SIGFobs
                    <FormSelect
                        size="sm"
                        disabled={!calcStructFactRef.current?.checked}
                        ref={sigFobsSelectRef}
                        defaultValue="SIGFP"
                        onChange={() => {}}
                    >
                        {Object.keys(columns)
                            .filter(key => columns[key] === "Q")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
                <Col key="FreeR">
                    Free R
                    <FormSelect
                        size="sm"
                        disabled={!calcStructFactRef.current?.checked}
                        ref={freeRSelectRef}
                        defaultValue="FREER"
                        onChange={() => {}}
                    >
                        {Object.keys(columns)
                            .filter(key => columns[key] === "I")
                            .map(key => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                    </FormSelect>
                </Col>
            </Row>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
