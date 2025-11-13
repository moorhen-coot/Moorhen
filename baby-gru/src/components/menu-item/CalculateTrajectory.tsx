import { useSnackbar } from "notistack";
import { Form, FormSelect } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { representationLabelMapping } from "../../utils/enums";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

const animationRepresentations = ["CBs", "CAs", "CRs", "gaussian", "MolecularSurface", "VdwSpheres"];

export const CalculateTrajectory = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const styleSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const [representationStyle, setRepresentationStyle] = useState<string>("CBs");

    const commandCentre = useCommandCentre();

    const { enqueueSnackbar } = useSnackbar();

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null || styleSelectRef.current.value === null) {
            return;
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            enqueueSnackbar("model-trajectory", {
                variant: "modelTrajectory",
                persist: true,
                commandCentre: commandCentre,
                moleculeMolNo: selectedMolecule.molNo,
                representationStyle: styleSelectRef.current.value,
                anchorOrigin: { vertical: "bottom", horizontal: "center" },
            });
        } else {
            console.warn(`Cannot find molecule with imol ${moleculeSelectRef.current.value}`);
        }
    }, [molecules]);

    return (
        <>
            <Form.Group style={{ margin: "0.5rem", width: "20rem" }}>
                <Form.Label>Style</Form.Label>
                <FormSelect
                    ref={styleSelectRef}
                    size="sm"
                    value={representationStyle}
                    onChange={evt => setRepresentationStyle(evt.target.value)}
                >
                    {animationRepresentations.map(key => {
                        return (
                            <option value={key} key={key}>
                                {representationLabelMapping[key]}
                            </option>
                        );
                    })}
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
