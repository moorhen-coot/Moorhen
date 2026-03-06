import { useEffect } from "react";
import { MoorhenProvider } from "./MoorhenProvider";
import { MoorhenContainer } from "./container/MainContainer";

export const MoorhenExitMenu = (props: { exitCallback: () => void }) => {
    useEffect(() => {
        props.exitCallback();
    }, []);

    return <span>Saving...</span>;
};

export const MoorhenApp = () => {
    return (
        <MoorhenProvider>
            <MoorhenContainer />
        </MoorhenProvider>
    );
};
