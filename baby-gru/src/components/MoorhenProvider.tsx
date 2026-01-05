import { ReactNode, useRef } from "react";
import { MoorhenInstanceProvider } from "../InstanceManager";

export const MoorhenProvider = (props: { children: ReactNode }) => {
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={popoverContainerRef}>
            <MoorhenInstanceProvider>{props.children}</MoorhenInstanceProvider>
        </div>
    );
};
