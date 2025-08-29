import { Provider } from "react-redux";
import { LogoutOutlined } from "@mui/icons-material";
import { useEffect, useRef } from "react";
import { MoorhenReduxStore } from "../store/MoorhenReduxStore";
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

    return (
        <Provider store={MoorhenReduxStore}>
            <MoorhenContainer />
        </Provider>
    );
};
