import { useSelector } from 'react-redux';
import { RootState } from '../../../store/MoorhenReduxStore';
import type { MoorhenMolecule } from '../../../utils/MoorhenMolecule';
import './selectors.css';

type MoorhenMoleculeSelectType = {
    onSelect: (arg0: number) => void;
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
    }

    return (
        <div className="moorhen__selector-container">
            <label htmlFor="MoleculeSelector">Select Molecule:</label>
            <select
                disabled={disabled}
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
