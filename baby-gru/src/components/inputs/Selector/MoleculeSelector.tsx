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
    selected?: number;
    selectedUniqueId?: string;
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
        onSelectUniqueId = null,
        onChange = null,
        molecules = null,
        allowAny,
        ref,
        label,
        style,
        filterFunction = () => true,
        selected,
        selectedUniqueId,
    } = props;

    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moleculesList = molecules ? molecules : storeMolecules;
    const [internalSelected, setInternalSelected] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (moleculesList.length > 0 && internalSelected === undefined) {
            setInternalSelected(moleculesList[0].molNo);
            onSelect?.(moleculesList[0].molNo);
            onSelectUniqueId?.(moleculesList[0].uniqueId);
        }
    },[moleculesList])

    useEffect(() => {
        if (selectedUniqueId !== undefined ) {
            const selectedMolecule = moleculesList.find(molecule => molecule.uniqueId === selectedUniqueId);
            setInternalSelected(selectedMolecule ? selectedMolecule.molNo : undefined);
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

    if (props.allowAny && options.length !== 0) {
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
        const selectedMolNo = parseInt(evt.target.value);
        const selectedMolecule = moleculesList.find(molecule => molecule.molNo === selectedMolNo);
        if (selectedMolecule && onSelectUniqueId) {
            onSelectUniqueId(selectedMolecule.uniqueId);
        }
        if (onChange) onChange(evt);
        if (onSelect) onSelect(selectedMolNo);
        setInternalSelected(selectedMolNo);
    };

    const getDefaultValue = () => {
        if (selected !== undefined) return selected;
        if (allowAny && options.length > 0 && !disabled) return -999999;
        return 0;
    };

    return (
        <MoorhenSelect
            label={props.label === undefined ? "Select Molecule:" : props.label}
            disabled={disabled}
            // defaultValue={getDefaultValue()}
            value={internalSelected}
            onChange={e => handleChange(e)}
            ref={ref}
            style={style}
        >
            {options}
        </MoorhenSelect>
    );
};
