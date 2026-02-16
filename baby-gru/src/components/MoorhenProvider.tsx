import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { ReactNode, useRef } from "react";
import { reducers } from "@/store";
import { MoorhenInstanceProvider } from "../InstanceManager";

export const MoorhenProvider = (props: { children: ReactNode }) => {
    const MoorhenReduxStore = configureStore({
        reducer: reducers,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    return (
        <Provider store={MoorhenReduxStore}>
            <div ref={popoverContainerRef}>
                <MoorhenInstanceProvider>{props.children}</MoorhenInstanceProvider>
            </div>
        </Provider>
    );
};
