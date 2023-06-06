import { ChangeEvent, forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenMapInterface } from "../../utils/MoorhenMap";

type MoorhenMapSelectPropsType = {
    height: string;
    width: string;
    label: string;
    maps: MoorhenMapInterface[];
    filterFunction: (arg0: MoorhenMapInterface) => boolean;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const MoorhenMapSelect = forwardRef<HTMLSelectElement, MoorhenMapSelectPropsType>((props, selectRef) => {

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        if (props.onChange) {
            props.onChange(evt)
        }
    }

    const getMapOptions = () => {
        let mapOptions: JSX.Element[] = []
        
        if (props.maps) {
            props.maps.forEach(map => {
                if(props.filterFunction(map)){
                    mapOptions.push(<option key={map.molNo} value={map.molNo}>{map.molNo}: {map.name}</option>)
                }
            })
        }

        return mapOptions.length > 0 ? mapOptions : null
    }

    return <Form.Group style={{ width: props.width, margin: '0.5rem', height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={handleChange}>
            {getMapOptions()}
        </FormSelect>
    </Form.Group>
})

MoorhenMapSelect.defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Map", filterFunction: () => true }