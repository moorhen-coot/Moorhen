import { useSelector } from "react-redux";
import { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import { MoorhenStack } from "../../interface-base";
import { MoorhenSelect } from "./Select";
import "./selectors.css";

type MoorhenMoleculeSelectType = {
    onSelect?: (arg0: number) => void;
    onChange?: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
    selected?: number;
    molecules?: MoorhenMolecule[];
    disabled?: boolean;
    allowAny?: boolean;
    ref?: React.Ref<HTMLSelectElement>;
    label?: string | null;
    style?: React.CSSProperties;
    filterFunction?: (arg0: MoorhenMolecule) => boolean;
};

export const MoorhenMoleculeSelect = (props: MoorhenMoleculeSelectType) => {
    const {
        onSelect = null,
        onChange = null,
        molecules = null,
        allowAny,
        ref,
        label,
        style,
        filterFunction = () => true,
        selected,
    } = props;

    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moleculesList = molecules ? molecules : storeMolecules;

    let disabled: boolean = props.disabled;

    const options = moleculesList.map(option => {
        if (filterFunction(option)) {
            return (
                <option key={option.molNo} value={option.molNo as number}>
                    {option.name}
                </option>
            );
        }
    });

    if (props.allowAny && options.length === 0) {
        options.push(
            <option value={-999999} key={-999999}>
                Any molecule
            </option>
        );
    }

    if (options.length === 0) {
        disabled = true;
        options.push(
            <option disabled value={0} key={0}>
                No molecules loaded
            </option>
        );
    }

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (onChange) onChange(evt);
        if (onSelect) onSelect(parseInt(evt.target.value));
    };

    return (
        <MoorhenSelect
            label={props.label === undefined ? "Select Molecule:" : props.label}
            disabled={disabled}
            defaultValue={selected ? selected : 0}
            onChange={e => handleChange(e)}
            ref={props.ref}
        >
            {options}
        </MoorhenSelect>
    );
};
