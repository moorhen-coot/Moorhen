import { Provider } from "react-redux";
import { ReactNode, useRef } from "react";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { MoorhenInstanceProvider } from "../InstanceManager";

export const MoorhenProvider = (props: { children: ReactNode }) => {
    const MoorhenReduxStore = createMoorhenStore();
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    const menuSystemRef = useRef<MoorhenMenuSystem>(new MoorhenMenuSystem());

    return (
        <Provider store={MoorhenReduxStore}>
            <div ref={popoverContainerRef}>
                <MoorhenInstanceProvider menuSystem={menuSystemRef.current}>{props.children}</MoorhenInstanceProvider>
            </div>
        </Provider>
    );
};
