import { useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenStack } from "../Stack/Stack";
import "./tree.css";

export const TreeBranch = (props: { children: React.ReactNode; label: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <MoorhenStack className="moorhen__tree-branch-container">
            <button className="moorhen__tree-branch-button" onClick={() => setIsExpanded(!isExpanded)}>
                {props.label}
                <MoorhenIcon
                    moorhenSVG="MatSymKeyboardArrowDown"
                    className={`moorhen__tree-branch-icon ${isExpanded ? "open" : null}`}
                    size="small"
                />{" "}
            </button>
            <div className={`moorhen__tree-branch-content ${isExpanded ? "open" : ""}`}>{isExpanded && props.children}</div>
        </MoorhenStack>
    );
};
