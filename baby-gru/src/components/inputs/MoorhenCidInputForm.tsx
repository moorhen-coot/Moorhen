import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import "./MoorhenInput.css";
import { MoorhenStack } from "../interface-base";

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

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(evt);
        }
        if (cidFormRef && typeof cidFormRef === "object" && "current" in cidFormRef && cidFormRef.current) {
            cidFormRef.current.value = evt.target.value;
        }
    };

    const handleFillCurrentSelection = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (evt.target.checked) {
            if (residueSelection.cid) {
                // @ts-expect-error - Creating synthetic event object for handleChange
                handleChange({target: { value: typeof residueSelection.cid === "string" ? residueSelection.cid : residueSelection.cid.join("||") },
                });
            }
        } else {
            // @ts-expect-error - Creating synthetic event object for handleChange
            handleChange({ target: { value: "" } });
        }
    };

    return (
        <>
            <MoorhenStack  direction={inline? "line" : null} style={{ width: width, margin: margin, height: height }}>
                {label && <label style={{ display: "block", marginBottom: "0.25rem" }}>{label}</label>}
                <input
                    type="text"
                    className={`${"moorhen__input"} ${invalidCid ? "moorhen__input.invalid" : ""}`}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    onChange={handleChange}
                    ref={cidFormRef}
                />
            </MoorhenStack>
            {allowUseCurrentSelection && showResidueSelection && (
                <div style={{ width: width, margin: margin, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" id="useCurrentSelection" onChange={handleFillCurrentSelection} />
                    <label htmlFor="useCurrentSelection">Use current selection?</label>
                </div>
            )}
        </>
    );
};
