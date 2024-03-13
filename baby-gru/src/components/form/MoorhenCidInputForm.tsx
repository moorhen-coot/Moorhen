import { forwardRef } from "react";
import { Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";

type MoorhenCidInputFormPropsType = {
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    placeholder?: string; 
    defaultValue?: string;
    onChange?: (arg0: React.ChangeEvent<HTMLInputElement>) => void;
    invalidCid?: boolean;
    allowUseCurrentSelection?: boolean;
}

export const MoorhenCidInputForm = forwardRef<HTMLInputElement, MoorhenCidInputFormPropsType>((props, cidFormRef) => {
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const showResidueSelection = useSelector((state: moorhen.State) => state.generalStates.showResidueSelection)

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (props.onChange) {
            props.onChange(evt)
        }
        if(cidFormRef !== null && typeof cidFormRef !== 'function') cidFormRef.current.value = evt.target.value
    }

    const handleFillCurrentSelection = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (evt.target.checked) {
            if (residueSelection.cid) {
                // @ts-ignore
                handleChange({target: {value: typeof residueSelection.cid === 'string' ? residueSelection.cid : residueSelection.cid.join('||')}})
            }
        } else {
            // @ts-ignore
            handleChange({target: {value: ''}})
        }
    }

    return  <>
    <Form.Group style={{ width: props.width, margin: props.margin, height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <Form.Control size="sm" type='text' placeholder={props.placeholder} defaultValue={props.defaultValue} style={{width: "100%", color: props.invalidCid ? 'red' : '', borderColor: props.invalidCid ? 'red' : ''}} onChange={handleChange} ref={cidFormRef}/>
    </Form.Group>
    {props.allowUseCurrentSelection && showResidueSelection && <Form.Check type="checkbox" label="Use current selection?" style={{width: props.width, margin: props.margin}} onChange={handleFillCurrentSelection}/>}
    </>
})

MoorhenCidInputForm.defaultProps = { 
    height: '4rem', width: '20rem', margin: '0.1rem', label: "Atom selection", 
    placeholder: "", defaultValue: "", invalidCid: false, allowUseCurrentSelection: false
}
