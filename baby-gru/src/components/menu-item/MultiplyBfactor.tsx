import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { triggerRedrawEnv } from "../../store/glRefSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { MoorhenButton, MoorhenSelect, MoorhenSlider } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../inputs/Selector/MoorhenLigandSelect";
import { MoorhenStack } from "../interface-base/Stack/Stack"
import { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { RootState } from "@/WebComponent/entry";

export const MultiplyBfactor = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const chainSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidFormRef = useRef<null | HTMLInputElement>(null);
    const ruleSelectRef = useRef<null | HTMLSelectElement>(null);
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null);

    const dispatch = useDispatch();
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    const [cid, setCid] = useState<string>("");
    const [invalidCid, setInvalidCid] = useState<boolean>(false);
    const [selectionType, setSelectionType] = useState<string>("molecule");
    const [selectedChain, setSelectedChain] = useState<string | number>(null);
    const [selectedModel, setSelectedModel] = useState<number | number>(null);
    const [bfactor, setBfactor] = useState<number | number>(0);

    const commandCentre = useCommandCentre();

    const handleModelChange = useCallback(
        (evt: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedModel(parseInt(evt.target.value));
            setSelectedChain(chainSelectRef.current?.value);
        },
        [molecules]
    );

    const handleChainChange = useCallback(
        evt => {
            setSelectedChain(evt.target.value);
        },
        [molecules]
    );

    useEffect(() => {
        let selectedMolecule: MoorhenMolecule;
        if (molecules.length === 0) {
            setSelectedModel(null);
            setSelectedChain(null);
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo);
            setSelectedChain(molecules[0].sequences[0]?.chain);
            selectedMolecule = molecules[0];
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo);
            setSelectedChain(molecules[0].sequences[0]?.chain);
            selectedMolecule = molecules[0];
        }
    }, [molecules]);

    const multiplyBfactor = async () => {
        if (!moleculeSelectRef.current.value || !ruleSelectRef.current?.value ) {
            console.warn("Missing data, doing nothing...");
            return;
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!selectedMolecule) {
            console.warn(`Cannot find molecule with molNo ${moleculeSelectRef.current.value}`);
            return;
        }

        let cid: string;
        switch (ruleSelectRef.current.value) {
            case "molecule":
                cid = "/*/*/*/*";
                break;
            case "chain":
                cid = chainSelectRef.current?.value ? `//${chainSelectRef.current.value}` : undefined;
                break;
            case "ligand":
                cid = ligandSelectRef.current?.value ? ligandSelectRef.current.value : undefined;
                break;
            case "cid":
                cid = cidFormRef.current?.value ? cidFormRef.current.value : undefined;
                break;
            default:
                console.warn(`Unrecognised selection type ${ruleSelectRef.current.value}`);
                break;
        }

        const isValid = cid && (await selectedMolecule.isValidSelection(cid));
        if (isValid) {
            await commandCentre.current.cootCommand(
                {
                    command: "multiply_residue_temperature_factors",
                    commandArgs: [selectedMolecule.molNo, cid, 1 + bfactor/100],
                    returnType: "status",
                },
                false
            );
            dispatch(triggerUpdate(selectedMolecule.molNo));
            selectedMolecule.setAtomsDirty(true);
            await selectedMolecule.redraw();
            dispatch(triggerRedrawEnv(true));
            // document.body.click();
        } else {
            if (ruleSelectRef.current.value === "cid") setInvalidCid(true);
            console.warn(`Invalid selection of type ${ruleSelectRef.current.value}`);
        }
    };

    return (
        <>
            <MoorhenStack inputGrid>
            <MoorhenSelect
                label="Selection type"
                ref={ruleSelectRef}
                defaultValue={"molecule"}
                onChange={val => setSelectionType(val.target.value)}
            >
                <option value={"molecule"} key={"molecule"}>
                    By molecule
                </option>
                <option value={"chain"} key={"chain"}>
                    By chain
                </option>
                <option value={"ligand"} key={"ligand"}>
                    By ligand
                </option>
                <option value={"cid"} key={"cid"}>
                    By atom selection
                </option>
            </MoorhenSelect>
            <MoorhenMoleculeSelect molecules={molecules} onChange={handleModelChange} allowAny={false} ref={moleculeSelectRef} />
            {selectionType === "chain" && (
                <MoorhenChainSelect
                    molecules={molecules}
                    onChange={handleChainChange}
                    selectedCoordMolNo={selectedModel}
                    ref={chainSelectRef}
                />
            )}
            {selectionType === "ligand" && (
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={selectedModel} ref={ligandSelectRef} />
            )}
            {selectionType === "cid" && (
                <MoorhenCidInputForm
                    ref={cidFormRef}
                    label="Atom selection"
                    margin="0.5rem"
                    onChange={evt => setCid(evt.target.value)}
                    invalidCid={invalidCid}
                    allowUseCurrentSelection={true}
                />
            )}
        </MoorhenStack>
        <br/>
                <MoorhenSlider
                    aria-label="Factor"
                    // getAriaValueText={convertValue}
                    // valueLabelFormat={convertValue}
                    // valueLabelDisplay="on"
                    sliderTitle="Change B by "
                    sliderTitleUnit="%"
                    value={bfactor}
                    setValue={setBfactor}
                    step={10}
                    minVal={-90}
                    maxVal={90}
                />
            <MoorhenButton variant="primary" onClick={multiplyBfactor}>
                OK
            </MoorhenButton>
        </>
    );
};
