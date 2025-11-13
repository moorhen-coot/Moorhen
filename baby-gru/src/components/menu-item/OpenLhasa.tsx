import { useSnackbar } from "notistack";
import { Button, FormControl, FormGroup, FormLabel, FormSelect } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { addRdkitMoleculePickle } from "../../store/lhasaSlice";
import { showModal } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const OpenLhasa = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const [selectedCoordMolNo, setSelectedCoordMolNo] = useState<number>(molecules[0]?.molNo ?? null);
    const [onStartLigandSource, setOnStartLigandSource] = useState<string>("none");

    const loadLigandSelectRef = useRef<HTMLSelectElement | null>(null);
    const ligandSelectRef = useRef<HTMLSelectElement | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);
    const tlcRef = useRef<HTMLInputElement | null>(null);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    const menuItemText = "Open ligand builder...";

    const handleMoleculeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCoordMolNo(parseInt(evt.target.value));
    };

    const handleLoadLigandSource = useCallback(evt => {
        setOnStartLigandSource(evt.target.value);
    }, []);

    const fetchAndAddRdkitPickle = useCallback(
        async (resName: string, molNo: number, cid: string = null) => {
            const result = (await commandCentre.current.cootCommand(
                {
                    returnType: "string",
                    command: "get_rdkit_mol_pickle_base64",
                    commandArgs: [resName, molNo],
                },
                false
            )) as moorhen.WorkerResponse<string>;
            if (result.data.result.result) {
                dispatch(
                    addRdkitMoleculePickle({
                        ligandName: resName,
                        cid: cid,
                        moleculeMolNo: molNo,
                        id: `${resName}_${molNo}`,
                        pickle: result.data.result.result,
                    })
                );
            } else {
                enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: "warning" });
            }
        },
        [commandCentre]
    );

    const onCompleted = useCallback(async () => {
        try {
            if (loadLigandSelectRef.current.value === "molecule") {
                const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
                if (selectedMolecule) {
                    const selectedLigand = selectedMolecule.ligands.find(ligand => ligand.cid === ligandSelectRef.current.value);
                    if (selectedLigand) {
                        await fetchAndAddRdkitPickle(selectedLigand.resName, selectedMolecule.molNo, selectedLigand.cid);
                    }
                }
            } else if (loadLigandSelectRef.current.value === "libcoot-api") {
                if (tlcRef.current?.value && moleculeSelectRef.current?.value) {
                    await fetchAndAddRdkitPickle(tlcRef.current.value, parseInt(moleculeSelectRef.current.value));
                }
            } else if (tlcRef.current?.value) {
                let url: string;
                switch (loadLigandSelectRef.current.value) {
                    case "pdbe":
                        url = `https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${tlcRef.current.value.toUpperCase()}.cif`;
                        break;
                    case "remote-monomer-library":
                        url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${tlcRef.current.value.toLowerCase()[0]}/${tlcRef.current.value.toUpperCase()}.cif`;
                        break;
                    case "local-monomer-library":
                        url = `${monomerLibraryPath}/${tlcRef.current.value.toLowerCase()[0]}/${tlcRef.current.value.toUpperCase()}.cif`;
                        break;
                    default:
                        console.warn(`Unrecognised ligand source ${loadLigandSelectRef.current.value}`);
                        break;
                }
                if (url) {
                    const response = await fetch(url);
                    if (response.ok) {
                        const ligandDict = await response.text();
                        await commandCentre.current.cootCommand(
                            {
                                returnType: "status",
                                command: "read_dictionary_string",
                                commandArgs: [ligandDict, -999999],
                                changesMolecules: [],
                            },
                            false
                        );
                        await fetchAndAddRdkitPickle(tlcRef.current.value.toUpperCase(), -999999);
                    }
                }
            }
            dispatch(showModal(modalKeys.LHASA));
            document.body.click();
        } catch (err) {
            enqueueSnackbar("Something went wrong...", { variant: "warning" });
            console.warn(err);
        }
    }, [molecules, fetchAndAddRdkitPickle]);

    return (
        <>
            <FormGroup style={{ height: "4rem", width: "20rem", margin: "0.5rem" }}>
                <FormLabel>Load a ligand on start?</FormLabel>
                <FormSelect ref={loadLigandSelectRef} size="sm" onChange={handleLoadLigandSource} defaultValue={"none"}>
                    <option value={"none"}>Do not load a ligand</option>
                    <option value={"molecule"}>From a molecule</option>
                    <option value={"libcoot-api"}>From an imported dictionary</option>
                    <option value={"local-monomer-library"}>From the local monomer library</option>
                    <option value={"remote-monomer-library"}>From the remote monomer library</option>
                    <option value={"pdbe"}>From the PDBe</option>
                </FormSelect>
            </FormGroup>
            {onStartLigandSource !== "none" && (
                <>
                    <MoorhenMoleculeSelect
                        ref={moleculeSelectRef}
                        molecules={molecules}
                        onChange={handleMoleculeChange}
                        allowAny={onStartLigandSource !== "molecule"}
                    />
                    {onStartLigandSource === "molecule" ? (
                        <MoorhenLigandSelect ref={ligandSelectRef} molecules={molecules} selectedCoordMolNo={selectedCoordMolNo} />
                    ) : (
                        <FormGroup className="moorhen-form-group" controlId="MoorhenGetMonomerMenuItem">
                            <FormLabel>Monomer identifier</FormLabel>
                            <FormControl ref={tlcRef} type="text" size="sm" style={{ textTransform: "uppercase" }} />
                        </FormGroup>
                    )}
                </>
            )}
            <Button variant="primary" onClick={onCompleted}>
                OK
            </Button>
        </>
    );
};
