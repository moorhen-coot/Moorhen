import { ChangeEvent } from "react";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect } from "./Select";

type MoorhenModelSelectProps = {
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    disabled?: boolean;
    selectedCoordMolNo: number;
    molecules: moorhen.Molecule[];
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    ref?: React.Ref<HTMLSelectElement>;
    allowAll?: boolean;
    setValue?: (cid: string) => void;
};

export const MoorhenModelSelect = (props: MoorhenModelSelectProps) => {
    const defaultProps = { disabled: false, selectedCoordMolNo: null, label: "Ligand" };
    const { disabled, label, ref } = { ...defaultProps, ...props };

    // Get the single molecule you passed in
    const molecule = props.molecules[0];

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt);
        props.setValue?.(evt.target.value);
    };

    const getModelOptions = (): React.JSX.Element[] => {
        if (!molecule) return [];

        const nModels = molecule.sequences.length;

        const options: React.JSX.Element[] = [];

        for (let i = 1; i <= nModels; i++) {
            const cid = `/${i}/*/*/*:*`;

            options.push(
                <option value={cid} key={cid}>
                    Model {i}
                </option>
            );
        }

        return options;
    };

    return (
        <MoorhenSelect
            label={label}
            ref={ref}
            defaultValue={""}
            onChange={handleChange}
            disabled={disabled}
        >
            {getModelOptions()}
        </MoorhenSelect>
    );
};