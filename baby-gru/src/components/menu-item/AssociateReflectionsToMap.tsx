import { useSnackbar } from "notistack";
import { Form, FormSelect, Stack } from "react-bootstrap";
import { useSelector } from "react-redux";
import React, { useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenMtzWrapper } from "../../utils/MoorhenMtzWrapper";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";

export const AssociateReflectionsToMap = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const maps = useSelector((state: moorhen.State) => state.maps);

    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const filesRef = useRef<null | HTMLInputElement>(null);
    const fobsSelectRef = useRef<null | HTMLSelectElement>(null);
    const sigFobsSelectRef = useRef<null | HTMLSelectElement>(null);
    const freeRSelectRef = useRef<null | HTMLSelectElement>(null);
    const reflectionDataRef = useRef<Uint8Array>(null);

    const [columns, setColumns] = useState<{ [colType: string]: string }>({});

    const { enqueueSnackbar } = useSnackbar();

    const handleFileRead = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const babyGruMtzWrapper = new MoorhenMtzWrapper();
        try {
            const allColumnNames = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0]);
            setColumns(allColumnNames);
            reflectionDataRef.current = babyGruMtzWrapper.reflectionData;
        } catch (err) {
            enqueueSnackbar("Error reading mtz file", { variant: "error" });
            document.body.click();
        }
    };

    const onCompleted = async () => {
        if (
            !mapSelectRef.current.value ||
            !fobsSelectRef.current.value ||
            !sigFobsSelectRef.current.value ||
            !freeRSelectRef.current.value
        ) {
            return;
        }

        const selectedColumns = {
            Fobs: fobsSelectRef.current.value,
            SigFobs: sigFobsSelectRef.current.value,
            FreeR: freeRSelectRef.current.value,
            calcStructFact: true,
        };
        const selectedMap = maps.find(map => map.molNo === parseInt(mapSelectRef.current.value));

        if (!selectedMap) {
            return;
        }

        await selectedMap.associateToReflectionData(selectedColumns, reflectionDataRef.current);
    };

    return (
        <>
            <Stack direction="vertical" gap={2}>
                <MoorhenMapSelect
                    maps={maps}
                    ref={mapSelectRef}
                    filterFunction={map => !map.hasReflectionData}
                    width="100%"
                    label="Select a map"
                />
                <Form.Group style={{ width: "100%", margin: "0.5rem", padding: "0rem" }} controlId="uploadMTZ" className="mb-3">
                    <Form.Label>Upload MTZ file with reflection data</Form.Label>
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
                <Stack direction="horizontal">
                    <Form.Group style={{ width: "7rem", margin: "0.5rem", padding: "0rem" }} controlId="fobs" className="mb-3">
                        <Form.Label>Fobs</Form.Label>
                        <FormSelect size="sm" ref={fobsSelectRef} defaultValue="FP" onChange={val => {}}>
                            {Object.keys(columns)
                                .filter(key => columns[key] === "F")
                                .map(key => (
                                    <option value={key} key={key}>
                                        {key}
                                    </option>
                                ))}
                        </FormSelect>
                    </Form.Group>
                    <Form.Group style={{ width: "7rem", margin: "0.5rem", padding: "0rem" }} controlId="sigfobs" className="mb-3">
                        <Form.Label>SIGFobs</Form.Label>
                        <FormSelect size="sm" ref={sigFobsSelectRef} defaultValue="SIGFP" onChange={val => {}}>
                            {Object.keys(columns)
                                .filter(key => columns[key] === "Q")
                                .map(key => (
                                    <option value={key} key={key}>
                                        {key}
                                    </option>
                                ))}
                        </FormSelect>
                    </Form.Group>
                    <Form.Group style={{ width: "7rem", margin: "0.5rem", padding: "0rem" }} controlId="freeR" className="mb-3">
                        <Form.Label>Free R</Form.Label>
                        <FormSelect size="sm" ref={freeRSelectRef} defaultValue="FREER" onChange={val => {}}>
                            {Object.keys(columns)
                                .filter(key => columns[key] === "I")
                                .map(key => (
                                    <option value={key} key={key}>
                                        {key}
                                    </option>
                                ))}
                        </FormSelect>
                    </Form.Group>
                </Stack>
            </Stack>
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
("Associate map to reflection data...");
