import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import "./MoorhenInput.css";
import { MoorhenStack } from "../interface-base";
import { MoorhenToggle } from "./MoorhenToggle/Toggle";
import { useState } from "react";

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
    ref?: React.Ref<HTMLInputElement>;
    inline?: boolean
};

export const MoorhenCidInputForm = ({
    height = "4rem",
    width = "16rem",
    margin = "0.1rem",
    label = "Atom selection",
    placeholder = "",
    defaultValue = "",
    invalidCid = false,
    allowUseCurrentSelection = false,
    onChange,
    ref: cidFormRef,
    inline = true,
}: MoorhenCidInputFormPropsType) => {
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const showResidueSelection = useSelector((state: moorhen.State) => state.generalStates.showResidueSelection);
    const [selection, setSelection] = useState<string>("")
    const [useSelection, setUseSelection] = useState(false)

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(evt);     
        }
        setSelection(evt.target.value)
    };

    const handleFillCurrentSelection = (evt: React.ChangeEvent<HTMLInputElement>) => {
        console.log(residueSelection)
        if (!useSelection) {
            if (residueSelection) {
                if (residueSelection.cid === null) {
                    setSelection(residueSelection.first)
                } else {
                setSelection(Array.isArray(residueSelection.cid) ? residueSelection.cid[0] : residueSelection.cid)}
            }
        } else {
            setSelection("")
        }
        setUseSelection(!useSelection)}

    return (
        <>
            <MoorhenStack  direction={inline? "line" : null} style={{ width: width, margin: margin, height: height }}>
                {label && <label style={{ display: "block", marginBottom: "0.25rem" }}>{label}</label>}
                <input
                    type="text"
                    className={`${"moorhen__input"} ${invalidCid ? "moorhen__input.invalid" : ""}`}
                    placeholder={placeholder}
                    onChange={handleChange}
                    ref={cidFormRef}
                    value={selection}
                />
            </MoorhenStack>
            {allowUseCurrentSelection && showResidueSelection && (
                <MoorhenToggle
                    label="Use Current Selection"
                    onChange={handleFillCurrentSelection} 
                    checked={useSelection}/>
            )}
        </>
    );
};
