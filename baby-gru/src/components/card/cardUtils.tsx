import { itemHasChildren } from "@mui/x-tree-view/hooks/useTreeItemUtils/useTreeItemUtils";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenPopover, MoorhenStack } from "../interface-base";
import { MoorhenTooltip } from "../interface-base/Popovers/Tooltip";

// export const getNameLabel = (item: moorhen.Molecule | moorhen.Map, maxLength: number = 18) => {
//     if (item.name.length > maxLength + 3) {
//         return (
//             <OverlayTrigger
//                 key={item.molNo}
//                 placement="top"
//                 overlay={
//                     <Tooltip id="name-label-tooltip" className="moorhen-tooltip">
//                         <div>{item.name}</div>
//                     </Tooltip>
//                 }
//             >
//                 <div>{`#${item.molNo}\u00A0${item.name.slice(0, maxLength)}...`}</div>
//             </OverlayTrigger>
//         );
//     }
//     return `${item.name}`;
// };

export const MoleculeOrMapName = (props: { item: moorhen.Molecule | moorhen.Map; maxLength?: number }) => {
    const { item, maxLength = 18 } = props;
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false);

    const popoverLinkRef = useRef<HTMLButtonElement>(null);
    const popoverLink = (
        <MoorhenButton
            onClick={() => setPopoverIsShown(true)}
            style={{
                textWrap: "nowrap",
                textAlign: "left",
                width: "100%",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                overflow: "hidden",
                border: "none",
                borderBottom: "1px solid var(--moorhen-border)",
            }}
            ref={popoverLinkRef}
            tooltip={
                <MoorhenStack align="center">
                    <div>{item.name}</div>
                    <div style={{ fontSize: "0.85em" }}>click to rename</div>
                </MoorhenStack>
            }
            variant="outlined"
        >{`${item.name.slice(0, maxLength)}...`}</MoorhenButton>
    );
    return (
        <MoorhenPopover
            link={popoverLink}
            linkRef={popoverLinkRef}
            isShown={popoverIsShown}
            setIsShown={setPopoverIsShown}
            popoverPlacement="top"
        >
            {item.name}
        </MoorhenPopover>
    );
};
