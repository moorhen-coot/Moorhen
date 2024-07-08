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

    const defaultProps = { 
        height: '4rem', width: '20rem', margin: '0.1rem', label: "Atom selection", 
        placeholder: "", defaultValue: "", invalidCid: false, allowUseCurrentSelection: false
    }

    const {
        height, width, margin, label, placeholder, defaultValue, invalidCid, allowUseCurrentSelection
    } = { ...defaultProps, ...props }
    
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
    <Form.Group style={{ width: width, margin: margin, height: height }}>
        {label && <Form.Label>{label}</Form.Label>}
        <Form.Control size="sm" type='text' placeholder={placeholder} defaultValue={defaultValue} style={{width: "100%", color: invalidCid ? 'red' : '', borderColor: invalidCid ? 'red' : ''}} onChange={handleChange} ref={cidFormRef}/>
    </Form.Group>
    {allowUseCurrentSelection && showResidueSelection && <Form.Check type="checkbox" label="Use current selection?" style={{width: width, margin: margin }} onChange={handleFillCurrentSelection}/>}
    </>
})

