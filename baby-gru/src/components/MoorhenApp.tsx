import { LogoutOutlined } from "@mui/icons-material";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { useEffect, useRef } from "react";
import { reducers } from "../store/MoorhenReduxStore";
import { MoorhenProvider } from "./MoorhenProvider";
import { MoorhenContainer } from "./container/MainContainer";
import { ExtraNavBarMenus } from "./menu-system/MainMenu";

export const MoorhenExitMenu = (props: { exitCallback: () => void }) => {
    useEffect(() => {
        props.exitCallback();
    }, []);

    return <span>Saving...</span>;
};

export const MoorhenApp = () => {
    const MoorhenReduxStore = configureStore({
        reducer: reducers,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });

    return (
        <Provider store={MoorhenReduxStore}>
            <MoorhenProvider>
                <MoorhenContainer />
            </MoorhenProvider>
        </Provider>
    );
};
