import { useSelector } from 'react-redux';
import { RootState } from '../../../store/MoorhenReduxStore';
import type { MoorhenMolecule } from '../../../utils/MoorhenMolecule';
import './selectors.css';

type MoorhenMoleculeSelectType = {
    onSelect: (arg0: number) => void;
    selected?: number;
    moleculeList?: MoorhenMolecule[];
    disabled?: boolean;
};

export const MoorhenMoleculeSelect = (props: MoorhenMoleculeSelectType) => {
    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moleculesList = props.moleculeList ? props.moleculeList : storeMolecules;
    let disabled: boolean = props.disabled;

    const options = moleculesList.map(option => {
        return (
            <option key={option.molNo} value={option.molNo as number}>
                {option.name}
            </option>
        );
    });

    if (options.length === 0) {
        disabled = true;
        options.push(
            <option selected disabled>
                No molecules loaded
            </option>
        );
    }

    return (
        <div className="moorhen__selector-container">
            <label htmlFor="MoleculeSelector">Select Molecule:</label>
            <select
                disabled={disabled}
                defaultValue={props.selected ? props.selected : 0}
                name="MoleculeSelector"
                id="MoleculeSelector"
                className="moorhen__selector"
                onChange={e => props.onSelect(parseInt(e.target.value))}
            >
                {options}
            </select>
        </div>
    );
};
