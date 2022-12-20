import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruMapSelect = forwardRef((props, selectRef) => {

    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    const getMapOptions = () => {
        let mapOptions = []
        
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

BabyGruMapSelect.defaultProps = { height: '4rem', width: '20rem', maps: null, label: "Map", filterFunction: () => true }