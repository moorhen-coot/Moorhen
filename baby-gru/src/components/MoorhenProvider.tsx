import { Provider } from "react-redux";
import { ReactNode, useRef } from "react";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { MoorhenInstanceProvider } from "../InstanceManager";

export const MoorhenProvider = (props: { children: ReactNode }) => {
    const MoorhenReduxStore = createMoorhenStore();
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    return (
        <Provider store={MoorhenReduxStore}>
            <div ref={popoverContainerRef}>
                <MoorhenInstanceProvider>{props.children}</MoorhenInstanceProvider>
            </div>
        </Provider>
    );
};
