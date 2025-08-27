import { Provider } from "react-redux";
import { MoorhenReduxStore as store } from "../store/MoorhenReduxStore";
import { MoorhenContainer } from "./MoorhenContainer";

export const MoorhenApp = () => {
    return (
        <Provider store={store}>
            <MoorhenContainer />
        </Provider>
    );
};
