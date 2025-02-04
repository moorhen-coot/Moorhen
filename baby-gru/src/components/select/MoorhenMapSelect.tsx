import React, { ChangeEvent, forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";

type MoorhenMapSelectPropsType = {
    height?: string;
    width?: string;
    label?: string;
    maps: moorhen.Map[];
    filterFunction?: (arg0: moorhen.Map) => boolean;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * A map selector react component
 * @property {string} [height="4rem"] The height of the selector
 * @property {string} [width="20rem"] The width of the selector
 * @property {string} [label="Map"] A text label shown on top of the selector
 * @property {moorhen.Map[]} maps List of maps displayed in the selector options
 * @property {function} filterFunction A function that takes a moorhen.Map as input and returns a boolean: true if the map is to be included in the options.
 * @property {function} onChange A function that is called when the user changes the selector option
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
 *  <MoorhenMapSelect ref={mapSelectRef} filterFunction={(map) => !map.hasReflectionData} width='100%' label='Select a map' onChange={handleMapChange} />
 * )
 */
export const MoorhenMapSelect = forwardRef<HTMLSelectElement, MoorhenMapSelectPropsType>((props, selectRef) => {

    const defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Map", filterFunction: () => true }

    const {
        height, width, maps, label, filterFunction
    } = { ...defaultProps, ...props }

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt)
    }

    const getMapOptions = () => {
        let mapOptions: React.JSX.Element[] = []
        
        if (maps) {
            maps.forEach(map => {
                if(filterFunction(map)){
                    mapOptions.push(<option key={map.molNo} value={map.molNo}>{map.molNo}: {map.name}</option>)
                }
            })
        }

        return mapOptions.length > 0 ? mapOptions : null
    }

    return <Form.Group style={{ width: width, margin: '0.5rem', height:height }}>
        <Form.Label>{label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={handleChange}>
            {getMapOptions()}
        </FormSelect>
    </Form.Group>
})

