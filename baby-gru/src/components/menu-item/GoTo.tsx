import { useSnackbar } from "notistack";
import { Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useRef, useState } from "react";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { cidToSpec } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const GoTo = () => {
    const cidRef = useRef<null | HTMLInputElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const [cid, setCid] = useState<string>("");

    const menuItemText = "Go to...";

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const { enqueueSnackbar } = useSnackbar();

    const onCompleted = () => {
        const selectedCid = cidRef.current.value;
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return;
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!molecule) {
            enqueueSnackbar("Not a valid molecule", { variant: "warning" });
            return;
        }

        let residueSpec: moorhen.ResidueSpec;
        try {
            residueSpec = cidToSpec(selectedCid);
            if (!residueSpec.chain_id || !residueSpec.res_no) {
                enqueueSnackbar("Unable to parse CID", { variant: "warning" });
            } else {
                molecule.centreOn(
                    `/${residueSpec.mol_no ? residueSpec.mol_no : "*"}/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`,
                    true,
                    true
                );
            }
        } catch (err) {
            console.log(err);
            enqueueSnackbar("Unable to parse CID", { variant: "warning" });
            return;
        }
    };

    return (
        <>
            <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} width="20rem" />
            <Form.Group className="moorhen-form-group" controlId="cid">
                <Form.Label>Atom selection</Form.Label>
                <Form.Control
                    ref={cidRef}
                    type="text"
                    value={cid}
                    onChange={e => {
                        setCid(e.target.value);
                    }}
                />
            </Form.Group>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
