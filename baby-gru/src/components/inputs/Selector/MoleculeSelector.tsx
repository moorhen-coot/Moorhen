import { useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import { MoorhenSelect } from "./Select";
import "./selectors.css";

type MoorhenMoleculeSelectType = {
    onChange?: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
    molecules?: MoorhenMolecule[];
    disabled?: boolean;
    allowAny?: boolean;
    ref?: React.Ref<HTMLSelectElement>;
    label?: string | null;
    style?: React.CSSProperties;
    filterFunction?: (arg0: MoorhenMolecule) => boolean;
    useUniqueId?: boolean;
};

type MoorhenMoleculeSelectMolNoType = MoorhenMoleculeSelectType & {
    useUniqueId?: false;
    selectedMolecule?: number;
    setSelectedMolecule?: React.Dispatch<React.SetStateAction<number | undefined>>;
    onSelect?: (arg0: number) => void;
};

type MoorhenMoleculeSelectUIDType = MoorhenMoleculeSelectType & {
    useUniqueId: true;
    selectedMolecule?: string;
    setSelectedMolecule?: React.Dispatch<React.SetStateAction<string | undefined>>;
    onSelect?: (arg0: string) => void;
};

export const MoorhenMoleculeSelect = (props: MoorhenMoleculeSelectMolNoType | MoorhenMoleculeSelectUIDType) => {
    const {
        molecules,
        allowAny,
        ref,
        label,
        style,
        filterFunction = () => true,
        onChange,
        useUniqueId = false,
    } = props;

    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moleculesList = molecules ?? storeMolecules;

    const [internalSelected, setInternalSelected] = useState<number | string | undefined>(undefined);
    const selectedMolecule = props.selectedMolecule ?? internalSelected;

    const setSelectedMolecule = (newValue: number | string | undefined) => {
        setInternalSelected(newValue);
        if (useUniqueId) {
            (props as MoorhenMoleculeSelectUIDType).setSelectedMolecule?.(newValue as string | undefined);
            if (newValue !== undefined) {
                (props as MoorhenMoleculeSelectUIDType).onSelect?.(newValue as string);
            }
        } else {
            (props as MoorhenMoleculeSelectMolNoType).setSelectedMolecule?.(newValue as number | undefined);
            if (newValue !== undefined) {
                (props as MoorhenMoleculeSelectMolNoType).onSelect?.(newValue as number);
            }
        }
    };


    const getDefaultValue = (): number | string | undefined => {
        if (selectedMolecule !== undefined) {
            return selectedMolecule;
        }
        if (allowAny) {
            return useUniqueId ? "" : -999999;
        }
        if (moleculesList.length === 0) {
            return undefined;
        }
        return useUniqueId ? moleculesList[0].uniqueId : moleculesList[0].molNo;
    };

    useEffect(() => {
        if (selectedMolecule === undefined || selectedMolecule === -1) {
            const newSelection = getDefaultValue();
            if (newSelection !== undefined) {
                setSelectedMolecule(newSelection);
            }
        }
    }, [moleculesList, selectedMolecule, useUniqueId]);


    let disabled: boolean = props.disabled;

    const options = moleculesList.map(option => {
        if (filterFunction(option)) {
            const optionValue = useUniqueId ? option.uniqueId : option.molNo;
            return (
                <option key={option.uniqueId} value={optionValue}>
                    {`${option.molNo}: ${option.name}`}
                </option>
            );
        }
    });

    if (options.length === 0) {
        disabled = true;
        options.push(
            <option disabled value={allowAny ? (useUniqueId ? "" : -999999) : 0} key={0}>
                No molecules loaded
            </option>
        );
    } else if (props.allowAny && options.length !== 0) {
        options.push(
            <option value={useUniqueId ? "" : -999999} key={-999999}>
                Any molecule
            </option>
        );
    }



    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (useUniqueId) {
            setSelectedMolecule(evt.target.value);
        } else {
            const selectedMolNo = parseInt(evt.target.value);
            if (!Number.isNaN(selectedMolNo)) {
                setSelectedMolecule(selectedMolNo);
            }
        }

        onChange?.(evt);
    };


    return (
        <MoorhenSelect
            label={props.label === undefined ? "Select Molecule:" : props.label}
            disabled={disabled}
            // defaultValue={getDefaultValue()}
            value={selectedMolecule}
            onChange={e => handleChange(e)}
            ref={ref}
            style={style}
        >
            {options}
        </MoorhenSelect>
    );
};
