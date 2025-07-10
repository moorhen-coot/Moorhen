import { forwardRef } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import styles from "./Inputs.module.css";

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
    <div style={{ width: width, margin: margin, height: height }}>
        {label && <label style={{ display: 'block', marginBottom: '0.25rem' }}>{label}</label>}
        <input 
            type="text" 
            className={`${styles.input} ${invalidCid ? styles.invalid : ''}`}
            placeholder={placeholder} 
            defaultValue={defaultValue}
            onChange={handleChange} 
            ref={cidFormRef}
        />
    </div>
    {allowUseCurrentSelection && showResidueSelection && 
        <div style={{ width: width, margin: margin, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
                type="checkbox" 
                id="useCurrentSelection"
                onChange={handleFillCurrentSelection}
            />
            <label htmlFor="useCurrentSelection">Use current selection?</label>
        </div>
    }
</>
})

