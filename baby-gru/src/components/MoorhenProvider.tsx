import { useRef } from "react";
import { MoorhenInstanceProvider } from "../InstanceManager";
import { MoorhenMenuSystemProvider } from "./menu-system/MenuSystemContext";

export const MoorhenProvider = (children: React.ReactNode) => {
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={popoverContainerRef}>
            <MoorhenInstanceProvider>
                <MoorhenMenuSystemProvider>{children}</MoorhenMenuSystemProvider>
            </MoorhenInstanceProvider>
        </div>
    );
};
