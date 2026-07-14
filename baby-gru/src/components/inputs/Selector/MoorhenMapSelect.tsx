import React, { ChangeEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { MoorhenSelect } from "./Select";
import type { MoorhenMap } from "@/utils/MoorhenMap";
import type { RootState } from "@/store";

type MoorhenMapSelectBaseProps = {
    label?: string;
    maps?: MoorhenMap[];
    filterFunction?: (arg0: MoorhenMap) => boolean;
    ref?: React.Ref<HTMLSelectElement>;
    disabled?: boolean;
    onChange?: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
    onSelect?: (value: number | string) => void;
    useUniqueId?: boolean;
};

type MoorhenMapSelectPropsType = MoorhenMapSelectBaseProps & {
    defaultValue?: number | null;
    selected?: number | null;
    setSelectedMap?: React.Dispatch<React.SetStateAction<number | null>>;
};

type MoorhenMapSelectPropsUIDType = MoorhenMapSelectBaseProps & {
    defaultValue?: string | null;
    selected?: string | null;
    setSelectedMap?: React.Dispatch<React.SetStateAction<string | null>>;
};
/**
 * A map selector react component
 * @property {string} [height="4rem"] The height of the selector
 * @property {string} [width="20rem"] The width of the selector
 * @property {string} [label="Map"] A text label shown on top of the selector
 * @property {MoorhenMap[]} maps List of maps displayed in the selector options
 * @property {function} filterFunction A function that takes a MoorhenMap as input and returns a boolean: true if the map is to be included in the options.
 * @property {function} onChange A function that is called when the user changes the selector option
 * @property {number | string} [defaultValue=-999999] The default value of the selector
 * @example
 * import { MoorhenMapSelect } from "moorhen";
 * import { useRef } from "react";
 *
 * const mapSelectRef = useRef(null);
 *
 * const handleMapChange = (evt) => {
 *  const selectedMap = parseInt(evt.target.value)
 *  console.log(`New selected map is ${selectedMap}`)
 * }
 *
 * return (
 *  <MoorhenMapSelect ref={mapSelectRef} filterFunction={(map) => !map.hasReflectionData}
     width='100%' label='Select a map' onChange={handleMapChange} />
 * )
 */
export const MoorhenMapSelect = (props: MoorhenMapSelectPropsType | MoorhenMapSelectPropsUIDType) => {
    const storeMaps = useSelector((state: RootState) => state.maps);
    const {
        label = "Map",
        filterFunction = () => true,
        ref,
        onChange,
        onSelect,
    } = props;

    const maps = props.maps ?? storeMaps;
    const useUniqueId = props.useUniqueId ?? false;

    const [internalSelectedMap, setInternalSelectedMap] = useState<number | string | null>(null);
    const selectedMap =
        useUniqueId
            ? ((props.selected ?? internalSelectedMap) as string | null)
            : ((props.selected ?? internalSelectedMap) as number | null);

    const setSelectedMap = (value: number | string | null) => {
        setInternalSelectedMap(value);
        if (useUniqueId) {
            (props as MoorhenMapSelectPropsUIDType).setSelectedMap?.(value as string | null);
            if (value !== null) {
                onSelect?.(value as string);
            }
        } else {
            (props as MoorhenMapSelectPropsType).setSelectedMap?.(value as number | null);
            if (value !== null) {
                onSelect?.(value as number);
            }
        }
    };

    const filteredMaps = maps.filter(filterFunction);

    const resolveDefaultSelection = (): number | string | null => {
        if (filteredMaps.length === 0) {
            return null;
        }

        if (useUniqueId) {
            const defaultUniqueId = (props as MoorhenMapSelectPropsUIDType).defaultValue;
            return defaultUniqueId && defaultUniqueId !== "" ? defaultUniqueId : filteredMaps[0].uniqueId;
        }

        const defaultMolNo = (props as MoorhenMapSelectPropsType).defaultValue;
        return typeof defaultMolNo === "number" && !Number.isNaN(defaultMolNo) ? defaultMolNo : filteredMaps[0].molNo;
    };

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        let selectedMapValue: number | string | null = null;
        if (useUniqueId) {
            selectedMapValue = evt.target.value;
        } else {
            selectedMapValue = Number.parseInt(evt.target.value, 10);
        }

        if (useUniqueId || !Number.isNaN(selectedMapValue)) {
            setSelectedMap(selectedMapValue);
        }

        onChange?.(evt);
    };

    useEffect(() => {
        if (selectedMap === null || selectedMap === undefined || selectedMap === "") {
            const selectedMapValue = resolveDefaultSelection();
            if (selectedMapValue !== null) {
                setSelectedMap(selectedMapValue);
            }
        }
    }, [props.defaultValue, maps, selectedMap, useUniqueId]);

    const isDisabled = props.disabled ?? filteredMaps.length === 0;

    const mapOptions: React.JSX.Element[] = [];
    if (filteredMaps.length > 0) {
        filteredMaps.forEach(map => {
            const optionValue = useUniqueId ? map.uniqueId : map.molNo;
            mapOptions.push(
                <option key={map.uniqueId} value={optionValue}>
                    {`${map.molNo}: ${map.name}`}
                </option>
            );
        });
    } else {
        mapOptions.push(
            <option key="no-maps" disabled value={0}>
                No maps available
            </option>
        );
    }

    const defaultValue = useUniqueId
        ? (props as MoorhenMapSelectPropsUIDType).defaultValue ?? undefined
        : (props as MoorhenMapSelectPropsType).defaultValue ?? undefined;

    return (
        <MoorhenSelect ref={ref} defaultValue={defaultValue} value={selectedMap ?? undefined} onChange={handleChange} label={label} inline disabled={isDisabled}>
            {mapOptions}
        </MoorhenSelect>
    );
};
