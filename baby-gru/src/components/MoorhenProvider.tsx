import { ReactNode, useRef } from "react";
import { MoorhenInstanceProvider } from "../InstanceManager";
import { MoorhenMenuSystemProvider } from "./menu-system/MenuSystemContext";

export const MoorhenProvider = (props: { children: ReactNode }) => {
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={popoverContainerRef}>
            <MoorhenInstanceProvider>
                <MoorhenMenuSystemProvider>{props.children}</MoorhenMenuSystemProvider>
            </MoorhenInstanceProvider>
        </div>
    );
};
