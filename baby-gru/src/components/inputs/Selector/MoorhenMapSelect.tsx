import React, { ChangeEvent, useEffect, useState } from "react";
import { MoorhenSelect } from "..";
import { moorhen } from "../../../types/moorhen";

type MoorhenMapSelectPropsType = {
    height?: string;
    width?: string;
    label?: string;
    maps: moorhen.Map[];
    filterFunction?: (arg0: moorhen.Map) => boolean;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    defaultValue?: number | null;
    ref?: React.Ref<HTMLSelectElement>;
    disabled?: boolean;
    selected?: number | null;
    setSelectedMap?: React.Dispatch<React.SetStateAction<number | null>>;
};

/**
 * A map selector react component
 * @property {string} [height="4rem"] The height of the selector
 * @property {string} [width="20rem"] The width of the selector
 * @property {string} [label="Map"] A text label shown on top of the selector
 * @property {moorhen.Map[]} maps List of maps displayed in the selector options
 * @property {function} filterFunction A function that takes a moorhen.Map as input and returns a boolean: true if the map is to be included in the options.
 * @property {function} onChange A function that is called when the user changes the selector option
 * @property {number} [defaultValue=-999999] The default value of the selector
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
export const MoorhenMapSelect = (props: MoorhenMapSelectPropsType) => {
    const { height = "4rem", width = "20rem", maps = null, label = "Map", filterFunction = () => true, defaultValue = 0, ref } = props;

    const [_selectedMap, _setSelectedMap] = useState<number | null>(null);
    const selectedMap = props.selected ?? _selectedMap;
    const setSelectedMap = props.setSelectedMap ?? _setSelectedMap;

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        const nextSelectedMap = Number.parseInt(evt.target.value, 10);
        props.onChange?.(evt);
        if (!Number.isNaN(nextSelectedMap)) {
            // props.onSelect?.(nextSelectedMap);
            setSelectedMap(nextSelectedMap);
        }
    };

    useEffect(() => {
        if (selectedMap === null || selectedMap === undefined) {
            const newSelectedMap = defaultValue !== 0 ? defaultValue : maps[0]?.molNo ?? null;
            console.log(`MoorhenMapSelect: setting default selected map to ${newSelectedMap}`);
            setSelectedMap(newSelectedMap);
        }
    }, [defaultValue, maps]);

    const filteredMaps = maps ? maps.filter(filterFunction) : [];
    const isDisabled = props.disabled ?? filteredMaps.length === 0;

    const mapOptions: React.JSX.Element[] = [];
    if (filteredMaps.length > 0) {
        filteredMaps.forEach(map => {
            mapOptions.push(
                <option key={map.molNo} value={map.molNo}>
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

    return (
        <MoorhenSelect ref={ref} defaultValue={defaultValue} value={selectedMap ?? undefined} onChange={handleChange} label={label} inline disabled={isDisabled}>
            {mapOptions}
        </MoorhenSelect>
    );
};
