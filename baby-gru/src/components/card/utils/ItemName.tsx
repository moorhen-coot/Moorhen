import { useRef, useState } from "react";
import { MoorhenMap, MoorhenMolecule } from "../../../moorhen";
import { MoorhenButton, MoorhenTextInput } from "../../inputs";
import { MoorhenPopover, MoorhenStack } from "../../interface-base";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import "./card-utils.css";

export const ItemName = (props: { item: MoorhenMolecule | MoorhenMap; maxLength?: number }) => {
    const { item, maxLength = 18 } = props;
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false);
    const [name, setName] = useState(item.name);

    const onRename = () => {
        if (name === "") {
            onCancel();
            return;
        }
        console.log(name);
        item.name ? (item.name = name) : (item.name = name);
        document.body.click();
    };

    const onCancel = () => {
        setName(item.name);
        document.body.click();
    };

    const popoverLinkRef = useRef<HTMLButtonElement>(null);
    const popoverContent = (
        <MoorhenStack gap="0.5rem">
            <MoorhenTextInput placeholder={item.name} text={name} setText={setName} />
            <MoorhenStack direction="line">
                <MoorhenButton onClick={onRename}>Rename</MoorhenButton>
                <MoorhenButton onClick={onCancel}>Cancel</MoorhenButton>
            </MoorhenStack>
        </MoorhenStack>
    );
    const tooltip = (
        <MoorhenStack align="center">
            <div>{name}</div>
            <div style={{ fontSize: "0.75em" }}>click to rename</div>
        </MoorhenStack>
    );
    const popoverLink = (
        <button onClick={() => setPopoverIsShown(true)} className="moorhen__card-name-button" ref={popoverLinkRef}>
            <span
                style={{
                    display: "block",
                    width: "100%",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    border: "none",
                }}
            >
                {name}
            </span>
        </button>
    );
    return (
        <MoorhenTooltip tooltip={tooltip}>
            <MoorhenPopover
                link={popoverLink}
                linkRef={popoverLinkRef}
                isShown={popoverIsShown}
                setIsShown={setPopoverIsShown}
                popoverPlacement="top"
            >
                {popoverContent}
            </MoorhenPopover>
        </MoorhenTooltip>
    );
};
