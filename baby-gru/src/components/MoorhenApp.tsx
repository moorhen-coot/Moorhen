import { LogoutOutlined } from "@mui/icons-material";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { useEffect, useRef } from "react";
import { reducers } from "../store/MoorhenReduxStore";
import { MoorhenContainer } from "./container/MoorhenContainer";
import { ExtraNavBarMenus } from "./navbar-menus/MoorhenMainMenu";

export const MoorhenExitMenu = (props: { exitCallback: () => void }) => {
    useEffect(() => {
        props.exitCallback();
    }, []);

    return <span>Saving...</span>;
};

export const MoorhenApp = () => {
    const exitDialActionRef = useRef(null);

    const extraNavBarMenus: ExtraNavBarMenus[] = [
        {
            icon: (<LogoutOutlined />) as React.JSX.Element,
            name: "Exit",
            ref: exitDialActionRef,
            JSXElement: <MoorhenExitMenu key={"exit"} exitCallback={() => console.log("Exit clicked")} />,
        },
    ];

    const MoorhenReduxStore = configureStore({
        reducer: reducers,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });

    return (
        <Provider store={MoorhenReduxStore}>
            <MoorhenContainer />
        </Provider>
    );
};
