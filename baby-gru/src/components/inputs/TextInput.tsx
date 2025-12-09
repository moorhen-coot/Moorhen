import { useDispatch } from "react-redux";
import React from "react";
import { setShortCutsBlocked } from "../../store/globalUISlice";
import { MoorhenSVG } from "../icons";
import { MoorhenStack } from "../interface-base";
import { MoorhenButton } from "./MoorhenButton/MoorhenButton";

type MoorhenTextInputBase = {
    id?: string;
    text: string;
    setText: (text: string) => void;
    label?: string;
    labelPosition?: "top" | "left";
    style?: React.CSSProperties;
};
export type MoorhenTextInputProps = MoorhenTextInputBase & {
    button?: false;
};

export type MoorhenTextInputButtonProps = MoorhenTextInputBase & {
    button: true;
    onClick: () => {};
    icon?: MoorhenSVG;
    buttonLabel?: string;
};

export const MoorhenTextInput = (props: MoorhenTextInputProps | MoorhenTextInputButtonProps) => {
    const { labelPosition = "top" } = props;
    const dispatch = useDispatch();
    const handleBlur = () => {
        dispatch(setShortCutsBlocked(false));
    };
    return (
        <div className="moorhen__input-text-container" style={{ ...props.style }}>
            {labelPosition === "top" ? props.label : null}
            <MoorhenStack direction="line" align="center">
                {labelPosition === "left" ? props.label : null}
                <input
                    id={props.id}
                    type="text"
                    onChange={e => props.setText(e.target.value)}
                    defaultValue={props.text}
                    className={`moorhen__input moorhen__input-text-box ${props.button ? "moorhen__input-text-box-wbutton" : null}`}
                    onBlur={handleBlur}
                    onFocus={() => dispatch(setShortCutsBlocked(true))}
                />
                {props.button ? (
                    <MoorhenButton icon={props.icon} onClick={props.onClick} className="moorhen__input-text-box-button" />
                ) : null}
            </MoorhenStack>
        </div>
    );
};
