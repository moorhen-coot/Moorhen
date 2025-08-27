import { Provider } from "react-redux";
import { MoorhenReduxStore } from "../store/MoorhenReduxStore";
import { MoorhenContainer } from "./container/MoorhenContainer";

export const MoorhenApp = () => {
    return (
        <Provider store={MoorhenReduxStore}>
            <MoorhenContainer />
        </Provider>
    );
};
