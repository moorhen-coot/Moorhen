import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Container, Col, Form, Row } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";
import { MoorhenButton } from "../inputs";
import { useCommandCentre } from "../../InstanceManager";
import { MoorhenToggle } from "../inputs/MoorhenToggle/Toggle"

interface MoorhenConKitProps {
    resizeTrigger?: boolean;
    resizeNodeRef?: React.RefObject<HTMLDivElement>;
    size?: { width: number; height: number };
}

export const MoorhenConKit = (props: MoorhenConKitProps) => {

    const commandCentre = useCommandCentre();

    const [selectedInputModel, setSelectedInputModel] = useState<null | number>(null);
    const [selectedRefModel, setSelectedRefModel] = useState<null | number>(null);
    const [selectedInputChain, setSelectedInputChain] = useState<string | null>(null);
    const [selectedRefChain, setSelectedRefChain] = useState<string | null>(null);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const inputMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const refMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const inputChainSelectRef = useRef<HTMLSelectElement>(null);
    const refChainSelectRef = useRef<HTMLSelectElement>(null);

    const [specifyTargetChain, setSpecifyTargetChain] = useState<boolean>(false);

    const handleRefChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRefChain(evt.target.value);
    };

    const handleInputChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedInputChain(evt.target.value);
    };

    const runConKit = useCallback(async () => {
       
       const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(molecules[inputMoleculeSelectRef.current.value].gemmiStructure)
       const ref_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(molecules[refMoleculeSelectRef.current.value].gemmiStructure)

        if(input_cif_string.length==0 || ref_cif_string.length==0){
            return
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "run_conkit_validate",
                command: "run_conkit_validate",
                returnType: "string",
                commandArgs: [input_cif_string,ref_cif_string,"input.cif","ref.cif",inputChainSelectRef.current.value, specifyTargetChain, refChainSelectRef.current.value],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string

        console.log(JSON.parse(json_string))
       
    }, [inputMoleculeSelectRef.current, refMoleculeSelectRef.current, inputChainSelectRef.current, refChainSelectRef.current, molecules,specifyTargetChain]);
    

    return (<>
                    <MoorhenStack direction="row">
                        <MoorhenStack direction="column">
                            <MoorhenMoleculeSelect label="Input molecule" onSelect={sel => setSelectedInputModel(sel)} ref={inputMoleculeSelectRef} />
                            <MoorhenChainSelect
                                width=""
                                molecules={molecules}
                                onChange={handleInputChainChange}
                                selectedCoordMolNo={selectedInputModel}
                                ref={inputChainSelectRef}
                                allowedTypes={[1, 2]}
                            />
                        </MoorhenStack>
                        <MoorhenStack direction="column">
                            <MoorhenMoleculeSelect label="Reference molecule" onSelect={sel => setSelectedRefModel(sel)} ref={refMoleculeSelectRef} />
                            <MoorhenStack direction="row">
                            <MoorhenToggle
                            style={{ margin: "1.0rem", justifyContent: "left", display: "flex", gap: "0.5rem" }}
                            label="Specify reference model chain"
                            checked={specifyTargetChain}
                            onChange={e => {
                                setSpecifyTargetChain(!specifyTargetChain);
                            }}
                            />
                            <MoorhenChainSelect
                                width=""
                                disabled={!specifyTargetChain}
                                label=""
                                molecules={molecules}
                                onChange={handleRefChainChange}
                                selectedCoordMolNo={selectedRefModel}
                                ref={refChainSelectRef}
                                allowedTypes={[1, 2]}
                            />
                            </MoorhenStack>
                        </MoorhenStack>
                    </MoorhenStack>
                    <MoorhenButton onClick={runConKit}>OK</MoorhenButton>
            </>)
}
