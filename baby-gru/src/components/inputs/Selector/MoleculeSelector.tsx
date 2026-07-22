import { useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import { MoorhenSelect } from "./Select";
import "./selectors.css";

type MoorhenMoleculeSelectType = {
    onSelect?: (arg0: number) => void | React.Dispatch<React.SetStateAction<number>>;
    onSelectUniqueId?: (arg0: string) => void | React.Dispatch<React.SetStateAction<string>>;
    onChange?: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
    selectedUniqueId?: string;
    molecules?: MoorhenMolecule[];
    disabled?: boolean;
    allowAny?: boolean;
    ref?: React.Ref<HTMLSelectElement>;
    label?: string | null;
    style?: React.CSSProperties;
    filterFunction?: (arg0: MoorhenMolecule) => boolean;
    selectedMolecule?: number;
    setSelectedMolecule?: React.Dispatch<React.SetStateAction<number>>;

};

export const MoorhenMoleculeSelect = (props: MoorhenMoleculeSelectType) => {
    const {
        // onSelect = null,
        onSelectUniqueId = null,
        // onChange = null,
        molecules = null,
        allowAny,
        ref,
        label,
        style,
        filterFunction = () => true,
        selectedUniqueId,
        selectedMolecule,
        setSelectedMolecule
    } = props;

    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moleculesList = molecules ? molecules : storeMolecules;
    
    const [internalSelected, setInternalSelected] = useState<number | undefined>(undefined);
    const selectedMolNo = selectedMolecule !== undefined ? selectedMolecule : internalSelected;
    const setSelectedMolNo = setSelectedMolecule ? setSelectedMolecule : setInternalSelected;


    const getDefaultValue = () => {
        if (allowAny) return -999999;
        if (selectedMolNo) return selectedMolNo;    
        return 0;
    };

    useEffect(() => {
        if (selectedMolNo === undefined || selectedMolNo === -1) {
            const newMolNo = getDefaultValue();
            setSelectedMolNo(newMolNo);
            // onSelect?.(newMolNo);
            onSelectUniqueId?.(newMolNo.toString());
        }
    },[moleculesList])

    useEffect(() => {
        if (selectedUniqueId !== undefined ) {
            const selectedMolecule = moleculesList.find(molecule => molecule.uniqueId === selectedUniqueId);
            setSelectedMolNo(selectedMolecule ? selectedMolecule.molNo : undefined);
        }
    }, [selectedUniqueId])


    let disabled: boolean = props.disabled;

    const options = moleculesList.map(option => {
        if (filterFunction(option)) {
            return (
                <option key={option.molNo} value={option.molNo}>
                    {`${option.molNo}: ${option.name}`}
                </option>
            );
        }
    });

    if (options.length === 0) {
        disabled = true;
        options.push(
            <option disabled value={allowAny ? -999999 : 0} key={0}>
                No molecules loaded
            </option>
        );
    } else if (props.allowAny && options.length !== 0) {
        options.push(
            <option value={-999999} key={-999999}>
                Any molecule
            </option>
        );
    }



    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMolNo = parseInt(evt.target.value);
        const selectedMolecule = moleculesList.find(molecule => molecule.molNo === selectedMolNo);
        if (selectedMolecule && onSelectUniqueId) {
            onSelectUniqueId(selectedMolecule.uniqueId);
        }
        if (props.onChange) props.onChange(evt);
        //if (onSelect) onSelect(selectedMolNo);
        setSelectedMolNo(selectedMolNo);
    };


    return (
        <MoorhenSelect
            label={props.label === undefined ? "Select Molecule:" : props.label}
            disabled={disabled}
            // defaultValue={getDefaultValue()}
            value={selectedMolNo}
            onChange={e => handleChange(e)}
            ref={ref}
            style={style}
        >
            {options}
        </MoorhenSelect>
    );
};
