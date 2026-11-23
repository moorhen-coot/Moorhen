import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { RootState, enqueueSnackbar } from "@/store";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMtzWrapper } from "../../utils/MoorhenMtzWrapper";
import { MoorhenButton, MoorhenFileInput, MoorhenSelect, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const ImportMapCoefficients = () => {
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
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
    const [isDiff, setIsDiff] = useState<boolean>(false);
    const [useWeight, setUseWeight] = useState<boolean>(false);
    const [calcStructFact, setCalcStructFact] = useState<boolean>(false);
    const [columns, setColumns] = useState<{ [colType: string]: string }>({});

    const menuItemText = "Map coefficients...";

    const handleFileRead = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const babyGruMtzWrapper = new MoorhenMtzWrapper();
        try {
            const allColumnNames = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0]);
            setColumns(allColumnNames);
        } catch (err) {
            dispatch(enqueueSnackbar({ message: "Error reading mtz file", variant: "error" }));
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
                isDifference: isDiff,
                useWeight: useWeight,
                Fobs: fobsSelectRef.current.value,
                SigFobs: sigFobsSelectRef.current.value,
                FreeR: freeRSelectRef.current.value,
                calcStructFact: calcStructFact,
            };

            try {
                const newMap = await MoorhenMap.loadToCootFromMtzFile(file, selectedColumns, moorhenInstance);
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
                document.body.click();
            } catch (err) {
                dispatch(enqueueSnackbar({ message: "Error reading mtz file", variant: "warning" }));
                console.log(`Cannot read file`);
            }
        }
    }, [isDiff, useWeight, calcStructFact, commandCentre, molecules, maps]);

    return (
        <>
            <MoorhenFileInput
                label="Map coefficient files"
                ref={filesRef}
                multiple={false}
                accept=".mtz"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleFileRead(e);
                }}
            />
            <MoorhenStack direction="line">
                <MoorhenSelect label="Amplitude" inline={false} ref={fSelectRef} defaultValue="FWT" onChange={() => {}}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === "F")
                        .map(key => (
                            <option value={key} key={key}>
                                {key}
                            </option>
                        ))}
                </MoorhenSelect>

                <MoorhenSelect label="Phase" inline={false} ref={phiSelectRef} defaultValue="PHWT" onChange={() => {}}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === "P")
                        .map(key => (
                            <option value={key} key={key}>
                                {key}
                            </option>
                        ))}
                </MoorhenSelect>

                <MoorhenSelect label="Weight" inline={false} ref={wSelectRef} defaultValue="FOM" onChange={() => {}}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === "W")
                        .map(key => (
                            <option value={key} key={key}>
                                {key}
                            </option>
                        ))}
                </MoorhenSelect>
            </MoorhenStack>
            <MoorhenToggle label="is diff map" name="isDifference" type="checkbox" checked={isDiff} toggle={setIsDiff} />
            <MoorhenToggle label="use weight" name="useWeight" type="checkbox" checked={useWeight} toggle={setUseWeight} />
            <p />
            <MoorhenToggle
                label="assign labels for structure factor calculation?"
                name="calcStructFactors"
                type="checkbox"
                checked={calcStructFact}
                toggle={setCalcStructFact}
            />
            <MoorhenStack direction="line">
                <MoorhenSelect
                    label="Fobs"
                    inline={false}
                    disabled={!calcStructFact}
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
                </MoorhenSelect>
                <MoorhenSelect
                    label="SIGFobs"
                    inline={false}
                    disabled={!calcStructFact}
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
                </MoorhenSelect>
                <MoorhenSelect
                    label="Free R"
                    inline={false}
                    disabled={!calcStructFact}
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
                </MoorhenSelect>
            </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
