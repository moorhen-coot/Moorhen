import { useId, useRef, useState } from "react";
import { MoorhenPopover } from "../../interface-base/Popovers/Popover";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { MoorhenGradientPicker, type MoorhenGradientPickerType } from "./MoorhenGradientPicker";
import { colourTableToCssGradient } from "./gradientPresets";

type MoorhenGradientPickerButtonType = MoorhenGradientPickerType & {
    label?: string;
    popoverPlacement?: "left" | "right" | "top" | "bottom";
    /** Accessible name of the button, when there is no label to name it */
    ariaLabel?: string;
    /** Style of the button, e.g. to give it a fixed width */
    style?: React.CSSProperties;
};

/**
 * A label and a button painted with a colour gradient; clicking the button opens a
 * MoorhenGradientPicker in a popover. Takes the props of the picker, which it passes on.
 */
export const MoorhenGradientPickerButton = (props: MoorhenGradientPickerButtonType) => {
    const { label, popoverPlacement = "top", ariaLabel, style, ...pickerProps } = props;
    const [isShown, setIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const id = useId();

    const button = (
        <button
            id={`GradientPicker-${id}`}
            ref={buttonRef}
            type="button"
            onClick={() => setIsShown(!isShown)}
            aria-label={label ? undefined : (ariaLabel ?? "Gradient picker")}
            aria-haspopup="dialog"
            aria-expanded={isShown}
            style={{
                width: "100%",
                minWidth: "6rem",
                height: "25px",
                padding: 0,
                borderRadius: "8px",
                flexShrink: 0,
                border: "2px solid rgb(255, 255, 255)",
                boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                cursor: "pointer",
                backgroundImage: colourTableToCssGradient(pickerProps.colourTable),
                ...style,
            }}
        />
    );

    return (
        <MoorhenStack direction="line" align="center" gap="0.5rem">
            {label && (
                <label htmlFor={`GradientPicker-${id}`} className="moorhen__input__label">
                    {label}
                </label>
            )}
            <MoorhenPopover
                link={button}
                linkRef={buttonRef}
                isShown={isShown}
                setIsShown={setIsShown}
                popoverPlacement={popoverPlacement}
            >
                <MoorhenGradientPicker {...pickerProps} />
            </MoorhenPopover>
        </MoorhenStack>
    );
};

MoorhenGradientPickerButton.displayName = "MoorhenGradientPickerButton";
